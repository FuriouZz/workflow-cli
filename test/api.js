'use strict'

require('../bin/cli.js')
const assert = require('assert')
wk.load('./test/Wkfile')

// wk.Print.visibility('debug', true)

it('should returns functions', function() {
  assert(desc)
  assert(task)
  assert(command)
  assert(namespace)
  assert(serie)
  assert(parallel)
  assert(fail)
})
