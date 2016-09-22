task('hello', { async: true }, function() {
  const scope = this

  setTimeout(function() {
    console.log('Hello World')
    scope.complete('Hello World')
  }, 2000)
})

task('surprise', { async: true }, function() {
  const scope = this

  setTimeout(function() {
    console.log('surprise')
    scope.complete('surprise')
  }, 2000)
})

task('youhou', function() {
  console.log('youhou')
  return 'youhou'
})

task('plop', { async: true }, function() {
  const scope = this

  setTimeout(function() {
    scope.complete('plop_later')
  }, 2000)
  return 'plop_earlier'
})

task('yolo', ['test:hello', 'test:surprise'], { preReqSequence: 'parallel' }, function() {

  wk.run('test:plop').then(function(value) {
    console.log('promise', value)
    return value
  })

  wk.run('test:plop').then(function(value) {
    console.log('promise', value)

    console.log(
      wk.Tasks['test:hello'].value,
      wk.Tasks['test:surprise'].value,
      wk.Tasks['test:plop'].value
    )

    return value
  })

  console.log(
    wk.Tasks['test:hello'].value,
    wk.Tasks['test:surprise'].value,
    wk.Tasks['test:plop'].value
  )

})

task('arg0', function( message ) {
  console.log('Hello ' + message + '!')
})

task('arg1', function() {
  console.log('Hello ' + this.argv.who + '!')
})