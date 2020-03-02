module.exports.getDefaultOption = function(sandboxConfig){
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
        optimization: {
            splitChunks:{  // webpack会默认将node_modules中的打包出一个单独的vendor.chunk.js，ylang的本身就是为开发者提供的自由拆分chunk的工具，怎么拆分由开发者决定，打包器不做默认行为。所以我们要禁止webpack的默认拆分chunk行为。
                minChunks: 9999, // webpack 没有提供直接的手段禁止默认拆分行为，我们只能hack一下
            }
        },
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
                    { 
                        loader: 'babel-loader',
                        options: {
                            presets: ["babel-preset-env", "babel-preset-stage-0", "babel-preset-react"]
                        }
                    },
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
                            localIdentName: (sandboxConfig?`${sandboxConfig.sign}-`:'')+'[folder]_[local]-[hash:base64:5]',
                        },
                        localsConvention: 'camelCase',
                        importLoaders: 2,
                        sourceMap: false,
                    }
                }, {
                    loader: 'postcss-loader',
                    options: { 
                        sourceMap: true,
                        plugins: [
                            require('autoprefixer')
                        ]
                    }
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
    return defaultOption
}