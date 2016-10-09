# Workflow CLI

Task runner inspired by [Jake.js](https://github.com/jakejs/jake)

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

# Documentations

- [Command line](docs/cli.md#cli)
- [API](docs/api.md#api)
- [ExtraTask](docs/extra.md#extra-task)
