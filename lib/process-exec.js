'use strict'

const fs           = require('fs')
const spawn        = require('child_process').spawn
const exec         = require('child_process').exec
const guid         = require('./utils/guid').guid
const sanitize     = require('sanitize-filename')
const EventEmitter = require('events').EventEmitter
const pid_path     = require('./config/paths').pids_path
const path         = require('path')
const when         = require('when')
const Print        = require('./print')

const NOOP = function() {}

class ProcessExec extends EventEmitter {

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

    this.setOptions(opts || {})

    this._generatePromise()
  }

  get name() {
    return sanitize(this._name, { replacement: '_' })
  }

  set name(v) {
    this._name = v
  }

  setOptions(opts) {
    this._merge(opts, {
      _name: 'process_'+guid(),
      use_color: true,
      breakOnError: true,
      interactive: false,
      printStdout: true,
      printStderr: true,
      preferExec: false
    })

    opts = Object.assign({
      encoding: 'utf8'
    }, opts)

    this.opts = Object.assign(this.opts, opts)
  }

  execute() {
    if (this.status !== ProcessExec.STATUS.PENDING) return

    this.status = ProcessExec.STATUS.PROCESSING

    this._configure()

    const opts = this.opts
    const GUID = this.name

    let ps
    if (this.preferExec) {
      ps = exec(this.cmd, opts)
    } else {
      const res  = this.cmd.split(' ')
      const cmd  = res.shift()
      const args = res
      ps = spawn(cmd, args, opts)
    }

    ps.GUID = GUID
    this.ps = ps
    this._createFile()
    this.emit('start')
    this._addListeners()

    return ps

  }

  end( code ) {
    this.code = code

    if (code !== 0) {
      this.fail( 'Code ' + code )
    }

    if (this.status === ProcessExec.STATUS.PROCESSING) {
      this.status = ProcessExec.STATUS.DONE

      this.resolve( this.code )
      this.resolve = null
      this.reject  = null

    }

    let stdout = null, stderr = null
    if (this.ps.stdout) {
      stdout = Buffer.concat(this.ps.stdout._readableState.buffer)
      stdout = stdout.toString(this.opts.encoding)
    }
    if (this.ps.stderr) {
      stderr = Buffer.concat(this.ps.stderr._readableState.buffer)
      stderr = stderr.toString(this.opts.encoding)
    }

    this._deleteFile()
    this.emit('end', null, stdout, stderr)
  }

  fail( value ) {
    if (this.status !== ProcessExec.STATUS.PROCESSING) return

    this.status = ProcessExec.STATUS.FAIL

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
    // this.ps      = null

    this.emit('error', err)
  }

  kill() {
    if (this.ps) this.ps.kill()
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
      this.status  = ProcessExec.STATUS.PENDING
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
      this.end( code )
    })

    if (ps.stdout && this.printStdout) {
      ps.stdout.on('data', (data) => {
        Print.log(data.toString('utf-8'))
      })
    }

    if (ps.stderr && this.printStderr) {
      ps.stderr.on('data', (data) => {
        Print.log(data.toString('utf-8'))
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
    const pth = path.join( pid_path, `${this.name}.pid` )
    const stream = fs.createWriteStream(pth)
    stream.write(this.ps.pid.toString())
  }

  _deleteFile() {
    const pth = path.join( pid_path, `${this.name}.pid` )
    if (fs.existsSync(pth)) fs.unlinkSync(pth)
  }

}

ProcessExec.STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  FAIL: 'fail',
  DONE: 'done'
}

module.exports = ProcessExec