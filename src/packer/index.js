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

const cmdDir = path.join(process.cwd(), './package.json')



let defaultOption = {
    mode: 'none',
    resolve: {
        mainFields: ['main'],  // very important!
        extensions: ['.js', '.jsx']
    },
    stats: {
        warningsFilter: /export .* was not found in/
    },
    target: 'web',
    module: {
        unknownContextCritical: false,
        rules: [{
            test: /\.html$/,
            use: [{
                loader: 'html-loader',
                options: {
                    // 支持 html `${}` 语法
                    interpolate: 1,
                    attrs: ['script:src']
                }
            }]
        }, {
            test: /(\.js(x?)$|\.ts(x?)$)/,
            exclude: /node_modules/,
            use: [
                { loader: 'babel-loader' },
                {
                    loader: 'ts-loader', options: {
                        transpileOnly: true,
                    }
                },
            ]
        }, {
            test: /\.less$/,
            use: [MiniCssExtractPlugin.loader, {
                loader: 'css-loader',
                options: {
                    modules: {
                        localIdentName: '[name]_[local]-[hash:base64:5]',
                    },
                    localsConvention: 'camelCase',
                    importLoaders: 2,
                    sourceMap: false,
                }
            }, {
                loader: 'postcss-loader',
                options: { sourceMap: true }
            }, {
                loader: 'less-loader',
                options: {
                    sourceMap: true
                }
            }]
        }, {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader']
        }, {
            test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
            loader: 'url-loader',
            options: {
                limit: 8192
            }
        }]
    },
    plugins: [
        new webpack.NamedChunksPlugin(chunk => (chunk.name || chunk.id)),
    ]
}

function checkOption(option) {
    if(!option.output || !option.output.path){ paramNeed('output.path')}
}

function paramNeed(key) {
    throw new Error(`option.${key} is required.`)
}


class ExternalYlang{
    constructor(){
        this.keys = new Set()
        this.arr = []
    }
    add(item){
        if(this.keys.has(item.req)){return}
        this.keys.add(item.req)
        this.arr.push(item)
    }
    match(filePath){
        let i = -1;
        this.arr.some((item, index)=>{
            if(filePath.indexOf(item.req) == 0){
                i = index
                return true
            }
            return false
        })
        if(i!=-1){
            return this.arr[i]
        }
        return null
    }
    isEmpty(){
        return this.arr.length == 0
    }
}

/**
 * 判断是否是npm包的引用
 * @param {*} req 
 */
function isNpmPath(req){
    if(path.indexOf('.') == 0){ // 相对路径
        return false;
    }else if(path.indexOf(':\\') != -1){ // windows下的绝对路径
        return false
    }else if(path.indexOf('/') == 0){
        return false
    }else{
        return true
    }
}

class Packer {
    static externalPackage(arr) {
        return new Packer(exArr)
    }
    static of(){
        return new Packer()
    }
    constructor(exArr){
        this.exArr = exArr
    }
    config(option) {
        /**
         * 打包的目标环境，dev模式基本上可以看成是正常的打包，
         * prod模式会进行sandbox拆分，细节相对复杂得多
         */
        let env = option.env || 'dev'
        /**
         * 外部模块的申明
         */
        let exArr = this.exArr || []
        
        let ylangExt = new ExternalYlang();
        if(exArr.length){
            let thisDependencies = JSON.parse(fs.readFileSync(path.join(cmdDir, './package.json'), 'utf-8')).dependencies

            // 遍历每个ex，找到req中的模块，读取它的package.json中的dependencies，一直找下去，直到叶子节点。这样就取到了所有外部依赖块儿应用名称的列表
            for(let i=0;i<exArr.length;i++){
                let item = exArr[i]
                if(isNpmPath(item.req)){
                    let jsonFile = path.join(cmdDir, './node_modules/'+item.req+'/package.json');
                    if(!fs.existsSync(jsonFile)){
                        throw new Error(`Ylang externals error:: no ${jsonFile} exist. `)
                    }
                    let node_module_dir = path.join(cmdDir, './node_modules')
                    ylangExt.add({
                        req: node_module_dir+'/'+item.req,
                        sign: item.sign,
                    })
                    let json = fs.readFileSync(jsonFile, 'utf-8')
                    json = JSON.parse(json)
                    Object.keys(json.dependencies).forEach(name=>{
                        if(thisDependencies[name]){
                            // 如果本地的package.json存在引用，就不要再吧这个包当做公共的。
                            console.warn(chalk.bgYellow('Ylang Warn::')+'same_dependencies: '+chalk.green(name)+` reason: node_modules/${item.req} has dependencies:'{name}', and you add dependencies.${name} in your package.json too. this will lead ylang to package ${name}'s code again, where the ${name}'s code is already in ${item.req}'s bundle.`)
                        }else{
                            // 本地package.json不存在引用，就将这个包当做externals
                            ylangExt.add({
                                req: node_module_dir+'/'+name,
                                sign: item.sign +'_nm'
                            })
                        }
                    })
                }else{
                    // 本地external ylang模块，这种情况是开发者知道某些模块是已经沙箱化的，但是没有发布npm，所以拷贝到本地了。也需要external化
                    ylangExt.add(item)
                }
            } 
        }

        let config = {}
        checkOption(option)
        config = { ...defaultOption }

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
        if (option.ts == true) {
            if (!option.tsConfigPath) {
                throw new Error(`option.tsConfigPath must be specified when option.ts===true`)
            }
            if (!config.resolve.plugins) { config.resolve.plugins = [] }
            config.resolve.plugins.push(new TsconfigPathsPlugin({
                configFile: option.tsConfigPath
            }))
            config.extensions.push('.ts')
            config.extensions.push('.tsx')
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
                    config.entry = option.customerEntry.entry
                    config.plugins.push(new HtmlWebpackPlugin({
                        title: 'Ylang test entry',
                        template: option.customerEntry.html,
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
                    throw new Error('when sandbox module is opened in dev env, either option.testEntry or option.customerEntry is needed');
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
                    config.entry = option.customerEntry.entry
                    config.plugins.push(new HtmlWebpackPlugin({
                        title: 'Ylang test entry',
                        template: option.customerEntry.html,
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
                    throw new Error('when sandbox module is opened in prod env, either option.testEntry or option.customerEntry is needed');
                }
            } else {
                config.entry = option.entry
            }
            if(!ylangExt.isEmpty()){
                // 监测一个文件是否是外部模块，这里很重要
                config.externals = [function(context, userRequest, callback){
                    let stat = fs.statSync(context)
                    if(stat.isDirectory()){
                        context = context + '/'
                    }
                    util.getTheRealFile(context, userRequest).then(filepath=>{
                        if(!filepath){
                            throw new Error(`cannot find file to determin weither is external!! context:${context}, userRequest:${userRequest}`)
                        }
                        let isExt = ylangExt.match(filepath)
                        if(isExt){
                            return callback(null, 'root ""') 
                        }
                        callback()
                    }) 
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
        } else {
            throw new Error(`option.env must be either 'dev' or 'prod'`);
        }
        return config
    }
}


