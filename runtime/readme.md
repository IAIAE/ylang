# this
ylang的runtime代码。runtime指，每一个借助`ylang`打包的工程，最终运行时，`ylang`都会提供一些方法，这些初始化方法帮助开发者在程序运行时合理的加载、管理ylang打包的chunk.js，这些代码就是runtime。runtime代码的主要功能包括：

- loadChunk，加载一个chunk。具体参数请看ts声明

```typescript
import { loadChunk } from 'ylang-runtime'

// 加载一个线上的js沙箱，如果有对应的css，也一并加载
// js必须是ylang打包生成的沙箱
loadChunk({
    url: '/page1.chunk-1d82f9fbf8.js',
    cssurl: '/page1.sand.d03e91aa76.css',
    module: 'page1',   // 沙箱的sign
}).then(_ => {
    // _.data就是沙箱入口文件的exports
    if (_.ret == 0) return _.data
    console.info('load error ', _.data)
    return null
})
```

