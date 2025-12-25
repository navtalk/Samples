import {assert, assertNonEmptyStr} from "../utils/assert.js";

export const humanConfig =  {
    serverUrl: 'wss://transfer.navtalk.ai/wss/v2/realtime-chat',
    apiKey: '',
    model: 'gpt-realtime',
    name: 'Brain',
    videoElement: ()=> document.getElementById('character-avatar-video'),
    history: {
        localKey: 'realtimeChatHistory', //default localStorage key
        type: 'localStorage'
    }
}

export function createSocketFactory(options = {}) {
    const {serverUrl, apiKey, name, model} = options
    assertNonEmptyStr(serverUrl, 'serverUrl is required')
    assertNonEmptyStr(apiKey, 'apiKey is required')
    assertNonEmptyStr(name, 'name is required')
    const webSocket = new WebSocket(`${serverUrl}?license=${encodeURIComponent(apiKey)}&name=${encodeURIComponent(name)}&model=${encodeURIComponent(model)}`)
    webSocket.binaryType = 'arraybuffer'
    return webSocket
}