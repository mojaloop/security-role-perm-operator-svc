const yaml = require('js-yaml')
const fs = require('fs')

class Watch {
  constructor () {
    Watch.instance = this
    this.watches = []
  }

  sendResource (path) {
    const obj = yaml.load(fs.readFileSync(path, 'utf8'))
    for (const watch of this.watches) {
      watch('ADDED', obj)
    }
  }

  async watch (path, params, cb) {
    this.watches.push(cb)
  }

  static getInstance () {
    return Watch.instance
  }
}

module.exports = Watch
