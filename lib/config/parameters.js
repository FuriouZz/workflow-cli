'use strict'

module.exports = {

  serie: {
    type: 'boolean',
    default: true,
    aliases: ['s'],
    description: 'Execute tasks in "serie"'
  },

  parallel: {
    type: 'boolean',
    default: false,
    aliases: ['p'],
    description: 'Execute tasks in "parallel"'
  },

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

  help: {
    type: 'boolean',
    default: false,
    aliases: [ 'h' ],
    description: 'Help?'
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
  }

}