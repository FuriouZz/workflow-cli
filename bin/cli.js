#!/usr/bin/env node

const wk        = require('./../lib/workflow.js')
const Command   = require('./../lib/command')
const ARGParser = require('./../lib/arg-parser')

// Parse arguments
wk.PARAMS = ARGParser.parse(process.argv.slice(2))
wk.ARGV   = wk.PARAMS.__

// Check no global property overrided
const API_KEYS = Object.keys(wk.api)

for (const i in API_KEYS) {
  if (global.hasOwnProperty(API_KEYS[i])) {
   throw new Error(`The api method ${API_KEYS[i]} override a global property`)
  }
}

// Export API to global
Object.assign(global, wk.api)

// Load Wkfile
wk.load(wk.PARAMS.file)

// Execute command
Command()