# API

## `desc(string)`

Prepare a description for the next task

## `task(name[, prerequisites, options, action])`

Create a new task with a `name`.
If `prerequisites` are specified, it will be executed before the task.

Exemple :

```
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

**options.always_run** (Default: false) - Reenable the task when called

### Passing values through tasks

```
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
  // Print "task0"

  console.log( wk.Tasks['task1'].value )
  // Print "task1"
})
```

### Execution and hooks

You can execute a task thanks to `wk.run` method. This method will execute the task and its prerequisites.

Moreover, you can create hook tasks with the prefix `pre` or `post`.

```

task('task0', function() {
  console.log('task0')
})

task('pretask0', function() {
  console.log('pretask0')
})

task('posttask0', function() {
  console.log('posttask0')
})

wk.run('task0')

// "pretask0" "task0" "posttask0"

```


### `execute`, `invoke`, `reenable`

You can access to a task in `wk.Tasks` and execute it with two methods : `execute` or `invoke`.

Use `invoke` to execute the task with prerequisites.

Use `execute` to execute the task only.

A task is executed only once. You can reenable it with `wk.Tasks[taskname].reenable()`.

If you want to execute hooks, you must use `wk.run`


## `command(name[, prerequisites, options, command])`

Create a new task from a command line

```
command('hello', 'echo "Hello World"')
```

## `namespace`

Namespace are used to group a set of tasks.

```
namespace('foo', function() {
  task('bar')
})
```

```
wk -T

> wk foo:bar
```

You can set a default task associated to a namespace

```
namespace('foo', function() {
  task('default', [ 'bar' ])
  task('bar')
})
```

```
wk -T

> wk foo
> wk foo:bar
```

## `serie(...tasks)`

Execute tasks in `serie`

## `parallel(...tasks)`

Execute tasks in `parallel`

## `fail`

Execute an error

## `wk`

## `wk.load(path[, createNamespace])`

`wk.load` can be used to load a file, a directory or a `package.json` file.

Exemple with a `package.json` file :

```
// Inside package.json

...
"scripts": {
  "hello": "echo 'Hello World'",
  "message:foo": "echo 'Foo'"
}
...
```

`message:foo` is a namespaced task. A `message` namespace is created.

```
wk -T

>  wk hello          # [npm] echo 'Hello World'
>  wk message:foo    # [npm] echo 'Foo'
```

The `createNamespace` argument is optional. If `true`, a new namespace is created based on the basename of the path.

Example :

```
// Inside `message.js`

desc('Log "Hello World"')
task('hello', function() {
  console.log('Hello World')
})
```

```
// Inside `Wkfile`

wk.load('message.js', true)
```

```
wk -T

>  wk message:hello    # Hello World
```

## `wk.run(task)`

Run a task

## `wk.extra`

Load extra functions