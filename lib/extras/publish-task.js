'use strict'

const fs        = require('fs')
const path      = require('path')
const exec      = require('child_process').exec
const semver    = require('semver')
const Print     = require('../print').new()
const prompt    = require('../utils/prompt')
const ExtraTask = require('../tasks/extra-task')


Print.silent()
Print.visibility('log', true)


function getPackage() {
  return JSON.parse(fs.readFileSync(path.resolve('package.json')))
}

function getCurrentVersion() {
  return getPackage().version
}

function execPromise(cmd, opts) {
  return new Promise(function(resolve) {
    exec(cmd, opts, function(err, stdout, stderr) {
      if (err) fail(err)
      if (stderr) Print.error(stderr)
      if (stdout) Print.debug(stdout)
      resolve()
    })
  })
}

function execCommands(array, cb) {
  const item = array.shift()

  if (!item) {
    cb()
    return
  }

  execPromise(item).then(function() {
    execCommands(array, cb)
  })
}

/**
 *
 *
 * @class PublishTask
 */
class PublishTask extends ExtraTask {

  constructor( name, prerequisites, options, setupFn ) {
    super(name, prerequisites, options, setupFn)

    this.currentBranch = 'develop'
    this.remote        = 'origin'

    Object.assign(this, options || {})

    // Set configuration
    this.configure()
  }

  getCurrentVersion() {
    return getCurrentVersion()
  }

  _configure() {

    const remote = this.remote
    const nm     = this.getPath.bind(this)


    desc('Deploy a new version. Parameters <release> <identifier?>')
    task('publish', { visible: false }, [
      nm('bump'),
      nm('push')
    ])


    desc('Check git stage is clean')
    task('stage_clean', { async: true, visible: false }, function() {
      exec('git status --porcelain --untracked-files=no', (err, stdout, stderr) => {
        if (err) return this.fail( err )
        if (stderr) Print.error(stderr)
        if (stdout) Print.debug(stdout)

        if (stdout.length !== 0) {
          return this.fail( new Error(`Stage is not clean`) )
        }

        this.complete()
      })
    })


    task('prenext_version', { visible: false }, function() {
      if (!wk.ARGV[ nm('next_version') ]) {
        wk.ARGV[ nm('next_version') ] = wk.ARGV[ this.namespace.path ] || wk.ARGV[ nm('bump') ]
      }
    })


    desc('Generate next version')
    task('next_version', function( release, identifier ) {
      const nextVersion = semver.inc(getCurrentVersion(), release || "patch", identifier)
      Print.log(`Next version: "${nextVersion}"`)
      return nextVersion
    })


    desc('Confirm the next version')
    task('confirm_version', { async: true, visible: false }, function() {
      const nextVersion = wk.Tasks[nm('next_version')].value

      prompt(`Continue? `, ( answer ) => {
        if (answer[0] === 'y') {
          this.complete( nextVersion )
        } else {
          this.fail( 'Aborted' )
        }
      })
    })


    desc('')
    task('prebump', [
      nm('stage_clean'),
      nm('next_version'),
      nm('confirm_version')
    ], { visible: false }, function() {
      if (!wk.ARGV[ nm('next_version') ]) {
        wk.ARGV[ nm('next_version') ] = wk.ARGV[ nm('bump') ]
      }
    })


    desc(`Bump version. Parameters <release> <identifier?>`)
    task('bump', { visible: true }, function() {
      const nextVersion = wk.Tasks[nm('next_version')].value

      if (!nextVersion) return this.fail('Invalid version :' + nextVersion)

      const pkg   = getPackage()
      pkg.version = nextVersion

      const pth = path.join('package.json')
      fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')
    })


    desc('commit bump')
    task('postbump', [ nm('commit') ], { visible: false })


    desc('Commit')
    task('commit', { async: true, visible: false }, function() {
      const version = wk.Tasks[nm('next_version')].value

      const cmds = [
        `git commit -a -m "Bump ${version}"`,
        `git tag -a v${version} -m "Release ${version}"`
      ]

      const opts = {}
      if (process.platform == 'win32') {
        opts.windowsVerbatimArguments = true
      }

      const scope = this

      execCommands(cmds, function() {
        Print.log(`Version ${version} bumped !`)
        scope.complete()
      })
    })


    desc(`Detect if the current version is released`)
    task('version_released', { async: true, visible: false }, function() {
      const version = getCurrentVersion()

      exec('git ls-remote', (err, stdout, stderr) => {
        if (err) return this.fail( err )
        if (stderr) Print.error(stderr)
        if (stdout) Print.debug(stdout)

        if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
          return this.fail(`Version v${version} already released!`)
        }

        this.complete( version )
      })
    })


    desc(`Release current version (current: v${getCurrentVersion()})`)
    task('push', [ nm('version_released') ], { async: true }, function() {
      const version = wk.Tasks[ nm('version_released') ].value

      if (!version) return this.fail(`Version invalid: ${version}`)

      exec(`git push ${remote} --tag v${version}`, (err, stdout, stderr) => {
        if (err) return this.fail( err )
        if (stderr) Print.error(stderr)
        if (stdout) Print.debug(stdout)
        this.complete()
      })
    })

  }

}

module.exports = ExtraTask.new( PublishTask )