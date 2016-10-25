'use strict'

const fs           = require('fs')
const MemoryStream = require('./utils/memory-stream')
const spawn        = require('child_process').spawn
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
      name: guid(),
      use_color: true,
      breakOnError: false,
      interactive: false,
      printStdout: true,
      printStderr: true
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

    // Thanks mde tip
    // https://github.com/jakejs/jake/blob/master/lib/utils/index.js#L187
    let cmd  = '/bin/sh'
    let args = [ '-c', this.cmd ]
    if (process.platform === 'win32') {
      cmd  = 'cmd'
      args = [ '/c', this.cmd ]
    }

    const ps = spawn(cmd, args, opts)
    ps.GUID = GUID
    this.ps = ps
    this._createFile()
    this.emit('start')
    this._addListeners()

    return ps

  }

  end( code ) {
    this.code = code
    this._deleteFile()

    // if (code !== 0) {
      // this.fail( 'Code ' + code )
    // }

    if (this.status === ProcessExec.STATUS.PROCESSING) {
      this.status = ProcessExec.STATUS.DONE

      this.resolve( this.code )
      this.resolve = null
      this.reject  = null

    }

    let stdout = null
    let stderr = null

    // Wait stream finished
    this.streamPromise.then(() => {
      stdout = this.stdoutStream.getData(this.opts.encoding)
      stderr = this.stderrStream.getData(this.opts.encoding)

      this.emit('end', code, stdout, stderr)
    })

    // this.stdoutStream.end()
    // this.stderrStream.end()
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

      this.stdoutStream = new MemoryStream(this.name+'_stdout')
      this.stderrStream = new MemoryStream(this.name+'_stderr')

      this.streamPromise = when.map([
        when.promise((resolve) => { this.stdoutStream.on('finish', resolve) }),
        when.promise((resolve) => { this.stderrStream.on('finish', resolve) })
      ])
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

    if (ps.stdout) {
      ps.stdout.pipe(this.stdoutStream)

      if (this.printStdout) {
        ps.stdout.on('data', (data) => {
          Print.log(data.toString('utf-8'))
        })
      }
    }

    if (ps.stderr) {
      ps.stderr.pipe(this.stderrStream)

      if (this.printStderr) {
        ps.stderr.on('data', (data) => {
          Print.error(data.toString('utf-8'))
        })
      }
    }
  }

  _configure() {
    this.opts.env = this.opts.env || {}
    this.opts.env = Object.assign(this.opts.env, process.env)

    if (this.use_color) {
      this.opts.env.FORCE_COLOR = true
    }

    if (this.interactive) {
      this.opts.stdio = 'inherit'
    }
  }

  _createFile() {
    const pth = path.join( pid_path, `${this.name}.pid` )
    const stream = fs.createWriteStream(pth)
    stream.write(this.cmd)
    stream.write('\n')
    stream.write(this.ps.pid.toString())
    stream.end()
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