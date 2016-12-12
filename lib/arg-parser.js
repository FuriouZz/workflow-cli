'use strict'

const path   = require('path')

const cleanVariable = function(str) {
  return str.replace(/^-*/, '')
}

const cleanProperty = function(str) {
  if (typeof str === 'string') {
    if (str === 'true')  return true
    if (str === 'false') return false
    if (!isNaN(Number(str))) return Number(str)
  }

  return str
}



class Parser {

  constructor() {
    this._checkers = {}
  }

  new() {
    const parser     = new Parser(...arguments)
    parser._checkers = Object.assign({}, this._checkers)
    return parser
  }

  checker(name, checkFn) {
    if (!name || !checkFn) {
      console.warn('No name or check function found')
      return
    }

    this._checkers[name] = checkFn
  }

  parse( parameters, config, type ) {
    config = config || {}
    type   = type || 'valid'

    if (typeof this[`_${type}Parse`] === 'function') {
      return this[`_${type}Parse`]( parameters, config )
    }

    return {}
  }

  _validParse( parameters, config ) {
    const params = this._getKeyValue(parameters.slice(0))

    return Object.assign(
      { __: params },
      this._getValidParameters( params, config )
    )
  }

  _invalidParse( parameters, config ) {
    const params = this._getKeyValue(parameters.slice(0))

    return Object.assign(
      params,
      this._getValidParameters( params, config )
    )
  }

  _softParse( parameters ) {
    return this._getKeyValue(parameters.slice(0))
  }

  splitParameters( parameters, config ) {

    const args = parameters.filter(function(arg) {
      return !arg.match(/^-{1,2}\w/)
    })

    let parameterIndex, parameter, match, isTask = false, task = null
    for (let i = 0, len = args.length; i < len; i++) {
      parameterIndex = parameters.indexOf(args[i]) - 1

      if (parameterIndex < 0) {
        isTask = true
      } else {
        parameter = parameters[parameterIndex].replace(/^-{1,2}/, '')

        for (const key in config) {
          match = parameter.match(new RegExp('^'+key+'$'))

          if (!match && config[key].aliases) {
            for (let j = 0, leng = config[key].aliases.length; j < leng; j++) {
              match = parameter.match(new RegExp('^'+config[key].aliases[j]+'$'))
              if (match) break
            }
          }

          if (match && config[key].type === 'boolean') {
            isTask = true
            break
          }
        }

      }


      if (isTask) {
        task = args[i]
        break
      }

    }

    if (task) {
      const index = parameters.indexOf(task)
      return { wkParameters: parameters.slice(0, index), taskParameters: parameters.slice(index) }
    }

    return { wkParameters: parameters, taskParameters: null }

  }

  _getValidParameters( object, config ) {
    const result = {}

    let param, value
    for (const key in config) {
      param = config[key]
      if (!param.type) param.type = 'boolean'

      if (param.no_key && !isNaN(param.index)) {
        value = object._[param.index]
      } else {
        // Get value from key
        value = object[key]
      }

      // Get value from aliases
      if (value === undefined && param.aliases) {
        for (let i = 0, len = param.aliases.length; i < len; i++) {
          value = object[param.aliases[i]]
          if (value !== undefined) break
        }
      }

      // Check the value
      if (this._checkers[param.type]) {
        if (!this._checkers[param.type]( param, value )) {
          value = undefined
        }
      }

      // Get default value
      if (value === undefined) {
        value = this._getDefaultValue(param)
      }

      // Set result value
      if (value !== undefined) {
        result[key] = value
      }

      param = value = undefined

    }

    return result
  }

  _getDefaultValue( arg ) {
    if (arg.hasOwnProperty('default')) {
      return arg.default
    }
    return undefined
  }

  _getFirstArgument( parameters ) {

    let value = undefined

    if (parameters[0].indexOf('-') !== 0) {
      value = parameters[0]
    }

    return value

  }

  _getKeyValue(parameters) {
    const object = { _: [] }

    if (parameters.length === 0) return object

    const params        = parameters
    const matchVarRegex = /^-{1}\w|^-{2}\w/

    let str, key, value

    for (let i = 0, len = params.length; i <= len; i++) {

      str = params[i] || null

      if (key) {

        if (str === null || str.match(matchVarRegex)) {
          value = true
          i--
        }

        else if (str.match(/^\[$/)) {

          let args      = params.slice(i+1)
          const closure = args.indexOf(']')

          if (closure !== -1) {
            args = args.slice(0, closure)
            i += args.length+1
          } else {
            i += args.length
          }

          value = this._getKeyValue(args)

        }

        else {
          value = str
        }

        object[key] = cleanProperty(value)
        key = value = null
        continue
      }

      if (str && str.match(matchVarRegex)) {
        key = cleanVariable(str)

        if (key.indexOf('=') !== -1) {
          const split = key.split('=')
          key         = split[0]
          value       = split[1]

          object[key] = cleanProperty(value)
          key = value = null
          continue
        }

        if (str.match(/^-[a-zA-Z][0-9]$/)) {
          value = key[1]
          key   = key[0]

          object[key] = cleanProperty(value)
          key = value = null
          continue
        }

        continue
      }

      // Special conditions for tasks arguments
      if (str && str.match(/^--$/) && i > 0 && object._.indexOf(params[i-1]) !== -1) {
        key = cleanVariable(params[i-1])
        continue
      }

      if (typeof str === 'string') {
        object._.push( str )
      }

    }

    return object

  }

}

const ParserSingleton = new Parser

ParserSingleton.checker('boolean', function( parameter, value ) {
  return typeof value === 'boolean'
})

ParserSingleton.checker('value', function( parameter, value ) {
  return value !== null && value !== undefined && value !== '' && typeof value !== 'boolean'
})

ParserSingleton.checker('inline_value', function( parameter, value ) {
  return value !== null && value !== undefined && value !== '' && typeof value !== 'boolean'
})

ParserSingleton.checker('select', function( parameter, value ) {
  if (parameter.values && parameter.values.indexOf(value) === -1) {
    return false
  }
  return true
})

ParserSingleton.checker('file', function( parameter, value ) {
  let res = false
  let ext = ''

  if (ParserSingleton._checkers['value'](parameter, value)) {
    ext = path.extname(value)
    res = ext.length > 1
  }

  if (parameter.extensions) {
    res = parameter.extensions.indexOf(ext) !== -1
  }

  return res
})

module.exports = ParserSingleton