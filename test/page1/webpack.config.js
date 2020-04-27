const {Packer} = require('../../src')
const path = require('path')

let webpackConfig = Packer.config()

// console.info('webpack config is ', webpackConfig)

module.exports = webpackConfig