# Extra

You can use extra functions from `lib/extras` with the method `wk.extra`.

## `hook(name[, prerequisites, options, action])` (Need improvement)

`hook()` create basicly a new task. This task is executed before (`pre-`) or after (`post-`) an existing task.

Example :

```

var hook = wk.extra('hook')

// This code :

task('task0', function() {
  console.log('Execute task0')
})

hook('pre-task0', function() {
  console.log('Execute pre-task0')
})

hook('post-task0', function() {
  console.log('Execute pre-task0')
})

```

**Warning** When you use `hook()`, the existing task is prefixed with `per-` and its path change. From the example, `task0` path become `per-task0`

`hook()` generation is equivalent to :

```
task('pre-task0', function() {
  console.log('Execute pre-task0')
})

task('per-task0', function() {
  console.log('Execute per-task0')
})

task('post-task0', function() {
  console.log('Execute pre-task0')
})

task('task0', [ 'pre-task0', 'per-task0', 'post-task0' ], { preReqSequence: 'serie' })
```