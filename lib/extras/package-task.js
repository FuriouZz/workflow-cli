'use strict'

const fs    = require('fs')
const ncp   = require('ncp')
const pth   = require('../config/path')
const Print = require('../print').new

const NOOP = function() {}

class PackageTask {

  constructor( name, prerequisites, options, action ) {
    this.name = name

    this.options       = options || {}
    this.prerequisites = prerequisites

    this.namespace = namespace(this.name, NOOP)

    this.tmp_path = pth.tmp_path

    // Set configuration
    action.bind(this)
    action()

    this.configure()
  }

  generatePath(name) {
    const path = this.namespace.path
    if (path.length === 0) return name
    return this.path = path + ':' + name
  }

  configure() {

    const nm    = this.generatePath.bind(this)
    const scope = this

    namespace(this.name, () => {

      task('default', [ nm('package') ])


      task('package')


      task('tmp_folder', { async: true }, function() {
        fs.mkdir( scope.tmp_path, this.complete )
      })


      task('copy', { async: true }, function() {
        ncp( scope.src_path, scope.tmp_path, ( err ) => {
          if (err) {
            Print.error(err)
            return this.fail( err )
          }

          this.complete()
        })
      })


      task('gzip', { async: true }, function() {
        fs.readdirSync( scope.tmp_path ).forEach(( file ) => {

        })
      })

    })

  }

}

module.exports = function() {

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

  return new PackageTask(name, prerequisites, options, action)

}