
import Foundation
import WebRTC
import AVFoundation
import Starscream

class WebRTCManager: NSObject, RTCPeerConnectionDelegate, RTCVideoViewDelegate{
    
    var superVC: RealTimeTalkVC!
    
    var peerConnection: RTCPeerConnection?
    private var peerConnectionFactory: RTCPeerConnectionFactory?
    var iceServers: [[String: Any]]?
    var targetSessionId: String?
    
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
    
    //MARK: 2.Hnadle Offer
    func handleOfferMessage(message: [String: Any]){
        print("=========")
        print("Offer Message:\(message)")
        
        guard let current_targetSessionId = targetSessionId else{
            webRTC_status = .NotConnected
            NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
            return
        }
        
        configureAudioSessionToSpeakerForWebRTC()
      
        let config = RTCConfiguration()
        //config.iceServers = [RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"])]
        guard let current_iceServers = iceServers else {
            print("Can't get iceServers.")
            return
        }
        //print("current_iceServers:\(current_iceServers)")
        let current_iceServers_array = parseIceServers(from: current_iceServers)
        print("current_iceServers_array:\(current_iceServers_array)")
        config.iceServers = current_iceServers_array
        config.iceTransportPolicy = .all
        config.rtcpMuxPolicy = .require
        config.bundlePolicy = RTCBundlePolicy.maxBundle
        config.tcpCandidatePolicy = RTCTcpCandidatePolicy.enabled
        config.keyType = .ECDSA
        config.continualGatheringPolicy = .gatherContinually
        
        let constraints0 = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        self.peerConnection = self.peerConnectionFactory?.peerConnection(with: config, constraints:constraints0, delegate: self)
    
        guard let offer_date_dict = message["data"] as? [String: Any] else{ return }
        guard let offer_sdp_dict = offer_date_dict["sdp"] as? [String: Any] else{return}
        guard let offer_sdp_string = offer_sdp_dict["sdp"] as? String else{return}
        
        self.webRTC_status = .Connectting
        NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
        
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
                    answer_param["type"] = "webrtc.signaling.answer"
                    answer_param["data"] = ["sdp": ["type": "answer", "sdp": current_local_sdp.sdp]]
                    print("===========================\nSend Answer To Socket:\(answer_param)")
                    if let jsonData = try? JSONSerialization.data(withJSONObject: answer_param),
                       let jsonString = String(data: jsonData, encoding: .utf8){
                        WebSocketManager.shared.socket.write(string: jsonString) {
                            print("===========================\nSend Answer To Socket--Success")
                        }
                    }
                })
            })
        })
    }
    func parseIceServers(from rawServers: [[String: Any]]) -> [RTCIceServer] {
        var iceServers: [RTCIceServer] = []

        for server in rawServers {
            guard let urls = server["urls"] as? [String] else { continue }

            let username = server["username"] as? String
            let credential = server["credential"] as? String

            if let username = username, let credential = credential {
                let iceServer = RTCIceServer(
                    urlStrings: urls,
                    username: username,
                    credential: credential
                )
                iceServers.append(iceServer)
            } else {
                let iceServer = RTCIceServer(urlStrings: urls)
                iceServers.append(iceServer)
            }
        }

        return iceServers
    }
    
    //MARK: 4.Hnadle Answer
    func handleAnswerMessage(message: [String: Any]){
        print("=========")
        print("Answer Message:\(message)")
        guard let sdpDict = message["sdp"] as? [String: Any],
        let sdpString = sdpDict["sdp"] as? String else { return }
        let answer = RTCSessionDescription(type: .answer, sdp: sdpString)
        peerConnection?.setRemoteDescription(answer)
    }
    //MARK:5.Hnadle IceCandidate
    func handleIceCandidateMessage(message: [String: Any]){
        print("=========")
        print("IceCandidate Message:\(message)")
        guard let data = message["data"] as? [String: Any],
                  let candidateDict = data["candidate"] as? [String: Any],
                  let sdp = candidateDict["candidate"] as? String,
                  let sdpMLineIndex = candidateDict["sdpMLineIndex"] as? Int32,
                  let sdpMid = candidateDict["sdpMid"] as? String else { return }

        let candidate = RTCIceCandidate(sdp: sdp, sdpMLineIndex: sdpMLineIndex, sdpMid: sdpMid)
        peerConnection?.add(candidate)
    }

    //MARK: 6.PeerConnectionDelegate
    var webRTC_status: webRTCStatus = .NotConnected
    //MARK: 6.1.PeerConnection
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
    //MARK: 6.2.Get Remote Video View
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
    
    //MARK: 6.3.Set To Speaker
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
    //MARK: 6.4.Local ICE Candidate
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        guard let currentTargetSessionId = targetSessionId else {
            print("Cannot send ICE candidate: targetSessionId is nil")
            return
        }
        print("========")
        let message: [String: Any] = [
            "type": "webrtc.signaling.iceCandidate",
            "data": [
                "candidate":[
                    "candidate": candidate.sdp,
                    "sdpMLineIndex": candidate.sdpMLineIndex,
                    "sdpMid": candidate.sdpMid ?? ""
                ]
            ]
        ]
        if let data = try? JSONSerialization.data(withJSONObject: message),
           let jsonString = String(data: data, encoding: .utf8) {
            WebSocketManager.shared.socket.write(string: jsonString)
            print("ICE Candidate Have Sended:\(message)")
        }
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {
        
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {
        
    }
    // Send Offer Message：
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {
        print("=========")
        print("Get peerConnectionShouldNegotiate, now need send offer message")
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
            peerConnection.offer(for: constraints) { [weak self] offer, error in
                guard let self = self else { return }
                if let error = error {
                    print("Failed to create offer: \(error)")
                    return
                }
                guard let offer = offer else { return }
                peerConnection.setLocalDescription(offer) { error in
                    if let error = error {
                        print("Failed to set local description: \(error)")
                        return
                    }
                    self.sendOfferMessage(offer)
                }
        }
    }
    func sendOfferMessage(_ offer: RTCSessionDescription) {
        guard let targetSessionId = targetSessionId else { return }
        let message: [String: Any] = [
            "type": "webrtc.signaling.offer",
            "data": [
                "sdp": [
                    "type": "offer",
                    "sdp": offer.sdp
                ]
            ]
        ]
        if let data = try? JSONSerialization.data(withJSONObject: message),
           let jsonString = String(data: data, encoding: .utf8) {
            WebSocketManager.shared.socket.write(string: jsonString)
            print("Offer sent success:\n\(message)")
        }
    }
    
    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        
    }
    
    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        
    }
    
    //MARK: 5.5.RTCVideoViewDelegate
    func videoView(_ videoView: RTCVideoRenderer, didChangeVideoSize size: CGSize) {
        print("RTCVideoRenderer->didChangeVideoSize")
        self.remoteVideoView.isHidden = false
    }
    
    //MARK: 5.6.Disconnect WebRTC
    func disconnectWebRTC(){
        if webRTC_status == .Connected{
            remoteVideoView.isHidden = true
            remoteVideoView.removeFromSuperview()
            peerConnection?.close()
            peerConnection = nil
            remoteVideoTrack = nil
            targetSessionId = nil
            iceServers = nil
        }
    }
}
