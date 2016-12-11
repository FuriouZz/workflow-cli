#!/usr/bin/env node

const wk        = require('./../lib/workflow.js')
const Command   = require('./../lib/command')
const ARGParser = require('./../lib/arg-parser')

// const parameters = ARGParser.splitParameters( process.argv.slice(2) )
// const WKPARAMS = ARGParser.parse(parameters.wkParameters)
// const TKPARAMS = ARGParser._softParse(parameters.taskParameters)
// console.log(WKPARAMS, TKPARAMS)

// Parse arguments
wk.PARAMS = ARGParser.parse(process.argv.slice(2))
wk.ARGV   = wk.PARAMS.__

// Load Wkfile
wk.load(wk.PARAMS.file)

// Execute command
Command()