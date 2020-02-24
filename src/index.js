const Packer = require('./packer')
const Runtime = require('./runtime')

const {loadChunk} = Runtime

module.exports = {
    Packer,
    Runtime,
    loadChunk,
}