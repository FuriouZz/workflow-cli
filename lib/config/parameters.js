'use strict'

module.exports = {

  verbose: {
    type: 'boolean',
    default: false,
    description: "Display verbose log"
  },

  silent: {
    type: 'boolean',
    default: false,
    description: "Hide logs"
  },

  log: {
    type: 'value',
    default: 'log,error',
    description: "Precise log levels (eg.: --log=log,warn,error)"
  },

  clean: {
    type: 'boolean',
    default: false,
    aliases: [ 'kill' ],
    description: 'Kill all processes referenced inside tmp/pids'
  },

  tasks: {
    type: 'boolean',
    default: false,
    aliases: [ 'T' ],
    description: 'List available tasks'
  },

  file: {
    type: 'value',
    default: 'Wkfile',
    aliases: [ 'F' ],
    description: 'Precise a default file'
  },

  parallel: {
    type: 'boolean',
    default: false,
    aliases: [ 'p' ],
    description: 'Execute tasks in parallel'
  }

}