'use strict'

const when = require('when')

class Task {

  constructor(name, action, options) {
    // Bind
    this.execute              = this.execute.bind(this)
    this.executeTask          = this.executeTask.bind(this)
    this.executePrerequisites = this.executePrerequisites.bind(this)

    // Defaults
    this._name          = name
    this.guid           = wk.guid()
    this.action         = action.bind(this)
    this.description    = ''
    this.preReqSequence = 'serie'
    Object.assign(this, options || {})

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

  execute() {
    let prms;
    if (this.prerequisites) {
      prms = this.executePrerequisites().then(this.executeTask)
    }
    prms = this.executeTask()

    return prms
  }

  executeTask() {
    wk.Print.verbose('Execute ' + wk.Print.cyan(`[${this.name}]`))
    return when.promise((function(resolve) {
      this.action( resolve )
      if (!this.async) resolve()
    }).bind(this)).then(function(value) {
      return value
    })
  }

  executePrerequisites() {
    let prereqs = this.prerequisites.map(function(name) {
      return wk.Print.cyan(`[${name}]`)
    })
    prereqs.push(wk.Print.green(`(${this.preReqSequence})`))
    prereqs = prereqs.join(' ')

    wk.Print.verbose(`Execute prerequisites ${prereqs}`)
    if (this.preReqSequence === 'parallel') {
      return wk.TaskManager.parallel(...this.prerequisites)
    }
    return wk.TaskManager.serie(...this.prerequisites)
  }

}

module.exports = Task