module.exports = node

function node(meta) {
  return new Node(meta)
}

function Node(meta) {
  meta.node = this
  this.next = null

  this._deltaed = 0
  this._oid = meta.obj.hash
  this._type = meta.obj.type
  this._data = meta.obj.serialize()
  this._basename_dirname = get_basename_dirname(meta)
  this._size = this._data.length
  this._in_pack = meta.in_pack
}

var cons = Node
  , proto = cons.prototype

proto.compare = function compare(instance) {
  var cmp
  cmp = cmp_string(
      instance._basename_dirname
    , this._basename_dirname
  )
  cmp = cmp || +!!this._in_pack - +!!instance._in_pack
  cmp = cmp || this._size - instance._size

  // return in reverse since we want to look "forward"
  // down the list later.
  return -cmp
}

function get_basename_dirname(meta) {
  var filename_dirname

  if(meta.path) {
    filename_dirname = []
    if(meta.path.length) {
      for(var i = 0, len = meta.path.length; i < len; ++i) {
        filename_dirname.push(meta.path[i].name)  
      }
      filename_dirname.unshift(filename_dirname.pop())
    }
    filename_dirname = filename_dirname.join('/') 
  } else {
    filename_dirname = ''
  }

  return filename_dirname
}

function cmp_string(lhs, rhs) {
  var cmp = 0
  for(var i = 0, len = Math.min(lhs.length, rhs.length); i < len; ++i) {
    cmp = lhs.charCodeAt(i) - rhs.charCodeAt(i)
    if(cmp !== 0) {
      break
    } 
  }

  return cmp === 0 ? lhs.length - rhs.length : cmp
}
