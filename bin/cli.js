#!/usr/bin/env node

const wk        = require('./../lib/workflow.js')

const ARGParser  = require('./../lib/arg-parser')
const ARGConfig = require('./../lib/config/parameters')

ARGParser._createHelp( ARGConfig )
const ARGV = ARGParser.getContextAndCommandARGV( process.argv.slice(2), ARGConfig )

wk.CONTEXT_ARGV   = ARGV.context
wk.CONTEXT_PARAMS = ARGParser.parse(wk.CONTEXT_ARGV, ARGConfig)

wk.COMMAND_ARGV   = ARGV.command
wk.COMMAND_PARAMS = ARGParser.parse(wk.COMMAND_ARGV)

// Load Wkfile
wk.load(wk.CONTEXT_PARAMS.file)

// Prepare command execution
const Print          = require('./../lib/print')
const ProcessManager = require('./../lib/process-manager')


const listTasks = function() {
  const pad = require('./../lib/utils/string').pad

  let tasks = []

  const getTasks = function(ns) {

    const tsks = []

    for (const key in ns.tasks) {
      if (ns.tasks[key].visible)
        tsks.push( ns.tasks[key] )
    }

    if (tsks.length > 0) {
      if (ns.path.length === 0) tasks.push(`[default]`)
      else tasks.push( `\n[${ns.path}]` )
      tasks = tasks.concat(tsks)
    }

    for (const k in ns.children) {
      getTasks(ns.children[k])
    }
  }

  getTasks(wk.defaultNamespace)

  let length = 0
  for (const i in tasks) {
    if (typeof tasks[i] === 'string') continue
    if (length < tasks[i].path.length) length = tasks[i].path.length
  }

  tasks = tasks.map(function(tsk) {
    if (typeof tsk === 'string') return tsk
    if (!tsk.description) return 'wk ' + `${Print.green(tsk.path)}`

    const path = pad(tsk.path, length + 5, ' ', true)
    return 'wk ' + Print.green(path) + ' ' + Print.grey('# ' + tsk.description)
  })

  console.log(tasks.join('\n'))

}


const createCommands = function() {
  const commandTask = require('../lib/extras/command-task')

  commandTask('run', function() {

    this.config['parallel'] = {
      type: 'boolean',
      default: false,
      aliases: [ 'p' ],
      description: 'Execute tasks in "parallel"'
    }

    wk.ARGParser._createHelp( this.config )

    const config = this.config

    task('command', { visible: false, async: true }, function() {
      const tasks = Array.from(arguments)

      if (this.argv.help || !tasks) {
        console.log( config.help.description )
        return this.complete()
      }

      if (this.argv.parallel) {
        parallel(tasks).catch(this.fail).then(this.complete)
      } else {
        serie(tasks).catch(this.fail).then(this.complete)
      }
    })

  })
}

/**
 * Execute command
 */

// --help -h
if (wk.CONTEXT_PARAMS.help) {
  const pkg = require('./../package.json')
  console.log( `${pkg.name} v${pkg.version} \n`)
  console.log( wk.CONTEXT_PARAMS.__config.help.description )
  return
}

// -T --tasks
if (wk.CONTEXT_PARAMS.tasks) {
  return listTasks()
}

// --clean --kill
if (wk.CONTEXT_PARAMS.clean) {
  return ProcessManager.clean()
}

// --silent
if (wk.CONTEXT_PARAMS.silent) {
  Print.silent()
}

// --verbose
else if (wk.CONTEXT_PARAMS.verbose) {
  Print.verbose()
}

// --log=<levels>
else {
  Print.silent()
  const levels = wk.CONTEXT_PARAMS.log.split(/,/)
  if (levels.length) {
    for (const level in levels) {
      Print.visibility(levels[level], true)
    }
  }
}

// Execute a command
if (wk.COMMAND_ARGV.length > 0) {
  const tsk = wk.COMMAND_ARGV[0]

  if (tsk === 'run') createCommands()

  if (wk.Tasks[tsk]) {
    wk.Tasks[tsk].argv = Object.assign(wk.Tasks[tsk].argv, wk.COMMAND_PARAMS.__)
    return wk.run(tsk)
  }
}

// By default list tasks
listTasks()