'use strict'

const fs             = require('fs-extra')
const path           = require('path')
const exec           = require('child_process').exec
const FileList       = require('filelist').FileList
const pth            = require('../config/paths')
const Print          = require('../print').new()
const parseArguments = require('../utils/parse-arguments')
const when           = require('when')

Print.silent()
Print.visibility('log', true)

const NOOP = function() {}

class PackageTask {

  constructor( name, prerequisites, options, action ) {
    this.name = name

    this.options       = options || {}
    this.prerequisites = prerequisites

    this.namespace = namespace(this.name, NOOP)

    this.filelist = new FileList

    this.tmp_path = pth.pkg_path
    this.targets  = [ 'gzip', 'zip', 'bzip2' ]

    if (typeof action === 'function') {
      action = action.bind(this)
      action()
    }

    // Set configuration
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
    const p     = path.join( this.tmp_path, this.name )

    namespace(this.name, () => {

      task('default', [ nm('package') ])


      task('package', [
        nm('empty'),
        nm('copy'),
        nm('archive'),
        nm('clean')
      ], { preReqSequence: 'serie' })


      task('empty', { async: true }, function() {
        fs.emptyDir(p, (err) => {
          if (err) this.fail( err )
          else this.complete()
        })
      })


      task('copy', { async: true }, function() {
        scope.filelist.resolve()

        when.reduce(scope.filelist.toArray(), function( res, file ) {
          return when.promise(function( resolve ) {
            fs.copy( file, path.join( p, file ), resolve )
          })
        }, []).done(this.complete)

      })


      task('archive', { async: true }, function() {
        const targets = scope.targets.map(function( target ) {
          return nm(target)
        })

        serie(targets).catch(this.fail).done(this.complete)
      })


      task('bzip2', { async: true }, function() {
        exec(`tar -cjf ${p}.tar.bz2 ${p}`, (err, stdout, stderr) => {
          if (err) return this.fail( err )
          if (stderr) Print.error(stderr)
          if (stdout) Print.debug(stdout)

          this.complete()
        })
      })


      task('gzip', { async: true }, function() {
        exec(`tar -c ${p} | gzip -9 -> ${p}.tar.gz`, (err, stdout, stderr) => {
          if (err) return this.fail( err )
          if (stderr) Print.error(stderr)
          if (stdout) Print.debug(stdout)

          this.complete()
        })
      })


      task('zip', { async: true }, function() {
        exec(`zip ${p}.zip ${p}`, (err, stdout, stderr) => {
          if (err) return this.fail( err )
          if (stderr) Print.error(stderr)
          if (stdout) Print.debug(stdout)

          this.complete()
        })
      })


      task('clean', { async: true }, function() {
        fs.remove( p, (err) => {
          if (err) this.fail( err )
          else this.complete()
        })
      })

    })

  }

}

module.exports = function() {
  const args = [...arguments]
  args.unshift( PackageTask )
  return parseArguments.apply(null, args)
}