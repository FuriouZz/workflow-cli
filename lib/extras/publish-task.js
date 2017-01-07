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
    taskProcess('stage_clean', 'git status --porcelain --untracked-files=no', function(err, stdout) {
      if (stdout.length !== 0) return this.fail(`Stage is not clean`)

      this.complete()
    }, { async: true, visible: false, process: { printStdout: false } })



    /**
     * Generate the next version
     */
    task('next_version', { visible: false }, function() {
      const ARGV = wk.COMMAND_PARAMS.__

      const identifier = ARGV['identifier'] ? ARGV['identifier'] : null
      let release      = typeof ARGV['release'] === 'string' ? ARGV['release'] : 'patch'

      if (ARGV['prerelease'] || ARGV['pre']) release = 'prerelease'

      const nextVersion = semver.inc(getCurrentVersion(), release, identifier)
      Print.log(`Next version: "${nextVersion}"`)
      return nextVersion
    })



    /**
     * Ask a confirmation to the user
     */
    task('confirm_version', { async: true, visible: false }, function() {
      const nextVersion = wk.Tasks[ nm('next_version') ].value

      prompt(`Continue? `, ( answer ) => {
        if (answer[0] === 'y') {
          this.complete( nextVersion )
        } else {
          this.fail( 'Bump aborted' )
        }
      })
    })



    /**
     * Bump vesion
     *
     */
    desc(`Bump version. Parameters <release> <identifier?>`)
    task('bump', [
      nm('stage_clean'),
      nm('next_version'),
      nm('confirm_version'),
      nm('bump_version'),
      nm('commit')
    ])



    /**
     * Bump version
     */
    task('bump_version', { visible: false }, function() {
      const nextVersion = wk.Tasks[nm('next_version')].value

      if (!nextVersion) return this.fail('Invalid version :' + nextVersion)

      const pkg   = getPackage()
      pkg.version = nextVersion

      const pth = path.join('package.json')
      fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')
    })


    /**
     * Commit and tag the new version
     */
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

      wk.exec(cmds).catch(this.fail).then(() => {
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
    taskProcess('version_released', 'git ls-remote', function(err, stdout) {
      const version = getCurrentVersion()

      if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
        return this.fail(`Version v${version} already released!`)
      }

      // wk.ARGV[ nm('git_push') ] = { remote: remote, version: version }
      this.complete( version )
    }, { async: true, visible: false, process: { printStdout: false } })


    /**
     * Push the current tag version
     */
    task('git_push', { visible: false, async: true }, function() {
      const version = getPackage().version
      wk.exec(`git push ${remote} --tag v${version}`)
        .catch(this.fail)
        .then(this.complete)
    })


    desc(`Release current version (current: v${getCurrentVersion()})`)
    task('push', [ nm('version_released'), nm('git_push') ])

  }

}

module.exports = ExtraTask.new( PublishTask )