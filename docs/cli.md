# CLI

Execute the task `mytask`

```sh
wk mytask
```

From the namespace `mynamespace`

```sh
wk mynamespace:mytask
```

Pass arguments

```sh
wk hello -- [ World ]
```

or

```sh
wk hello -- World
```

```js
task('hello', function( message ) {
  console.log('Hello ' + message + '!')
  // Print "Hello World!"
})
```

Pass variable

```sh
wk hello -- [ --who Jack ]
```

```js
task('hello', function() {
  console.log('Hello ' + this.argv.who + '!')
  // Print "Hello Jack!"
})
```