export class ListenerManager {
    constructor() {
        this.listenerManager = {}
    }
    on(key, handler) {
        this.listenerManager[key] ??= []
        this.listenerManager[key].push(handler)
        // Return the function for unsubscribing
        return ()=>{
            const index = this.listenerManager[key].indexOf(handler)
            if(index !== -1){
                this.listenerManager[key].splice(index, 1)
            }
        }
    };
    emit(key, data){
        this.listenerManager[key]?.forEach(handler => handler(data))
    }
}