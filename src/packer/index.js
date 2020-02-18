const path = require('path')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const SandboxNamedModulePlugin = require('./SandboxNamedModulePlugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

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
                { loader: 'ts-loader', options: {
                    transpileOnly: true,
                }},
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

function checkOption(option){
    if(!option.entry){paramNeed('entry')}
}

function paramNeed(key){
    throw new Error(`option.${key} is required.`)
}

function packer(option){
    let config = {}
    checkOption(option)
    config = {...defaultOption}

    config.entry = option.entry

    config.plugins.unshift(new MiniCssExtractPlugin({
        filename: option.cssFilenamePattern || '[name].sand.[contenthash:10].css'
    }))

    if(option.sandbox){
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
        }))
    }
    if(option.ts == true){
        if(!option.tsConfigPath){
            throw new Error(`option.tsConfigPath must be specified when option.ts===true`)
        }
        if(!config.resolve.plugins){config.resolve.plugins = []}
        config.resolve.plugins.push(new TsconfigPathsPlugin({
            configFile: option.tsConfigPath
        }))
        config.extensions.push('.ts')
        config.extensions.push('.tsx')
        option.plugins.unshift(new ForkTsCheckerWebpackPlugin({
            checkSyntacticErrors: true
        }))
    }
}