import {assert, assertNonEmptyStr} from "../utils/assert.js";

export default function historyReader(options = {}){
    assertNonEmptyStr(options.type,`storage type must be a non-empty string: type=${options.type}`)
    typeFactory(options.key,options.type)
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
            }
        }
    }else{
        assert(false,`storage type ${type} is not supported`)
    }
}