import { useEffect, useRef, useState } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions, Platform, FlatList} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import NavtalkManager from "../model/NavtalkManager";
import WebSocketManager from "../model/WebSocketManager";
import notificationManager from "../model/NotificationManager";
import RecordAudioManager from "../model/RecordAudioManager";
import Toast from "react-native-root-toast";
import  { useAudioRecorder }  from  '@siteed/audio-studio' ; 
import WebRTCManager from "../model/WebRTCManager";
import { RTCView} from "react-native-webrtc";
import inCallManager from "react-native-incall-manager";
import { check, PERMISSIONS, request, RESULTS } from "react-native-permissions";
import CameraManager from "../model/CameraManager";
import { Camera, useCameraPermission, usePhotoOutput, useCameraDevices, useFrameOutput} from 'react-native-vision-camera'
import RNFS from 'react-native-fs';
import { center, Skia, translate } from '@shopify/react-native-skia';
import RNHeicConverter from 'react-native-heic-converter';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ImageResizer from 'react-native-image-resizer';

export default function ChatScreen({ navigation }){

    const screen = Dimensions.get('window');
    const insets = useSafeAreaInsets();
     
    // Execute:
    // Initialize tasks
    // Request microphone permission
    // Request camera permission
    // Retrieve saved message history from local storage
    useEffect(()=>{
        const initUI = async () => {
            await fetchAvatarDetailInfo();
            await requestMicrophonePermission();
            await requestCameraPermission();
            await fetchMessagesFromLocal();
        }
        initUI(); 
    },[]);
    //Listen for notifications:
    useEffect(()=>{
     const listener1 = notificationManager.addListener('webSocketStatusChanged',(data)=>{
        console.log('Received notification - webSocketStatusChanged');
        updateNavtalkCallStatus();
     });
     const listener2 = notificationManager.addListener('WebRTCStatusChanged',(data)=>{
        console.log('Received notification - WebRTCStatusChanged');
        updateNavtalkCallStatus();
     });
     const listener3 = notificationManager.addListener('startRecordingAudio',(data)=>{
        console.log('Received notification - startRecordingAudio');
        startRecordingAudio();
     });
     const listener4 = notificationManager.addListener('needWebSocketSendMessage',(data)=>{
        console.log(`Received notification - needWebSocketSendMessage - ${data}`);
        WebSocketManager.webSocket?.send(data);
     });
     const listener5 = notificationManager.addListener('nowNeedShowRemoteRenderView',(data)=>{
        console.log(`Received notification - nowNeedShowRemoteRenderView`);
         if (WebRTCManager.current_remoteStream){
            setRemoteStream(WebRTCManager.current_remoteStream);
         }
     });
     const listener6 = notificationManager.addListener('realtime.conversation.item.input_audio_transcription.completed',(data)=>{
        console.log("Received notification - User input audio ended:", data);
        handleUserInputMessage(data);
     });
     const listener7 = notificationManager.addListener('realtime.response.audio_transcript.done',(data)=>{
        console.log("Received notification - AI audio output ended:", data);
        handleAIOutputMessage(data);
     });
     const listener8 = notificationManager.addListener('recieveFunctionCallMessage',(data)=>{
        console.log("Received notification - FunctionCall related callback:", data);
        handleFunctionCallMessage(data);
     });
     

     return (()=>{
        listener1.remove();
        listener2.remove();
        listener3.remove();
        listener4.remove();
        listener5.remove();
        listener6.remove();
        listener7.remove();
     });
    },[]);

    // 1. Get Avatar details information:
    const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
    async function fetchAvatarDetailInfo() {
        try{
            var full_url = ""
            if (NavtalkManager.characterId.length > 0){
                full_url = `${NavtalkManager.fetchAvatarInfoById}${encodeURIComponent(NavtalkManager.characterId)}`;
            }else{
                full_url = `${NavtalkManager.fetchAvatarInfoByName}${encodeURIComponent(NavtalkManager.characterName)}`;
            }
            const response = await fetch(full_url,{
                method: 'GET',
                headers:{
                    'Content-Type': 'application/json',
                    'license': NavtalkManager.license
                }
            });
            const data = await response.json();
            console.log('Fetch avatar detail success:', data);
            if (data.data?.url && data.data?.url?.length > 0 && data.data?.providerName && data.data?.providerName?.length > 0){
               NavtalkManager.avatar_image_url = data.data?.url;
               setBackgroundImageUrl(NavtalkManager.avatar_image_url);
               NavtalkManager.avatar_provider_type = data.data?.providerName;
               console.log('Avatar image url:', NavtalkManager.avatar_image_url);
               console.log('Avatar provider type:', NavtalkManager.avatar_provider_type);
            }
        }catch(error){
            console.log('Fetch avatar detail failed:', error);
        }
    }

    //2.Update Navtalk call status based on WebSocket and WebRTC status
    function updateNavtalkCallStatus(){
        //WebSocket.CONNECTING, OPEN, CLOSING, CLOSED
        const webSocket_readyState = WebSocketManager.webSocket?.readyState ?? "none";
        //new, checking, connected, completed, failed, disconnected, closed
        const webRTC_iceState = WebRTCManager.peerConnection?.iceConnectionState ?? "none";
        //NavtalkManager.navtalk_call_status: on, off, connecting
        if (webSocket_readyState === WebSocket.OPEN && (webRTC_iceState === "connected" || webRTC_iceState === "completed")){
            NavtalkManager.navtalk_call_status =  "on";
            updateCallStatusUI();
        } 
        //console.log("-->: ", webSocket_readyState);
        //console.log("-->: ", webRTC_iceState);
        if (webSocket_readyState === WebSocket.CLOSED || webSocket_readyState === WebSocket.CLOSING){ 
            if (webRTC_iceState === "none" || webRTC_iceState === "failed" || webRTC_iceState === "disconnected" || webRTC_iceState === "closed"){
                NavtalkManager.navtalk_call_status =  "off";
                updateCallStatusUI();
            }else if (webRTC_iceState === "checking"){
               WebRTCManager.disconnectWebRTC();
               NavtalkManager.navtalk_call_status =  "off";
               updateCallStatusUI();
            }
        }
        //Exception state:
        if (webSocket_readyState === WebSocket.OPEN && webRTC_iceState === "disconnected"){
           WebSocketManager.disConnectWebSocket();
        } 
    }
    // 3. Update UI based on Navtalk status
    const [callStatusIcon, setCallStatusIcon] = useState(require('../images/navtalk_off.png'));
    const [callStatusTitle, setCallStatusTitle] = useState("Call");
    const [remoteStream, setRemoteStream] = useState(null);
    const [remoteStreamDisplay, setRemoteStreamDisplay] = useState(false);
    function updateCallStatusUI(){
        console.log("Update UI -- current call status:", NavtalkManager.navtalk_call_status);
        if (NavtalkManager.navtalk_call_status === "off"){
             setCallStatusIcon(require('../images/navtalk_off.png'));
             setCallStatusTitle("Call");
             setRemoteStream(null);
             setRemoteStreamDisplay(false);

             stopRecordingAudio();
             setShowMicrophoneButton(false);
             RecordAudioManager.record_audio_status = false;
             setMicrophoneStatusIcon(require("../images/micphone_on.png"));

             stopCaptruePhoto();
             setShowCameraButton(false);
             CameraManager.camera_capture_status = false;
             setCameraStatusIcon(require("../images/camera_off.png"));
        }else if (NavtalkManager.navtalk_call_status === "connecting"){
            setCallStatusIcon(require('../images/navtalk_connecting.png'));
            setCallStatusTitle("Connecting…");
            setRemoteStream(null);
            setRemoteStreamDisplay(false);

            stopRecordingAudio();
            setShowMicrophoneButton(false);

             stopCaptruePhoto();
            setShowCameraButton(false);
        }else{
            setCallStatusIcon(require('../images/navtalk_on.png'));
            setCallStatusTitle("Hang Up");
            if (WebRTCManager.current_remoteStream){
                setTimeout(()=>{
                    setRemoteStreamDisplay(true);
                },400);
            }

            setShowMicrophoneButton(true);
            if (enableOfMicrophoneButton_Ref.current === true){
                RecordAudioManager.record_audio_status = true;
                setMicrophoneStatusIcon(require("../images/micphone_on.png"));
            }else{
                RecordAudioManager.record_audio_status = false;
                setMicrophoneStatusIcon(require("../images/micphone_off.png"));
            }

            setShowCameraButton(true);
        }
    }
    // 4. Click Call button
    function clickCallStatusButton(){
        if (NavtalkManager.navtalk_call_status === "off"){
            console.log(`Click Call button --> status: ${NavtalkManager.navtalk_call_status} --> start connecting`);
             if (NavtalkManager.avatar_provider_type.length <= 0){
                Toast.show('Please fetch avatar info first.',{
                    duration: Toast.durations.LONG,
                    position: Toast.positions.CENTER,
                    containerStyle: Platform.OS==='android'?{width:200}:undefined
                })
                return
            }
            WebSocketManager.connectWebSocket();
            NavtalkManager.navtalk_call_status = "connecting";
            updateCallStatusUI();
        }else if (NavtalkManager.navtalk_call_status === "connecting"){
            console.log(`Click Call button --> status: ${NavtalkManager.navtalk_call_status} --> disconnect`);
            WebRTCManager.disconnectWebRTC();
            WebSocketManager.disConnectWebSocket();
            NavtalkManager.navtalk_call_status = "off";
            updateCallStatusUI();
        }else if (NavtalkManager.navtalk_call_status === "on"){
            console.log(`Click Call button --> status: ${NavtalkManager.navtalk_call_status} --> disconnect`);
            WebRTCManager.disconnectWebRTC();
            WebSocketManager.disConnectWebSocket();
            NavtalkManager.navtalk_call_status = "off";
            updateCallStatusUI();
        }
    }
   
   // 5. Audio recording
   const { startRecording, stopRecording, isRecording } = useAudioRecorder();
   const haveSetSpeaker_ref = useRef(false);
   // 5.1 Start recording audio
   async function startRecordingAudio(){
    if (enableOfMicrophoneButton_Ref.current===false){
        console.log("No microphone permission, cannot start recording");
        return;
    }
    console.log("Start recording");
     try {
       await startRecording({
         sampleRate: 16000,   
         channels: 1,        
         encoding: "pcm_16bit", 
         streamFormat: 'float32',
         //5.2.
         onAudioStream: async (event) => {
            handleRecoredAudioData(event);
            if (haveSetSpeaker_ref.current == false){
                RecordAudioManager.mustSpeaker();
                haveSetSpeaker_ref.current = true;
            }
         }
       });
       RecordAudioManager.mustSpeaker();
     } catch (e) {
       console.log("startRecording error: ",e)
     }
   }
   // 5.2 Handle recorded audio data
   function handleRecoredAudioData(event){
    if (!RecordAudioManager.record_audio_status){
        return;
    }
    const float32 = event.data;
    const pcm16 = RecordAudioManager.floatTo16BitPCM(float32);
    //
    //const base64 = RecordAudioManager.arrayBufferToBase64(pcm16);
     //
     const chunks = splitPCM16(pcm16, 3200); // 20ms ~ 100ms
     chunks.forEach((chunk, index) => {
        const base64 = RecordAudioManager.arrayBufferToBase64(chunk);
        const event_message = {
            type: "realtime.input_audio_buffer.append",
            data: {
               audio: base64
            }
        };
        WebSocketManager.webSocket?.send(JSON.stringify(event_message));
        console.log("sendAudio: ", JSON.stringify(event_message).length);
     });
   }
   // Split PCM data
   function splitPCM16(buffer, chunkSize = 3200) {
    const result = [];
    const uint8 = new Uint8Array(buffer);
    for (let i = 0; i < uint8.length; i += chunkSize) {
        result.push(uint8.slice(i, i + chunkSize));
    }
    return result;
   }
  // 5.3 Stop recording audio
   async function stopRecordingAudio() {
    console.log("Stop recording");
    haveSetSpeaker_ref.current = false;
     if (isRecording){ 
        try{
            await stopRecording();
        }catch(error){
         console.log("stopRecording error:", error);
        }
      }
   }
  // 6. Microphone button
  const [showMicrophoneButton, setShowMicrophoneButton] = useState(false);
  const [enableOfMicrophoneButton, setEnableOfMicrophoneButton] = useState(false);
  const enableOfMicrophoneButton_Ref = useRef(false);
  const [microphoneStatusIcon, setMicrophoneStatusIcon] = useState(require("../images/micphone_on.png"))
  function clickMicrophoneStatusButton(){
    if (!enableOfMicrophoneButton_Ref.current){
        return
      }
    RecordAudioManager.record_audio_status = !RecordAudioManager.record_audio_status
    if (RecordAudioManager.record_audio_status){
        setMicrophoneStatusIcon(require("../images/micphone_on.png"));
    }else{
        setMicrophoneStatusIcon(require("../images/micphone_off.png"));
    }
  }

  // 7. Camera button
  const [showCameraButton, setShowCameraButton] = useState(false);
  const [enableOfCameraButton, setEnableOfCameraButton] = useState(false);
  const enableOfCameraButton_Ref = useRef(false);
  const [cameraStatusIcon, setCameraStatusIcon] = useState(require("../images/camera_off.png"))
  const [showCameraPreView, setShowCameraPreView] = useState(false);
  function clickCameraButton(){
      if (!enableOfCameraButton_Ref.current){
        return
      }
      CameraManager.camera_capture_status = !CameraManager.camera_capture_status;
      if (CameraManager.camera_capture_status){
        setCameraStatusIcon(require("../images/camera_on.png"));
        setShowCameraPreView(true);
        setShowSwitchDeviceDirectionButton(true);
        startCaptruePhoto();
      }else{
        setCameraStatusIcon(require("../images/camera_off.png"));
         stopCaptruePhoto();
      }
  }
   // 7.1 Front / Back camera switch
   const [deviceDirection, setDeviceDirection] = useState('back');
   const deviceDirection_Ref = useRef('back');
   const [showSwitchDeviceDirectionButton, setShowSwitchDeviceDirectionButton] = useState(false);
   function clickSwitchDeviceDirectionButon(){
    if (deviceDirection_Ref.current === 'back'){
        setDeviceDirection('front');
        deviceDirection_Ref.current = 'front';
    }else{
        setDeviceDirection('back');
        deviceDirection_Ref.current = 'back';
    }
   }

  // 7.2 Capture video frames
   const photoOutput = usePhotoOutput({});
   var captrueImageTimer_ref = useRef(null);
   // Capture photo every 1 second
   async function startCaptruePhoto() {
    const capturePhoto = async () => {
        // Important issue: payload cannot be too large, otherwise WebRTC may fail or disconnect
        // Recommended compression quality: 0.3
        const photoFile = await photoOutput.capturePhotoToFile(
            {flashMode: 'off', enableShutterSound: false},{}
        )
        console.log("Captured one frame");
        try{
            var jpegPath = "";
            if (Platform.OS === 'ios'){
                // Get HEIC file path
                const photoFile_path = photoFile.filePath;
                // Convert HEIC to JPEG
                const result = await RNHeicConverter.convert({
                    path: photoFile_path,
                    quality: 1,
                    extension: 'jpg'
                });
                jpegPath = result.path;
            }else{
                 // Compress image size (important for upload stability)
                const compressed = await ImageResizer.createResizedImage(
                    photoFile.filePath,
                      960, 
                      540,
                      'JPEG',
                      30        // 0.3
                );
                // Convert JPEG to Base64
                jpegPath = compressed.uri;
            }
        
            //(4).
            const base64 = await RNFS.readFile(jpegPath, 'base64');
            //(5).
            const imageUrl = `data:image/jpeg;base64,${base64}`;
            const event = {
                type: "realtime.input_image",
                data: {
                    content: imageUrl,
                    reply: 0
                }
            };
            //(6).send image message
            WebSocketManager.webSocket?.send(JSON.stringify(event));
            console.log("send image message - success");
        }catch (error){
            console.log("send image message - fail: ",error);
        }
     } 
     if (captrueImageTimer_ref.current){
        clearInterval(captrueImageTimer_ref.current);
        captrueImageTimer_ref.current = null;
     }
     captrueImageTimer_ref.current = setInterval(async ()=>{
        if (CameraManager.camera_capture_status === true){
            await capturePhoto();
        }
        // Android may crash if frequency is too high
     }, (Platform.OS==='ios'?1000:2000));
   }

   // 7.3 Stop capture
   function stopCaptruePhoto(){
      console.log("Stop capture");
      setShowCameraPreView(false);
      setShowSwitchDeviceDirectionButton(false);
      if (captrueImageTimer_ref.current){
        clearInterval(captrueImageTimer_ref.current);
        captrueImageTimer_ref.current = null;
     }
   }

  // 8. Permissions handling
  // 8.1 Microphone permission
  async function requestMicrophonePermission(){
     const permission = Platform.OS === "ios" ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
     let result = await check(permission);
     if (result === RESULTS.GRANTED){
        console.log("Microphone permission granted");
        setEnableOfMicrophoneButton(true);
        enableOfMicrophoneButton_Ref.current = true;
        return true;
     }else
     if (result === RESULTS.DENIED){
        console.log("Microphone permission not granted, requesting...");

        setEnableOfMicrophoneButton(false);
        enableOfMicrophoneButton_Ref.current = false;
        const result1 = await request(permission);
        console.log("Permission request result:", result1);
   
        const granted = (result1 === RESULTS.GRANTED);
        setEnableOfMicrophoneButton(granted);
        enableOfMicrophoneButton_Ref.current = (granted);
        return granted;
     }else
     if (result === RESULTS.BLOCKED) {
        console.log("Microphone permission permanently blocked");
        setEnableOfMicrophoneButton(false);
        enableOfMicrophoneButton_Ref.current = false;
        return false;
     }else{
        console.log("Unknown microphone permission state");
        return false;
     }
  }
   // 8.2 Camera permission
   async function requestCameraPermission(){
    if (NavtalkManager.avatar_provider_type != "openai"){
        console.log("Camera not supported in non-GPT mode");
        setEnableOfCameraButton(false);
        enableOfCameraButton_Ref.current = false;
        return;
    }
     const permission = Platform.OS === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
     let result = await check(permission);
     if (result === RESULTS.GRANTED){
        console.log("Camera permission granted");
        setEnableOfCameraButton(true);
        enableOfCameraButton_Ref.current = true;
        return true;
     }else
     if (result === RESULTS.DENIED){
         console.log("Camera permission not granted, requesting...");

        setEnableOfCameraButton(false);
        enableOfCameraButton_Ref.current = false;
        const result1 = await request(permission);
        console.log("Permission request result:", result1);

        const granted = (result1 === RESULTS.GRANTED);
        setEnableOfCameraButton(granted);
        enableOfCameraButton_Ref.current = granted;

        return granted;
     }else
     if (result === RESULTS.BLOCKED) {
        console.log("Camera permission permanently blocked");
        setEnableOfCameraButton(false);
        enableOfCameraButton_Ref.current = false;
        return false;
     }else{
        console.log("Unknown camera permission state");
        return false;
     }
  }

  // 9. Message list
  const flatListRef = useRef(null);
  const [messageList, setMessageList] = useState([]);
  const messageList_ref = useRef([]);
  async function handleUserInputMessage(content){
    if(!content || content.trim() === ""){
        return
    }
    const message = {
        type: "user_input",
        content: content
    }
    setMessageList(prev => [...prev, message]);
    const newList = [...messageList_ref.current, message];
    messageList_ref.current = newList;
    await AsyncStorage.setItem('HistoryChatMessages',JSON.stringify(messageList_ref.current));
  }
  async function handleAIOutputMessage(content){
    if(!content || content.trim() === ""){
        return
    }
    const message = {
        type: "ai_output",
        content: content
    }
    setMessageList(prev => [...prev, message]);
    const newList = [...messageList_ref.current, message];
    messageList_ref.current = newList;
    await AsyncStorage.setItem('HistoryChatMessages',JSON.stringify(messageList_ref.current));
  }
  const renderItem = (item, index) => {
    const messageType = item.type ?? "";
    const messageContent = item.content ?? "";
    return (
      <View style={{left:0,top:0, width: screen.width-100, backgroundColor:"transparent"}}>
        <View style={{alignSelf:"flex-start",marginLeft:10,marginTop:10, maxWidth:screen.width-100-10*2, minHeight:20+20,
                      backgroundColor:(messageType==="user_input")?"#6C69AA":"#282826",
                      borderRadius:8
                      }}>
          <Text style={{alignSelf:"flex-start",marginLeft:10,marginTop:10,marginRight:10,marginBottom:10,
                        minWidth:20, maxWidth:screen.width-100-10*4, minHeight:20,
                        TextSize:14,color:"#FFFFFF",textAlign:"left"}}>{messageContent}</Text>
        </View>
      </View>
    );
  };
  // Load local messages
  async function fetchMessagesFromLocal(){
    if (!NavtalkManager.isOrNotSaveHistoryChatMessages){
        await AsyncStorage.setItem('HistoryChatMessages',"");
        return
    }
    const messages_string = await AsyncStorage.getItem("HistoryChatMessages");
    if (messages_string && messages_string.length > 0){
        const messages_array = JSON.parse(messages_string);
        setMessageList(messages_array);
        messageList_ref.current = messages_array;
    }
  }

  //10.Function Call
  function handleFunctionCallMessage(message){
    const function_name = message.data.function_name ?? "";
    if (function_name === "functioncall_close_session"){
        if (NavtalkManager.navtalk_call_status === "on"){
            clickCallStatusButton();
        }
    }
  }

   // Back button
   function clickBakcButton(){
    if (NavtalkManager.navtalk_call_status === "off"){
        navigation.goBack(); 
    }else if (NavtalkManager.navtalk_call_status === "connecting"){
        clickCallStatusButton();
        navigation.goBack(); 
    }else if (NavtalkManager.navtalk_call_status === "on"){
        clickCallStatusButton();
        navigation.goBack();
    }
   }

    return(
      <View style={{flex:1,backgroundColor:"#FFFFFF"}}>
        {/* Background image */}
        <Image source={ (backgroundImageUrl.length > 0) ? {uri: backgroundImageUrl} : require("./../images/default_background.png")} style={{flex: 1}} resizeMode="cover"/>
       {/* Remote video stream */}
       {remoteStream && (
        <RTCView
        mirror={true}
	    objectFit={'cover'}
	    streamURL={remoteStream.toURL()}
        style={{position: "absolute",left:0,top:0,right:0,bottom:0,backgroundColor:"transparent",opacity:(remoteStreamDisplay?1:0)}}/>
       )}
        {/* Back button */}
        <TouchableOpacity style={{position:"absolute", left:30, top:insets.top+20, width:30, height:30}} onPress={clickBakcButton}>
          <Image style={{position:"absolute",left:0,top:0,width:35,height:35}} source={require('../images/navtalk_back.png')} resizeMode="cover"/>
        </TouchableOpacity>
        {/* Microphone button */}
        {showMicrophoneButton && (
        <TouchableOpacity disabled={!enableOfMicrophoneButton} style={{position: "absolute", left: screen.width/2-40-80,bottom:insets.bottom+20,width:80,height:60,opacity:enableOfMicrophoneButton?1.0:0.5}} onPress={clickMicrophoneStatusButton}>
          <Image style={{position: "absolute",left: 80/2-38/2,top:0,width:38,height:38}} source={microphoneStatusIcon}/>
          <Text style={{position: "absolute",left: 0, top: 38+10,right: 0, fontSize: 12, textAlign: "center", color: "#FFFFFF"}}>Microphone</Text>
        </TouchableOpacity>
        )}
        {/* Call button */}
        <TouchableOpacity style={{position: "absolute", left: screen.width/2-80/2,bottom:insets.bottom+20,width:80,height:60}} onPress={clickCallStatusButton}>
          <Image style={{position: "absolute",left: 80/2-38/2,top:0,width:38,height:38}} source={callStatusIcon}/>
          <Text style={{position: "absolute",left: 0, top: 38+10,right: 0, fontSize: 12, textAlign: "center", color: "#FFFFFF"}}>{callStatusTitle}</Text>
       </TouchableOpacity>
       {/* Camera button */}
        {showCameraButton && (
        <TouchableOpacity disabled={!enableOfCameraButton} style={{position: "absolute", left: screen.width/2+40,bottom:insets.bottom+20,width:80,height:60, opacity:enableOfCameraButton?1.0:0.5}} onPress={clickCameraButton}>
          <Image style={{position: "absolute",left: 80/2-38/2,top:0,width:38,height:38}} source={cameraStatusIcon}/>
          <Text style={{position: "absolute",left: 0, top: 38+10,right: 0, fontSize: 12, textAlign: "center", color: "#FFFFFF"}}>Camera</Text>
        </TouchableOpacity>
        )}
        
        {/* Camera preview */}
        {Platform.OS === "ios" ? (
        <View
          style={{
            position: "absolute",
            right: 10,
            top: insets.top + 10,
            width: 90 * 1.5,
            height: 160 * 1.5,
            borderRadius: 5,
            overflow: "hidden",
            opacity: showCameraPreView ? 1.0 : 0.0,
          }}
          pointerEvents={showCameraPreView ? "auto" : "none"}>
          <Camera
            disabled={!showCameraPreView}
            style={{ flex: 1 }}
            isActive={showCameraPreView}
            device={deviceDirection}
            outputs={[photoOutput]}
          />
         <TouchableOpacity style={{position: "absolute", left: 90*1.5/2-30/2,top:20,width:30,height:30}} onPress={clickSwitchDeviceDirectionButon}>
           <Image style={{position: "absolute",left:0,top:0,width:30,height:30}} source={require('../images/switch_camera.png')}/>
         </TouchableOpacity>
        </View>
        ) : (
            showCameraPreView && (
            <View
              style={{
                position: "absolute",
                right: 30,
                top: insets.top + 10,
                width: 90 * 1.2,
                height: 160 * 1.2,
                borderRadius: 5,
                backgroundColor: "transparent",
                overflow: "hidden",
              }}>
              <Camera
                disabled={!showCameraPreView}
                style={{ flex: 1 }}
                isActive={showCameraPreView}
                device={deviceDirection}
                outputs={[photoOutput]}
              />
              <TouchableOpacity style={{position: "absolute", left: 90*1.5/2-30/2,top:20,width:30,height:30}} onPress={clickSwitchDeviceDirectionButon}>
                <Image style={{position: "absolute",left:0,top:0,width:30,height:30}} source={require('../images/switch_camera.png')}/>
              </TouchableOpacity>
            </View>
            )
        )}
       
        {/* Message list */}
        <FlatList 
        ref={flatListRef}
        style={{position:"absolute",left:0,top:360,width:screen.width-100,height:screen.height-360-insets.bottom-20-60-50,backgroundColor:"transparent",opacity: 0.8}}
        data={messageList}
        renderItem={({item,index})=> renderItem(item,index)}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={()=>{
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
        }}
        />

      </View>
   );
}