
import Foundation
import AVFoundation
import Starscream

class WebSocketManager: NSObject, WebSocketDelegate{

    var superVC: RealTimeTalkVC!

    enum websocketStatus: Int{
        case NotConnected = 0
        case Connectting = 1
        case Connected = 2
    }

    //MARK: 1.init
    static let shared = WebSocketManager()
    private override init(){
        super.init()
    }

    //MARK: 2.Connect NavTalk WebSocket
    var socket: WebSocket!
    //Avatar Image URL
    var avatar_image_url = ""
    //Avatar Provide Type Name
    var avatar_provider_type = ""
    //Socket URL
    var socket_status: websocketStatus = .NotConnected
    //Base URL - Prod
    let baseUrl = "transfer.navtalk.ai"
    //WebSocket URL - Prod
    let websocketUrl = "wss://transfer.navtalk.ai/wss/v2/realtime-chat"
    
    //Your Api Kye
    let license = "Your Api Key"
    //Your Avatar Name
    let characterName = "Your Avatar Name"

    //Is or not save history chat message in local database
    var isOrNotSaveHistoryChatMessages = false
    
    func connectWebSocketOfNavTalk(){
        if avatar_provider_type.count <= 0{
            MBProgressHUD.showTextWithTitleAndSubTitle(title: "Please retrieve the avatar details first.", subTitle: "", view: getCurrentVc().view)
            superVC.talk_status = .notConnected
            superVC.refreshNavTalkStatusUI()
            return
        }
        if socket_status == .NotConnected{
            //(1).Get Full URL
            let encodedLicense = license.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let encodedCharacterName = characterName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            guard let url = URL(string: "\(websocketUrl)?license=\(encodedLicense)&name=\(encodedCharacterName)") else { return }
            //2.Connect Socket
            let request = URLRequest(url: url)
            socket = WebSocket(request: request)
            socket.delegate = self
            socket.connect()
            socket_status = .Connectting
            NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebSocketManager_socket_status_changed"), object: nil)
        }else if socket_status == .Connected{
            MBProgressHUD.showTextWithTitleAndSubTitle(title: "The WebSocket is already connected, no need to connect again.", subTitle: "", view:  getCurrentVc().view)
        }else if socket_status == .Connectting{
            MBProgressHUD.showTextWithTitleAndSubTitle(title: "The WebSocket is currently connecting, please try again later.", subTitle: "", view: getCurrentVc().view)
        }
    }

