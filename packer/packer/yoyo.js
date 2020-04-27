/**
 * 判断是否是npm包的引用
 * @param {*} req
 */
module.exports.isNpmPath = function isNpmPath(req){
    if(req.indexOf('.') == 0){ // 相对路径
        return false;
    }else if(req.indexOf(':\\') != -1){ // windows下的绝对路径
        return false
    }else if(req.indexOf('/') == 0){
        return false
    }else{
        return true
    }
}