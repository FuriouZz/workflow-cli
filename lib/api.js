'use strict'

/**
 * API implementation from jake.js
 * https://github.com/jakejs/jake/blob/master/lib/api.js
 */

const Task           = require('./tasks/task')
const Namespace      = require('./namespace')
const ProcessManager = require('./process-manager')
const TaskManager    = require('./task-manager')

module.exports = {

  /**
   * Register a new task inside the active namespace
   * If the action is a string, it will be executed as a command
   *
   * @param {String} name
   * @param {Array} prerequisites
   * @param {Object} options
   * @param {Function} action
   * @returns {Task} tsk
   */
  task() {

    let name, prerequisites, options, action

    for (const i in arguments) {
      if (typeof arguments[i] === 'string')
        name = arguments[i]

      if (typeof arguments[i] === 'function')
        action  = arguments[i]

      if (Array.isArray(arguments[i]))
        prerequisites = arguments[i]

      if (!Array.isArray(arguments[i]) && typeof arguments[i] === 'object')
        options = arguments[i]
    }

    options = options || {}
    options.description   = options.description || wk.currentDescription
    options.prerequisites = options.prerequisites || prerequisites
    options.action        = options.action || action

    // Create task
    const tsk = new Task(name, options)

    wk.currentDescription = null

    return tsk

  },


  /**
   * Register a command as a task
   *
   * @param {String} name
   * @param {String} cmd
   * @param {Array} prerequisites
   * @param {Object} options
   * @param {Function} callback
   * @returns {Task} tsk
   */
  command() {

    let cmd, prerequisites, options, callback
    const name = arguments[0]

    for (const i in arguments) {
      if (typeof arguments[i] === 'string' && arguments[i] !== name)
        cmd = arguments[i]

      if (Array.isArray(arguments[i]))
        prerequisites = arguments[i]

      if (!Array.isArray(arguments[i]) && typeof arguments[i] === 'object')
        options = arguments[i]

      if (typeof arguments[i] === 'function')
        callback = arguments[i]
    }

    if (!cmd) {
      fail('No command found')
    }

    options = options || {}
    const processOptions = options.process || {}



    const action = function() {

      // Replace variables
      if (this.argv) {
        for (const key in this.argv) {
          const reg   = new RegExp("\\$\\{"+key+"\\}", 'g')
          if (cmd.match( reg )) {
            cmd = cmd.replace( reg, this.argv[key] )
          }
        }
      }

      const psExec = wk.createExec(cmd, processOptions)
      psExec.name  = this.name

      psExec.on('end', () => {
        if (callback) {
          callback = callback.bind(this)
          callback()
        } else if (options.async) {
          this.complete()
        }
      })

      psExec.execute()

    }

    return task(name, prerequisites, options, action)
  },


  /**
   * Set the current description for the next task initialization
   *
   * @param {String} desc
   */
  desc(desc) {
    wk.currentDescription = desc
  },


  /**
   * Get or create a namespace
   *
   * @param {String} name
   * @param {Function} closure
   */
  namespace(name, closure) {
    const current = wk.currentNamespace
    let ns        = current.children[name]
    if (!ns) ns   = new Namespace(name, current)
    current.children[name] = ns
    wk.currentNamespace = ns
    closure()

    // If the namespace as a default task
    // the path to the namespace will execute the default task
    if (ns.tasks.default) {
      const tsk = ns.tasks.default
      tsk.unlink()
      tsk.namespace    = ns.parent
      tsk._name        = ns.name
      tsk.description  = tsk.description || null
      tsk.link()
    }

    wk.currentNamespace   = current
    wk.currentDescription = null

    return ns
  },


  /**
   * Run tasks in serie
   *
   * @param {...String} arguments
   * @returns {Promise}
   */
  serie() {
    return TaskManager.serie(...arguments)
  },


  /**
   * Run tasks in parallel
   *
   * @param {...String} arguments
   * @returns {Promise}
   */
  parallel() {
    return TaskManager.parallel(...arguments)
  },


  // Plain jake fail code
  fail(err) {
    var msg
      , errObj;
    if (err) {
      if (typeof err == 'string') {
        // Use the initial or only line of the error as the error-message
        // If there was a multi-line error, use the rest as the stack
        msg = err.split('\n');
        errObj = new Error(msg.shift());
        if (msg.length) {
          errObj.stack = msg.join('\n');
        }
        throw errObj;
      }
      else if (err instanceof Error) {
        throw err;
      }
      else {
        throw new Error(err.toString());
      }
    }
    else {
      throw new Error();
    }
  }

}