'use strict'

const fs        = require('fs')
const path      = require('path')
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


  /**
   * Get the current package version
   *
   * @returns
   *
   * @memberOf PublishTask
   */
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


    /**
     * Check if the git stage is clean
     */
    command('stage_clean', 'git status --porcelain --untracked-files=no', function(err, stdout) {
      if (stdout.length !== 0) return this.fail(`Stage is not clean`)

      this.complete()
    }, { async: true, visible: false, process: { printStdout: false } })


    /**
     * Set parameters to next_version task
     */
    task('prenext_version', { visible: false }, function() {
      if (!wk.ARGV[ nm('next_version') ]) {
        wk.ARGV[ nm('next_version') ] = wk.ARGV[ this.namespace.path ] || wk.ARGV[ nm('bump') ]
      }
    })


    /**
     * Generate the next version
     */
    task('next_version', { visible: false }, function( release, identifier ) {
      const nextVersion = semver.inc(getCurrentVersion(), release || "patch", identifier)
      Print.log(`Next version: "${nextVersion}"`)
      return nextVersion
    })


    /**
     * Ask a confirmation to the user
     */
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


    /**
     * Prebump
     *
     * Before each bump :
     *  - Git stage must be clean
     *  - Generate the target version
     *  - User confirmation
     *
     */
    task('prebump', [
      nm('stage_clean'),
      nm('next_version'),
      nm('confirm_version')
    ], { visible: false }, function() {
      if (!wk.ARGV[ nm('next_version') ]) {
        wk.ARGV[ nm('next_version') ] = wk.ARGV[ nm('bump') ]
      }
    })


    /**
     * Bump version
     */
    desc(`Bump version. Parameters <release> <identifier?>`)
    task('bump', { visible: true }, function() {
      const nextVersion = wk.Tasks[nm('next_version')].value

      if (!nextVersion) return this.fail('Invalid version :' + nextVersion)

      const pkg   = getPackage()
      pkg.version = nextVersion

      const pth = path.join('package.json')
      fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')
    })


    /**
     * Postbump
     *
     * After each bump :
     *  - Commit and tag the new version
     */
    task('postbump', [ nm('commit') ], { visible: false })

    /**
     * Commit and tag the new version
     */
    task('commit', { async: true, visible: false }, function() {
      const version = wk.Tasks[nm('next_version')].value

      const cmds = [
        {
          command: `git commit -a -m "Bump ${version}"`,
          options: { preferExec: true }
        },
        {
          command: `git tag -a v${version} -m "Release ${version}"`,
          options: { preferExec: true }
        }
      ]

      const opts = {}
      if (process.platform == 'win32') {
        opts.windowsVerbatimArguments = true
      }

      wk.exec(cmds).catch(this.fail).done(() => {
        Print.log(`Version ${version} bumped !`)
        this.complete()
      })
    })


    /**
     * Prepush
     *
     * Before each push :
     *  - Detect if the current version is already released
     */
    command('prepush', 'git ls-remote', function(err, stdout) {
      const version = getCurrentVersion()

      if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
        return this.fail(`Version v${version} already released!`)
      }

      wk.ARGV[ nm('push') ] = { remote: remote, version: version }
      this.complete( version )
    }, { async: true, visible: false, process: { printStdout: false, preferExec: true } })


    /**
     * Push the current tag version
     */
    desc(`Release current version (current: v${getCurrentVersion()})`)
    command('push', 'git push ${remote} --tag v${version}', { process: { printStdout: false, preferExec: true } })

  }

}

module.exports = ExtraTask.new( PublishTask )