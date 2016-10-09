'use strict'

const wk = require('../lib/workflow')
wk.load('./test/Wkfile')
// wk.Print.silent()

// wk.Print.visibility('debug', true)
wk.Print.verbose()