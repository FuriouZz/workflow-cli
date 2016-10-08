'use strict'

const fs             = require('fs')
const path           = require('path')
const exec           = require('child_process').exec
const semver         = require('semver')
const Print          = require('../print').new()
const prompt         = require('../utils/prompt')
const parseArguments = require('../utils/parse-arguments')

Print.silent()
Print.visibility('log', true)

const NOOP = function() {}

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
class PublishTask {

  constructor( name, prerequisites, options, action ) {
    this.name = name

    this.options       = options || {}
    this.prerequisites = prerequisites

    this.currentBranch = 'develop'
    this.remote        = 'origin'

    this.namespace = namespace(this.name, NOOP)

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

    const remote = this.remote
    const nm     = this.generatePath.bind(this)

    namespace(this.name, () => {

      desc('Deploy a new version. Parameters <release> <identifier>')
      task('default', [ nm('deploy') ])

      task('deploy', { visible: false }, [
        nm('bump'),
        nm('push')
      ])

      task('predeploy', { visible: false }, function() {
        if (!wk.ARGV[ nm('next_version') ]) {
          wk.ARGV[ nm('next_version') ] = wk.ARGV[ this.namespace.path ]
        }
      })


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
      task('prebump', [ nm('stage_clean'), nm('next_version'), nm('confirm_version') ], { visible: false }, function() {
        if (!wk.ARGV[ nm('next_version') ]) {
          wk.ARGV[ nm('next_version') ] = wk.ARGV[ nm('bump') ]
        }
      })


      desc(`Bump version. Parameters <release> <identifier>`)
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

    })

  }

}

module.exports = function() {
  const args = [...arguments]
  args.unshift( PublishTask )
  return parseArguments.apply(null, args)
}