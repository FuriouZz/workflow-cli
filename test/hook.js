'use strict'

require('./_common')
const assert = require('assert')

it('must have the right values', function( done ) {

  wk.run('hook:task0').then(function() {
    assert.equal(wk.Tasks['hook:task0'].value , 'hook:task0')
    assert.equal(wk.Tasks['hook:pretask0'].value , 'hook:pretask0')
    assert.equal(wk.Tasks['hook:posttask0'].value, 'hook:posttask0')
    done()
  }).catch(function(err) {
    done(err)
  })

})
