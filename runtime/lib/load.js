"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var little_loader_1 = require("little-loader");
var cssCache = {};
var jsCache = {};
/**
 * 加载一个css文件，并在dom节点上打一个标记chunkname(如果提供的话)。
 * 遵照webpack4的源码，从webpack4的runtime源码copy过来的
 * @param url css文件的url
 * @param chunkName 这个css对应的chunkname, 可选
 */
function loadcss(cssurl, chunkName) {
    return new Promise(function (done, notDone) {
        if (cssCache[cssurl]) {
            return done({ ret: 0, data: null });
        }
        var existingLinkTags = document.getElementsByTagName("link");
        for (var i = 0; i < existingLinkTags.length; i++) {
            var tag = existingLinkTags[i];
            var dataHref = tag.getAttribute("data-href") || tag.getAttribute("href");
            if (tag.rel === "stylesheet" && (dataHref === cssurl)) {
                cssCache[cssurl] = true;
                if (chunkName && !tag.getAttribute('data-chunkname')) {
                    tag.setAttribute('data-chunkname', chunkName);
                }
                return done({ ret: 0, data: null });
            }
        }
        var existingStyleTags = document.getElementsByTagName("style");
        for (var i = 0; i < existingStyleTags.length; i++) {
            var tag = existingStyleTags[i];
            var dataHref = tag.getAttribute("data-href");
            if (dataHref === cssurl) {
                cssCache[cssurl] = true;
                if (chunkName && !tag.getAttribute('data-chunkname')) {
                    tag.setAttribute('data-chunkname', chunkName);
                }
                return done({ ret: 0, data: null });
            }
        }
        var linkTag = document.createElement("link");
        linkTag.rel = "stylesheet";
        linkTag.type = "text/css";
        linkTag.onload = function () {
            cssCache[cssurl] = true;
            done({ ret: 0, data: null });
        };
        linkTag.onerror = function (event) {
            // @ts-ignore
            var request = event && event.target && event.target.src || cssurl;
            var err = new Error("Loading CSS chunk " + (chunkName || '--') + " failed.\n(" + request + ")");
            err.code = "CSS_CHUNK_LOAD_FAILED";
            err.request = request;
            cssCache[cssurl] = false;
            linkTag.parentNode.removeChild(linkTag);
            done({
                ret: 1,
                msg: err.message,
                data: err
            });
        };
        linkTag.href = cssurl;
        if (linkTag.href.indexOf(window.location.origin + '/') !== 0) {
            linkTag.crossOrigin = "anonymous";
        }
        var head = document.getElementsByTagName("head")[0];
        head.appendChild(linkTag);
    });
}
exports.loadcss = loadcss;
function loadjs(url, chunkName) {
    return new Promise(function (done, notDone) {
        if (jsCache[url]) {
            return done({ ret: 0, data: null });
        }
        little_loader_1.default(url, function (err) {
            if (err) {
                console.error('loadjs network error:', err);
                return done({
                    ret: 1,
                    msg: 'loadjs network error',
                    data: err
                });
            }
            jsCache[url] = true;
            done({
                ret: 0,
                data: null
            });
        });
    });
}
exports.loadjs = loadjs;
