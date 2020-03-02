const {Packer} = require('../../src')
const path = require('path')

let webpackConfig = Packer.externalPackage([
    {req: path.resolve(__dirname, './base'), sign: 'base'},
]).config({
    env: 'prod',
    output: {
        path: path.resolve(__dirname, './dist')
    },
    ts: true,
    tsConfigPath: path.resolve(__dirname, './tsconfig.json'),
    sandbox: {
        // 相对于root.dir指定的文件夹路径
        root: path.resolve(__dirname, './src'),
        main: './index.tsx',  // 入口文件，多见于导出模块什么的，可以不指定。如果不指定的话，就需要自己填写customizedTestEntry；指定了，testEntry才能根据指定的文件生成测试entry.js的代码
        sign: 'page1',  // sign必须全局唯一
    },
    // testEntry: 'react',
    customizedTestEntry: {   // optional
        html: path.resolve(__dirname, './src/entry.html'),
        entry: {
            index: path.resolve(__dirname, './src/entry.ts'),
        }
    },
})

module.exports = webpackConfig