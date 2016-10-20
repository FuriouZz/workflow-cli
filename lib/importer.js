'use strict'

const fs   = require('fs')
const path = require('path')

class Importer {

  constructor() {

    // Binds
    this.load  = this.load.bind(this)
    this.extra = this.extra.bind(this)

    // Defaults
    this.pkg = null

    // Load package.json
    const package_path = path.resolve('package.json')
    if (fs.existsSync( package_path )) {
      this.pkg = require(package_path)
    }
  }

  exists( p ) {
    return fs.existsSync( path.resolve(p) )
  }

  load(p, createNamespace) {

    if (createNamespace) {
      this.loadNamespace(p)
      return
    }

    p = path.resolve(p)

    const ext = path.extname(p)

    const filePaths = [p]
    if (ext !== '.js')   filePaths.push(p+'.js')
    if (ext !== '.wk')   filePaths.push(p+'.wk')
    if (ext !== '.json') filePaths.push(p+'.json')

    let file = null

    for (let i = 0; i < filePaths.length; i++) {
      try {
        if (fs.statSync(filePaths[i]).isFile()) {
          file = filePaths[i]
          break
        }
      } catch(e) {}
    }

    if (file) {
      if (file.match(/package\.json/)) {
        this._package(require(file))
      } else {
        this._file(file)
      }

      return
    }

    // Is a directory
    if (fs.statSync(p).isDirectory()) {
      this._directory(p)
    }
  }

  loadNamespace(p) {

    p = path.resolve(p)
    let name = path.basename(p)
    name     = name.split('.').shift()

    const scope = this
    namespace(name, function() {
      scope.load( p )
    })

  }

  extra( name ) {
    const p = `${__dirname}/extras/${name}.js`
    if (this.exists( p )) {
      return require(p)
    }
  }

  _package(pkg) {

    const scripts = pkg.scripts || {}

    for (const key in scripts) {

      const parts = key.split(':')
      const name  = parts.pop()

      const createNS = function(parts) {
        const ns = parts.shift()
        namespace(ns, function() {
          if (parts.length > 0) {
            createNS(parts)
          } else {
            desc('[package.json]')
            command(name, scripts[key])
          }
        })
      }

      if (parts.length) createNS(parts.slice(0))
      else {
        desc('[package.json]')
        command(name, scripts[key])
      }
    }
  }

  _file(p) {
    return require(p)
  }

  _directory(p) {
    const files = fs.readdirSync(p).filter(function(file) {
      return file.match(/\Wkfile|.(js|wk)$/)
    })

    for (const i in files) {
      this._file(`${p}/${files[i]}`)
    }
  }

}

module.exports = new Importer