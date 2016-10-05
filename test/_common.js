'use strict'

process.argv.push('--no-help')
require('../bin/cli.js')
wk.load('./test/Wkfile')

// wk.Print.visibility('debug', true)
// wk.Print.verbose()