    //MARK: 3.Disconnect NavTalk WebSocket
    func disconnectWebSocketOfNavTalk(){
        if socket_status == .Connected{
            socket.disconnect()
            WebRTCManager.shared.disconnectWebRTC()
            CameraCaptureManager.shared.stopRunningSession()
        }else if socket_status == .NotConnected{
            //MBProgressHUD.showTextWithTitleAndSubTitle(title: "The WebSocket is not connected, please connect it first.", subTitle: "", view:  getCurrentVc().view)
        }else if socket_status == .Connectting{
            socket.disconnect()
            WebRTCManager.shared.disconnectWebRTC()
            CameraCaptureManager.shared.stopRunningSession()
        }
    }
    //MARK: 4.WebSocketDelegate：When webSocket received a message
    func didReceive(event: WebSocketEvent, client: WebSocketClient) {
        switch event {
            case .connected(let headers):
                print("WebSocket--WebSocket is connected:\(headers)")
                self.socket_status = .Connected
                self.sendFunctionCall()
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebSocketManager_socket_status_changed"), object: nil)
                break
            case .disconnected(let reason, let code):
                print("WebSocket-WebSocket disconnected: \(reason) with code: \(code)")
                self.socket_status = .NotConnected
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebSocketManager_socket_status_changed"), object: nil)
                break
            case .text(let text):
                //print("Received text message:")
                handleRecivedMeaage(message_string: text)
                break
            case .binary(let data):
                print("WebSocket-Process the returned binary data (such as audio data): \(data.count)")
                break
            case .pong(let data):
                print("WebSocket-Received pong: \(String(describing: data))")
                break
            case .ping(let data):
                print("WebSocket-Received ping: \(String(describing: data))")
                break
            case .error(let error):
                print("WebSocket-Error: \(String(describing: error))")
                DispatchQueue.main.async {
                   MBProgressHUD.showTextWithTitleAndSubTitle(title: "The WebSocket has some error.", subTitle: "", view:  getCurrentVc().view)
                }
                self.socket_status = .NotConnected
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebSocketManager_socket_status_changed"), object: nil)
                break
            case .viabilityChanged(let isViable):
                print("WebSocket-WebSocket feasibility has changed: \(isViable)")
                break
            case .reconnectSuggested(let isSuggested):
                print("WebSocket-Reconnect suggested: \(isSuggested)")
                break
            case .cancelled:
                print("WebSocket-WebSocket was cancelled")
                break
            case .peerClosed:
                print("WebSocket-WebSocket peer closed")
                self.socket_status = .NotConnected
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "WebSocketManager_socket_status_changed"), object: nil)
        }
    }
    
    //MARK: 5.Send Function Call
    func sendFunctionCall(){
        let functions = [
            [
                "type": "function",
                "name": "function_call_close_talk",
                "description": "Please trigger this method when you receive a message or when the conversation is closed.",
                "parameters": [
                    "type": "object",
                    "properties": [
                        "userInput": [
                            "type": "string",
                            "description": "Raw user request content to be processed"
                        ]
                    ],
                    "required": ["userInput"]
                ]
            ]
        ]
        if let functionsJsonData = try? JSONSerialization.data(withJSONObject: functions),
           let functionsJsonString = String(data: functionsJsonData, encoding: .utf8){
            let message = [
                "type":"realtime.input_function_call",
                "data": ["content": functionsJsonString]
            ] as [String : Any]
            if let messageJsonData = try? JSONSerialization.data(withJSONObject: message),
               let messageJsonString = String(data: messageJsonData, encoding: .utf8){
                WebSocketManager.shared.socket.write(string: messageJsonString) {
                    print("===========================\n")
                    print("Send Function Call Data:\(messageJsonString)")
                }
            }
        }
        
    }
    //MARK: 6.Handle Function Call
    func handleFunctionCall(message: [String: Any]){
        print("Handle Function Call:\(message)")
        if let data = message["data"] as? [String: Any],
           let name = data["function_name"] as? String,
           name == "function_call_close_talk"{
            self.superVC.clickOpenOrCloesCallStatusButton()
        }
    }
    //MARK: 7.Handle Recieved Message
    var audio_String = ""
    var audio_String_count = 0
    func handleRecivedMeaage(message_string: String){
        print("===========================")
        //print("Handle Recieved Message:\(message_string)")
        //(0).String-->Dictionary
        let  message_jsonData = message_string.data(using: .utf8) ?? Data()
        var message_dict = [String: Any]()
        do {
            if let dictionary = try JSONSerialization.jsonObject(with: message_jsonData, options: []) as? [String: Any] {
                message_dict = dictionary
            }
        } catch {
            print("********************")
            print("Conver message string to dictionary is fail: \(message_string)")
            print("Fail error is: \(error.localizedDescription)")
            print("********************")
            return
        }
        guard let message_type = message_dict["type"] as? String else {
            print("********************")
            print("Can't get message type.")
            print("********************")
            return
        }
        
        print("Handle Recieved Message -- Type is:\(message_type)")
        
        //(1).tye == conversation.connected.success:
        //Connection established, sessionId contains iceServers for WebRTC
        if message_type == "conversation.connected.success"{
            print("conversation.connected.success:\(message_dict)")
            let current_data = message_dict["data"] as? [String: Any] ?? [String: Any]()
            let sessionId = current_data["sessionId"] as? String ?? message_dict["session_id"] as? String
            let iceServers = current_data["iceServers"] as? [[String: Any]] ?? [[String: Any]]()
            // Close existing WebRTC socket
            WebRTCManager.shared.disconnectWebRTC()
            // Setup paramDict
            WebRTCManager.shared.targetSessionId = sessionId
            WebRTCManager.shared.iceServers = iceServers
            return
        }
        
        //(2).type == realtime.session.created
        //Need to set session configuration parameters
        if message_type == "realtime.session.created"{
            sendHistoryToCurrentChat()
            return
        }
        
        //(3).type == realtime.session.updated
        //Need to send history message date.
        //Need to start record audio
        if message_type == "realtime.session.updated"{
            RecordAudioManager.shared.startRecordAudio()
            return
        }
        
        //(4).type == realtime.input_audio_buffer.speech_started
        //When OpenAI detects someone speaking, it returns the following message.
        if message_type == "realtime.input_audio_buffer.speech_started"{
            //print("===========================\nConfigure session Success")
            return
        }
        //(5).type == realtime.response.audio.delta
        //The audio data increment returned by OpenAI: divided into N packets sent sequentially to the frontend until all packets are sent.
        if message_type == "realtime.response.audio.delta"{
            if let delta = message_dict["delta"] as? String{
                //You Can Play Audio with Iphone
            }
            return
        }
        //(6).type == realtime.response.audio_transcript.delta
        //The transcribed text content of each incremental packet of audio data returned by OpenAI: divided into N packets sent sequentially to the frontend until all packets are sent.
        if message_type == "realtime.response.audio_transcript.delta"{
            return
        }
        //(7).type == realtime.conversation.item.input_audio_transcription.completed
        //This is the complete transcribed text content of a detected speech question by OpenAI (the sum of all increments).
        if message_type == "realtime.conversation.item.input_audio_transcription.completed"{
            print("\(message_dict)")
            if  let raw_data = message_dict["data"] as? [String: Any],
                let transcript = raw_data["content"] as? String{
                let dict = ["text": transcript]
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "HaveInputText"), object: dict)
            }
        }
        //(8).type == realtime.response.audio_transcript.done
        //Complete a reply.
        if message_type == "realtime.response.audio_transcript.done"{
            print("\(message_dict)")
            if let raw_data = message_dict["data"] as? [String: Any],
               let transcript = raw_data["content"] as? String,
               transcript.count > 0{
               let dict = ["text": transcript]
               NotificationCenter.default.post(name: NSNotification.Name(rawValue: "HaveOutputText"), object: dict)
            }
        }
        //(9).type == response.function_call_arguments.done
        //Function call message
        if message_type == "realtime.response.function_call_arguments.done"{
            handleFunctionCall(message: message_dict)
        }
        
        //(10).type == webrtc.signaling.offer
        if message_type == "webrtc.signaling.offer"{
            WebRTCManager.shared.handleOfferMessage(message: message_dict)
        }
        //(11).type == webrtc.signaling.answer
        if message_type == "webrtc.signaling.answer"{
            WebRTCManager.shared.handleAnswerMessage(message: message_dict)
        }
        //(12).type == webrtc.signaling.iceCandidate
        if message_type == "webrtc.signaling.iceCandidate"{
            WebRTCManager.shared.handleIceCandidateMessage(message: message_dict)
        }
        
        //(13).Other:
        //conversation.connected.fail
        if message_type == "conversation.connected.fail"{
            print("Connect websocket fail: \(message_dict)")
        }
        if message_type == "conversation.connected.close"{
            print("WebSocket is closed: \(message_dict)")
        }
        if message_type == "conversation.connected.insufficient_balance"{
            print("WebSocket is closed: \(message_dict)")
        }
        
    }
    /*
    //6.Set this chat configuration parameters
    func settingThisTalkConfiguration(){
        var sessionConfig = [String: Any]()
        sessionConfig["type"] = "session.updated"
        var session = [String: Any]()
        session["instructions"] = "iOS Demo Chat"
        session["voice"] = voice_type
        session["temperature"] = 1
        session["modalities"] = ["text", "audio"]
        session["input_audio_format"] = "pcm16"
        session["output_audio_format"] = "pcm16"
        session["input_audio_transcription"] = ["model": "whisper-1"]
        // Add Funcation Call:
        
        let tools = [
            [
                "type": "function",
                "name": "function_call_close_talk",
                "description": "Trigger this method when ending or dropping the current call.",
                "parameters": [
                    "type": "object",
                    "properties": [
                        "userInput": [
                            "type": "string",
                            "description": "Raw user request content to be processed"
                        ]
                    ],
                    "required": ["userInput"]
                ]
            ]
        ]
        session["tools"] = tools
         
        sessionConfig["session"] = session
        if let jsonData = try? JSONSerialization.data(withJSONObject: sessionConfig),
           let jsonString = String(data: jsonData, encoding: .utf8){
            WebSocketManager.shared.socket.write(string: jsonString) {
                print("===========================\nConfigure session information:\(jsonString)")
            }
        }
    }*/

    
    //MARK: 6.Send History
    func sendHistoryToCurrentChat(){
        let allMessageModels = superVC.allMessageModels
        var allQuestionsMessageModels = [[String: Any]]()
        for value in allMessageModels{
            if let type = value["type"] as? String, type == "question"{
                allQuestionsMessageModels.append(value)
            }
        }
        print("Try To Send History: \(allQuestionsMessageModels)")

        for value in allQuestionsMessageModels{
            let content_text = value["content"] as? String
            var message = [String: Any]()
            message["type"] = "conversation.item.create"
            message["item"] = [
                "type": "message",
                "role": "user",
                "content": [
                    [
                        "type": "input_text",
                        "text": content_text
                    ]
                ]
            ]
            if let jsonData = try? JSONSerialization.data(withJSONObject: message),
               let jsonString = String(data: jsonData, encoding: .utf8){
                WebSocketManager.shared.socket.write(string: jsonString) {
                    print("===========================\nSend History Data:\(jsonString)")
                }
            }
        }
    }
   
}
