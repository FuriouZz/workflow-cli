'use strict'

module.exports = function Hook( name, opts ) {

  const tsk = wk.Tasks[name]
  delete tsk.namespace.tasks[tsk.path]


  namespace( name, function() {

    task('pre', { visible: false }, opts.pre)
    task('post', { visible: false }, opts.post)
    task('default', [name+':pre', name+':run', name+':post'])

  })


  const ns  = wk.currentNamespace.children[name]

  tsk.namespace   = ns
  tsk._name       = 'run'
  tsk.path        = tsk.getPath()
  tsk.visible     = false
  ns.tasks['run'] = tsk

}

// module.exports = function Release( name, opts ) {

//   opts = opts || {}

//   const preTasks  = opts['pre-release']  || null
//   const tasks     = opts['release']      || null
//   const postTasks = opts['post-release'] || null

//   namespace( name, function() {

//     task('default', [ name+':_pre-release', name+':_release', name+':_post-release' ], { preReqSequence: 'serie' })

//     task('_pre-release', { visible: true, async: true }, function() {
//       if (Array.isArray(preTasks)) {
//         console.log('Execute pre release')
//         const scope = this
//         serie(preTasks).then(function() {
//           scope.complete(true)
//         }).catch(function( e ) {
//           scope.fail( e )
//         })
//       } else {
//         this.complete( true )
//       }
//     })

//     task('_post-release', { visible: true, async: true }, function() {
//       if (Array.isArray(postTasks)) {
//         console.log('Execute post release')
//         const scope = this
//         serie(postTasks).then(function() {
//           scope.complete(true)
//         }).catch(function( e ) {
//           scope.fail( e )
//         })
//       } else {
//         this.complete( true )
//       }
//     })

//     task('_release', { visible: true, async: true }, function() {
//       if (Array.isArray(tasks)) {
//         console.log('Execute release')
//         const scope = this
//         serie(tasks).then(function() {
//           scope.complete(true)
//         }).catch(function( e ) {
//           scope.fail( e )
//         })
//       } else {
//         this.complete( true )
//       }
//     })

//   })

// }