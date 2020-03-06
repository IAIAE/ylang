const fs = require('fs')
const path = require('path')
const resolve = require("enhanced-resolve");
const chalk = require('chalk')

const myResolver = resolve.create.sync({
	// or resolve.create.sync
	extensions: [".js", ".ts", '.jsx', '.tsx'],
    mainFields: ['main'],
    modules: ["node_modules"],
    descriptionFiles: ["package.json"],
});

// const myResolver = ResolverFactory.createResolver({
// 	// Typical usage will consume the `fs` + `CachedInputFileSystem`, which wraps Node.js `fs` to add caching.
// 	fileSystem: new CachedInputFileSystem(fs, 4000),
//     extensions: [".js", ".ts", '.jsx', '.tsx'],
//     mainFields: ['main'],
//     modules: ["node_modules"],
//     descriptionFiles: ["package.json"],
// });

/**
 * 根据一个局部的文件路径，按照commonjs的模块resolve方式找到对应的文件
 */
function findFile(context, req){
    try{
        return myResolver(context, req)
    }catch(e){
        console.warn(chalk.bgYellow('Ylang warn =>')+` cannot resolve file with context:${context} req:${req}`)
        return null
    }
}

/**
 * 根据userRequest定位到具体的文件
 * @param {*} context   e.g. /Users/pro/test-project/src/component/btn/index.ts
 * @param {*} userRequest  e.g. './log.ts' / 'react' / 'utils/log.ts' / 'react/lib/test.ts'
 * @param {*} cmdDir  项目根目录，也就是./src所在的那个目录
 */
module.exports.getTheRealFile = function getTheRealFile(context, userRequest, cmdDir){
    // userRequest有三种格式
    // 1. 以./或者../开头的，是相对路径，我们可以很轻松找到相对的dir，如果文件名没有带上后缀，就用默认后缀去实际文件目录中找，确定后缀名，最终确定文件的全路径

    // 2. import t from 'utils' 这样不是相对路径开头的，但是src/下存在同名的目录src/util。就定位到这个目录，去找util/index或者util.js

    // 3. import t from 'react' 这样，不是以相对路径开头的，src下也不存在同名的文件夹，就去src/node_modules下去寻找。
    if(/\.\//.test(userRequest) || /\.\.\//.test(userRequest)){
        // 第一种情况
        return findFile(context, userRequest)
    }else{
        let filepath = findFile(path.join(cmdDir, './src/'), './'+userRequest)
        if(filepath){
            // 第二种情况
            return filepath
        }else{
            // 第三种情况
            return findFile(context, userRequest)
        }

    }
}



module.exports.pathRoute = function pathRoute(filepath, cmdDir){
    if(filepath[filepath.length-1]=='/'){
        filepath = filepath.slice(0, filepath.length-1);
    }
    let arr = filepath.split(path.sep)
    let result = []
    for(let i= arr.length; i>1; i--){
        let _path = arr.slice(0, i).join(path.sep)
        if(cmdDir && cmdDir == _path){
            break
        }
        result.push(_path)
    }
    return result
}