module.exports = function() {
  return new LList
}

var node = require('./llist-node')

function LList() {
  this.root = null
}

var cons = LList
  , proto = cons.prototype

proto.insert = function llist_insert(meta) {
  var instance = node(meta)
  if(!this.root) {
    this.root = instance
    return
  }

  var cmp = this.root.compare(instance)
    , current = this.root

  if(cmp < 1) {
    instance.next = current
    this.root = instance
    return
  }

  while(current.next) {
    cmp = current.next.compare(instance)
    if(cmp < 1) {
      break
    }
    current = current.next
  }

  instance.next = current.next
  current.next = instance
}

proto.forEach = function(fn) {
  var current = this.root
    , idx = 0

  while(current) {
    fn(current, idx++)
    current = current.next
  }
}
