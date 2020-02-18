const createHash = require("crypto").createHash;
const path = require('path')

const PLUGIN_NAME = 'SandboxNamedModulePlugin'

class SandboxNamedModulePlugin{
	constructor(options) {
		if(!options.sandbox || !options.sandbox.length){
			throw new Error(PLUGIN_NAME+':: the option.sandbox is required!')
		}
		this.options = Object.assign({
			root: null,
			sandbox: [],
			hashFunction: "md5",
			hashDigest: "base64",
			hashDigestLength: 7,
			debug: false,
		}, options);
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", (compilation) => {
			const usedIds = new Set();
			compilation.plugin("before-module-ids", (modules) => {
				modules.forEach((module) => {
					if(module.id === null && module.libIdent) {
						let id = module.libIdent({
							context: compiler.options.context
						});
						let hashId;
						let len;
						if(this.options.debug){
							hashId = id;
							len = hashId.length
						}else{	
							const hash = createHash(options.hashFunction);
							hash.update(id);
							hashId = hash.digest(options.hashDigest);
							len = options.hashDigestLength;
							while(usedIds.has(hashId.substr(0, len)))
								len++;	
						}


						// 防止不同pages下面的代码在互不相关的工程下模块名重复
						let i = 0;
						for(;i<options.sandbox.length;i++){
							let rule = options.sandbox[i]
							if(!rule || !rule.root){
								throw new Error(`${PLUGIN_NAME}:: option.sandbox[${i}].root mustn't be null!!!`)
							}
							let dir = rule.root
							// 兼容windows下的斜杠格式
							dir = dir.replace(/\//g, '[\\/\\\\]')
							let reg = new RegExp(dir)
							if(reg.test(module.resource)){
								break;
							}
						}
						if(i<options.sandbox.length){
							// target
							let rule = options.sandbox[i]
							if(!rule.sign){
								throw new Error(`${PLUGIN_NAME}:: option.sandbox[${i}].sign mustn't be null!!!!`)
							}
							module.id = rule.sign +'-'+ hashId.substr(0, len);
						}else{
							// 应用的文件不在sandbox中，不能将sandbox打包的模块名暴露到外部，这个时候加上任意一个sign，外加一些标记表明是外部文件，易于辨识即可。
							module.id = options.sandbox[0].sign + '-outer-' + hashId.substr(0, len);
						}	

						usedIds.add(hashId.substr(0, len));
					}
				});
			});
		});
	}
}

module.exports = SandboxNamedModulePlugin;