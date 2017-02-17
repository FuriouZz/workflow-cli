# CLI

## Parameters

```
wk --help

    --sequence --seq -s (serie|parallel)    Execute tasks in "serie" or "parallel"
    --parallel -p                           Execute tasks in "parallel"
    --verbose                               Display verbose log
    --silent                                Hide logs
    --log <string>                          Precise log levels (eg.: --log=log,warn,error)
    --help -h                               Help?
    --clean --kill                          Kill all processes referenced inside tmp/pids
    --tasks -T                              List available tasks
    --file -F <string>                      Precise a default file
```

## Execute task

```sh
wk mytask
```

From a namespace `message`

```sh
wk message:hello
```

To execute multiple tasks you can use `run` task.

```sh
wk run mytask0 mytask1
```

## Passing arguments

Every arguments before `wk` will be added to `process.env`.
Every arguments between `wk` and the task will be added to `wk.CONTEXT_ARGV` and parsed result to `wk.CONTEXT_PARAMS`.
Every arguments after the task will be added to `wk.COMMAND_ARGV` and parsed result to `wk.COMMAND_PARAMS`.

```sh
ENV=staging wk --verbose mytask --message="Hello World"
```

To execute multiple tasks with arguments, use `run` task.

```sh
wk run mytask0 -- [ --message="Hello World" ] mytask1 -- [ --message="Surprise" ]
```

## Fetch arguments

```sh
wk hello John --uppercase
```

```js
task('hello', function( name ) {
  console.log('Hello ' + name + '!')
  // Print "Hello John!"
})
```

Pass variable

```sh
wk hello --who Jack
```

```js
task('hello', function() {
  console.log('Hello ' + this.argv.who + '!')
  // Print "Hello Jack!"
})
```

**Warning** — `wk.COMMAND_PARAMS` and `this.argv` is the same object.