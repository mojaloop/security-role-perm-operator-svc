class KubeConfig {
  constructor () {
    KubeConfig.instance = this
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  loadFromDefault () {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  makeApiClient () {}

  static getInstance () {
    return KubeConfig.instance
  }
}

module.exports = KubeConfig
