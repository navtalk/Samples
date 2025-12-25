export const NavTalkMessageType = Object.freeze({
    CONNECTED_SUCCESS: "conversation.connected.success",
    CONNECTED_FAIL: "conversation.connected.fail",
    CONNECTED_CLOSE: "conversation.connected.close",
    INSUFFICIENT_BALANCE: "conversation.connected.insufficient_balance",
    WEB_RTC_OFFER: "webrtc.signaling.offer",
    WEB_RTC_ANSWER: "webrtc.signaling.answer",
    WEB_RTC_ICE_CANDIDATE: "webrtc.signaling.iceCandidate",
    REALTIME_SESSION_CREATED: "realtime.session.created",
    REALTIME_SESSION_UPDATED: "realtime.session.updated",
    REALTIME_SPEECH_STARTED: "realtime.input_audio_buffer.speech_started",
    REALTIME_SPEECH_STOPPED: "realtime.input_audio_buffer.speech_stopped",
    REALTIME_CONVERSATION_ITEM_COMPLETED: "realtime.conversation.item.input_audio_transcription.completed",
    REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA: "realtime.response.audio_transcript.delta",
    REALTIME_RESPONSE_AUDIO_DELTA: "realtime.response.audio.delta",
    REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE: "realtime.response.audio_transcript.done",
    REALTIME_RESPONSE_AUDIO_DONE: "realtime.response.audio.done",
    REALTIME_RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE: "realtime.response.function_call_arguments.done",
    REALTIME_INPUT_AUDIO_BUFFER_APPEND: "realtime.input_audio_buffer.append",
    REALTIME_INPUT_TEXT: "realtime.input_text",
    REALTIME_INPUT_IMAGE: "realtime.input_image"
})

export const HumanEvent = Object.freeze({
    CONNECT: "connect",
    SEND: "send",
    RECEIVE: "receive",
    ERROR: "error",
    LOAD_HISTORY: "load_history",
    NATIVE_RADIO: 'native_radio',
    DIGITAL_HUMAN_VIDEO: 'receive_native_video',
    AUDIO_WILL_PLAY: 'audioWillPlay',
    CLOSE: 'close'
})