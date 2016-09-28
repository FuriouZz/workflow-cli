'use strict'

/**
 * Largely inspired by publish task from jake.js
 * https://github.com/jakejs/jake/blob/master/lib/publish_task.js
 */

const exec = require('child_process').exec
const fs   = require('fs')
const path = require('path')

/**
 *
 */
const cfg  = {
  developBranch: 'develop',
  releaseBranch: 'master',
  remote: 'origin',
  version_format: '[major].[minor].[patch]'
}

const versions = cfg.version_format.split('.').map(function(v) {
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
    fail(`Version format are differents "${cfg.version_format}" != "${pkg.version}"`)
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


namespace('check', function() {



  desc('Make some checks before bump')
  task('default', [
    'release:check:stage',
    'release:check:branch',
  ])



  desc('Check the current branch is equal to the develop branch')
  task('branch', { async: true, visible: false }, function() {
    const scope = this

    exec('git symbolic-ref --short HEAD', function(err, stdout, stderr) {
      if (err) console.log(err)
      if (stderr) console.log(stderr)

      if (stdout.replace(/\n/, '') !== cfg.developBranch) {
        return scope.fail(`The current branch must be "${cfg.developBranch}"`)
      }

      console.log(`Current develop branch:`, stdout.replace(/\n/, ''))
      scope.complete(cfg.developBranch)
    })
  })



  desc('Check the stage is clean')
  task('stage', { async: true, visible: false }, function() {
    const scope = this

    exec('git status --porcelain --untracked-files=no', function(err, stdout, stderr) {
      if (err) console.log(err)
      if (stderr) console.log(stderr)

      if (stdout.length !== 0) {
        return scope.fail(new Error(`Stage is not clean`))
      }

      console.log(`Stage is clean`)
      scope.complete(true)
    })
  })

})


namespace('test', function() {

  desc(`Test version availability. Required --target=[${versions.join('|')}]`)
  task('next_version', { async: true, visible: true }, function() {

    const scope   = this
    const target  = wk.ARGV.target
    const version = getNextVersion(target)

    if (!target) {
      return scope.fail(`Invalid target. Required --target=[${versions.join('|')}]`)
    }

    exec('git ls-remote', function(err, stdout, stderr) {

      if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
        return scope.fail(`Version v${version} already released!`)
      }

      console.log(`Next version for ${target} bump:`, version)
      scope.complete( version )

    })
  })



  desc(`Detect if the current version is released`)
  task('version', { async: true, visible: true }, function() {

    const scope   = this
    const version = getCurrentVersion()

    exec('git ls-remote', function(err, stdout, stderr) {

      if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
        return scope.fail(`Version v${version} already released!`)
      }

      console.log(`Ready to release:`, version)
      scope.complete( version )

    })
  })

})


desc('Commit')
task('commit', { async: true, visible: false }, function() {

  const version = getCurrentVersion()

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



desc('Update package.json version')
task('version', ['release:test:next_version'], { async: true, visible: false }, function() {
console.log('tolo')
  const version = wk.Tasks['release:test:next_version'].value

  if (!version) return this.fail('Invalid version :' + version)

  const pkg   = getPackage()
  pkg.version = version

  const pth = path.join('package.json')
  fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')

  this.complete( version )

})




desc(`Bump version. Required --target=[${versions.join('|')}]`)
task('bump', [ 'release:check', 'release:version', 'release:commit' ])



desc(`Release current version (current: v${getCurrentVersion()})`)
task('push', ['release:check', 'release:test:version'], function() {

  const version = wk.Tasks['release:test:version'].value

  if (!version) return this.fail(`Version invalid: ${version}`)

  exec(`git push ${cfg.remote} v${version}`, function(err, stdout, stderr) {
    if (err) console.log(err)
    else {
      console.log(`Version v${version} released!`)
    }
  })

})