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
  - [wk.load](#wkloadpath-createnamespace)
  - [wk.run](#wkrun)
  - [wk.extra](#wkextra)
  - [wk.exec](#wkexec)
  - [wk.ExtraTask](#wkextratask)
  - [wk.Print](#wkprint)
  - [wk.ARGParser](#wkargparser)

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

## `command(name[, prerequisites, options, command])`

Create a new task that execute a command line

```js
command('hello', 'echo "Hello World"')
```

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

## `wk.load(path[, createNamespace])`

`wk.load` can be used to load a file, a directory or a `package.json` file.

Exemple with a `package.json` file :

```json
"scripts": {
  "hello": "echo 'Hello World'",
  "message:foo": "echo 'Foo'"
}
```

`message:foo` is a namespaced task. A `message` namespace is created.

```sh
wk -T

>  wk hello          # [npm] echo 'Hello World'
>  wk message:foo    # [npm] echo 'Foo'
```

The `createNamespace` argument is optional. If `true`, a new namespace is created based on the basename of the path.

Example :

```js
// Inside "message.js"
desc('Log "Hello World"')
task('hello', function() {
  console.log('Hello World')
})

// Inside "tasks/assets/index.js"
desc('Compile assets')
task('compile', function() {
  console.log('compile assets')
})
```

```js
// Inside `Wkfile`
wk.load('./message.js', true)   // File name is the namespace
wk.load('./tasks/assets', true) // Directory name is the namespace
```

```
wk -T

> wk message:hello      # Hello World
> wk assets:compile     # Compile assets
```

## `wk.run`

See [Execution and hooks](#execution-and-hooks)

## `wk.extra`

Useful function used to load `ExtraTask` like `PublishTask` or `PackageTask`. These tasks are not inject in the `global` object by default.

More information in [ExtraTask](extra-task.md#extra-task)

## `wk.exec`

Execute a command line

## `wk.ExtraTask`

More information in [ExtraTask](extra-task.md#extra-task)

## `wk.Print`

You can use the `Print` object to log data. To use your own options, call `Print.new()` to create a new `Print` object.

By default `Print` has four differents log level : `Print.log`, `Print.debug`, `Print.warn`, `Print.error`.

You can create your own level with `Print.level`

```js
Print.level('test', {
  style: 'cyan'
})

Print.test('My test')
// => "My test"
```

You can create your own plugin with `Print.plugin` and use it with your level. Each plugin created comes with a boolean property `use_`.

```js
// In the example above, "test" level use the style plugin to print string in cyan.
Print.plugin('style', function(str, style) {
  return this[style]( str )
}, false)

Print.use_style = true
```

You can set the visibility of each level.

```js
// No log printed
Print.silent()

// Only "test" level printed
Print.visibility('test', true)

// All logs printed
Print.verbose()

// Only "debug" level is not printed
Print.visibility('debug', false)
```

More information [lib/print.js](../lib/print.js)

## `wk.ARGParser`

Parser used to parse command line arguments.

More information [lib/arg-parser.js](../lib/arg-parser.js) and [lib/config/parameters.js](../lib/config/parameters.js)