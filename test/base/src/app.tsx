import React from 'react'
const style = require('./index.less')

type Props = {

}
export default class App extends React.Component<Props, any>{
    constructor(props){
        super(props)
    }

    render(){
        return <div className={style.root}>
            <div className={style.title}>Hello ylang!</div>
            <div className={style.line}></div>
            <div className={style.container}>
                this is container
            </div>
        </div>
    }
}