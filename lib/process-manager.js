'use strict'

const when        = require('when')
const ProcessExec = require('./process-exec')

class ProcessManager {

  constructor() {
    this._onBeforeExit = this._onBeforeExit.bind(this)
    this.execute       = this.execute.bind(this)
    this.serie         = this.serie.bind(this)
    this.parallel      = this.parallel.bind(this)

    this.processes = {}

    this.activate()
  }

  activate() {
    process.on('beforeExit', this._onBeforeExit)
  }

  desactivate() {
    process.removeListener('beforeExit', this._onBeforeExit)
  }

  execute( strOrArr, opts ) {

    opts = opts || {}

    if (Array.isArray(strOrArr)) {
      const arr = strOrArr
      if (arr.length === 1) {
        return this.run( this._resolve(arr)[0] )
      }

      if (opts.sequence === 'parallel') {
        return this.parallel.apply(this, arr)
      }
      return this.serie.apply(this, arr)
    }

    if (typeof strOrArr === 'object' && !Array.isArray(strOrArr)) {
      const ps = this._resolve([strOrArr])[0]
      this.run( ps )
      return ps
    } else if (typeof strOrArr === 'string') {
      const ps = this._resolve([{ command: strOrArr, options: opts }])[0]
      this.run( ps )
      return ps
    }

  }

  create(cmd, opts) {
    return new ProcessExec(cmd, opts)
  }

  serie() {
    const processes = this._resolve(arguments)

    return when.reduce(processes, (res, ps) => {
      return this.run(ps)
    }, [])
  }

  parallel() {
    const processes = this._resolve(arguments)

    return when.map(processes, (ps) => {
      return this.run(ps)
    })
  }

  run(ps) {
    this.processes[ps.name] = ps

    ps.on('end', () => {
      delete this.processes[ps.name]
    })

    ps.execute()

    return ps.promise
  }

  _onBeforeExit() {
    for (var k in this.processes) {
      this.processes[k].kill()
    }
  }

  _resolve(cmds) {

    if (cmds.length === 1 && Array.isArray(cmds[0])) {
      cmds = cmds[0]
    }

    const processes = []

    let cmd, ps
    for (let i = 0, len = cmds.length; i < len; i++) {

      cmd = cmds[i]

      if (Array.isArray(cmd)) {
        ps = new ProcessExec(cmd[0], cmd[1])
      } else if (typeof cmd === 'object' && !Array.isArray(cmd)) {
        ps = new ProcessExec(cmd.command, cmd.options)
      } else if (typeof cmd === 'string') {
        ps = new ProcessExec(cmd)
      }

      if (ps) processes.push( ps )

      ps = null
    }

    return processes
  }

}

module.exports = new ProcessManager