import { CommonReturn } from "./types";
import lloader from 'little-loader'

let cssCache = {}
let jsCache = {}

/**
 * 加载一个css文件，并在dom节点上打一个标记chunkname(如果提供的话)。
 * 遵照webpack4的源码，从webpack4的runtime源码copy过来的
 * @param url css文件的url
 * @param chunkName 这个css对应的chunkname, 可选
 */
export function loadcss(cssurl:string, chunkName?:string):Promise<CommonReturn> {
    return new Promise(function (done, notDone) {
        if(cssCache[cssurl]){
            return done({ret: 0, data: null})
        }

        let existingLinkTags = document.getElementsByTagName("link");
        for (let i = 0; i < existingLinkTags.length; i++) {
            let tag = existingLinkTags[i];
            let dataHref = tag.getAttribute("data-href") || tag.getAttribute("href");
            if (tag.rel === "stylesheet" && (dataHref === cssurl)) {
                cssCache[cssurl] = true
                if(chunkName && !tag.getAttribute('data-chunkname')){
                    tag.setAttribute('data-chunkname', chunkName)
                }
                return done({ret: 0, data: null});
            }
        }

        let existingStyleTags = document.getElementsByTagName("style");
        for (let i = 0; i < existingStyleTags.length; i++) {
            let tag = existingStyleTags[i];
            let dataHref = tag.getAttribute("data-href");
            if (dataHref === cssurl) {
                cssCache[cssurl] = true
                if(chunkName && !tag.getAttribute('data-chunkname')){
                    tag.setAttribute('data-chunkname', chunkName)
                }
                return done({ret: 0, data: null});
            }
        }
        let linkTag = document.createElement("link");
        linkTag.rel = "stylesheet";
        linkTag.type = "text/css";
        linkTag.onload = () => {
            cssCache[cssurl] = true
            done({ret: 0, data: null})
        };
        linkTag.onerror = function (event) {
            // @ts-ignore
            let request = event && event.target && event.target.src || cssurl;
            var err:any = new Error("Loading CSS chunk " + (chunkName || '--') + " failed.\n(" + request + ")");
            err.code = "CSS_CHUNK_LOAD_FAILED";
            err.request = request;
            cssCache[cssurl] = false
            linkTag.parentNode.removeChild(linkTag)
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
    })
}



export function loadjs(url: string, chunkName: string):Promise<CommonReturn>{
    return new Promise((done, notDone)=>{
        if(jsCache[url]){
            return done({ret: 0, data: null})
        }
        lloader(url, function(err){
            if(err){
                console.error('loadjs network error:', err)
                return done({
                    ret: 1,
                    msg: 'loadjs network error',
                    data: err
                })
            }
            jsCache[url] = true;
            done({
                ret: 0,
                data: null
            })
        })
    })
}
