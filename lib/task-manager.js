'use strict';

const when  = require('when')
const Print = require('./print')

class TaskManager {

  constructor() {
    this.run = this.run.bind(this)
  }

  run(nameOrTask) {
    if (!nameOrTask) return

    let tsk = nameOrTask

    if (typeof tsk === 'string') {
      tsk = wk.currentNamespace.resolveTask(nameOrTask)
    }

    if (!tsk) {
      return when.promise(function(resolve, reject) {
        const err = new Error(Print.red(`Cannot run '${nameOrTask}' task`))
        reject(err)
      })
    }

    // Execute hooks and the task
    const hooks = this._resolveHooks( tsk )
    if (hooks) {
      return when.reduce(hooks, function( res, t ) {
        return t.invoke()
      }, [])
    }

    // Execute the task only
    return tsk.invoke()

  }

  serie() {

    const tasks = this._resolve(arguments)

    if (tasks.length === 0) {
      Print.error('No task found')
      return when(false)
    }

    this._verbose(tasks, 'serie')

    return when.reduce(tasks, (function(results, tsk) {
      return this.run(tsk)
    }).bind(this), [])

  }

  parallel() {
    const tasks = this._resolve(arguments)

    if (tasks.length === 0) {
      Print.error('No task found')
      return when(false)
    }

    this._verbose(tasks, 'parallel')

    return when.map(tasks, (function(tsk) {
      return this.run(tsk)
    }).bind(this))

  }

  _resolve(names) {

    if (names.length === 1 && Array.isArray(names[0])) {
      names = names[0]
    }

    const tasks = []

    for (let i = 0, res = null, len = names.length; i < len; i++) {
      res = wk.defaultNamespace.resolveTask(names[i])
      if (res) tasks.push( res )
    }

    return tasks

  }

  _resolveHooks( tsk ) {

    if (!tsk.hooks) return null

    let hooks = []
    let hook  = null

    const resolveHooks = function(hks) {
      let arr = []

      if (Array.isArray(hks)) {
        arr = hks.map((hk) => {
          hook = wk.defaultNamespace.resolveTask(hk)
          if (hook) hook._isHook = true
          return hook
        }).filter((t) => {
          return !!t
        })
      } else {
        hook = wk.defaultNamespace.resolveTask(hks)
        if (!!hook) {
          hook._isHook = true
          arr.push( hook )
        }
      }

      return arr
    }

    // Pre-task
    if (tsk.hooks.pre) hooks = hooks.concat(resolveHooks(tsk.hooks.pre))

    // Task
    hooks.push( tsk )

    // Post-task
    if (tsk.hooks.post) hooks = hooks.concat(resolveHooks(tsk.hooks.post))

    return hooks.length > 1 ? hooks : null

  }

  _visible(paths) {
    if (!Array.isArray(paths)) return []

    let tsk = null
    return paths.filter(function(path) {
      tsk = wk.defaultNamespace.resolveTask(path)
      if (!tsk) {
        Print.warn(`Task [${path}] does not exist`)
        return false
      }

      if (!tsk.visible) {
        Print.warn(`[${tsk.path}] can't be executed by the user.`)
      }

      return tsk.visible
    })
  }

  _verbose(tasks, sequence) {

    const names = tasks.map(function(tsk) {
      return Print.magenta(`[${tsk.path}]`)
    })

    Print.debug('Execute tasks' + ` ${names.join(' ')} ` + Print.green(`(${sequence})`) )

  }

}

module.exports = new TaskManager