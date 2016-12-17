# API

Workflow-CLI comes with a set of functions that can be used in your `js` file. API functions are setted in node `global` object and others functions or object in `global.wk` object.

- [desc](#descstring)
- [task](#taskname-prerequisites-options-action)
  - [Options](#options)
  - [Passing values through tasks](#passing-values-through-tasks)
  - [Execution and hooks](#execution-and-hooks)
- [command](#commandname-prerequisites-options-command)
- [namespace](#namespacename-fn)
- [serie](#serietasks)
- [parallel](#paralleltasks)
- [fail](#fail)
- [wk object](#wk-object)











## `desc(string)`

Prepare a description for the next task created.










## `task(name[, prerequisites, options, action])`

Create a new task with a `name` and return the `Task` object.

Exemple :

```js
task('foo', function() {
  console.log('Foo')
})

// When async is true, this.complete() function must be executed
task('bar', { async: true }, function() {
  var scope = this

  setTimeout(function() {
    console.log('bar')
    scope.complete()
  }, 2000)
})

// If something went wrong, you can call this.fail()
task('baz', function() {
  if (1+1 === 0) {
    this.fail( 'Bad result' )
  }
})
```

`prerequisites` is an array of tasks executed before a task.

```js
// By default prerequisites are executed in serie,
// but you can specified to be executed in parallel
task('baz', [ 'foo', 'bar' ], { preReqSequence: 'parallel' })
```

**Note: If `prerequisites` are executed in `serie` but a task has async option setted to `false`, the complete function will be executed at task execution.**










### Options

**options.async** (Default: false) — Precise that task is asynchronous. You **MUST** call `this.complete` or `this.fail` to complete the task.

**options.preReqSequence** (Default: serie) - Execute prerequisites in `parallel` or `serie`

**options.visible** (Default: true) - Enable a task to be called by the user. A task hidden can be called by the others.

**options.description** (Default: '') - Add a task description

**options.prerequisites** (Default: null) - Tasks executed before execution of a task

**options.action** (Default: null) - Function called by the task

**options.always_run** (Default: false) - Reenable the task and its prerequisites.

**options.breakOnError** (Default: true) - Throw an error when `this.fail` is called.










### Async

When `options.async` is `true`, you **MUST** call `this.complete` or `this.fail`. You can pass a value to `this.complete` and a message to `this.fail`.
`this.fail` has a second argument to break execution on error.










### Passing values through tasks

```js
task('task0', function() {
  return 'task0'
})

task('task1', { async: true } function() {
  var scope = this

  setTimeout(function() {
    scope.complete( 'task1' )
  }, 2000)
})

task('task2', [ 'task0', 'task1' ], function() {
  console.log( wk.Tasks['task0'].value )
  // => "task0"

  console.log( wk.Tasks['task1'].value )
  // => "task1"
})
```










### Execution and hooks

You got three ways to execute a task :

* Use `execute` method to execute the task only.

* Use `invoke` method to execute the task with prerequisites.

* Use `wk.run` function to `invoke` a task and invoke its hooks.

**Warning** — A task is executed only once. You **MUST** call `reenable` method to execute it again or add `always_run` in task options.

Example:

```js
task('task0', function() {
  console.log('task0')
})

// always_run will reenable the task automatically
task('task1', [ 'task0' ], { always_run: true }, function() {
  console.log('task1')
})

task('pretask1', function() {
  console.log('pretask1')
})

task('posttask1', function() {
  console.log('posttask1')
})


wk.Tasks['task1'].execute()
// => "task1"

wk.Tasks['task1'].invoke()
// => "task0"
// => "task1"

wk.run('task1')
// => "pretask1"
// => "task0"
// => "task1"
// => "posttask1"
```










## `taskProcess(name, command[, prerequisites, options, callback])`

Create a new task that execute a command line

```js
taskProcess('hello', 'echo "Hello World"')

taskProcess('ls-remote', 'git ls-remote', function(err, stdout, stderr) {
  this.complete()
}, { async: true })
```










### Command options

**options.process.use_color** (Default: true) Display child process color

**options.process.breakOnError** (Default: true) - Throw an error when `this.fail` is called.

**options.process.interactive** (Default: false)

**options.process.printStdout** (Default: true)  Print `stdout`

**options.process.printStderr** (Default: true) Print `stderr`

**Warning** When `printStdout` or `printStderr` option is `true`, `stdout` or `stderr` returns `undefined`










## `namespace(name, fn)`

`namespace` create a group and return a `Namespace` object.

```js
namespace('foo', function() {
  task('bar')
})
```

```sh
wk -T

> wk foo:bar
```

You can set a default task associated to a namespace

```js
namespace('foo', function() {
  task('default', [ 'bar' ])
  task('bar')
})
```

```sh
wk -T

> wk foo
> wk foo:bar
```

**Warning** — You cannot create hooks for `default` task. If you want to create hooks in the example above, you can create `prefoo` and `postfoo` tasks outside of the namespace.










## `serie(...tasks)`

Execute tasks in `serie`










## `parallel(...tasks)`

Execute tasks in `parallel`










## `fail`

Execute an error










## `wk` object

See [wk object](wk-object.md#wk-object) documentation