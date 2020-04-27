"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var load_1 = require("./load");
function loadChunk(config) {
    return new Promise(function (done) {
        Promise.all([
            load_1.loadjs(config.url, config.module),
            load_1.loadcss(config.cssurl, config.module),
        ]).then(function (arr) {
            var jsret = arr[0];
            var cssret = arr[1];
            if (jsret.ret == 0 && cssret.ret == 0) {
                done(requireModule(config.module, config.url));
            }
            else if (jsret.ret != 0) {
                done(jsret);
            }
            else if (config.ignoreCssError) {
                // css加载失败，加载的组件会没有样式，同样渲染。
                done(requireModule(config.module, config.url));
            }
            else {
                // css 加载失败，不加载组件
                done(cssret);
            }
        });
    });
}
exports.loadChunk = loadChunk;
function requireModule(moduleName, url) {
    var data;
    try {
        // @ts-ignore
        data = __webpack_require__(moduleName);
    }
    catch (e) {
        console.error("after load. exec chunk's js error", e);
        return { ret: 1, msg: 'after chunk load, exec chunk js error', data: e };
    }
    if (data && data.__esModule) {
        return data.default ? { ret: 0, data: data.default } : { ret: 0, data: null };
    }
    else {
        return data ? { ret: 0, data: data } : { ret: 0, data: null };
    }
}
