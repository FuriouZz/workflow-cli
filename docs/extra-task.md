# Extra task

`ExtraTask` is a namespace with a set of tasks created for a specific purpose. `PublishTask` and `PackageTask` are two `ExtraTask`s.

- [PublishTask](#publishtask)
- [PackageTask](#packagetask)
- [Create your own ExtraTask](#create-my-own-extratask)

# PublishTask

`PublishTask` can be use to bump a version like `npm version`.

```js
var publishTask = wk.extra('publish-task')

publishTask('deploy', function() {
  this.remote = 'origin'
})
```

```sh
wk -T

> wk deploy:next_version
> wk deploy:bump
> wk deploy:push
```

# PackageTask

`PackageTask` can be use to generate package from a set of file. Available compression : `zip`, `gzip`, `bzip2`.

```js
var exec        = require('child_process').exec
var packageTask = wk.extra('package-task')

packageTask('delivery', function() {

  const p = this.packagePath

  this.target = [ 'zip', 'gzip', 'lzma' ]

  // Add another compression
  task('lzma', { async: true, visible: false }, function() {
    exec(`tar Jxvf ${p}.tar.xz ${p}`, () => {
      if (err) return this.fail( err )
      this.complete()
    })
  })

})
```

```sh
wk -T

> wk delivery
```

# Create my own `ExtraTask`

You can create your own `ExtraTask` with the static method `ExtraTask.new`.

Exemple :

```js

class CustomTask extends ExtraTask {

  constructor() {
    super(...arguments)

    // Default properties
    this.firstname = 'John'

    this.configure()
  }

  _configure() {

    const scope = this
    const ns    = this.getPath

    task('custom', [ ns('message') ])

    task('message', function() {
      console.log('Hello '+ scope.firstname +' !')
    })

  }

}

module.exports = ExtraTask.new( CustomTask )

```

`Wkfile`

```js

const customTask = wk.extra('custom-task')
customTask('hello', function() {
  this.firstname = 'Eric'
})

```

`CLI`

```sh
wk -T

> wk hello
> wk hello:message
```


**Warning** By default, the `default` task of the namespace is created. This task will execute prerequisites and a named default task. To know named default task, you must know its identifier. In the example above, the identifier of the `CustomTask` is `custom`. For `PublishTask`, it will be `publish` and for `PackageTask` it will be `package`. The identifier is generated from the class name. It use the non-standard `Class.name`.
