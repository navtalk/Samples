import {humanConfig as config} from './config.js'
import { NavTalkMessageType as messageType } from './constants.js'
import {assertFunction, assertNonEmptyStr} from "../utils/assert.js";
import {ListenerManager} from "./ListenerManager.js";
import HistoryReader from "./HistoryReader.js";
export class NavTalkDigitalHuman{
    /**
     * apiKey
     * @param options
     */
    constructor(options = {}) {
        this.socket = null;
        this.config = {
            ...config,
            ...options
        }
        this.historyReader = HistoryReader(this.config.history)
        this.listenerManager = new ListenerManager()
        this.connect()
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
        const eventType = messageType[eventKey]
        assertNonEmptyStr(eventType,`must be a valid event: eventKey=${eventKey}`)
        return this.listenerManager.on(eventType,handler)
    };
    connect(){
        const socket = new WebSocket(config.serverUrl)
        this.socket = socket
        this.config.connectHandler({human:this})
        socket.onopen = () => {
            this.config?.socketOpenHandler({human:this})
            console.log('Connected to server')
        }
        socket.onmessage = (event) => {
            this.#onMessage(event)
            console.log('Received message:', event)
        }
        socket.onerror = (error) => {
            this.config.socketErrorHandler({human:this,event:error})
            console.error('WebSocket error:', error)
        }
        socket.onclose = () => {
            this.config?.socketCloseHandler({human:this})
            console.log('Disconnected from server')
        }
    };
    disconnect(){
        this.config.disconnectHandler({human:this})
    };
    send(data){
        this.socket.send(data)
    };
    #onMessage(event){
        const key = event.type
        this.listenerManager.emit(key,event)
    };
    loadLocalHistory(){
        return this.historyReader.get()
    }
}