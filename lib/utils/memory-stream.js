'use strict'

const stream   = require('stream')
const Writable = stream.Writable
const memStore = {}

function MemoryStream(key, options) {
  Writable.prototype.constructor.call(this, options)

  this.key = key
  memStore[key] = new Buffer('')
}

MemoryStream.prototype = Object.create(Writable.prototype)
MemoryStream.prototype.constructor = MemoryStream

MemoryStream.prototype._write = function(chunk, enc, cb) {
  var bf = Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk)
  memStore[this.key] = Buffer.concat([memStore[this.key], bf])
  cb()
}

MemoryStream.prototype.getData = function(encoding) {
 return encoding ? memStore[this.key].toString(encoding) : memStore[this.key]
}

module.exports = MemoryStream