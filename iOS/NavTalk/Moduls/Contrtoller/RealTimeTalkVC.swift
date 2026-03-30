
import UIKit
import WebRTC
import SDWebImage

class RealTimeTalkVC: UIViewController, UITableViewDelegate, UITableViewDataSource{

    lazy var backgroudImage = {
        let imageView = UIImageView(frame: CGRect(x: 0, y: 0, width: kScreen_WIDTH, height: kScreen_HEIGHT))
        imageView.backgroundColor = .clear
        imageView.image = UIImage(named: "default_background")
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        return imageView
    }()

    lazy var myTableView = {
        let tableView = UITableView(frame: CGRect(x: 0, y: kScreen_HEIGHT-safeBottom()-20-39-20-450, width: kScreen_WIDTH, height: 450))
        tableView.backgroundColor = .clear
        tableView.register(UINib(nibName: "ChatTableViewQuestionCell", bundle: nil), forCellReuseIdentifier: "ChatTableViewQuestionCellID")
        tableView.register(UINib(nibName: "ChatTableViewAnswerCell", bundle: nil), forCellReuseIdentifier: "ChatTableViewAnswerCellID")
        tableView.dataSource = self
        tableView.delegate = self
        tableView.separatorStyle = .none

        let gradientLayer = CAGradientLayer()
        gradientLayer.frame = tableView.bounds
        gradientLayer.colors = [
            UIColor.black.cgColor,
            UIColor.black.withAlphaComponent(0).cgColor,
        ]
        gradientLayer.startPoint = CGPoint(x: 0.5, y: 1.0)
        gradientLayer.endPoint  =  CGPoint(x: 0.5, y: 0.1)
        tableView.layer.mask = gradientLayer
        
        return tableView
    }()
    
