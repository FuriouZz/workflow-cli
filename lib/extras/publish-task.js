'use strict'

const fs     = require('fs')
const path   = require('path')
const exec   = require('child_process').exec
const Print  = require('../print')
const prompt = require('../utils/prompt')

const NOOP = function() {}

const versions = '[major].[minor].[patch]'.split('.').map(function(v) {
  return v.replace(/\[/, '').replace(/\]/, '')
})

function getPackage() {
  return JSON.parse(fs.readFileSync(path.resolve('package.json')))
}

function getCurrentVersion() {
  return getPackage().version
}

function getNextVersion(v) {

  const index = versions.indexOf(v)

  if (index === -1) return null

  const pkg  = getPackage()
  const arr  = pkg.version.split('.')

  if (arr.length !== versions.length) {
    return fail(`Version format are differents "[major].[minor].[patch]" != "${pkg.version}"`)
  }

  arr[index] = (parseInt(arr[index], 10) + 1).toString()

  if (index < arr.length-1) {
    for (let j = index+1; j < arr.length; j++) {
      arr[j] = 0
    }
  }

  return arr.join('.')

}

function execPromise(cmd, opts) {
  return new Promise(function(resolve) {
    exec(cmd, opts, function(err, stdout, stderr) {
      if (err) fail(err)
      if (stderr) fail(stderr)
      if (stdout) console.log(stdout)
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

    // Set configuration
    action.bind(this)
    action()

    this.configure()
  }

  generatePath(name) {
    const path = this.namespace.getPath()
    if (path.length === 0) return name
    return this.path = path + ':' + name
  }

  configure() {

    const currentBranch = this.currentBranch
    const remote        = this.remote
    const nm            = this.generatePath.bind(this)


    namespace(this.name, () => {

      task('default', [ nm('deploy') ])


      task('deploy', this.prerequisites, this.options)
      task('postdeploy', [ nm('bump'), nm('push') ])


      task('predeploy', function() {
        wk.ARGV[ nm('next_version') ] = wk.ARGV['deploy']
      })


      desc('Check git stage is clean')
      task('check_stage', { async: true }, function() {
        exec('git status --porcelain --untracked-files=no', (err, stdout, stderr) => {
          if (err) Print.error(err)
          if (stderr) Print.error(stderr)

          if (stdout.length !== 0) {
            return this.fail( new Error(`Stage is not clean`) )
          }

          this.complete()
        })
      })


      desc('Check the current branch')
      task('check_branch', { async: true }, function() {
        exec('git symbolic-ref --short HEAD', (err, stdout, stderr) => {
          if (err) Print.error(err)
          if (stderr) Print.error(stderr)

          if (stdout.trim() !== currentBranch) {
            return this.fail( new Error(`The current branch must be "${currentBranch}"`) )
          }

          this.complete()
        })
      })


      desc('Check the current version is released')
      task('version_released', { async: true }, function() {

        const version = getCurrentVersion()

        exec('git ls-remote', (err, stdout, stderr) => {
          if (err) Print.error(err)
          if (stderr) Print.error(stderr)

          if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
            return this.fail(`Version v${version} already released!`)
          }

          this.complete( version )
        })
      })


      desc('Checks')
      task('checks', [ nm('check_stage'), nm('check_branch') ])


      desc('Confirm the next version')
      task('confirm_version', { async: true }, function() {
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
      task('next_version', function() {

        const scope   = this
        const target  = wk.ARGV.target
        const version = getNextVersion(target)

        if (!target) {
          return scope.fail(`Invalid target. Required --target=[major|minor|patch]`)
        }

        exec('git ls-remote', function(err, stdout, stderr) {

          if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
            return scope.fail(`Version v${version} already released!`)
          }

          console.log(`Next version for ${target} bump:`, version)
          scope.complete( version )

        })

      })


      desc('')
      task('prebump', [ nm('checks') ], function() {
        wk.ARGV[ nm('next_version') ] = wk.ARGV[ nm('bump') ]
      })


      desc('')
      task('postbump', function() {
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
          console.log(`Version ${version} bumped !`)
          scope.complete( true )
        })
      })


      desc(`Bump version. Parameters -- [ <release> <identifier> ]`)
      task('bump', [ nm('next_version'), nm('confirm_version') ], function() {
        const nextVersion = wk.Tasks[nm('next_version')].value

        if (!nextVersion) return this.fail('Invalid version :' + nextVersion)

        const pkg   = getPackage()
        pkg.version = nextVersion

        const pth = path.join('package.json')
        fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')

        this.complete( nextVersion )
      })


      desc(`Release current version (current: v${getCurrentVersion()})`)
      task('push', [ nm('version_released') ], { async: true }, function() {
        const version = wk.Tasks[ nm('version_released') ].value

        if (!version) return this.fail(`Version invalid: ${version}`)

        exec(`git push ${remote} --tag v${version}`, (err, stdout, stderr) => {
          if (err) Print.error(err)
          if (stderr) Print.error(stderr)
          if (stdout) Print.log(stdout)
          this.complete()
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

  return new PublishTask(name, prerequisites, options, action)

}