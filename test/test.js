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

})

describe('TASK', function() {

  it('task without action', function() {
    wk.run('no_action')
  })

  it('task with action setted later', function() {
    wk.run('action_later')
  })

  describe('SERIE', function() {


    it('each task must have the right values', function( done ) {

      wk.run('serie0').then(function(value) {
        assert.equal(wk.Tasks['task_sync'].value, 'task_sync:complete')
        assert.equal(wk.Tasks['task_async'].value, 'task_async:complete')
        assert.equal(value, 'serie0:complete')
        done()
      }).catch(function(err) {
        done(err)
      })

    })

    it('tasks must be executed in the right order', function( done ) {

      wk.Tasks['serie0'].reenable()
      wk.Tasks['serie0'].invoke()

      // Executed in the right order
      let order = -1

      wk.Tasks['task_sync'].promise.then(function() {
        order++
        assert.equal(order, 0)
      })

      wk.Tasks['task_async'].promise.then(function() {
        order++
        assert.equal(order, 1)
      })

      wk.Tasks['serie0'].promise.then(function() {
        order++
        assert.equal(order, 2)

        done()
      })

    })


  })



})