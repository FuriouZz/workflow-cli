'use strict'

const fs           = require('fs')
const spawn        = require('child_process').spawn
const guid         = require('./utils/guid').guid
const sanitize     = require('sanitize-filename')
const EventEmitter = require('events').EventEmitter
const pid_path     = require('./config/paths').pids_path
const path         = require('path')
const when         = require('when')
const Print        = require('./print')

const NOOP = function() {}

class Process extends EventEmitter {

  constructor(cmd, opts) {
    super()
    this.execute = this.execute.bind(this)

    this.cmd        = cmd
    this.execObject = {}
    this.code       = null
    this.ps         = null
    this.opts       = {}

    this.on('start', NOOP)
    this.on('error', NOOP)
    this.on('end'  , NOOP)

    this.stdout = new Buffer('')
    this.stderr = new Buffer('')

    this.setOptions(opts || {})

    this._parse()
    this._generatePromise()
  }

  setOptions(opts) {
    this._merge(opts, {
      use_color: true,
      name: 'process_'+guid(),
      breakOnError: true,
      interactive: false,
      printStdout: false,
      printStderr: false,
      bufferStdout: false,
      bufferStderr: false
    })

    opts = Object.assign({
      encoding: 'utf8'
    }, opts)

    this.opts = Object.assign(this.opts, opts)
  }

  execute() {
    if (this.status !== Process.STATUS.PENDING) return

    this.status = Process.STATUS.PROCESSING

    this._configure()

    const cmd  = this.execObject.cmd
    const args = this.execObject.args
    const opts = this.opts
    const GUID = this.name

    const ps = spawn(cmd, args, opts)
    ps.GUID  = GUID
    this.ps  = ps
    this._createFile()
    this.emit('start', this)
    this._addListeners()

    return ps

  }

  complete( code ) {
    this.code = code

    if (code !== 0) {
      this.fail( 'Code ' + code )
      this.emit('end', new Error('Code ' + code), this.stdout, this.stderr, this.ps)
      return
    }

    if (this.status === Process.STATUS.PROCESSING) {
      this.status = Process.STATUS.DONE

      this.resolve( this.code )
      this.resolve = null
      this.reject  = null
      this.ps      = null

      this.emit('end', null, this.stdout, this.stderr, this.ps)
    }
  }

  fail( value ) {
    if (this.status !== Process.STATUS.PROCESSING) return

    this.status = Process.STATUS.FAIL

    let err
    if (value) {
      if (value instanceof Error) err = value
      else if ( typeof value === 'string' ) err = new Error( value )
      else err = new Error( value.toString() )
    } else {
      err = new Error()
    }

    if (this.breakOnError) fail( err )

    this.reject( err )
    this.resolve = null
    this.reject  = null
    this.ps      = null

    this.emit('error', this)
  }

  kill() {
    if (this.ps) this.ps.kill()
  }

  _parse() {

    const res            = this.cmd.split(' ')
    this.execObject.cmd  = res.shift()
    this.execObject.args = res
    this.name = sanitize(this.name, { replacement: '_' })

  }

  _merge(opts, dfts) {
    const merge = {}

    for (const key in dfts) {
      if (opts.hasOwnProperty(key)) {
        merge[key] = opts[key]
        delete opts[key]
      } else {
        merge[key] = dfts[key]
      }
    }

    Object.assign( this, merge )
  }

  _generatePromise() {
    this.promise = when.promise((resolve, reject) => {
      this.status  = Process.STATUS.PENDING
      this.resolve = resolve
      this.reject  = reject
    })
  }

  _addListeners() {
    const ps = this.ps

    ps.on('error', (data) => {
      this.fail( data )
    })

    ps.on('exit', (code) => {
      this.complete( code )
    })

    if (ps.stdout && (this.printStdout || this.bufferStdout)) {
      ps.stdout.on('data', (data) => {
        if (this.printStdout)  Print.log(data.toString('utf-8'))
        if (this.bufferStdout) this.stdout = Buffer.concat([this.stdout, data])
      })
    }

    if (ps.stderr && (this.printStderr || this.bufferStderr)) {
      ps.stderr.on('data', (data) => {
        if (this.printStderr)  Print.log(data.toString('utf-8'))
        if (this.bufferStderr) this.stderr = Buffer.concat([this.stderr, data])
      })
    }
  }

  _configure() {
    if (this.use_color) {
      this.opts.env = Object.assign({ FORCE_COLOR: true }, process.env)
    }

    if (this.interactive) {
      this.opts.stdio = 'inherit'
    }
  }

  _createFile() {
    const pth = path.join( pid_path, `${this.name}.pd` )
    const stream = fs.createWriteStream(pth)
    stream.write(this.ps.pid.toString())
  }

  _deleteFile() {
    const pth = path.join( pid_path, `${this.name}.pd` )
    if (fs.existsSync(pth)) fs.unlinkSync(pth)
  }

}

Process.STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  FAIL: 'fail',
  DONE: 'done'
}

module.exports = Process