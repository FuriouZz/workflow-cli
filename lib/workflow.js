'use strict'

/**
 * Workflow implementation from jake.js
 * https://github.com/jakejs/jake/blob/master/lib/jake.js
 */

const wk = {}
module.exports = wk

const Namespace      = require('./namespace')
const Print          = require('./print')
const Importer       = require('./importer')
const TaskManager    = require('./task-manager')
const ProcessManager = require('./process-manager')
const ARGParser      = require('./arg-parser')

// Method to export
wk.Print              = Print
wk.ARGParser          = ARGParser
wk.defaultNamespace   = new Namespace('default', null)
wk.currentNamespace   = wk.defaultNamespace
wk.currentDescription = null

wk.load  = Importer.load
wk.extra = Importer.extra
wk.run   = TaskManager.run
wk.exec  = ProcessManager.execute
wk.Tasks = {}
