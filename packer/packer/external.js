const {isNpmPath} = require('./yoyo')
const path = require('path')
const {readAndParseJson} = require('./fs')
const {pathRoute} = require('./util')

class ExternalYlang{
    constructor(option){
        let externalCache = {}
        option.externalOption.forEach(item=>{
            goDeepExternal(item, option.ylangJsonPath, option.ylangDir, externalCache)
        })
        this.cache = externalCache
        this.hasEx = Object.keys(this.cache).length != 0
    }
    hasExternal(){
        return this.hasEx
    }
    match(filePath){
        if(!this.hasEx){
            return null;
        }
        // console.info('the filePath is ', filePath)
        let route = pathRoute(filePath)
        // console.info('the path router of '+ filePath, ' is', route)
        for(let i=route.length-1; i>0; i--){
            if(this.cache[route[i]]){
                return this.cache[route[i]]
            }
        }
        return null;
    }
    getCache(){
        return this.cache
    }
}


function goDeepExternal(externalItem, ylangFilepath, cmdDir, cache){
    if(isNpmPath(externalItem.root)){
        let targetYlang = path.resolve(cmdDir, './node_modules/'+externalItem.root+'/ylang.json5')
        let ylangJson = readAndParseJson(targetYlang)
        if(!ylangJson || !ylangJson.sandbox || !ylangJson.sandbox.sign || !ylangJson.sandbox.root){
            throw new Error('ylangjson.sandbox.sign/root must be specified:'+targetYlang)
        }
        let targetYlangSandboxRoot = path.resolve(path.dirname(targetYlang), ylangJson.sandbox.root)
        // 处理自身
        if(!cache[externalItem.sign]){
            cache[targetYlangSandboxRoot] = cache[externalItem.sign] = {
                root: targetYlangSandboxRoot,
                main: ylangJson.sandbox.main,
                ylang: targetYlang,
                sign: externalItem.sign
            }
        }
        // 处理npmExport
        if(ylangJson.npmExport && ylangJson.npmExport.length){
            ylangJson.npmExport.forEach(name=>{
                let npmdir = path.join(cmdDir, './node_modules/'+name)
                // 每个ylang工程导出的npmExternal不能重复
                if(cache[npmdir]){
                    throw new Error(`${targetYlang} wants to export npm package ${name}, where is already externals by ${cache[npmdir].sign}`)
                }
                cache[npmdir] = {
                    root: targetYlangSandboxRoot,
                    main: ylangJson.sandbox.main,
                    sign: externalItem.sign
                }
            })
        }
        if(ylangJson.external && ylangJson.external.length){
            ylangJson.external.forEach(innerItem=>{
                if(!isNpmPath(innerItem.root)){
                    throw new Error('ylang init error::cannot external a relative path in a npm external')
                }
                goDeepExternal(innerItem, targetYlang, cmdDir, cache)
            })
        }
    }else{
        // 相对路径的external
        let targetYlang = path.resolve(path.dirname(ylangFilepath), externalItem.root+'/ylang.json5')
        let ylangJson = readAndParseJson(targetYlang)
        if(!ylangJson || !ylangJson.sandbox || !ylangJson.sandbox.sign || !ylangJson.sandbox.root){
            throw new Error('ylangjson.sandbox.sign/root must be specified:'+targetYlang)
        }
        let targetYlangSandboxRoot = path.resolve(path.dirname(targetYlang), ylangJson.sandbox.root)
        // 处理自身
        if(!cache[externalItem.sign]){
            cache[targetYlangSandboxRoot] = cache[externalItem.sign] = {
                root: targetYlangSandboxRoot,
                main: ylangJson.sandbox.main,
                ylang: targetYlang,
                sign: externalItem.sign
            }
        }
        // 处理npmExport
        if(ylangJson.npmExport && ylangJson.npmExport.length){
            ylangJson.npmExport.forEach(name=>{
                // let npmdir = path.join(cmdDir, './node_modules/'+name)
                let npmdir = path.join(path.dirname(targetYlang), './node_modules/'+name)
                // 每个ylang工程导出的npmExternal不能重复
                if(cache[npmdir]){
                    throw new Error(`${targetYlang} wants to export npm package ${name}, where is already externals by ${cache[npmdir].sign}`)
                }
                cache[npmdir] = {
                    root: targetYlangSandboxRoot,
                    main: ylangJson.sandbox.main,
                    sign: externalItem.sign,
                }
            })
        }
        if(ylangJson.external && ylangJson.external.length){
            ylangJson.external.forEach(innerItem=>{
                goDeepExternal(innerItem, targetYlang, cmdDir, cache)
            })
        }
    }
}

module.exports.goDeepExternal = goDeepExternal
module.exports.ExternalYlang = ExternalYlang