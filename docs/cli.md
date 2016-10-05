# CLI

Execute the task `mytask`

`wk mytask`

From the namespace `mynamespace`

`wk mynamespace:mytask`

Pass arguments

`wk hello -- [ World ]` or `wk hello -- World`

```
task('hello', function( message ) {
  console.log('Hello ' + message + '!')
  // Print "Hello World!"
})
```

Pass variable

`wk hello -- [ --who Jack ]`

```
task('hello', function() {
  console.log('Hello ' + this.argv.who + '!')
  // Print "Hello Jack!"
})
```