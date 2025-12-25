import {assert, assertNonEmptyStr} from "../utils/assert.js";

export default function historyReader(options = {}){
    assertNonEmptyStr(options.type,`storage type must be a non-empty string: type=${options.type}`)
    return typeFactory(options.localKey,options.type)
}

const typeFactory = (key,type)=>{
    if(type === 'localStorage'){
        return {
            get(){
                const history = localStorage.getItem(key);
                return history ? JSON.parse(history) : [];
            },
            append(data){
                const history = this.get().push(data)
                localStorage.setItem(key, JSON.stringify(history));
            },
            clear(){
                localStorage.setItem(key,JSON.stringify([]));
            },
            getUserMessage(){
                const history = this.get();
                return history.filter(item => item.role === 'user');
            },
        }
    }else{
        assert(false,`storage type ${type} is not supported`)
    }
}