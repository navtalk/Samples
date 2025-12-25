import {HumanEvent, NavTalkMessageType, NavTalkMessageType as MessageType} from "./components/constants.js";
import {startRecording,stopRecording} from "./utils/audio.js";
import {socket,handleOffer, handleIceCandidate,handleAnswer} from './utils/webRTC.js'
export default function register(eventBus){
    socket.send = message=>eventBus.send(message)
    socket.videoElement = eventBus.config.videoElement
    // Send historical messages to the digital person
    eventBus.on(MessageType.REALTIME_SESSION_CREATED, ({data,human}) => {
        if(human.config.autoSendHistoryOnStart){
            human.historyReader.getUserMessage().forEach(msg => {
                const messageConfig = {
                    type: 'conversation.item.create',
                    item: {
                        type: 'message',
                        role: msg.role,
                        content: [
                            {
                                type: 'input_text',
                                text: msg.content
                            }
                        ]
                    }
                }
                human.send(JSON.stringify(messageConfig))
            })
        }
    })

    //Send audio messages to the digital person
    eventBus.on(MessageType.REALTIME_SESSION_UPDATED,({human})=>{
        startRecording((chunk)=>{
            human.send(JSON.stringify({
                type: NavTalkMessageType.REALTIME_INPUT_AUDIO_BUFFER_APPEND,
                data: { audio: chunk }
            }));
            human.emit(HumanEvent.NATIVE_RADIO,{
                data: {chunk},
                human
            })
        })
    })

    //Turn off the audio
    eventBus.on(HumanEvent.CLOSE,()=>{
        stopRecording()
    })
    
    // webrtc.signaling.offer
    eventBus.on(MessageType.WEB_RTC_OFFER, ({data,human}) => {
        console.log("WEB_RTC_OFFER:", data);
        handleOffer(data)
        eventBus.emit(HumanEvent.AUDIO_WILL_PLAY,{human})
    })

    eventBus.on(MessageType.WEB_RTC_ANSWER, ({data,human}) => {
        console.log("WEB_RTC_ANSWER:", data);
        handleAnswer(data)
    })

    // handleIceCandidate
    eventBus.on(MessageType.WEB_RTC_ICE_CANDIDATE, ({data,human}) => {
        console.log("WEB_RTC_ICE_CANDIDATE:", data);
        handleIceCandidate(data)
    })

    //HumanEvent.SOCKET_ERROR
    eventBus.on(HumanEvent.SOCKET_ERROR, ({error,human}) => {
        console.error("WebSocket connection failed. Common causes include an invalid API key, incorrect digital avatar name, or an unsupported AI model. Please verify these parameters and try again.", error);
        human.closeChannel()
    })
}

