'use strict'

module.exports = function() {

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

  return new ClassConstructor( name, prerequisites, options, action )

}