import Toast from "react-native-root-toast";
import NavtalkManager from "./NavtalkManager";
//import WebRTCManager from "./WebRTCManager";
import notificationManager from "./NotificationManager";
import RecordAudioManager from "./RecordAudioManager";
import { Platform } from "react-native";
import WebRTCManager from "./WebRTCManager";
import AsyncStorage from "@react-native-async-storage/async-storage";

class WebSocketManager{

  static instance;
  static getInstance() {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  webSocket = null
  
  //1.Connect to WebSocket.
  connectWebSocket(){
    if (this.webSocket?.readyState === WebSocket.OPEN){
      this.webSocket.close();
      this.webSocket = null;
    }
    var webSocket_url = ""
    if (NavtalkManager.characterId.length > 0){
      webSocket_url = `${NavtalkManager.navtalkBaseURL}?license=${encodeURIComponent(NavtalkManager.license)}&avatarId=${encodeURIComponent(NavtalkManager.characterId)}`
    }else{
      webSocket_url = `${NavtalkManager.navtalkBaseURL}?license=${encodeURIComponent(NavtalkManager.license)}&name=${encodeURIComponent(NavtalkManager.characterName)}`
    }
    this.webSocket = new WebSocket(webSocket_url)

    this.webSocket.onopen = (event) => {
      console.log("WebSocket connection successful.");
      notificationManager.emit('webSocketStatusChanged');
      this.sendFunctionCallMessage();
    };
    this.webSocket.onmessage = (event) => {
      this.handleMessage(event);
    };
    this.webSocket.onerror = (error) => {
      console.log("WebSocket--: ", error);
    };
     this.webSocket.onclose = (event) => {
      console.log("WebSocket--closed");
      notificationManager.emit('webSocketStatusChanged');
    };
  }

  //2.Disconnect WebSocket connection.
  disConnectWebSocket(){
    if (this.webSocket?.readyState === WebSocket.OPEN || this.webSocket?.readyState === WebSocket.CONNECTING){
       this.webSocket?.close();
       this.webSocket = null
    }
  }
  //3.Handle received message:
   handleMessage(event){
    //console.log("WebSocket--Handle received message: ",event);
    //3.1.conversation.connected.fail
    if (event._data){
       const event_data = JSON.parse(event._data);
      if (event_data.type === "conversation.connected.fail"){
         var conversation_connected_fail_message = "Connect websocket fail."
         if (typeof(event_data.message) === 'string' && event_data.message.length > 0){
           conversation_connected_fail_message = event_data.message;
         }
         console.log("WebSocket--received message--connect fail: ",conversation_connected_fail_message);
         Toast.show(conversation_connected_fail_message,{
            duration: Toast.durations.LONG,
            position: Toast.positions.CENTER,
            containerStyle: Platform.OS==='android'?{width:200}:undefined
          })
          return
      }
    }
    const event_data_object = JSON.parse(event.data);
    const event_data_object_type = event_data_object.type;
    console.log("received message--event_data_object_type:",event_data_object_type);
    //3.2.conversation.connected.success
    if (event_data_object_type === "conversation.connected.success"){
      //(1).save sessionId and  iceServers
      const iceServers = event_data_object.data.iceServers;
      WebRTCManager.iceServers = iceServers;
      //(2).If WebRTC is already connected or is in the process of connecting, it must be closed first.
      const sessionId = event_data_object.data.sessionId;
      WebRTCManager.targetSessionId = sessionId;
      console.log("WebRTCManager.iceServers:",WebRTCManager.iceServers);
      console.log("WebRTCManager.targetSessionId:",WebRTCManager.targetSessionId);
    }
    //3.3.realtime.session.created
    if (event_data_object_type === "realtime.session.created"){
        this.sendHistoryMessage();
    }
    //3.4.realtime.session.updated
    if (event_data_object_type === "realtime.session.updated"){
      notificationManager.emit('startRecordingAudio');
    }
    //3.5.realtime.conversation.item.input_audio_transcription.completed
    if (event_data_object_type === "realtime.conversation.item.input_audio_transcription.completed"){
      //User audio input ended.
      const content = event_data_object.data.content;
      notificationManager.emit("realtime.conversation.item.input_audio_transcription.completed",content);
    }
    //3.6.realtime.response.audio_transcript.done
    if (event_data_object_type === "realtime.response.audio_transcript.done"){
      //AI audio output ended.
      const content = event_data_object.data.content;
      notificationManager.emit("realtime.response.audio_transcript.done",content);
    }
    //3.7.realtime.response.function_call_arguments.done
    if (event_data_object_type === "realtime.response.function_call_arguments.done"){
      //Function Call back message
      this.handleFunctionCallMessage(event_data_object);
    }
    //3.8.WebRTC:
    //(1).webrtc.signaling.offer
    if (event_data_object_type === "webrtc.signaling.offer"){
      WebRTCManager.startConnectWebRTC(event_data_object);
    }
    //(2).webrtc.signaling.answer
    if (event_data_object_type === "webrtc.signaling.answer"){
      
    }
    //(3).webrtc.signaling.iceCandidate
    if (event_data_object_type === "webrtc.signaling.iceCandidate"){
      
    }
   }

   //4.Send history data：
    async sendHistoryMessage(){
      if (!NavtalkManager.isOrNotSaveHistoryChatMessages){return}
      try {
        const messages_string = await AsyncStorage.getItem("HistoryChatMessages");
        if (!messages_string) return;
        const messages_array = JSON.parse(messages_string);
        if (!Array.isArray(messages_array)) return;
        const userMessages = messages_array.filter(
          item => item.type === "user_input"
        );
        for (const value of userMessages) {
          const content_text = value.content || "";
          const message = {
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: content_text
                }
              ]
            }
          };
          this.webSocket?.send(JSON.stringify(message));
          console.log("Send history message: ",JSON.stringify(message));
        }
      }catch(error){
        console.log("sendHistoryMessage error:", error);
      }
    }

    //5.Send FunctionCall:
    sendFunctionCallMessage() {
      if (NavtalkManager.functionCallAllParams?.length > 0){
          const function_call_message = {
            type: "realtime.input_function_call",
            data: {
              content: JSON.stringify(NavtalkManager.functionCallAllParams)
            }
          };
          this.webSocket?.send(JSON.stringify(function_call_message));
          console.log("Send FunctionCall Message: ", JSON.stringify(function_call_message));
      }
    }
    //6.Handle FunctionCall back message：
    handleFunctionCallMessage(message){
      console.log("Handle FunctionCall back message: ",message);
      notificationManager.emit("recieveFunctionCallMessage", message);
    }
}
//Export class
export default WebSocketManager.getInstance();