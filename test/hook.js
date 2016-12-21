'use strict'

require('./_common')
const assert = require('assert')

it('must have the right values', function( done ) {

  wk.run('hook:task0').then(function() {
    assert.equal(wk.Tasks['hook:task0'].value, 'hook:task0')
    assert.equal(wk.Tasks['hook:task1'].value, 'hook:task1')
    assert.equal(wk.Tasks['hook:task2'].value, 'hook:task2')
    done()
  }).catch(function(err) {
    done(err)
  })

})
