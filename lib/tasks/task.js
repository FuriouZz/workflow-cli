'use strict'

const when        = require('when')
const guid        = require('../utils/guid').guid
const Print       = require('../print')
const TaskManager = require('../task-manager')

const _handleError = function(value) {
  Print.error('Task execution aborted')
  fail( value )
}

class Task {

  constructor(name, options) {
    // Bind
    this.execute             = this.execute.bind(this)
    this.invoke              = this.invoke.bind(this)
    this.invokePrerequisites = this.invokePrerequisites.bind(this)
    this.complete            = this.complete.bind(this)
    this.fail                = this.fail.bind(this)

    // Properties
    this._name       = name
    this.namespace   = wk.currentNamespace
    this.path        = null
    this.guid        = guid()
    this.status      = Task.STATUS.PENDING
    this.promise     = this._generatePromise()
    this.argv        = wk.ARGV[this.path]
    this.value       = null

    // Set options
    this._setOptions(options, {
      preReqSequence: 'serie',
      visible: true,
      async: false,
      description: '',
      prerequisites: null,
      action: null,
      always_run: false,
      breakOnError: true
    })

    // Register to the namespace and global wk.Tasks
    this.link()

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

  updatePath() {
    this.path = this.getPath()
  }

  getPath() {
    const path = this.namespace.getPath()
    if (path.length === 0) return this._name
    return this.path = path + ':' + this._name
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

    if (!Task.STATUS.IS_PENDING(this.status)) {
      if (this.always_run) this.reenable()
      return this.promise
    }

    this.status = Task.STATUS.PROCESS

    this._execute()

    return this.promise

  }

  invoke() {

    if (!Task.STATUS.IS_PENDING(this.status)) {
      if (this.always_run) this.reenable()
      return this.promise
    }

    if (this.prerequisites && this.prerequisites.length > 0) {
      this.status = Task.STATUS.PENDING_PREREQ
      this.invokePrerequisites().done(this.execute)
    } else {
      this.execute()
    }

    return this.promise

  }

  canExecute() {
    return typeof this.action === 'function' && Task.STATUS.IS_PROCESSING(this.status)
  }

  _execute() {

    if (this.canExecute()) {
      Print.debug('Execute ' + Print.magenta(`[${this.path}]`))

      this.argv = wk.ARGV[this.path]

      let args  = []

      if ( typeof this.argv === 'object' && Array.isArray(this.argv._) ) {
        args = this.argv._
      } else {
        args.push( this.argv )
      }

      this.value = this.action.apply( this, args )
      if (!this.async) this.complete( this.value )

      return
    }

    if (this.status === Task.STATUS.PROCESS) this.complete()
  }

  invokePrerequisites() {
    if (this.preReqSequence === 'parallel') {
      return TaskManager.parallel(...this.prerequisites)
    }
    return TaskManager.serie(...this.prerequisites)
  }


  /**
   *
   * Fail task operation
   * @param {any} value
   * @param {Boolean} breakOnError
   *
   * @memberOf Task
   */
  fail( value, breakOnError ) {
    if (this.status !== Task.STATUS.PROCESS) return

    this.status = Task.STATUS.FAIL

    let err
    if (value) {
      if (value instanceof Error) err = value
      else if ( typeof value === 'string' ) err = new Error( value )
      else err = new Error( value.toString() )
    } else {
      err = new Error()
    }

    breakOnError = typeof breakOnError === 'boolean' ? breakOnError : this.breakOnError
    if (breakOnError) _handleError( err )

    this.reject( err )
    this.resolve = null
    this.reject  = null
  }



  /**
   *
   * Complete task operation
   * @param {any} value
   *
   * @memberOf Task
   */
  complete(value) {
    if (this.status !== Task.STATUS.PROCESS) return

    this.status = Task.STATUS.DONE
    this.value  = value

    this.resolve(value)
    this.resolve = null
    this.reject  = null
  }

  _setOptions(options, dflts) {

    for (const key in dflts) {
      if (options.hasOwnProperty(key)) {
        dflts[key] = options[key]
        if (key === 'action' && typeof dflts[key] === 'function') {
          dflts[key] = dflts[key].bind(this)
        }
      }
    }

    Object.assign( this, dflts )

  }

  link() {
    this.namespace.registerTask( this )
  }

  unlink() {
    this.namespace.unregisterTask( this )
  }

}

Task.STATUS = {
  PENDING: 'pending',
  PENDING_PREREQ: 'pending_prereq',
  PROCESS: 'process',
  FAIL: 'fail',
  DONE: 'done',

  IS_PENDING(value) {
    return value === this.PENDING || value === this.PENDING_PREREQ
  },

  IS_PROCESSING(value) {
    return value === this.PROCESS
  }
}

module.exports = Task