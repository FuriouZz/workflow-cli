'use strict'

const fs        = require('fs-extra')
const path      = require('path')
const exec      = require('child_process').exec
const FileList  = require('filelist').FileList
const pth       = require('../config/paths')
const Print     = require('../print').new()
const when      = require('when')
const ExtraTask = require('../tasks/extra-task')


Print.silent()
Print.visibility('log', true)


class PackageTask extends ExtraTask {

  constructor( name, prerequisites, options, setupFn ) {
    super(name, prerequisites, options, setupFn)

    this.filelist    = new FileList
    this.tmp_path    = pth.pkg_path
    this.targets     = [ 'gzip' ]
    this.packagePath = path.join( this.tmp_path, this.name )

    Object.assign(this, options || {})

    this.configure()
  }

  _configure() {

    const nm    = this.getPath.bind(this)
    const scope = this


    desc('Create a package. Targets: ' + this.targets.join(', '))
    task('package', [
      nm('empty'),
      nm('copy'),
      nm('archive'),
      nm('clean')
    ], { preReqSequence: 'serie', visible: false })


    task('empty', { async: true, visible: false }, function() {
      const p = scope.packagePath

      fs.emptyDir(p, (err) => {
        if (err) this.fail( err )
        else this.complete()
      })
    })


    task('copy', { async: true, visible: false }, function() {
      const p = scope.packagePath

      scope.filelist.resolve()

      when.reduce(scope.filelist.toArray(), function( res, file ) {
        return when.promise(function( resolve ) {
          fs.copy( file, path.join( p, file ), resolve )
        })
      }, []).done(this.complete)

    })


    task('archive', { async: true, visible: false }, function() {
      const targets = scope.targets.map(function( target ) {
        return nm(target)
      })

      serie(targets).catch(this.fail).done(this.complete)
    })


    task('bzip2', { async: true, visible: false }, function() {
      const p = scope.packagePath

      exec(`tar -cjf ${p}.tar.bz2 ${p}`, (err, stdout, stderr) => {
        if (err) return this.fail( err )
        if (stderr) Print.error(stderr)
        if (stdout) Print.debug(stdout)

        this.complete()
      })
    })


    task('gzip', { async: true, visible: false }, function() {
      const p = scope.packagePath

      exec(`tar -c ${p} | gzip -9 -> ${p}.tar.gz`, (err, stdout, stderr) => {
        if (err) return this.fail( err )
        if (stderr) Print.error(stderr)
        if (stdout) Print.debug(stdout)

        this.complete()
      })
    })


    task('zip', { async: true, visible: false }, function() {
      const p = scope.packagePath

      exec(`zip ${p}.zip ${p}`, (err, stdout, stderr) => {
        if (err) return this.fail( err )
        if (stderr) Print.error(stderr)
        if (stdout) Print.debug(stdout)

        this.complete()
      })
    })


    task('clean', { async: true, visible: false }, function() {
      const p = scope.packagePath

      fs.remove( p, (err) => {
        if (err) this.fail( err )
        else this.complete()
      })
    })

  }

}

module.exports = ExtraTask.new( PackageTask )