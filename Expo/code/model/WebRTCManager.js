import {
	ScreenCapturePickerView,
	RTCPeerConnection,
	RTCIceCandidate,
	RTCSessionDescription,
	RTCView,
	MediaStream,
	MediaStreamTrack,
	mediaDevices,
	registerGlobals
} from 'react-native-webrtc';
import WebSocketManager from './WebSocketManager';
import RecordAudioManager from './RecordAudioManager';
import notificationManager from './NotificationManager';

class WebRTCManager{

   static instance;
   static getInstance() {
      if (!WebRTCManager.instance) {
        WebRTCManager.instance = new WebRTCManager();
      }
      return WebRTCManager.instance;
    }

    targetSessionId = null;
    iceServers = null;
    peerConnection = null;

    current_remoteStream = null;

 
    //1.
    async startConnectWebRTC(message){
        try{
            //1.1.create peerConnection
            let peerConstrains = {
              iceServers: this.parseIceServers(this.iceServers)
            }
            //console.log("ICES--1: ",this.iceServers);
            //console.log("ICES--2: ",this.parseIceServers(this.iceServers));
            this.peerConnection = new RTCPeerConnection(peerConstrains);

            //1.2.
            this.peerConnection.addEventListener( 'connectionstatechange', event => {
                //console.log("WebRTC status is changed: ", this.peerConnection.connectionState);
            });
            this.peerConnection.addEventListener( 'icecandidate', event => {
                //Get Local ICE，then send message：
                if (!event.candidate) return;
                const candidate = event.candidate;
                //console.log("Local ICE:", candidate);
                const message = {
                    type: "webrtc.signaling.iceCandidate",
                    data: {
                        candidate: {
                            candidate: candidate.candidate, 
                            sdpMLineIndex: candidate.sdpMLineIndex,
                            sdpMid: candidate.sdpMid || ""
                        }
                    }
                };
                //notificationManager.emit("needWebSocketSendMessage", JSON.stringify(message));
                WebSocketManager.webSocket?.send(JSON.stringify(message));
            } );
            this.peerConnection.addEventListener( 'icecandidateerror', event => {} );
            this.peerConnection.addEventListener( 'iceconnectionstatechange', event => {
                console.log("ICE-status is changed: ", this.peerConnection?.iceConnectionState);
                notificationManager.emit('WebRTCStatusChanged');
                RecordAudioManager.mustSpeaker();
            });
            this.peerConnection.addEventListener( 'icegatheringstatechange', event => {} );
            this.peerConnection.addEventListener( 'negotiationneeded', event => {} );
            this.peerConnection.addEventListener( 'signalingstatechange', event => {} );
            this.peerConnection.addEventListener( 'track', event => {
                const remoteStream = event.streams[0];
                if (remoteStream){
                    this.current_remoteStream = remoteStream;
                    notificationManager.emit("nowNeedShowRemoteRenderView");
                    RecordAudioManager.mustSpeaker();
                    setTimeout(() => RecordAudioManager.mustSpeaker(), 300);
                }
            });
            try{
                //1.3.Set the server’s SDP as the local remote SDP.
                const offerDescription_string = message.data.sdp;
                //console.log("The server’s SDP: ",offerDescription_string);
                const offerDescription = new RTCSessionDescription(offerDescription_string);
                await this.peerConnection.setRemoteDescription(offerDescription);

                //1.4.Get the SDP of the local device.
                const answerDescription = await this.peerConnection.createAnswer();
	            await this.peerConnection.setLocalDescription(answerDescription);

                //1.5.Send the local device’s SDP to the server.
                const event_message = {
                    type: "webrtc.signaling.answer",
                    data: {
                        sdp: {
                            type: "answer",
                            sdp: answerDescription.sdp
                        }
                    }
                };
                //notificationManager.emit("needWebSocketSendMessage", JSON.stringify(message));
                WebSocketManager.webSocket?.send(JSON.stringify(event_message));
            }catch (error){
               console.log("Exchange the SDP between the local device and the server — error occurred.: ",error);
            }
        }catch(error){
            console.log("Create peer connection — error occurred: ",error);
        }  
    }
    parseIceServers(rawServers) {
        if (!rawServers) return [];
        return rawServers.map(server => {
            const urls = server.urls || [];
            if (server.username && server.credential) {
                return {
                    urls: urls,
                    username: server.username,
                    credential: server.credential,
                };
            }
            return {
                urls: urls,
            };
        });
    }

    //2.Disconnect the connection.
    disconnectWebRTC(){
        this.peerConnection?.close();
        this.peerConnection = null;
        this.current_remoteStream = null;
    }
}
//Export class
export default WebRTCManager.getInstance();