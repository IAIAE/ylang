const fs = require('fs')

module.exports.tryReadSync = function(filepath){
    try{
        return fs.readFileSync(filepath, 'utf-8')
    }catch(e){
        return null
    }
}


module.exports.tryJSONParse = function(json){
    try{
        return JSON.parse(json)
    }catch(e){
        return null
    }
}

module.exports.readAndParseJson = function(filepath){
    try{
        let content = fs.readFileSync(filepath, 'utf-8')
        return JSON.parse(content)
    }catch(e){
        console.info(e)
        return null
    }
}