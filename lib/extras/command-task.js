'use strict'

const ExtraTask = require('../tasks/extra-task')
const ARGParser = require('../arg-parser')

class CommandTask extends ExtraTask {
  constructor( name, prerequisites, options, setupFn ) {
    super(name, prerequisites, options, setupFn)
    Object.assign(this, options || {})

    this.parser = ARGParser.new()
    this.config = {}

    this.configure()
  }

  _configure() {
    const nm    = this.getPath.bind(this)
    const scope = this

    task('precommand', { visible: false }, function() {
      scope.argv = scope.parser.parse(wk.COMMAND_ARGV, scope.config)
      wk.Tasks[nm('command')].argv = scope.argv.__

      Array.from(arguments).forEach((tsk) => {
        if (wk.Tasks[tsk]) {
          if (wk.COMMAND_PARAMS.__[tsk]) {
            // console.log(wk.COMMAND_PARAMS)
            // console.log(wk.COMMAND_PARAMS.__[tsk])
            // console.log(wk.Tasks[tsk].argv)
            wk.Tasks[tsk].argv = Object.assign(wk.Tasks[tsk].argv, wk.COMMAND_PARAMS.__[tsk])
            wk.Tasks[tsk].argv._.unshift( tsk )
          } else if (wk.Tasks[tsk].argv === wk.COMMAND_PARAMS.__) {
            wk.Tasks[tsk].argv = { _: [ tsk ] }
          }
        }
      })
    })
  }
}

module.exports = ExtraTask.new( CommandTask )