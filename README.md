# Workflow CLI

Workflow CLI inspired from [Jake.js](https://github.com/jakejs/jake)

# Parameters

```
   --sequence --seq -s (serie|parallel)    Execute tasks in "serie" or "parallel"
   --parallel -p                           Execute tasks in "parallel"
   --verbose                               Display verbose log
   --silent                                Hide logs
   --log <string>                          Precise log levels (eg.: --log=log,warn,error)
   --help -h                               Help?
   --clean --kill                          Kill all processes referenced inside tmp/pids
   --tasks -T                              List available tasks
```

# API

## `desc(string)`

Prepare a description for the next task

## `task(name[, prerequisites, options, action])`

Create a new task with `name`.
If `prerequisites` are specified, it will be executed before the task.

Exemple :

```
task('foo', function() {
  console.log('Foo')
})

// When async is true, a complete function must be executed
task('bar', { async: true }, function( complete ) {
  setTimeout(function() {
    console.log('bar')
    complete()
  }, 2000)
})

// By default prerequisites are executed in serie,
// but you can specified to be executed in parallel
// with preReqSequence setted to options
task('baz', [ 'foo', 'bar' ], { preReqSequence: 'parallel' })
```

**Note: If `prerequisites` are executed in `serie` but a task has async option setted to `false`, the complete function will be executed at task execution.**

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
wk --tasks

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
wk --tasks

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
wk --tasks

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
wk --tasks

>  wk message:hello    # Hello World
```

## `wk.run(task)`

Run a task