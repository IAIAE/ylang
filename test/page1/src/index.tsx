import React from '../base/node_modules/react'
import {Button, message} from '../base/node_modules/antd'

const style = require('./index.less')
export type Props = {

}
export default class Page1 extends React.Component<Props, any>{
    constructor(props){
        super(props)
    }
    render(){
        return <div className={style.root}>
            this is page1!!!
            <Button onClick={_=> message.info('this is page1')} >antd的一个测试按钮</Button>
        </div>
    }
}