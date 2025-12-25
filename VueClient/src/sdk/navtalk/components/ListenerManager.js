export class ListenerManager {
    constructor() {
        this.events = {}
    }
    on(key, handler) {
        if (typeof handler !== 'function') {
            throw new TypeError('Handler must be a function');
        }
        this.events[key] ??= []
        if (!this.events[key].includes(handler)) {
            this.events[key].push(handler);
        }
        // Return the function for unsubscribing
        return ()=>{
            const index = this.events[key].indexOf(handler)
            if(index !== -1){
                this.events[key].splice(index, 1)
            }
        }
    };
    emit(key, data){
        this.events[key]?.forEach(handler => handler(data))
    }
}