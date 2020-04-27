const path = require('path')
const fs = require('fs')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const SandboxNamedModulePlugin = require('./sandboxPlugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const webpackMerge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const chalk = require('chalk')
const util = require('./util')
const mustache = require('mustache')
const {getDefaultOption} = require('./option')
const {ExternalYlang, goDeepExternal} = require('./external')
const {readAndParseJson, tryReadSync} = require('./fs')
const {isNpmPath} = require('./yoyo')

const cmdDir = process.cwd()

function checkOption(option) {
    if(!option.output || !option.output.path){ paramNeed('output.path')}
    if(!option.env){paramNeed('env')}
}

function paramNeed(key) {
    throw new Error(`option.${key} is required.`)
}



class Packer {
    static config(option, ylangJsonPath) {
        if(!option){
            let ylangJsonPath = path.join(cmdDir, './ylang.json5')
            let optionObj = readAndParseJson(ylangJsonPath)
            if(!optionObj){
                throw new Error('ylang init error => no ylang.json5 in work_dir')
            }
            return this.config(optionObj, ylangJsonPath)
        }
        // if(typeof option == 'string'){
        //     // ylang.json的地址
        //     let optionObj = fs.readAndParseJson(option)
        //     if(!optionObj){
        //         throw new Error(`ylang init error => no ylang.json with path: ${option}`)
        //     }
        //     return this.config(optionObj, option)
        // }
        if(typeof option != 'object'){
            throw new Error(`ylang init error => ylang.json must be an object, but get:'${typeof option}'`)
        }
        if(!tryReadSync(ylangJsonPath)){
            throw new Error(`ylang init error => ylangJsonPath invalid. no such file: ${ylangJsonPath}`)
        }

        let ylangDir = path.dirname(ylangJsonPath)
        if(ylangDir != cmdDir){
            throw new Error('the ylang.json must in the root of workspace')
        }
        // 如果这个工程存在外部引用，去读取外部工程的ylang.json文件，
        // 目的是根据引用树，生成一个平铺开来的external列表，
        // 当webpack打包的时候，如果一个模块路径就在以上external列表中，会将对应模块认定为外部的，不去生成具体的模块代码。而是直接require一个模块id，该模块id是按照某种规则固定的。实际程序运行中，该模块id的代码已经加载的，去引用它就不会产生问题。
        // 这其实就是独立打包，运行时耦合的核心机制
        let ylangExt = option.external? new ExternalYlang({
            externalOption: option.external,
            ylangJsonPath: ylangJsonPath,
            ylangDir: ylangDir
        }):null;
        // let match = ylangExt.match('/Users/richcao/Desktop/career/git/ylang/test/page1/node_modules/moment/test/index.js')
        // console.info('the match is ', match)

        /**
         * 打包的目标环境，dev模式基本上可以看成是正常的打包，
         * prod模式会进行sandbox拆分，细节相对复杂得多
         */
        let env = option.env || 'dev'

        /**
         * 外部模块的申明
         */
        // let ylangExt = new ExternalYlang();
        // if(exArr.length){
        //     let thisDependencies = JSON.parse(fs.readFileSync(path.join(cmdDir, './package.json'), 'utf-8')).dependencies

        //     // 遍历每个ex，找到req中的模块，读取它的package.json中的dependencies，一直找下去，直到叶子节点。这样就取到了所有外部依赖块儿应用名称的列表
        //     for(let i=0;i<exArr.length;i++){
        //         let item = exArr[i]
        //         if(isNpmPath(item.req)){
        //             let jsonFile = path.join(cmdDir, './node_modules/'+item.req+'/package.json');
        //             if(!fs.existsSync(jsonFile)){
        //                 throw new Error(`Ylang externals error:: no ${jsonFile} exist. `)
        //             }
        //             let node_module_dir = path.join(cmdDir, './node_modules')
        //             ylangExt.add({
        //                 req: node_module_dir+'/'+item.req,
        //                 sign: item.sign,
        //             })
        //             let json = fs.readFileSync(jsonFile, 'utf-8')
        //             json = JSON.parse(json)
        //             Object.keys(json.dependencies).forEach(name=>{
        //                 if(thisDependencies[name]){
        //                     // 如果本地的package.json存在引用，就不要再吧这个包当做公共的。
        //                     console.warn(chalk.bgYellow('Ylang Warn::')+'same_dependencies: '+chalk.green(name)+` reason: node_modules/${item.req} has dependencies:'{name}', and you add dependencies.${name} in your package.json too. this will lead ylang to package ${name}'s code again, where the ${name}'s code is already in ${item.req}'s bundle.`)
        //                 }else{
        //                     // 本地package.json不存在引用，就将这个包当做externals
        //                     ylangExt.add({
        //                         req: node_module_dir+'/'+name,
        //                         sign: item.sign +'_nm'
        //                     })
        //                 }
        //             })
        //         }else{
        //             // 本地external ylang模块，这种情况是开发者知道某些模块是已经沙箱化的，但是没有发布npm，所以拷贝到本地了。也需要external化
        //             ylangExt.add(item)
        //         }
        //     }
        // }

        let config = {}
        checkOption(option)
        config = { ...getDefaultOption(option.sandbox)}

        config.plugins.unshift(new MiniCssExtractPlugin({
            filename: option.cssFilenamePattern || '[name].sand.[contenthash:10].css'
        }))


        if (option.sandbox) {
            config.plugins.push(new SandboxNamedModulePlugin({
                debug: option.debug || false,
                /**
                 * [{
                    // 相对于root.dir指定的文件夹路径
                    root: path.resolve(__dirname, '../src/pages/home-page'),
                    sign: 'home-page',  // sign必须全局唯一
                    }]
                 */
                sandbox: option.sandbox,
                externals: env=='dev'?null:ylangExt
            }))
        }

        if (option.tsConfig) {
            if (!config.resolve.plugins) { config.resolve.plugins = [] }
            config.resolve.plugins.push(new TsconfigPathsPlugin({
                configFile: path.join(ylangDir, option.tsConfig)
            }))
            config.resolve.extensions.push('.ts')
            config.resolve.extensions.push('.tsx')
            config.plugins.unshift(new ForkTsCheckerWebpackPlugin({
                checkSyntacticErrors: true
            }))
        }

        if (env == 'dev') {
            config = webpackMerge(config, {
                devtool: 'inline-source-map',
                plugins: [
                    new webpack.DefinePlugin({
                        'process.env.NODE_ENV': JSON.stringify('dev'),
                        '__dev': 'true'
                    }),
                ],
            })
            if (option.sandbox) {
                if (option.customizedTestEntry) {  // 用户手动指定了打包的测试html和入口js
                    config.entry = option.customizedTestEntry.entry
                    config.plugins.push(new HtmlWebpackPlugin({
                        title: 'Ylang test entry',
                        template: option.customizedTestEntry.html,
                        filename: 'index.html',
                    }))
                } else if (option.testEntry) {
                    // 如果用户没有手动指定entry，我们需要伪造一个html和entry.js用于测试用户编写的代码。这种情况，我们默认它是一个react工程。所以创造
                    // dev环境需要将react等包打进bundle.js包里面，不存在externals，且需要有一个完整的React.render()函数在entry.js里面。prod环境下面就不需要，直接动态import('xxxx')就行了。
                    if (option.testEntry == 'react') {
                        // 创造一个React工程的外壳，用于测试用户编写的沙箱组件
                        let entryFilePath = path.join(process.cwd(), './entry_.ts')
                        let jstmpl = fs.readFileSync(path.resolve(__dirname, '../tmpl/entry_react.mustache'), 'utf-8')
                        if(!option.sandbox.main){
                            console.error(chalk.bgRed('Ylang Error::')+'packer_config_error: '+chalk.green('sandbox.main')+` sandbox.main must specified when you use testEntry.`)
                            throw new Error('Ylang config exception')
                        }
                        let sandboxEntryMain = path.join(option.sandbox.root, option.sandbox.main)

                        let relFilePath = path.relative(entryFilePath, sandboxEntryMain)
                        let entryFileContent = mustache.render(jstmpl, {
                            divId: 'root',
                            relPath: relFilePath
                        })
                        fs.writeFileSync(entryFilePath, entryFileContent)
                        config.entry = {
                            index: entryFilePath
                        }
                        // 对应html文件
                        let entryHtmlPath = path.join(process.cwd(), './entry_.html')
                        let htmltmpl = fs.readFileSync(path.resolve(__dirname, '../tmpl/entry_html.mustache'), 'utf-8')
                        let entryHtmlContent = mustache.render(htmltmpl, {
                            divId: 'root',
                        })
                        fs.writeFileSync(entryHtmlPath, entryHtmlContent)
                        config.plugins.push(new HtmlWebpackPlugin({
                            title: 'Ylang test entry',
                            template: entryHtmlPath,
                            filename: 'index.html',
                        }))
                    } else {
                        throw new Error('no supportted option.testEntry type:: ' + option.testEntry)
                    }
                } else {
                    throw new Error('when sandbox module is opened in dev env, either option.testEntry or option.customizedTestEntry is needed');
                }
            } else {
                config.entry = option.entry
            }

            config.output = Object.assign({
                filename: '[name].bundle.js',
                publicPath: '/',
                chunkFilename: '[name].chunk.js',
                chunkLoadTimeout: 60000,
                jsonpFunction: 'Ylang',
                crossOriginLoading: "anonymous",
            }, option.output)
            if(/^\./.test(config.output.path)){
                // 相对路径转绝对路径
                let abpath = path.join(ylangDir, config.output.path)
                config.output.path = abpath
            }

        } else if (env == 'prod') {
            config = webpackMerge(config, {
                optimization: {
                    minimize: true
                },
                plugins: [
                    new webpack.DefinePlugin({
                        'process.env.NODE_ENV': JSON.stringify('prod'),
                        '__dev': 'false',
                    }),
                    // 生成一个pageRoute.json文件，包含所有chunk的索引信息，所有chunk的url都是`${urlPrefix}/${filename}.js`
                    // new chunkListPlugin({
                    //   urlPrefix: chunkPublicPath
                    // }),
                ]
            })
            if (option.sandbox) {
                if (option.customizedTestEntry) {
                    // 用户手动指定了打包的测试html和入口js
                    // 如果是prod环境，最好禁止用自定义的entry，因为会出错（比如没有用动态import什么的），最好用Ylang自动生成的。
                    config.entry = option.customizedTestEntry.entry
                    config.plugins.push(new HtmlWebpackPlugin({
                        title: 'Ylang test entry',
                        template: option.customizedTestEntry.html,
                        filename: 'index.html',
                    }))
                } else if (option.testEntry) {
                    // 如果用户没有手动指定entry，我们需要伪造一个html和entry.js用于测试用户编写的代码。这种情况，我们默认它是一个react工程。所以创造
                    // dev环境需要将react等包打进bundle.js包里面，不存在externals，且需要有一个完整的React.render()函数在entry.js里面。prod环境下面就不需要，直接动态import('xxxx')就行了。
                    if (option.testEntry == 'react') {
                        // 创造一个React工程的外壳，用于测试用户编写的沙箱组件
                        let entryFilePath = path.join(process.cwd(), './entry_.ts')
                        let jstmpl = fs.readFileSync(path.resolve(__dirname, '../tmpl/entry_react.mustache'), 'utf-8')
                        if(!option.sandbox.main){
                            console.error(chalk.bgRed('Ylang Error::')+'packer_config_error: '+chalk.green('sandbox.main')+` sandbox.main must specified when you use testEntry.`)
                            throw new Error('Ylang config exception')
                        }
                        let sandboxEntryMain = path.join(option.sandbox.root, option.sandbox.main)

                        let relFilePath = path.relative(entryFilePath, sandboxEntryMain)
                        let entryFileContent = mustache.render(jstmpl, {
                            relPath: relFilePath
                        })
                        fs.writeFileSync(entryFilePath, entryFileContent)
                        config.entry = {
                            index: entryFilePath
                        }
                        // 按理说sandbox的生产版本不需要html文件，生成起来放着吧
                        let entryHtmlPath = path.join(process.cwd(), './entry_.html')
                        let htmltmpl = fs.readFileSync(path.resolve(__dirname, '../tmpl/entry_html.mustache'), 'utf-8')
                        let entryHtmlContent = mustache.render(htmltmpl, {
                            divId: 'root',
                        })
                        fs.writeFileSync(entryHtmlPath, entryHtmlContent)
                        config.plugins.push(new HtmlWebpackPlugin({
                            title: 'Ylang test entry',
                            template: entryHtmlPath,
                            filename: 'index.html',
                        }))
                    } else {
                        throw new Error('no supportted option.testEntry type:: ' + option.testEntry)
                    }
                } else {
                    throw new Error('when sandbox module is opened in prod env, either option.testEntry or option.customizedTestEntry is needed');
                }
            } else {
                config.entry = option.entry
            }
            if(ylangExt && ylangExt.hasExternal()){
                // 监测一个文件是否是外部模块，这里很重要
                config.externals = [function(context, userRequest, callback){
                    let stat = fs.statSync(context)
                    if(stat.isDirectory()){
                        context = context + '/'
                    }
                    // console.info('isExternal find file, ', context, userRequest)
                    if(ylangExt.match(context)){
                        return callback(null, 'root ""')
                    }
                    let filepath = util.getTheRealFile(context, userRequest, cmdDir)
                    if(!filepath){
                        // 如果没有，遇到一些情况是第三方npm包中的代码，引用一个根本没有的lib，try一下，如果异常又引用另外一个。这样，总会存在一个userRequest不存在的情况。所以降级一下，如果一个filepath不存在，就监测context是不是external，如果context不在external里面，就认为此模块不是external
                        console.warn(chalk.bgYellow('Ylang WARN ===> ')+`cannot find file to determin weither is external!! context:${context}, userRequest:${userRequest}`)
                        return callback()
                    }
                    let isExt = ylangExt.match(filepath)
                    if(isExt){
                        return callback(null, 'root ""')
                    }
                    callback()
                }]
            }
            config.output = Object.assign({
                filename: '[name].sandbox-[chunkhash:10].js',
                publicPath: '/',
                chunkFilename: '[name].chunk-[chunkhash:10].js',
                chunkLoadTimeout: 60000,
                jsonpFunction: 'Ylang',
                crossOriginLoading: "anonymous",
            }, option.output)
            if(/^\./.test(config.output.path)){
                // 相对路径转绝对路径
                let abpath = path.join(ylangDir, config.output.path)
                config.output.path = abpath
            }
        } else {
            throw new Error(`option.env must be either 'dev' or 'prod'`);
        }
        return config
    }
}




module.exports = Packer