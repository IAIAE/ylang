# tip
**只能在mac\linux环境使用，因为目前path判断是用uinx形式的“/”，没有支持windows上的c:\\情况**

# this
Ylang是一个前端javascript打包器，也可以认为是“微前端”的一种落地实现。它基于webpack，在此基础上提供了沙箱环境，进而落地“微前端”。注意它只针对浏览器环境下的js工程使用，不适用于nodejs工程。

到底什么是“微前端”呢？这个话题不得不在这里讨论一下。


# ylang做了什么
采用ylang打包的前端工程，都会封装进一个沙箱(称为sandbox)内。一个沙箱可以引用另一个沙箱内的资源。这样做就允许我们将一个大型的前端工程拆分成多个部分。一些沙箱负责统筹管理提供基础依赖(例如[ylang-demo-base](https://github.com/IAIAE/ylang-demo-base))，而另一些沙箱负责渲染页面，定制复杂纷繁的业务页面逻辑(例如[ylang-demo-page1](https://github.com/IAIAE/ylang-demo-page1))。不同沙箱页面可以用不同git管理，打包也是“独立”的。由于打包是独立的，也就不会造成自己的发布夹带了别人的“私货”或者bug。这在维护大型前端工程是很重要的一点。


# usage
最好参照demo工程：[ylang-demo-base](https://github.com/IAIAE/ylang-demo-base)。
以及demo子页面工程：[ylang-demo-page1](https://github.com/IAIAE/ylang-demo-page1)。

如果你想自己建一个工程，才看下面的内容：
新建一个前端工程，然后安装依赖
```
npm i ylang -S
npm i react react-dom antd -S
```
作为测试，我们同样安装了react、antd。

然后在工程的根目录新建`ylang.json5`文件，最简单的配置如下：
```json5
{
    "output": {
        "path": "./dist",  // 打包目标输出目录，
    },
    "tsConfig": "./tsconfig.json",   // 如果想用ts，开启这个配置
    "sandbox": {    // 沙箱配置
        "root": "./src",   // 沙箱的根目录
        "main": "./index.tsx",  // 沙箱的入口文件
        "sign": "first-base",   // 沙箱的全局唯一标识
    },
    "npmExport": [   // 如果此沙箱会导出一些npm模块，在这里配置
        "react",
        "antd",
        "moment",
        "react-dom",
    ],
    "customizedTestEntry": {
        "html": "./src/entry.html",   // 定义测试用的入口html文件，如果这是生产版本，这个入口文件也可以当做真正的html入口使用的，“test”在这里并无实际限制效用
        "entry": {
            "index": "./src/entry.ts",  // 定义测试用的入口js文件，如果这是生产版本，这个入口文件也可以当做真正的js入口使用
        },
    }
}
```

ylang实质上只是webpack的配置工具，打包采用webpack，并未做恶心的见不得人的封装，所以和以往webpack前端工程一样，创建`webpack.config.prod.js`和`webpack.config.dev.js`两个文件吧，其中代码如下：
```javascript
// webpack.config.prod.js
const {Packer} = require('ylang')

let webpackConfig = Packer.env('prod').config()

module.exports = webpackConfig
```
很简单不是？对于`webpack.config.dev.js`，只需要将`prod`改成`dev`即可。
新建对应的js和html，然后就可以run了:

```json
{
    "build": "webpack --config ./webpack.config.prod.js",
    "start": "webpack --progress --colors --watch --config ./webpack.config.dev.js"
}

```


