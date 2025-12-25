import {humanConfig as config,createSocketFactory} from './config.js'
import {HumanEvent, NavTalkMessageType as MessageType} from './constants.js'
import {assertFunction, assertNonEmptyStr} from "../utils/assert.js";
import {ListenerManager} from "./ListenerManager.js";
import HistoryReader from "./HistoryReader.js";
import register from "../register.js";
export class NavTalkDigitalHuman{
    /**
     * apiKey
     * @param options
     */
    constructor(options = {}) {
        this.socket = null;
        this.config = {...config, ...options}
        this.historyReader = HistoryReader(this.config.history)
        this.listenerManager = new ListenerManager()
        register(this)
    };
    /**
     *
     * @param eventKey
     * @param handler
     * @returns unsubscribe
     */
    on(eventKey,handler){
        assertNonEmptyStr(eventKey,`eventKey must be a non-empty string: eventKey=${eventKey}`)
        assertFunction(handler,`handler must be a function: eventKey=${eventKey}`)
        const eventType = reverseKV({...MessageType, ...HumanEvent})[eventKey]
        assertNonEmptyStr(eventType,`must be a valid event: eventKey=${eventKey}`)
        return this.listenerManager.on(eventKey,handler)
    };
    openChannel(){
        this.socket = createSocketFactory(this.config)
        this.socket.onopen = () => {
            console.log('Connected to server')
        }
        this.socket.onmessage = (event) => {
            this.#onMessage(event)
        }
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error)
        }
        this.socket.onclose = () => {
            console.log('Disconnected from server')
        }
        this.#loadHistoryMessage()
    };
    closeChannel(){
        try {
            if (this.socket) {
                this.socket.close()
            }
        }finally {
            this.emit(HumanEvent.CLOSE,{human:this})
        }
    };
    send(data){
        this.socket.send(data)
    };
    #onMessage(event){
        const responseData = JSON.parse(event.data)
        const { type:key } = responseData
        this.emit(key,{data:responseData.data,human:this})
    };
    emit(key,data){
        this.listenerManager.emit(key,data)
    };
    #loadHistoryMessage(){
        this.emit(HumanEvent.LOAD_HISTORY,{data: this.historyReader.get()})
    }
}

const reverseKV = (obj) =>
    Object.entries(obj).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {});