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
  ], { async: true })



  desc('Check the current branch is equal to the develop branch')
  task('branch', { async: true, visible: false }, function() {
    const scope = this

    exec('git symbolic-ref --short HEAD', function(err, stdout, stderr) {
      if (err) fail(err)
      if (stderr) fail(stderr)

      if (stdout.replace(/\n/, '') !== cfg.developBranch) {
        fail(new Error('The current branch must be "'+ cfg.developBranch +'"'));
        return scope.complete(false)
      }

      console.log('[Git] Current develop branch:', stdout.replace(/\n/, ''))
      scope.complete(true)
    })
  })



  desc('Check the stage is clean')
  task('stage', { async: true, visible: false }, function() {
    const scope = this

    exec('git status --porcelain --untracked-files=no', function(err, stdout, stderr) {
      if (err) fail(err)
      if (stderr) fail(stderr)

      if (stdout.length !== 0) {
        fail(new Error('Git repository is not clean.'))
        return scope.complete(false)
      }

      console.log('[Git] Stage clean')
      scope.complete(true)
    })
  })



  desc(`Check tag availability. Required --target=[${versions.join('|')}]`)
  task('next_tag', { async: true, visible: true }, function() {

    const scope   = this
    const target  = wk.ARGV.target
    const version = getNextVersion(target)

    if (!target) {
      console.log(`Invalid target. Required --target=[${versions.join('|')}]`)
      return false
    }

    exec('git ls-remote', function(err, stdout, stderr) {

      if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
        fail(`Version v${version} already released!`)
        scope.complete( false )
      } else {
        console.log(`[Git] Next version for ${target} bump:`, version)
        scope.complete( version )
      }

    })
  })



  desc(`Check the current version is not released`)
  task('current_tag', { async: true, visible: true }, function() {

    const scope   = this
    const version = getCurrentVersion()

    exec('git ls-remote', function(err, stdout, stderr) {

      if (stdout.match(new RegExp(`refs/tags/v${version}`))) {
        fail(`Version v${version} already released!`)
        scope.complete( false )
      } else {
        console.log(`[Git] Need to release:`, version)
        scope.complete( version )
      }

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
    scope.complete()
  })

})



desc('Update package.json version')
task('version', ['release:check:next_tag'], { async: true, visible: false }, function() {

  const version = wk.Tasks['release:check:next_tag'].value

  if (!version) fail('Invalid version :' + version)

  const pkg   = getPackage()
  pkg.version = version

  const pth = path.join('package.json')
  fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')

  this.complete( version )

})



desc('Bump current state')
task('bump', [ 'release:check', 'release:version', 'release:commit' ])



desc(`Push to remote [${cfg.remote}]`)
task('push', ['release:check', 'release:check:current_tag'], function() {

  const version = wk.Tasks['release:check:current_tag'].value

  const cmds = [
    `git push ${cfg.remote} ${cfg.developBranch}`,
    `git checkout ${cfg.releaseBranch}`,
    `git pull ${cfg.remote} ${cfg.developBranch}`,
    `git push ${cfg.remote} ${cfg.releaseBranch}`,
    `git push ${cfg.remote} v${version}`,
    `git checkout ${cfg.developBranch}`
  ]

  const scope = this

  execCommands(cmds, function() {
    console.log(`Version ${version} released !`)
    scope.complete()
  })

})