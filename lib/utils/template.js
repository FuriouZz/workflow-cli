'use strict'

const rg = function( key ) {
  return new RegExp("\\$\\{"+key+"\\}", 'g')
}

module.exports = function( string, obj ) {

  let value, str = string

  for (const key in obj) {
    value = obj[key]
    str = str.replace( rg(key), value )
  }

  return str

}