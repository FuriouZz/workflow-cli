'use strict'

const fs        = require('fs-extra')
const path      = require('path')
const exec      = require('child_process').exec
const FileList  = require('filelist').FileList
const pth       = require('../config/paths')
const Print     = require('../print').new()
const when      = require('when')
const ExtraTask = require('../tasks/extra-task')
const template  = require('../utils/template')


Print.silent()
Print.visibility('log', true)


const COMMANDS = {
  zip:   "zip ${path}.zip ${path}",
  gzip:  "tar -c ${path} | gzip -9 -> ${path}.tar.gz",
  bzip2: "tar -cjf ${path}.tar.bz2 ${path}",
}


class PackageTask extends ExtraTask {

  constructor( name, prerequisites, options, setupFn ) {
    super(name, prerequisites, options, setupFn)

    this.filelist    = new FileList
    this.tmp_path    = pth.pkg_path
    this.targets     = [ 'gzip' ]

    Object.assign(this, options || {})

    this.configure()
  }

  getPackagePath() {
    return path.join( this.tmp_path, this.name )
  }

  registerTarget( target, cmd ) {
    COMMANDS[target] = cmd
  }

  _configure() {

    const nm    = this.getPath.bind(this)
    const scope = this


    desc('Create a package. Targets: ' + this.targets.join(', '))
    task('package', [
      nm('clean'),
      nm('copy'),
      nm('archive'),
      nm('clean')
    ], { preReqSequence: 'serie', visible: false })


    task('clean', { async: true, visible: false, always_run: true }, function() {
      const p = scope.getPackagePath()

      fs.remove( p, (err) => {
        if (err) this.fail( err )
        else this.complete()
      })
    })


    task('copy', { async: true, visible: false }, function() {
      const p = scope.getPackagePath()

      scope.filelist.resolve()

      when.reduce(scope.filelist.toArray(), function( res, file ) {
        return when.promise(function( resolve ) {
          fs.copy( file, path.join( p, file ), resolve )
        })
      }, []).done(this.complete)

    })


    task('archive', { async: true, visible: false }, function() {
      const targets = scope.targets.map(function( target ) {
        if (!COMMANDS[target]) return null
        return {
          command: template( COMMANDS[target], { path: scope.name } ),
          options: {
            preferExec: true,
            cwd: scope.tmp_path
          }
        }
      }).filter(( cmd ) => { return !!cmd })

      wk.exec(targets).catch(this.fail).done(this.complete)

    })

  }

}

module.exports = ExtraTask.new( PackageTask )