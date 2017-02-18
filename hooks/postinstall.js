'use strict'

const ProcessManager = require('../lib/process-manager')
const Print          = require('../lib/print')

Print.silent()

ProcessManager.execute([
  {
    command: 'mkdir '+process.env.HOME+'/.wk',
    printStdout: false, printStderr: false
  },
  {
    command: 'mkdir '+process.env.HOME+'/.wk/extensions',
    printStdout: false, printStderr: false
  }
]).then(function(results) {
  Print.verbose()

  results.forEach(function(res) {
    if (res.stdout) Print.debug(res.stdout)
    if (res.stderr) Print.warn(res.stderr)
  })
})