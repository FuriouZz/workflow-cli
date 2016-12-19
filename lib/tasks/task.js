'use strict'

const when        = require('when')
const guid        = require('../utils/guid').guid
const Print       = require('../print')
const TaskManager = require('../task-manager')
const ARGParser   = require('../arg-parser')

const _handleError = function(value) {
  if (value) {
    Print.error(`Task execution aborted (${this.path})`)
    Print.error( value.stack )
  }
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
    this.path        = this.getPath()
    this.guid        = guid()
    this.status      = Task.STATUS.PENDING
    this.promise     = this._generatePromise()
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
      argv: { _: [ this.path ] }
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
   * @returns {String}
   */
  get fullname() {
    return this._name + '_' + this.guid
  }


  /**
   * Set the name of task
   * @param {String} value
   */
  set name(value) {
    this._name = value
  }


  /**
   * Get the shorten name of task
   * @returns {String}
   */
  get name() {
    return this._name + '_' + this.guid.slice(0, 4)
  }


  /**
   *
   * Update task path
   *
   * @memberOf Task
   */
  updatePath() {
    return this.getPath()
  }


  /**
   *
   * Update and returns task path
   * @returns {String}
   *
   * @memberOf Task
   */
  getPath() {
    const nsPath = this.namespace.getPath()
    this.path    = this._name
    if (nsPath.length !== 0) this.path = nsPath + ':' + this._name
    return this.path
  }


  /**
   *
   * Create a new promise for the task and its prerequisites
   *
   * @memberOf Task
   */
  reenable() {

    this._generatePromise()

    if (this.prerequisites && this.prerequisites.length) {

      for (let i = 0, len = this.prerequisites.length; i < len; i++) {
        wk.Tasks[this.prerequisites[i]].reenable()
      }

    }
  }


  /**
   *
   * Create a promise and reset task status
   * @returns
   *
   * @memberOf Task
   */
  _generatePromise() {

    const scope = this

    this.promise = when.promise(function(resolve, reject) {
      scope.status  = Task.STATUS.PENDING
      scope.resolve = resolve
      scope.reject  = reject
      scope.value   = undefined
    })

    this.promise.catch( _handleError.bind(this) )

    return this.promise

  }


  /**
   *
   * Execute the task without its prerequisites
   * @returns {Promise}
   *
   * @memberOf Task
   */
  execute() {

    if (!Task.STATUS.IS_PENDING(this.status)) {
      if (this.always_run) {
        this.reenable()
      } else {
        return this.promise
      }
    }

    this.status = Task.STATUS.PROCESS

    this._execute()

    return this.promise

  }


  /**
   *
   * Execute the task with its prerequisites
   * @returns {Promise}
   *
   * @memberOf Task
   */
  invoke() {

    if (!Task.STATUS.IS_PENDING(this.status)) {
      if (this.always_run) {
        this.reenable()
      } else {
        return this.promise
      }
    }

    if (this.prerequisites && this.prerequisites.length > 0) {
      this.status = Task.STATUS.PENDING_PREREQ
      this.invokePrerequisites()
          .then(this.execute)
          .catch(this.fail)
    } else {
      this.execute()
    }

    return this.promise

  }


  /**
   *
   * Detect if the task can executed
   * @returns {Boolean}
   *
   * @memberOf Task
   */
  canExecute() {
    return typeof this.action === 'function' && Task.STATUS.IS_PROCESSING(this.status)
  }


  /**
   *
   * Execute the task
   *
   * @memberOf Task
   */
  _execute() {

    if (this.canExecute()) {
      if (this._isHook) {
        Print.debug('Execute ' + Print.magenta(`[${this.path}]`) + Print.green(' (hook)'))
      } else {
        Print.debug('Execute ' + Print.magenta(`[${this.path}]`))
      }

      const args = this.argv._ || []
      this.value = this.action.apply( this, args.slice(1) )
      if (!this.async) this.complete( this.value )

      return
    }

    if (this.status === Task.STATUS.PROCESS) this.complete()
  }


  /**
   *
   * Invoke prerequisites
   * @returns {Promise}
   *
   * @memberOf Task
   */
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
   *
   * @memberOf Task
   */
  fail( value ) {
    if (this.status !== Task.STATUS.PROCESS) return

    this.status = Task.STATUS.FAIL

    let err
    if (value) {
      if (value instanceof Error) err = value
      else if ( typeof value === 'string' ) err = new Error( value )
      else err = new Error( value.toString() )
    } else {
      err = new Error
    }

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



  /**
   *
   * Merge options
   * @param {Object} options
   * @param {Object} dflts
   *
   * @memberOf Task
   */
  _setOptions(options, dflts) {

    for (const key in dflts) {
      if (options.hasOwnProperty(key)) {
        if (dflts[key] && typeof dflts[key] === 'object') {
          if (Array.isArray(dflts[key])) {
            dflts[key] = options[key].concat(dflts[key].slice(0))
          } else {
            dflts[key] = Object.assign(dflts[key], options[key])
          }
        } else if (key === 'action' && typeof dflts[key] === 'function') {
          dflts[key] = options[key].bind(this)
        } else {
          dflts[key] = options[key]
        }
      }
    }

    Object.assign( this, dflts )

  }


  /**
   *
   * Register the task to its namespace and be visible
   *
   * @memberOf Task
   */
  link() {
    this.namespace.registerTask( this )
  }


  /**
   *
   * Unregister the task to its namespace and be hidden
   *
   * @memberOf Task
   */
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