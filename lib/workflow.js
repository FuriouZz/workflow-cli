'use strict'

/**
 * Workflow implementation from jake.js
 * https://github.com/jakejs/jake/blob/master/lib/jake.js
 */

const wk = {}
module.exports = wk

const Namespace   = require('./namespace')
const Print       = require('./print')
const Importer    = require('./importer')
const TaskManager = require('./task-manager')
const ARGParser   = require('./arg-parser')

// Parse arguments
wk.PARAMS = ARGParser.parse(process.argv.slice(2))
wk.ARGV   = wk.PARAMS.__

// Method to export
wk.Print              = Print
wk.defaultNamespace   = new Namespace('default', null)
wk.currentNamespace   = wk.defaultNamespace
wk.currentDescription = null

wk.load  = Importer.load
wk.run   = TaskManager.run
wk.Tasks = {}
