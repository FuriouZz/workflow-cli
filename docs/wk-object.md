## `wk` object

- [wk.load](#wkloadpath-createnamespace)
- [wk.run](#wkrun)
- [wk.extra](#wkextra)
- [wk.exec](#wkexec)
- [wk.ExtraTask](#wkextratask)
- [wk.Print](#wkprint)
- [wk.ARGParser](#wkargparser)










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

Execute a command or a list of command. Use same options as [command()](api.md#commandname-prerequisites-options-command).

`wk.exec` returns a promise.

```js
wk.exec('echo Hello World', { printStdout: true })

wk.exec([
  'echo foo',
  'echo bar',
  'echo baz'
])

wk.exec([
  {
    command: 'git status',
    options: { printStdout: true, breakOnError: true, preferExec: true }
  },
  {
    command: 'git add',
    options: { printStderr: true }
  },
  {
    command: 'git commit',
    options: { interactive: true, breakOnError: true }
  }
])
```










## `wk.createExec`

Create a `ProcessExec` object. You can attach event callback, options and execute it.

Example:

```js
const psExec = wk.createExec('echo Hello World')

psExec.on('end', function() {
  console.log('Command ended')
})

psExec.execute()
```










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