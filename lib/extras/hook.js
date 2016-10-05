'use strict'

const _hooks_keys = [ 'pre', 'per', 'post' ]
const _hooksRegex = new RegExp('^('+_hooks_keys.join('|')+')-')

const createPath = function( p, hook ) {
  const path = p.split(':')
  const tsk  = path.pop()
  path.push(`${hook}-${tsk}`)
  return path.join(':')
}

module.exports = function Hook( path, prerequisites, options, action ) {

  const matches = path.match(_hooksRegex)

  if (!matches) {
    console.log('No hook found')
    return
  }

  const hook_key = matches[1]
  const ns_path  = wk.currentNamespace.getPath()

  const tsk_name = path.replace(`${hook_key}-`, '')
  const tsk_path = ns_path.length > 0 ? `${ns_path}:${tsk_name}` : tsk_name

  let tsk = wk.Tasks[tsk_path]

  if (tsk) {

    if ( typeof tsk.action === 'function' ) {
      const tmp_name = tsk._name

      tsk._unlink()
      tsk._name   = `per-${tsk._name}`
      tsk.visible = false
      tsk._link()

      tsk = task(tmp_name, { preReqSequence: 'serie' })
    }

  } else {
    console.log('No task found')
    return
  }

  // Create hook
  const args = [ path, prerequisites, options, action ]
  const hookTsk = task(...args)
  hookTsk.visible = false

  // Fetch hooks
  const hooks = _hooks_keys.slice(0).filter(function( key ) {
    return !!wk.Tasks[createPath(tsk_path, key)]
  }).map(function( key ) {
    return createPath(tsk_path, key)
  })

  // Update prerequisites
  tsk.prerequisites = hooks

}