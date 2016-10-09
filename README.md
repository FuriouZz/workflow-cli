# Workflow CLI

Workflow-CLI is task runner inspired by [Jake.js](https://github.com/jakejs/jake).
By default, the `wk` command will load the `Wkfile` at your root path.

Example:

```js
desc('Display a message')
task('message', function() {
  console.log('Hello World')
})
```

```sh
wk -T

> wk message    # Display a message
```

```sh
wk message

> Hello World
```

More information in [API](docs/api.md#api)

# Parameters

```
wk --help

>   --sequence --seq -s (serie|parallel)    Execute tasks in "serie" or "parallel"
>   --parallel -p                           Execute tasks in "parallel"
>   --verbose                               Display verbose log
>   --silent                                Hide logs
>   --log <string>                          Precise log levels (eg.: --log=log,warn,error)
>   --help -h                               Help?
>   --clean --kill                          Kill all processes referenced inside tmp/pids
>   --tasks -T                              List available tasks
>   --file -F <string>                      Precise a default file
```

# Documentations

- [Command line](docs/cli.md#cli)
- [API](docs/api.md#api)
- [ExtraTask](docs/extra-task.md#extra-task)
