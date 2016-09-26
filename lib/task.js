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
    this.promise        = this._generatePromise()
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

    this._generatePromise()

    if (this.prerequisites && this.prerequisites.length) {

      for (let i = 0, len = this.prerequisites.length; i < len; i++) {
        wk.Tasks[this.prerequisites[i]].reenable()
      }

    }
  }

  _generatePromise() {

    const scope = this

    this.promise = when.promise(function(resolve, reject) {
      scope.status  = Task.STATUS.PENDING
      scope.resolve = resolve
      scope.reject  = reject
      scope.value   = undefined
    })

    return this.promise

  }

  execute() {

    if (!Task.STATUS.IS_PENDING(this.status)) return

    this.status = Task.STATUS.PROCESS

    Print.debug('Execute ' + Print.magenta(`[${this.path}]`))

    this._execute()

    return this.promise

  }

  invoke() {

    if (!Task.STATUS.IS_PENDING(this.status)) return

    this.status = Task.STATUS.PENDING_PREREQ

    if (this.prerequisites && this.prerequisites.length > 0) {
      this.invokePrerequisites().done(this.execute)
      return this.promise
    }

    return this.execute()

  }

  _execute() {
    const args  = this.argv && this.argv._ ? this.argv._: []

    this.value = this.action ? this.action( ...args ) : null
    if (!this.async) this.complete(this.value)
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
    this.value = value

    this.resolve(value)
    this.resolve = null

    return true
  }

}

Task.STATUS = {
  PENDING: 'pending',
  PENDING_PREREQ: 'pending_prereq',
  PROCESS: 'process',
  FAIL: 'fail',
  DONE: 'done',

  IS_PENDING(value) {
    if (value !== undefined) return value === this.PENDING || value === this.PENDING_PREREQ
    return this.PENDING
  }
}

module.exports = Task