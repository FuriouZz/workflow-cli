'use strict'

const fs     = require('fs')
const path   = require('path')
const exec   = require('child_process').exec
const semver = require('semver')

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


function prompt( message, cb ) {

  process.stdin.resume();
  process.stdin.setEncoding('utf8')
  process.stdout.write(message);
  process.stdin.once("data", function (data) {
    if ( cb ) cb( data.toString().trim() )
    process.stdin.pause();
  });

}

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
  ], { async: true, visible: false })



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

  desc(`Test version availability. Parameters -- [ <release> <identifier> ]`)
  task('next_version', { visible: false }, function() {

    if (!(wk.ARGV['release'] && wk.ARGV['release']._ && wk.ARGV['release']._[0])) {
      this.fail('Please set release')
      return
    }

    const release    = wk.ARGV['release']._[0]
    const identifier = wk.ARGV['release']._[1]

    const next = semver.inc(getCurrentVersion(), release, identifier)

    console.log(`Next version: "${next}"`)

    return next

  })



  desc(`Detect if the current version is released`)
  task('version', { async: true, visible: false }, function() {

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



task('ask', { async: true, visible: false }, function() {
  const next  = wk.Tasks['release:test:next_version'].value
  const scope = this

  prompt(`Continue? `, function( answer ) {
    if (answer === 'y' || answer === 'yes') {
      scope.complete( next )
    } else {
      scope.fail('Aborted')
    }
  })
})


desc('Update package.json version')
task('version', ['release:test:next_version', 'release:ask'], { async: true, visible: false }, function() {

  const version = wk.Tasks['release:test:next_version'].value

  if (!version) return this.fail('Invalid version :' + version)

  const pkg   = getPackage()
  pkg.version = version

  const pth = path.join('package.json')
  fs.writeFileSync(pth, JSON.stringify(pkg, true, 2) + '\n')

  this.complete( version )

})




desc(`Bump version. Parameters -- [ <release> <identifier> ]`)
task('bump', [ 'release:check', 'release:version', 'release:commit' ])



desc(`Release current version (current: v${getCurrentVersion()})`)
task('push', ['release:check', 'release:test:version'], function() {

  const version = wk.Tasks['release:test:version'].value

  if (!version) return this.fail(`Version invalid: ${version}`)

  exec(`git push ${cfg.remote} --tag v${version}`, function(err, stdout, stderr) {
    if (err) console.log(err)
    else {
      console.log(`Version v${version} released!`)
    }
  })

})

task('default', ['release:bump', 'release:push'])