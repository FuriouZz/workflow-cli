'use strict'

require('./_common')
const assert = require('assert')

it('must fail', function( ) {

  assert.throws(
    () => {
      wk.run('error0')
    },
    Error
  )

})