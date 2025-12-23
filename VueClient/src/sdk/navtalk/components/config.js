export const humanConfig =  {
    serverUrl: 'wss://transfer.navtalk.ai/wss/v2/realtime-chat',
    history: {
        localKey: 'realtimeChatHistory', //default localStorage key
        type: 'localStorage'
    },
    socketOpenHandler: ({human,event}) => {},
    socketCloseHandler: ({human,event}) => {},
    socketErrorHandler: ({human,event}) => {},
    connectHandler: ({human}) => {},
    disconnectHandler: ({human}) => {},
}