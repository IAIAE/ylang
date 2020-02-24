import loadjs from 'little-loader'
import {CommonReturn, loadChunkParameter} from './types'

const ylangChunkLoadCache = {}


export function loadChunk(config: loadChunkParameter): Promise<CommonReturn>{
    return new Promise((done, notDone)=>{
        if(ylangChunkLoadCache[config.url]){
            return done(requireModule(config.module, config.url))
        }
        loadjs(config.url, function(err){
            if(err){
                console.error('loadjs network error:', err)
                return done({
                    ret: 1,
                    msg: 'loadjs network error',
                    data: err
                })
            }
            ylangChunkLoadCache[config.url] = true;
            done(requireModule(config.module, config.url))
        })
    })
}

function requireModule(moduleName:string, url: string):CommonReturn{
    let data;
    try{
        // @ts-ignore
        data = __webpack_require__(moduleName)
    }catch(e){
        console.error(`after load. exec chunk's js error`, e)
        return {ret: 1, msg: 'after chunk load, exec chunk js error', data: e};
    }
    if(data && data.__esModule){
        return data.default?{ret: 0, data: data.default}:{ret: 0, data: null};
    }else{
        return data?{ret: 0, data: data}:{ret: 0, data: null};
    }
}