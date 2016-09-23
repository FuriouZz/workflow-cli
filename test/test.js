'use strict'

require('../lib/workflow')

const assert = require('assert')

describe('API', function() {

  it('should returns functions', function() {
    assert(desc)
    assert(task)
    assert(command)
    assert(namespace)
    assert(serie)
    assert(parallel)
    assert(fail)
  })

  it('task without action', function() {
    wk.run('no_action').then(function(value) {
      assert(value)
    })
  })

  it('task with action setted later', function() {
    wk.run('action_later')
  })

})