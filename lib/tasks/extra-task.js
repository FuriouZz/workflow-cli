'use strict'

function NOOP() {}

function ParseArguments() {

  const args = [...arguments]
  const ClassConstructor = args.shift()

  let name, prerequisites, options, action

  for (const i in args) {
    if (typeof args[i] === 'string')
      name = args[i]

    if (typeof args[i] === 'function')
      action  = args[i]

    if (Array.isArray(args[i]))
      prerequisites = args[i]

    if (!Array.isArray(args[i]) && typeof args[i] === 'object')
      options = args[i]
  }

  options = options || {}
  options.className = ClassConstructor.name

  return new ClassConstructor( name, prerequisites, options, action )

}


class ExtraTask {

  constructor( name, prerequisites, options, setupFn ) {
    this.getPath = this.getPath.bind(this)

    Object.assign(this, options || {})

    this.name          = name
    this.prerequisites = prerequisites || []
    this.namespace     = namespace(this.name, NOOP)

    this.identifier = this.className.toLowerCase()
    this.identifier = this.identifier.replace('task', '')

    if (typeof setupFn === 'function') {
      this.setupFn = setupFn.bind(this)
    }

  }

  getPath( name ) {
    if (name) {
      const path = this.namespace.path
      if (path.length === 0) return name
      return this.path = path + ':' + name
    }
    return this.namespace.getPath()
  }

  configure() {

    namespace(this.name, () => {
      if (this.setupFn) this.setupFn()
      this._configure()

      const ns     = this.getPath
      const prereq = Array.prototype.concat([], this.prerequisites)

      prereq.push( ns(this.identifier) )

      const description = wk.Tasks[ ns(this.identifier) ] ?
        wk.Tasks[ ns(this.identifier) ].description : null

      task('default', prereq, { description: description })

    })

  }

  _configure() {}

}

ExtraTask.new = function( ClassConstructor ) {

  return (function() {
    const args = [...arguments]
    args.unshift( ClassConstructor )

    const o = ParseArguments.apply(null, args)
    o.className = ClassConstructor.name
    return o
  }).bind(ClassConstructor)

}

module.exports = ExtraTask