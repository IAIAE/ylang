export type CommonReturn = {ret: 0, data: any}|{ret: 1, msg:string, data?: any}

export type loadChunkParameter = {
    /**
     * chunk的url  e.g. '//11.url.cn/asn/chunk8-23bkh8237.js'
     */
    url: string,
    /**
     * 这个chunk的入口模块名：e.g. cm-web-asn-video-sfdu2
     */
    module: string,
}