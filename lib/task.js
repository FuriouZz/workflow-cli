'use strict'

const when        = require('when')
const guid        = require('./utils/guid').guid
const Print       = require('./print')
const TaskManager = require('./task-manager')

class Task {

  constructor(name, action, options) {
    // Bind
    this.execute             = this.execute.bind(this)
    this.invoke              = this.invoke.bind(this)
    this.invokePrerequisites = this.invokePrerequisites.bind(this)

    // Defaults
    this._name          = name
    this.namespace      = wk.currentNamespace
    this.path           = this.getPath()
    this.guid           = guid()
    this.action         = action ? action.bind(this) : null
    this.description    = ''
    this.preReqSequence = 'serie'
    this.visible        = true
    this.value          = null
    this.status         = Task.STATUS.PENDING
    this.promise        = null
    this.argv           = wk.ARGV[this.path]

    // Override with options
    Object.assign(this, options || {})

    // Register task
    wk.Tasks[this.path] = this

    // Do a test on self dependencies for this task
    if(Array.isArray(this.prerequisites) && this.prerequisites.indexOf(this.name) !== -1) {
      throw new Error("Cannot use prereq " + this.name + " as a dependency of itself");
    }
  }

  /**
   * Get the full name of task
   * @returns {string}
   */
  get fullname() {
    return this._name + '_' + this.guid
  }

  /**
   * Set the name of task
   * @param {string} value
   */
  set name(value) {
    this._name = value
  }

  /**
   * Get the shorten name of task
   * @returns {string}
   */
  get name() {
    return this._name + '_' + this.guid.slice(0, 4)
  }

  getPath() {
    const path = this.namespace.getPath()
    if (path.length === 0) return this._name
    return path + ':' + this._name
  }

  reenable() {
    this.status  = Task.STATUS.PENDING
    this.value   = undefined
    this.promise = null
    this.resolve = null
    this.reject  = null

    if (this.prerequisites && this.prerequisites.length) {

      for (let i = 0, len = this.prerequisites.length; i < len; i++) {
        wk.Tasks[this.prerequisites[i]].reenable()
      }

    }
  }

  invoke() {
    if (this.prerequisites && this.prerequisites.length > 0) {
      const scope  = this
      return this.invokePrerequisites().then(function(value) {
        scope.execute()
        return value
      })
    }
    return this.execute()
  }

  execute() {
    if (!this.action) this.promise = when(this.value)
    if (this.promise) return this.promise

    Print.debug('Execute ' + Print.magenta(`[${this.path}]`))

    this.status = Task.STATUS.PROCESS

    const args  = this.argv && this.argv._ ? this.argv._: []
    const scope = this
    this.promise = when.promise(function(resolve, reject) {
      scope.resolve = resolve
      scope.reject  = reject

      scope.value = scope.action( ...args )
      if (!scope.async) scope.complete(scope.value)
    })

    return this.promise
  }

  invokePrerequisites() {
    if (this.preReqSequence === 'parallel') {
      return TaskManager.parallel(...this.prerequisites)
    }
    return TaskManager.serie(...this.prerequisites)
  }

  fail(value) {
    if (this.status !== Task.STATUS.PROCESS) return

    this.status = Task.STATUS.FAIL

    this.reject(value)
    this.reject = null

    return false
  }

  complete(value) {
    if (this.status !== Task.STATUS.PROCESS) return

    this.status = Task.STATUS.DONE

    this.resolve(value)
    this.resolve = null

    this.value = value

    return true
  }

}

Task.STATUS = {
  PENDING: 'pending',
  PROCESS: 'process',
  FAIL: 'fail',
  DONE: 'done'
}

module.exports = Task