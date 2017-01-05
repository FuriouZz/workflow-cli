'use strict'

/**
 * Namespace implementation from jake.js
 * https://github.com/jakejs/jake/blob/master/lib/namespace.js
 */

class Namespace {

  /**
   * Creates an instance of Namespace.
   *
   * @param {String} name
   * @param {Namespace} parent
   *
   * @memberOf Namespace
   */
  constructor(name, parent) {
    this.name     = name
    this.parent   = parent
    this.children = {}
    this.tasks    = {}
    this.path     = this.getPath()
  }

  /**
   * Return the task from path
   *
   * @param {String} path
   * @returns
   *
   * @memberOf Namespace
   */
  resolveTask(path) {
    const parts = path.split(':')
    const name  = parts.pop()
    const ns    = this.resolveNamespace(parts.join(':'))

    return (ns && ns.tasks[name]) || (this.parent && this.parent.resolve(path))
  }

  /**
   * Return the namespace from path
   *
   * @param {String} path
   * @returns {Namespace}
   *
   * @memberOf Namespace
   */
  resolveNamespace(path) {
    if (!path) {
      return this
    }

    const parts = path.split(':')
    let ns      = this

    for (let i = 0, len = parts.length; ns && i < len; i++) {
      ns = ns.children[parts[i]]
    }

    return ns || (this.parent && this.parent.resolveNamespace(path))
  }

  /**
   * Get current namespace path
   *
   * @returns {String}
   *
   * @memberOf Namespace
   */
  getPath( name ) {
    const path  = [ this.name ]
    let next    = true
    let current = this

    while(next) {
      if (current.parent) {
        path.push(current.parent.name)
        current = current.parent
        continue
      }
      next = false
    }

    // Remove default namespace from path
    path.pop()

    const pth = path.reverse().join(':')

    if (name) {
      if (pth.length === 0) return name
      return pth + ':' + name
    }

    return pth
  }

  /**
   * Register a task to the namespace
   *
   * @param {Task} tsk
   *
   * @memberOf Namespace
   */
  registerTask( tsk ) {
    tsk.updatePath()
    this.tasks[tsk._name] = tsk
    wk.Tasks[tsk.path]    = tsk
  }

  /**
   * Unregister a task to the namespace
   *
   * @param {Task} tsk
   *
   * @memberOf Namespace
   */
  unregisterTask( tsk ) {
    if (this.tasks[tsk._name] === tsk ) {
      delete this.tasks[tsk._name]
      delete wk.Tasks[tsk.path]
    }
  }

}

module.exports = Namespace