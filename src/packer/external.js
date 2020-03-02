
class ExternalYlang{
    constructor(){
        this.keys = new Set()
        this.arr = []
    }
    add(item){
        if(this.keys.has(item.req)){return}
        this.keys.add(item.req)
        this.arr.push(item)
    }
    match(filePath){
        let i = -1;
        this.arr.some((item, index)=>{
            if(filePath.indexOf(item.req) == 0){
                i = index
                return true
            }
            return false
        })
        if(i!=-1){
            return this.arr[i]
        }
        return null
    }
    isEmpty(){
        return this.arr.length == 0
    }
}

module.exports.ExternalYlang = ExternalYlang