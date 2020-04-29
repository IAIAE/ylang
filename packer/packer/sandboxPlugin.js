const createHash = require("crypto").createHash;
const path = require('path')
const util = require('./util')

const PLUGIN_NAME = 'SandboxNamedModulePlugin'
const hashFunction = 'md5'
const hashDigest = 'base64'
const hashDigestLength = 7

function idWithSign(id, sign){
	return sign+'-'+id
}
const cmdDir = process.cwd()
function matchSandbox(sandboxConfig, module){
	// 防止不同pages下面的代码在互不相关的工程下模块名重复
	let rule = sandboxConfig
	if(!rule || !rule.root){
		throw new Error(`${PLUGIN_NAME}:: option.sandbox.root mustn't be null!!!`)
	}
	if(!module.resource){
		// 主要是有些库中的内部引用，一些稀奇古怪的引用方式。我们直接用absoluteId标记就好了
		// console.info('module.resource is nulll => ', module.request, module.userRequest, absoluteId)
		return null;
	}
	if(module.resource.indexOf(rule.root) == 0){
		return sandboxConfig
	}else{
		return null
	}
}

function isJsFile(path){
	return /\.jsx?$/.test(path)||/\.tsx?$/.test(path)
}

class SandboxNamedModulePlugin{
	constructor(options) {
		if(!options.sandbox){
			throw new Error(PLUGIN_NAME+':: the option.sandbox is required!')
		}
		this.options = Object.assign({
			debug: false,
		}, options);
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", (compilation) => {
			const usedIds = new Set();
			const exUsedIds = { }
			function getHashId(id, exUsedIds){
				const hash = createHash(hashFunction);
				hash.update(id);
				let hashId = hash.digest(hashDigest);
				let len = hashDigestLength;
				let cache = exUsedIds || usedIds
				while(cache.has(hashId.substr(0, len)))
					len++;
				return hashId.substr(0, len)
			}
			compilation.plugin("before-module-ids", (modules) => {
				modules.forEach((module) => {
					if(module.id === null && module.libIdent) {

						let absoluteId = module.libIdent({
							context: compiler.options.context
						});

						// external模块，我们需要将它的id变为标准的形式。
						if(module.external === true){
							if(!options.externals){
								module.id = absoluteId;  // 保持原有external_id的形式
								return;
							}
							if(!module.issuer.resource){
								throw new Error('module.issuser.reource is null===>', module)
							}
							// console.info('external in sandbox => ', module.issuer.resource, module.userRequest)
							// 获取这个external模块的路径
							let userRequest = module.userRequest
							let context = module.issuer.resource
							if(path.extname(context)){
								context = path.dirname(context)
							}
							// console.info('sandplugin find file ', context, userRequest)
							// 如果标记位external，那么是肯定找得到此文件的
							let userReqFilepath = util.getTheRealFile(context, userRequest, cmdDir)
							let exItem = options.externals.match(userReqFilepath)
							if(exItem){
								if(!exUsedIds[exItem.sign]){exUsedIds[exItem.sign] = new Set()}
								let relativePath = path.relative(exItem.root, userReqFilepath)
								if(('./'+relativePath) == exItem.main){
									// 这个文件是外部沙箱的入口模块，id是特殊的
									module.id = exItem.sign
									exUsedIds[exItem.sign].add(exItem.sign)
								}else{
									let hashId = this.options.debug?relativePath: getHashId(relativePath, exUsedIds[exItem.sign])
									module.id = idWithSign(hashId, exItem.sign)
									exUsedIds[exItem.sign].add(hashId)
								}
							}else{
								module.id = absoluteId;
							}
							return;
						}



						// 非external模块
						let rule = options.sandbox
						if(!rule.sign){
							throw new Error(`${PLUGIN_NAME}:: option.sandbox.sign mustn't be null!!!!`)
						}
						// 这个模块相对沙箱根路径的相对路径，作为模块id
						let relativeId = module.libIdent({
							context: rule.root
						})
						if(relativeId == rule.main){
							// 入口文件，模块id特殊指定
							module.id = rule.sign
							usedIds.add(rule.sign)
							return;
						}
						// console.info('the relative id is ====> ', relativeId)
						if(/^\.\//.test(relativeId)){
							relativeId = relativeId.substring(2)
						}
						// 所有文件都相对沙箱的root取模块id
						let hashId = this.options.debug?relativeId: getHashId(relativeId)
						module.id = idWithSign(hashId, rule.sign)
						usedIds.add(hashId)
						// if(!isJsFile(relativeId)){  // 不是js的文件，就直接取相对id
						// 	// todo: 这块儿逻辑虽然判断了，目前实际上这块儿功能不支持。我们不支持ylang外部引用.css文件之类的。
						// 	let hashId = getHashId(relativeId)
						// 	module.id = idWithSign(hashId, rule.sign)
						// 	usedIds.add(hashId)
						// }else if(/^\.\.\//.test(relativeId)){  // js文件，但在上级目录，很特殊的情况，姑且相对打包
						// 	let hashId = getHashId(relativeId)
						// 	module.id = idWithSign(hashId, rule.sign);
						// 	usedIds.add(hashId)
						// }else{
						// 	let hashId = getHashId(relativeId)
						// 	module.id = idWithSign(hashId, rule.sign)
						// 	usedIds.add(hashId)
						// }
						// if(rule){

						// }else{
						// 	// 文件不在沙箱目录中，分为3种情况
						// 	if(!isJsFile(absoluteId)){
						// 		// 非js文件，例如各种loader加载的less\css\html\png文件等等，也包括webpack编译生成了附加模块，例如（absoluteId=./node_modules/moment/locale sync recursive ^\.\/.*$），这种情况不需要给模块id做过多的处理，直接hash即可
						// 		let hashId = getHashId(absoluteId)
						// 		module.id = idWithSign(hashId, options.sandbox.sign)
						// 		usedIds.add(hashId)
						// 	}else if(/node_modules/.test(absoluteId)){
						// 		// node_modules中的npm包文件，相对node_modules文件夹取id
						// 		let ind = absoluteId.indexOf('node_modules')
						// 		let npmRelativePath = '.'+absoluteId.substring(ind)
						// 		let hashId = getHashId(npmRelativePath)
						// 		module.id = idWithSign(hashId, options.sandbox.sign)
						// 		usedIds.add(hashId)
						// 	}else{  // 非npm包文件，这些文件不会被外部ylang包引用，所以，只要取一个唯一id即可
						// 		let hashId = getHashId(absoluteId)
						// 		module.id = idWithSign(hashId, options.sandbox.sign+'-outer')
						// 		usedIds.add(hashId);
						// 	}
						// }
					}
				});
			});
		});
	}
}

module.exports = SandboxNamedModulePlugin;