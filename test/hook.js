'use strict'

require('../bin/cli.js')
const assert = require('assert')
wk.load('./test/Wkfile')

// wk.Print.visibility('debug', true)

it('should returns functions', function( done ) {

  wk.Tasks['hook:task0'].promise.then(function() {
    assert.equal(wk.Tasks['hook:per-task0'].value , 'hook:per-task0')
    assert.equal(wk.Tasks['hook:pre-task0'].value , 'hook:pre-task0')
    assert.equal(wk.Tasks['hook:post-task0'].value, 'hook:post-task0')
    done()
  }).catch(function(err) {
    done(err)
  })

  wk.Tasks['hook:task0'].invoke()

})
