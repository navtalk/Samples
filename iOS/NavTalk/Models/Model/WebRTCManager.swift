
import Foundation
import WebRTC
import AVFoundation
import Starscream

class WebRTCManager: NSObject, WebSocketDelegate, RTCPeerConnectionDelegate, RTCVideoViewDelegate{
    
    var superVC: RealTimeTalkVC!
    
    private var webSocket: WebSocket!
    private var webSocketTask: URLSessionWebSocketTask?
    private var RTC_URL = "stun:stun.l.google.com:19302"
    private var peerConnection: RTCPeerConnection?
    private var peerConnectionFactory: RTCPeerConnectionFactory?
    private var targetSessionId = "123"
    
    enum webRTCSocketStatus: Int{
        case NotConnected = 0
        case Connectting = 1
        case Connected = 2
    }
    
    enum webRTCStatus: Int{
        case NotConnected = 0
        case Connectting = 1
        case Connected = 2
        case HaveRecieveRemoteVideoRender = 3
    }
    
    //MARK: 1.init
    static let shared = WebRTCManager()
    private override init(){
        super.init()
        self.peerConnectionFactory = RTCPeerConnectionFactory.init()
    }
    
    //MARK: 2.Craere WebSocket-WebRTC
    var webRTC_socket_status: webRTCSocketStatus = .NotConnected
    func connectWebRTCOfNavTalk(){
        if webRTC_socket_status == .NotConnected{
            gotoConnectSingalSocket()
        }else if webRTC_socket_status == .Connected{
            MBProgressHUD.showTextWithTitleAndSubTitle(title: "The WebRTC is already connected, no need to connect again.", subTitle: "", view:  getCurrentVc().view)
        }else if webRTC_socket_status == .Connectting{
            MBProgressHUD.showTextWithTitleAndSubTitle(title: "The WebRTC is currently connecting, please try again later.", subTitle: "", view: getCurrentVc().view)
        }
    }
    //MARK: 2.1.WebSocket Data Chanel：
    func gotoConnectSingalSocket(){
        let encodedLicense = WebSocketManager.shared.license.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        guard let url = URL(string: "wss://\(WebSocketManager.shared.baseUrl)/api/webrtc?userId=\(encodedLicense)") else { return }
        let request = URLRequest(url: url)
        webSocket = WebSocket(request: request)
        webSocket.delegate = self
        webSocket.connect()
        webRTC_socket_status = .Connectting
        NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_socket_status_changed"), object: nil)
    }
    //MARK: 2.2.WebSocketDelegate：
    func didReceive(event: WebSocketEvent, client: WebSocketClient) {
        print("===========================")
        switch event {
        case .connected(let headers):
            print("RTC-WebSocket is connected:\(headers)")
            webRTC_socket_status = .Connected
            NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_socket_status_changed"), object: nil)
            break
        case .disconnected(let reason, let code):
            print("RTC-WebSocket disconnected: \(reason) with code: \(code)")
            webRTC_socket_status = .NotConnected
            NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_socket_status_changed"), object: nil)
            break
        case .text(let text):
            print("RTC-Received text message:")
            self.handleRecivedMeaage(message_string: text)
        case .binary(let data):
            print("RTC-Process the returned binary data (such as audio data): \(data.count)")
            break
        case .pong(let data):
            print("RTC-Received pong: \(String(describing: data))")
            break
        case .ping(let data):
            print("RTC-Received ping: \(String(describing: data))")
            break
        case .error(let error):
            print("RTC-Error: \(String(describing: error))")
            break
        case .viabilityChanged(let isViable):
            print("RTC-WebSocket feasibility has changed: \(isViable)")
            break
        case .reconnectSuggested(let isSuggested):
            print("RTC-Reconnect suggested: \(isSuggested)")
            break
        case .cancelled:
            print("RTC-WebSocket was cancelled")
            break
        case .peerClosed:
            print("RTC-WebSocket peer closed")
            webRTC_socket_status = .NotConnected
            NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_socket_status_changed"), object: nil)
        }
    }
    //MARK: 2.3.Send Start Command
    func gotoSendStartCommand(){
        var sessionConfig = [String: Any]()
        sessionConfig["type"] = "create"
        sessionConfig["targetSessionId"] = targetSessionId
        print("===========================\nSend Start Command:\(sessionConfig)")
        if let jsonData = try? JSONSerialization.data(withJSONObject: sessionConfig),
           let jsonString = String(data: jsonData, encoding: .utf8){
            WebRTCManager.shared.webSocket.write(string: jsonString) {
                print("===========================\nSend Start Command--Success")
            }
        }
    }
    //MARK: 2.4.Handle Recieved Message：
    func handleRecivedMeaage(message_string: String){
        //(0).String-->Dictionary
        let  message_jsonData = message_string.data(using: .utf8) ?? Data()
        var message_dict = [String: Any]()
        do {
            if let dictionary = try JSONSerialization.jsonObject(with: message_jsonData, options: []) as? [String: Any] {
                message_dict = dictionary
            }
        } catch {
            print("Conver Fail: \(error.localizedDescription)")
        }
        print("RTC--socket--Handle Recieved Message:\(message_dict)")
        
        //(1).offer
        if let type = message_dict["type"] as? String, type == "offer"{
            handleOfferMessage(message: message_dict)
        }
        //(2).answer
        if let type = message_dict["type"] as? String, type == "answer"{
            handleAnswerMessage(message: message_dict)
        }
        //(3).iceCandidate
        if let type = message_dict["type"] as? String, type == "iceCandidate"{
            handleIceCandidateMessage(message: message_dict)
        }
    }
    //MARK: (1).Hnadle Offer
    func handleOfferMessage(message: [String: Any]){
        
        print("=========\nRTC--Hnadle Offer")
        webRTC_status = .Connectting
        NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
        
        guard let current_targetSessionId = message["targetSessionId"] as? String else{
            webRTC_status = .NotConnected
            NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
            return
        }
        
        configureAudioSessionToSpeakerForWebRTC()
      
        let config = RTCConfiguration()
        config.iceServers = [RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"])]
        config.iceTransportPolicy = .all
        config.rtcpMuxPolicy = .require
        config.bundlePolicy = RTCBundlePolicy.maxBundle
        config.tcpCandidatePolicy = RTCTcpCandidatePolicy.enabled
        config.keyType = .ECDSA
        config.continualGatheringPolicy = .gatherContinually
        
        let constraints0 = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        self.peerConnection = self.peerConnectionFactory?.peerConnection(with: config, constraints:constraints0, delegate: self)
    
        guard let offer_sdp_dict = message["sdp"] as? [String: Any] else{ return }
        guard let offer_sdp_string = offer_sdp_dict["sdp"] as? String else{return}
        let remoteOffer = RTCSessionDescription(type: .offer, sdp: offer_sdp_string)
        self.peerConnection?.setRemoteDescription(remoteOffer, completionHandler: { error1 in
            if let error1 = error1 {
                print("Set Offer SDP Fail: \(error1)")
                return
            }
            
            //create Answer
            let mandatoryConstraints1 = ["OfferToReceiveAudio": "true","OfferToReceiveVideo": "true"]
            let constraints1 = RTCMediaConstraints(mandatoryConstraints: mandatoryConstraints1, optionalConstraints: nil)
            self.peerConnection?.answer(for: constraints1, completionHandler: { local_sdp, error2 in
                if let error2 = error2 {
                    print("Create Answer Fail: \(error2)")
                    return
                }
                guard let current_local_sdp = local_sdp else{
                    print("Get Local SDP Fail")
                    return
                }
                //set local SDP：
                self.peerConnection?.setLocalDescription(current_local_sdp, completionHandler: { error3 in
                    if let error3 = error3{
                        print("set local SDP fail: \(error3)")
                        return
                    }
                    //(6).Send Answer To Socket
                    var answer_param = [String: Any]()
                    answer_param["type"] = "answer"
                    answer_param["targetSessionId"] = current_targetSessionId
                    answer_param["sdp"] = ["type": "answer", "sdp": current_local_sdp.sdp]
                    print("===========================\nSend Answer To Socket:\(answer_param)")
                    if let jsonData = try? JSONSerialization.data(withJSONObject: answer_param),
                       let jsonString = String(data: jsonData, encoding: .utf8){
                        WebRTCManager.shared.webSocket.write(string: jsonString) {
                            print("===========================\nSend Answer To Socket--Success")
                        }
                    }
                })
            })
        })
    }
    
    //MARK: (2).Hnadle Answer
    func handleAnswerMessage(message: [String: Any]){
        print("=========\nRTC--Hnadle Answer")
        guard let sdpDict = message["sdp"] as? [String: Any],
        let sdpString = sdpDict["sdp"] as? String else { return }
        let answer = RTCSessionDescription(type: .answer, sdp: sdpString)
        peerConnection?.setRemoteDescription(answer)
    }
    //MARK: (3).Hnadle IceCandidate
    func handleIceCandidateMessage(message: [String: Any]){
        print("=========\nRTC--Hnadle IceCandidate")
        guard let candidateDict = message["candidate"] as? [String: Any],
              let sdp = candidateDict["candidate"] as? String,
              let sdpMLineIndex = candidateDict["sdpMLineIndex"] as? Int32,
              let sdpMid = candidateDict["sdpMid"] as? String else { return }
        let candidate = RTCIceCandidate(sdp: sdp, sdpMLineIndex: sdpMLineIndex, sdpMid: sdpMid)
        peerConnection?.add(candidate)
    }

    //MARK: 2.5.Disconnect NavTalk RTC - WebSocket
    func disconnectRTCWebSocketOfNavTalk(){
        if webRTC_socket_status == .Connected{
            webSocket.disconnect()
        }else if webRTC_socket_status == .NotConnected{
            //MBProgressHUD.showTextWithTitleAndSubTitle(title: "The WebSocket Of RTC is not connected, please connect it first.", subTitle: "", view:  getCurrentVc().view)
        }else if webRTC_socket_status == .Connectting{
            webSocket.disconnect()
        }
    }
    
    //MARK: 3.PeerConnectionDelegate
    var webRTC_status: webRTCStatus = .NotConnected
    //MARK: 3.1.PeerConnection
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        print("peerConnection--RTCIceConnectionState--Changed--->\(newState.rawValue)")
        switch newState {
        case .new:
            break
        case .checking:
            break
        case .connected:
            if peerConnection == self.peerConnection{
                webRTC_status = .Connected
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
                configureAudioSessionToSpeakerForWebRTC()
            }
            break
        case .completed:
            if peerConnection == self.peerConnection{
                webRTC_status = .Connected
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
            }
            break
        case .failed:
            if peerConnection == self.peerConnection{
                webRTC_status = .NotConnected
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
            }
            break
        case .disconnected:
            if peerConnection == self.peerConnection{
                webRTC_status = .NotConnected
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
            }
            break
        case .closed:
            if peerConnection == self.peerConnection{
                webRTC_status = .NotConnected
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
            }
            break
        case .count:
            break
        @unknown default:
            break
        }
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {
        /*
         typedef NS_ENUM(NSInteger, RTCSignalingState) {
           RTCSignalingStateStable,
           RTCSignalingStateHaveLocalOffer,
           RTCSignalingStateHaveLocalPrAnswer,
           RTCSignalingStateHaveRemoteOffer,
           RTCSignalingStateHaveRemotePrAnswer,
           // Not an actual state, represents the total number of states.
           RTCSignalingStateClosed,
         };
         */
        print("peerConnection--RTCSignalingState--Changed--->\(stateChanged.rawValue)")
    }
    //MARK: 3.2.Get Remote Video View
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd rtpReceiver: RTCRtpReceiver, streams: [RTCMediaStream]) {
        if let track = rtpReceiver.track as? RTCVideoTrack {
            print("111-stream.videoTracks:\(track)")
        }
    }
    var remoteVideoView: RTCMTLVideoView!
    var remoteVideoTrack: RTCVideoTrack!
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        print("222-stream.videoTracks:\(stream.videoTracks.count)")
        print("222-stream.audioTracks:\(stream.audioTracks.count)")
        if let remoteVideoTrack = stream.videoTracks.first {
            self.remoteVideoTrack = remoteVideoTrack
            DispatchQueue.main.async {
                self.remoteVideoView = RTCMTLVideoView(frame: CGRect(x: 0, y: 0, width: kScreen_WIDTH, height: kScreen_HEIGHT))
                self.remoteVideoView.backgroundColor = .clear
                self.remoteVideoView.videoContentMode = .scaleAspectFill
                self.remoteVideoView.delegate = self
                self.remoteVideoTrack.add(self.remoteVideoView)
                self.superVC.view.insertSubview(self.remoteVideoView, aboveSubview: self.superVC.backgroudImage)
                self.webRTC_status = .HaveRecieveRemoteVideoRender
                self.remoteVideoView.isHidden = true
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
            }
        }
        if let remoteAudioTrack = stream.audioTracks.first {
            print("Audio Track: \(remoteAudioTrack)")
        }
    }
    
    //MARK: 3.3.Set To Speaker
    func configureAudioSessionToSpeakerForWebRTC() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord,
                                    mode: .videoChat,
                                    options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers])
            try session.overrideOutputAudioPort(AVAudioSession.PortOverride.speaker)
            try session.setActive(true)

            print("Set To Speaker Success")
        } catch {
            print("Set To Speaker Fail: \(error)")
        }
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {
        
    }
    //MARK: 3.4.Local ICE Candidate
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        let message: [String: Any] = [
            "type": "iceCandidate",
            "targetSessionId": targetSessionId,
            "candidate": [
                "candidate": candidate.sdp,
                "sdpMLineIndex": candidate.sdpMLineIndex,
                "sdpMid": candidate.sdpMid ?? ""
            ]
        ]
        if let data = try? JSONSerialization.data(withJSONObject: message),
           let jsonString = String(data: data, encoding: .utf8) {
            webSocket.write(string: jsonString)
            print("ICE Candidate Have Sended:\(message)")
        }
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {
        
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {
        
    }
    
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {
        
    }
    
    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        
    }
    
    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        
    }
    
    //MARK: 3.5.RTCVideoViewDelegate
    func videoView(_ videoView: RTCVideoRenderer, didChangeVideoSize size: CGSize) {
        self.remoteVideoView.isHidden = false
    }
    
    //MARK: 3.6.Disconnect WebRTC
    func disconnectWebRTC(){
        if webRTC_status == .Connected{
            peerConnection?.close()
            peerConnection = nil
            remoteVideoTrack = nil
            remoteVideoView.removeFromSuperview()
        }
    }
}
