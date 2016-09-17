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
const options = {
  branch: 'master',
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
      if (err) fail(err)
      if (stderr) fail(stderr)
      // console.log(stdout)
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
  task('branch', { async: true, visible: false }, function( complete ) {
    exec('git symbolic-ref --short HEAD', function(err, stdout, stderr) {
      if (err) fail(err)
      if (stderr) fail(stderr)

      if (stdout.replace(/\n/, '') !== options.branch) {
        fail(new Error('The current branch must be "develop"'));
      }

      console.log('[Git] Current develop branch : ', stdout.replace(/\n/, ''))
      complete()
    })
  })

  desc('Check the stage is clean')
  task('stage', { async: true, visible: false }, function( complete ) {
    exec('git status --porcelain --untracked-files=no', function(err, stdout, stderr) {
      if (err) fail(err)
      if (stderr) fail(stderr)

      if (stdout.length !== 0) {
        fail(new Error('Git repository is not clean.'))
      }
      console.log('[Git] Stage clean')
      complete()
    })
  })

})



desc('Commit')
task('commit', { async: true, visible: false }, function( complete ) {

  const version = getVersion()

  const cmds = [
    `git commit -a -m "Bump ${version}"`,
    `git tag -a v${version} -m "Release ${version}"`
  ]

  const opts = {}
  if (process.platform == 'win32') {
    opts.windowsVerbatimArguments = true
  }

  execCommands(cmds, function() {
    console.log(`Version ${version} bumped !`)
    complete()
  })

})



const versions = options.version_format.split('.')
versions.forEach(function(v, index) {

  v = v.replace(/\[/, '').replace(/\]/, '')

  namespace('version', function() {

    desc(`Update to ${v} version`)
    task(v, { async: true, visible: false }, function( complete ) {
      const pkg   = getPackage()
      const arr   = pkg.version.split('.')
      arr[index] = parseInt(arr[index], 10) + 1
      pkg.version = arr.join('.')

      const pth = path.join('package.json')
      fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')

      complete()
    })

  })

  desc(`Bump ${v} release`)
  task(v, [
    'bump:check',
    `bump:version:${v}`,
    'bump:commit'
  ], { preReqSequence: 'serie' })

})