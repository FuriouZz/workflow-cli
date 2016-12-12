#!/usr/bin/env node

const wk        = require('./../lib/workflow.js')
const Command   = require('./../lib/command')

const ARGParser  = require('./../lib/arg-parser')
const ARGConfig = require('./../lib/config/parameters')

const p = ARGParser.splitParameters( process.argv.slice(2), ARGConfig )

// Parse arguments
wk.PARAMS = ARGParser.parse(p.wkParameters, ARGConfig)
wk.ARGV   = wk.PARAMS.__

if (p.taskParameters) {
  wk.ARGV._.push( p.taskParameters[0] )
  wk.ARGV[p.taskParameters[0]+'_argv'] = p.taskParameters.slice(1)
}

// Load Wkfile
wk.load(wk.PARAMS.file)

// Execute command
Command()