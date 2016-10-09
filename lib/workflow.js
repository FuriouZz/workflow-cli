'use strict'

/**
 * Workflow implementation from jake.js
 * https://github.com/jakejs/jake/blob/master/lib/jake.js
 */

const wk       = {}
module.exports = wk
global.wk      = wk

const Namespace      = require('./namespace')
const Print          = require('./print')
const Importer       = require('./importer')
const TaskManager    = require('./task-manager')
const ProcessManager = require('./process-manager')
const ARGParser      = require('./arg-parser')
const ExtraTask      = require('./tasks/extra-task')
const API            = require('./api')

// Exports
wk.ExtraTask          = ExtraTask
wk.Print              = Print
wk.ARGParser          = ARGParser
wk.defaultNamespace   = new Namespace('default', null)
wk.currentNamespace   = wk.defaultNamespace
wk.currentDescription = null
wk.ARGV               = {}

wk.load  = Importer.load
wk.extra = Importer.extra
wk.run   = TaskManager.run
wk.exec  = ProcessManager.execute
wk.Tasks = {}

// Check no global property overrided
const API_KEYS = Object.keys(API)

for (const i in API_KEYS) {
  if (global.hasOwnProperty(API_KEYS[i])) {
   throw new Error(`The api method ${API_KEYS[i]} override a global property`)
  }
}

// Export API to global
Object.assign(global, API)