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

function getPackage() {
  return JSON.parse(fs.readFileSync(path.resolve('package.json')))
}

function getVersion() {
  return getPackage().version
}

function execPromise(cmd, opts) {
  return new Promise(function(resolve) {
    exec(cmd, opts, function(err, stdout, stderr) {
      if (err) console.log(err)
      if (stderr) console.log(stderr)
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
    'bump:check:stage',
    'bump:check:branch'
  ], { async: true })

  desc('Check the current branch is equal to the develop branch')
  task('branch', { async: true, visible: false }, function() {
    const scope = this

    exec('git symbolic-ref --short HEAD', function(err, stdout, stderr) {
      if (err) fail(err)
      if (stderr) fail(stderr)

      if (stdout.replace(/\n/, '') !== cfg.developBranch) {
        fail(new Error('The current branch must be "'+ cfg.developBranch +'"'));
      }

      console.log('[Git] Current develop branch : ', stdout.replace(/\n/, ''))
      scope.complete()
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
      }
      console.log('[Git] Stage clean')
      scope.complete()
    })
  })

})



desc('Commit')
task('commit', { async: true, visible: false }, function() {

  const version = getVersion()

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



const versions = cfg.version_format.split('.').map(function(v) {
  return v.replace(/\[/, '').replace(/\]/, '')
})
versions.forEach(function(v, index) {

  namespace('version', function() {

    desc(`Update to ${v} version`)
    task(v, { async: true, visible: false }, function() {
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

      pkg.version = arr.join('.')

      const pth = path.join('package.json')
      fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')

      this.complete()
    })

  })

  desc(`Bump ${v} release`)
  task(v, [
    'bump:check',
    `bump:version:${v}`,
    'bump:commit'
  ], { preReqSequence: 'serie' })

})

desc(`Push to remote [${cfg.remote}]`)
task('push', ['bump:check'], function() {

  const version = getVersion()

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