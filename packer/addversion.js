const fs = require('fs')
const path = require('path')
let targetFile = path.resolve(__dirname, './package.json')
let json = fs.readFileSync(targetFile, 'utf-8')

let config = JSON.parse(json)
let arr = config.version.split('.')
arr[2] = (+arr[2]) + 1
let nextVersion = arr.join('.')
config.version = nextVersion

let content = JSON.stringify(config, null, 4)
fs.writeFileSync(targetFile, content);