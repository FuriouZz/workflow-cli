'use strict'

const ExtraTask = require('../tasks/extra-task')
const ARGParser = require('../arg-parser')

const parser = ARGParser.new()

class CommandTask extends ExtraTask {
  constructor( name, prerequisites, options, setupFn ) {
    super(name, prerequisites, options, setupFn)
    Object.assign(this, options || {})

    this.config = {}

    this.configure()
  }

  _configure() {
    const nm    = this.getPath.bind(this)
    const scope = this

    task('precommand', { visible: false }, function() {
      const argv = parser.parse(wk.COMMAND_ARGV, scope.config)
      wk.Tasks[nm('command')].argv = argv.__

      Array.from(argv.__._.slice(1)).forEach((tsk) => {
        if (wk.Tasks[tsk] && argv.__[tsk]) {
          wk.Tasks[tsk].argv = Object.assign(wk.Tasks[tsk].argv, argv.__[tsk])
          wk.Tasks[tsk].argv._.unshift( tsk )
        }
      })
    })
  }
}

module.exports = ExtraTask.new( CommandTask )