    lazy var microphoneStatusView = {
        let view = UIView(frame: CGRectMake(kScreen_WIDTH/2/2-80/2, kScreen_HEIGHT-safeBottom()-20-60, 80, 60))
        view.backgroundColor = .clear
        
        let iconView = UIView(frame: CGRect(x: 80/2-40/2, y: 0, width: 40, height: 40))
        iconView.backgroundColor = .white
        iconView.layer.cornerRadius = 20
        iconView.addSubview(self.microphoneStatusIcon)
        view.addSubview(iconView)
        
        let label = UILabel(frame: CGRect(x: 0, y: 40+5, width: 80, height: 15))
        label.font = UIFont.systemFont(ofSize: 12)
        label.textColor = .white
        label.text = "Microphone"
        label.textAlignment = .center
        view.addSubview(label)
        
        let tap = UITapGestureRecognizer(target: self, action: #selector(clickOpenOrCloesMirophoneButton))
        view.addGestureRecognizer(tap)
        return view
    }()
    lazy var microphoneStatusIcon = {
        let imageV = UIImageView(frame: CGRectMake(40/2-25/2, 40/2-25/2, 25, 25))
        imageV.contentMode = .scaleAspectFit
        imageV.image = UIImage(named: "micphone_opend")
        return imageV
    }()
    
    lazy var callStatusView = {
        let view = UIView(frame: CGRectMake(kScreen_WIDTH/2/2*2-80/2, kScreen_HEIGHT-safeBottom()-20-60, 80, 60))
        view.backgroundColor = .clear
        
        view.addSubview(self.callFullIconView)
        view.addSubview(self.callLabel)
        
        let tap = UITapGestureRecognizer(target: self, action: #selector(clickOpenOrCloesCallStatusButton))
        view.addGestureRecognizer(tap)
        return view
    }()
    lazy var callFullIconView = {
        let iconView = UIView(frame: CGRect(x: 80/2-40/2, y: 0, width: 40, height: 40))
        iconView.backgroundColor = .white
        iconView.layer.cornerRadius = 20
        iconView.addSubview(self.callStatusIcon)
        return iconView
    }()
    lazy var callStatusIcon = {
        let imageV = UIImageView(frame: CGRectMake(40/2-25/2, 40/2-25/2, 25, 25))
        imageV.contentMode = .scaleAspectFit
        imageV.image = UIImage(named: "call_open")
        return imageV
    }()
    lazy var callLabel = {
        let label = UILabel(frame: CGRect(x: 0, y: 40+5, width: 80, height: 15))
        label.font = UIFont.systemFont(ofSize: 12)
        label.textColor = .white
        label.text = "Call"
        label.textAlignment = .center
        return label
    }()
    

    lazy var cameraStatusView = {
        let view = UIView(frame: CGRectMake(kScreen_WIDTH/2/2*3-80/2, kScreen_HEIGHT-safeBottom()-20-60, 80, 60))
        view.backgroundColor = .clear
        
        let iconView = UIView(frame: CGRect(x: 80/2-40/2, y: 0, width: 40, height: 40))
        iconView.backgroundColor = .white
        iconView.layer.cornerRadius = 20
        iconView.addSubview(self.cameraStatusIcon)
        view.addSubview(iconView)
        
        let label = UILabel(frame: CGRect(x: 0, y: 40+5, width: 80, height: 15))
        label.font = UIFont.systemFont(ofSize: 12)
        label.textColor = .white
        label.text = "Camera"
        label.textAlignment = .center
        view.addSubview(label)
        
        let tap = UITapGestureRecognizer(target: self, action: #selector(clickOpenOrCloseCamerabutton))
        view.addGestureRecognizer(tap)
        return view
    }()
    lazy var cameraStatusIcon = {
        let imageV = UIImageView(frame: CGRectMake(40/2-25/2, 40/2-25/2, 25, 25))
        imageV.contentMode = .scaleAspectFit
        imageV.image = UIImage(named: "camera_closed")
        return imageV
    }()
    
    lazy var showcameraVideoView = {
        let view = UIView(frame: CGRectMake(kScreen_WIDTH-10-90, safeTop()+20, 90, 150))
        view.backgroundColor = .black
        view.layer.cornerRadius = 5
        view.layer.masksToBounds = true
        view.addSubview(self.switchCaeraButton)
        return view
    }()
    lazy var switchCaeraButton = {
        let button = UIButton(type: .custom)
        button.frame = CGRectMake(90/2-20/2, 10, 20, 20)
        button.setImage(UIImage(named: "switch_camera"), for: .normal)
        button.imageView?.contentMode = .scaleAspectFit
        button.addTarget(self, action: #selector(clickSwitchCameraPositionButton), for: .touchUpInside)
        return button
    }()
   
    enum NavTalkStatus: Int {
        case notConnected = 0
        case connecting = 1
        case connected = 2
    }
    
    var allMessageModels = [[String: Any]]()
    var talk_status: NavTalkStatus = .notConnected
    var isJudgeNotificationOfStatuse = true
    
    override func viewDidLoad() {
        super.viewDidLoad()
        initUI()
        fetchAvatarDetailInformation()
    }
    
    func initUI(){
        view.backgroundColor = .black
        view.addSubview(backgroudImage)
        view.addSubview(microphoneStatusView)
        view.addSubview(callStatusView)
        view.addSubview(cameraStatusView)
        view.addSubview(showcameraVideoView)
        
        microphoneStatusView.isHidden = true
        cameraStatusView.isHidden = true
        showcameraVideoView.isHidden = true
        
        talk_status = .notConnected
        refreshNavTalkStatusUI()
        
        view.addSubview(myTableView)
        
        if WebSocketManager.shared.isOrNotSaveHistoryChatMessages == false{
            UserDefaults.standard.removeObject(forKey: "SavedHistoryChatMessagesInLocal")
        }else{
            if let localSavedModels_string = UserDefaults.standard.string(forKey: "SavedHistoryChatMessagesInLocal"),
               let localSavedModels_array = jsonStringToArray(localSavedModels_string){
                if localSavedModels_array.count > 0{
                    allMessageModels = [[String: Any]]()
                    allMessageModels.append(contentsOf: localSavedModels_array)
                    myTableView.reloadData()
                    let lastIndex = IndexPath(row: self.allMessageModels.count - 1, section: 0)
                    self.myTableView.scrollToRow(at: lastIndex, at: .top, animated: true)
                }
            }
        }
        
        NotificationCenter.default.addObserver(self, selector: #selector(changeWebSocketStatus), name: NSNotification.Name(rawValue: "WebSocketManager_socket_status_changed"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(changeWebRTCStatus), name: NSNotification.Name(rawValue: "WebRTCManager_WebRTC_status_changed"), object: nil)
        
        NotificationCenter.default.addObserver(self, selector: #selector(HaveInputText), name: NSNotification.Name(rawValue: "HaveInputText"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(HaveOutputText), name: NSNotification.Name(rawValue: "HaveOutputText"), object: nil)
        
        NotificationCenter.default.addObserver(self, selector: #selector(refreshCameraButtonStatus), name: NSNotification.Name(rawValue: "CameraStateIsChanged"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(refreshMicrophonStatusUI), name: NSNotification.Name(rawValue: "changeAudioRecordStatus"), object: nil)
        
        
        WebRTCManager.shared.superVC = self
        WebSocketManager.shared.superVC = self
        CameraCaptureManager.shared.superVC = self
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onGainNetwork),
            name: .didGainNetwork,
            object: nil
        )
        
    }
    @objc private func onGainNetwork() {
        fetchAvatarDetailInformation()
    }
    //MARK: 0.Fetch Avatar Detail Information By Api
    func fetchAvatarDetailInformation(){
        var urlString = ""
        if (WebSocketManager.shared.characterId.count > 0){
            urlString = "https://api.navtalk.ai/api/open/v1/avatar/detail?avatarId=\(WebSocketManager.shared.characterId)"
        }else{
            urlString = "https://api.navtalk.ai/api/open/v1/avatar/getByName?name=\(WebSocketManager.shared.characterName)"
        }
        guard let url = URL(string: urlString) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(WebSocketManager.shared.license, forHTTPHeaderField: "license")
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Fetch Avatar Detail Information--Fail", error)
                return
            }
            guard let data = data else {
                print("Fetch Avatar Detail Information--No Data")
                return
            }
            do {
                if let result = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
                    print("Fetch Avatar Detail Information-Success")
                    print("\(result)")
                    if let avatar_data = result["data"] as? [String: Any],
                       let avatar_image_url_string = avatar_data["url"] as? String,
                       let avatar_image_url = URL(string: avatar_image_url_string),
                       let avatar_providerName = avatar_data["providerName"] as? String{
                        //providerName
                        WebSocketManager.shared.avatar_image_url = avatar_image_url_string
                        WebSocketManager.shared.avatar_provider_type = avatar_providerName
                        DispatchQueue.main.async {
                            self.backgroudImage.sd_setImage(with: avatar_image_url, placeholderImage: UIImage(named: "default_background"))
                            if avatar_providerName != "openai"{
                                self.cameraStatusView.alpha = 0.4
                                self.cameraStatusView.isUserInteractionEnabled = false
                            }else{
                                self.cameraStatusView.alpha = 1
                                self.cameraStatusView.isUserInteractionEnabled = true
                            }
                        }
                    }
                }
            }catch{
                print("Fetch Avatar Detail Information--Parse Result Error:", error)
            }
        }
        task.resume()
    }
    //MARK: 1.WebSocket:
    @objc func changeWebSocketStatus(){
        if isJudgeNotificationOfStatuse == false{
            return
        }
        DispatchQueue.main.async {
            if WebSocketManager.shared.socket_status == .Connectting{
                print("WebSocket status is changed，current is--Connectting")
            }else if WebSocketManager.shared.socket_status == .NotConnected{
                print("WebSocket status is changed，current is--NotConnected")
                MBProgressHUD.removeCurrentMBProgressHUD()
                self.talk_status = .notConnected
                self.refreshNavTalkStatusUI()
                self.isJudgeNotificationOfStatuse = false
                self.stopAllTask()
            }else if WebSocketManager.shared.socket_status == .Connected{
                print("WebSocket status is changed，current is--Connected")
            }
        }
    }
    //MARK: 2.WebRTC:
    var WebRTCConnect_Timer: Timer?
    @objc func changeWebRTCStatus(){
        if isJudgeNotificationOfStatuse == false{
            return
        }
        DispatchQueue.main.async {
            if WebRTCManager.shared.webRTC_status == .Connectting{
                print("WebRTC status is changed，current is--Connectting")
                DispatchQueue.main.async {
                    if self.WebRTCConnect_Timer != nil{
                        self.WebRTCConnect_Timer?.invalidate()
                        self.WebRTCConnect_Timer = nil
                    }
                    self.WebRTCConnect_Timer = Timer(timeInterval: 15.0, repeats: false, block: { timer in
                        if WebRTCManager.shared.webRTC_status == .Connectting{
                            WebSocketManager.shared.disconnectWebSocketOfNavTalk()
                        }
                    })
                    RunLoop.current.add(self.WebRTCConnect_Timer!, forMode: .common)
                }
            }else if WebRTCManager.shared.webRTC_status == .NotConnected{
                print("WebRTC status is changed，current is--NotConnected")
                MBProgressHUD.removeCurrentMBProgressHUD()
                self.talk_status = .notConnected
                self.refreshNavTalkStatusUI()
                self.isJudgeNotificationOfStatuse = false
                self.stopAllTask()
                if self.WebRTCConnect_Timer != nil{
                    self.WebRTCConnect_Timer?.invalidate()
                    self.WebRTCConnect_Timer = nil
                }
            }else if WebRTCManager.shared.webRTC_status == .Connected{
                print("WebRTC status is changed，current is--Connected")
                MBProgressHUD.removeCurrentMBProgressHUD()
                self.talk_status = .connected
                self.refreshNavTalkStatusUI()
                if self.WebRTCConnect_Timer != nil{
                    self.WebRTCConnect_Timer?.invalidate()
                    self.WebRTCConnect_Timer = nil
                }
            }else if WebRTCManager.shared.webRTC_status == .HaveRecieveRemoteVideoRender{
                print("WebRTC status is changed，current is--HaveRecieveRemoteVideoRender")
            }
        }
    }
    @objc func HaveInputText(notifiction: Notification){
        if let dict = notifiction.object as? [String: Any] {
            //print("User Ask：\(dict)")
            if let transcript = dict["text"] as? String{
                var messageModel = [String: Any]()
                messageModel["type"] = "question"
                messageModel["content"] = transcript
                allMessageModels.append(messageModel)
                saveChatMessageToLocal()
                if allMessageModels.count == 2{
                    let firstDict = allMessageModels[0]
                    if let firstDict_type = firstDict["type"] as? String,
                       firstDict_type == "answer"{
                        //Change Fist And Second
                        var new_allMessageModels = [[String: Any]]()
                        new_allMessageModels.append(allMessageModels[1])
                        new_allMessageModels.append(allMessageModels[0])
                        allMessageModels = new_allMessageModels
                    }
                }
                self.myTableView.reloadData()
                if self.allMessageModels.count > 0 {
                    let lastIndex = IndexPath(row: self.allMessageModels.count - 1, section: 0)
                    self.myTableView.scrollToRow(at: lastIndex, at: .top, animated: true)
                }
            }
        }
    }
    @objc func HaveOutputText(notifiction: Notification){
        if let dict = notifiction.object as? [String: Any]{
            //print("AI Answer：\(dict)")
            if let transcript = dict["text"] as? String{
                var messageModel = [String: Any]()
                messageModel["type"] = "answer"
                messageModel["content"] = transcript
                allMessageModels.append(messageModel)
                saveChatMessageToLocal()
                self.myTableView.reloadData()
                if self.allMessageModels.count > 0 {
                    let lastIndex = IndexPath(row: self.allMessageModels.count - 1, section: 0)
                    self.myTableView.scrollToRow(at: lastIndex, at: .top, animated: true)
                }
            }
        }
    }
    func saveChatMessageToLocal(){
        if WebSocketManager.shared.isOrNotSaveHistoryChatMessages{
            let localMessagesArray_string = arrayToJSONString(allMessageModels)
            UserDefaults.standard.set(localMessagesArray_string, forKey: "SavedHistoryChatMessagesInLocal")
            UserDefaults.standard.synchronize()
        }
    }
    //MARK: 3.UITableViewDelegate, UITableViewDataSource
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return allMessageModels.count
    }
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let current_massage = allMessageModels[indexPath.row]
        let current_message_type = current_massage["type"] as? String ?? ""
        if current_message_type == "question"{
            let cell = tableView.dequeueReusableCell(withIdentifier: "ChatTableViewQuestionCellID", for: indexPath) as! ChatTableViewQuestionCell
            cell.cellDict = current_massage
            cell.initUI()
            return cell
        }else if current_message_type == "answer"{
            let cell = tableView.dequeueReusableCell(withIdentifier: "ChatTableViewAnswerCellID", for: indexPath) as! ChatTableViewAnswerCell
            cell.cellDict = current_massage
            cell.initUI()
            return cell
        }else{
            let cell = UITableViewCell()
            return cell
        }
    }
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        if scrollView == myTableView {
            if let mask = scrollView.layer.mask as? CAGradientLayer {
                CATransaction.begin()
                CATransaction.setDisableActions(true)
                mask.frame = scrollView.bounds
                CATransaction.commit()
            }
        }
    }
    //MARK: 4.Cloase Or Open Microphone
    @objc func clickOpenOrCloesMirophoneButton(){
        if RecordAudioManager.shared.recordSatus == "no"{
            RecordAudioManager.shared.startSendAudioMessageToAI()
        }else{
            RecordAudioManager.shared.pauseSendAudioMessageToAI()
        }
    }
    @objc func refreshMicrophonStatusUI(){
        if RecordAudioManager.shared.recordSatus == "no"{
            microphoneStatusIcon.image = UIImage(named: "micphone_closed")
        }else{
            microphoneStatusIcon.image = UIImage(named: "micphone_opend")
        }
    }
    
    //MARK: 5.Cloase Or Open Call
    @objc func clickOpenOrCloesCallStatusButton(){
        if talk_status == .notConnected{
            //Refresh UI
            talk_status = .connecting
            refreshNavTalkStatusUI()
            //Connect WebSocket
            isJudgeNotificationOfStatuse = true
            WebSocketManager.shared.connectWebSocketOfNavTalk()
        }else if talk_status == .connected{
            //Refresh UI
            talk_status = .notConnected
            refreshNavTalkStatusUI()
            //Stop All Socket And WebRTC And Pause Record Audio
            isJudgeNotificationOfStatuse = false
            stopAllTask()
        }
    }
    func refreshNavTalkStatusUI(){
        if talk_status == .notConnected{
            callStatusView.isUserInteractionEnabled = true
            callStatusView.alpha = 1
            
            callFullIconView.backgroundColor = .white
            callStatusIcon.image = UIImage(named: "call_open")
            callLabel.text = "Call"
      
            microphoneStatusView.isHidden = true
            cameraStatusView.isHidden = true
            
            WebRTCManager.shared.remoteVideoView?.removeFromSuperview()
        }else if talk_status == .connecting{
            callStatusView.isUserInteractionEnabled = false
            callStatusView.alpha = 0.7
            
            callFullIconView.backgroundColor = .red
            callStatusIcon.image = UIImage(named: "talk_connecting_icon")
            callLabel.text = "Connecting…"
      
            microphoneStatusView.isHidden = true
            cameraStatusView.isHidden = true
        }else if talk_status == .connected{
            callStatusView.isUserInteractionEnabled = true
            callStatusView.alpha = 1
            
            callFullIconView.backgroundColor = .red
            callStatusIcon.image = UIImage(named: "call_close")
            callLabel.text = "Hang Up"
      
            microphoneStatusView.isHidden = false
            cameraStatusView.isHidden = false
        }else{
            
        }
    }
    func stopAllTask(){
        //pause captrue audio
        print("stop--1")
        RecordAudioManager.shared.pauseCaptureAudio()
        //disconect WebRTC
        print("stop--2")
        WebRTCManager.shared.disconnectWebRTC()
        //dicconect websocket
        print("stop--3")
        WebSocketManager.shared.disconnectWebSocketOfNavTalk()
        //Update Session DetailInformation
        fetchAvatarDetailInformation()
    }
    
    //MARK: 4.Cloase Or Open Camera
    @objc func clickOpenOrCloseCamerabutton(){
        if WebSocketManager.shared.socket_status != .Connected{
            MBProgressHUD.showTextWithTitleAndSubTitleWithShortTime(title: "Please connect to the WebSocket first", subTitle: "", view: self.view)
            return
        }
        if WebRTCManager.shared.webRTC_status != .Connected{
            MBProgressHUD.showTextWithTitleAndSubTitleWithShortTime(title: "Please connect to the WebRTC first", subTitle: "", view: self.view)
            return
        }
        if CameraCaptureManager.shared.current_camera_state == .opened{
            CameraCaptureManager.shared.stopRunningSession()
        }else{
            CameraCaptureManager.shared.showPreviewLayerView = showcameraVideoView
            CameraCaptureManager.shared.openCamera()
        }
    }
    @objc func refreshCameraButtonStatus(){
        DispatchQueue.main.async {
            if CameraCaptureManager.shared.current_camera_state == .opened{
                self.cameraStatusIcon.image = UIImage(named: "camera_opened")
                DispatchQueue.main.asyncAfter(deadline: .now()+0.5, execute: {
                    self.showcameraVideoView.isHidden = false
                })
            }else{
                self.cameraStatusIcon.image = UIImage(named: "camera_closed")
                self.showcameraVideoView.isHidden = true
            }
        }
    }
    @objc func clickSwitchCameraPositionButton(){
        CameraCaptureManager.shared.switchCameraPosition()
    }
}
