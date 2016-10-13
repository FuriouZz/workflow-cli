'use strict'

/**
 * List of paths
 */

module.exports = (function() {
  const path = require('path')
  const fs   = require('fs-extra')

  const paths = {
    tmp_path:  path.join(process.cwd(), 'tmp'),
    pids_path: path.join(process.cwd(), 'tmp', 'pids'),
    pkg_path:  path.join(process.cwd(), 'pkg')
  }

  // Create directories from paths
  fs.ensureDirSync(paths.tmp_path)
  fs.ensureDirSync(paths.pids_path)

  return paths

})()
