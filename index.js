module.exports = pack

var through = require('through')
  , crypto = require('crypto')
  , llist = require('./llist')
  , binary = require('bops')
  , zlib = require('zlib')

var OFS_DELTA = 6
  , REF_DELTA = 7

function deflate(data, ready) {
  zlib.deflate(data, ready)
}

function pack(window_size, max_delta, max_size) {
  var objects = []
    , buckets
    , hash

  // ensure sane inputs.
  window_size = 0 // window_size === undefined ? 10 : window_size
  max_delta = 0 // max_delta === undefined ? 10 : max_delta
  max_size = 0 // max_size === undefined ? 1 << 18 : max_size 
  window_size = Math.max(0, window_size)
  max_delta = Math.max(0, max_delta)
  max_size = Math.max(0, max_size)

  buckets = [
    null
  , llist()    // commit
  , llist()    // tree
  , llist()    // blob
  , llist()    // tag
  ]

  var stream = through(write, end)
    , cnt = 0

  return stream

  function write(meta) {
    ++cnt
    buckets[meta.type].insert(meta)
    objects.push(meta)
  }

  function end() {
    var header = binary.from('PACK\0\0\0\0\0\0\0\0', 'utf8')

    header.writeUInt32BE(2, 4)
    header.writeUInt32BE(objects.length, 8)

    hash = crypto.createHash('sha1')
    send(header)

    var idx = 0

    iter()

    function iter() {
      if(idx === objects.length) {
        return done()
      }

      output(objects[idx++], iter)
    }

    function done() {
      var digest = binary.from(hash.digest('hex'), 'hex')
      stream.queue(digest)
      stream.queue(null)
    }
  }

  function output(meta, ready) {
    if(meta.node.already_output) {
      return ready()
    }

    var object = meta.obj
      , candidate = {delta: null, node: null}
      , current = meta.node.next
      , lhs = object.serialize()
      , min = lhs.length
      , got = 0
      , rhs

    if(lhs.length < max_size)
    while(current && got < window_size) {
      if(current._deltaed < max_delta) {
        rhs = create(current._data, lhs, current._data) 
        if(rhs.length < min) {
          min = rhs.length
          candidate.delta = rhs
          candidate.node = current
        }
      }
      ++got
      current = current.next
    }
    if(!candidate.delta) {
      return void deflate(lhs, function(err, data) {
        send_object_header(object.type, lhs.length)
        send(data)
        ready()
      })
    }
  
    meta.node._deltaed = candidate.node._deltaed + 1
    meta.already_output = true

    if(!candidate.node.already_output) {
      candidate.node.already_output = true
      return void deflate(candidate.node._data, function(err, data) {
        send_object_header(candidate.node._type, candidate.node._data.length)
        send(data)
        send_current()
      })
    }

    return send_current()

    function send_current() {
      deflate(candidate.delta, function(err, data) {
        send_object_header(REF_DELTA, lhs.length)

        var oid = candidate.node._oid

        if(typeof oid === 'string') {
          send(binary.from(oid, 'hex'))
        } else {
          send(oid)
        }

        send(data)
        ready()
      })
    }
  }

  function send_object_header(type, size) {
    var out = [0]

    out[0] |= (type & 7) << 4
    out[0] |= size & 0x0f 
    size >>>= 4

    while(size > 0) {
      out[out.length - 1] |= 0x80
      out[out.length] = size & 0x7f
      size >>>= 7
    }

    send(binary.from(out))
  }

  function send(buf) {
    hash.update(buf)
    stream.queue(buf)
  }
}
