#!/usr/bin/env node

const wk  = require('./../lib/workflow.js')
global.wk = wk

const Command = require('./../lib/command')
const API     = require('./../lib/api')

// Check no global property overrided
const API_KEYS = Object.keys(API)

for (const i in API_KEYS) {
  if (global.hasOwnProperty(API_KEYS[i])) {
   throw new Error(`The api method ${API_KEYS[i]} override a global property`)
  }
}

// Export API to global
Object.assign(global, API)

// Load Wkfile
wk.load(wk.PARAMS.file)

// Execute command
Command()