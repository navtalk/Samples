
import UIKit
import AVFoundation

enum CameraStatus: Int {
    case unKnown = 0
    case opened = 1
    case closed = 2
}

class CameraCaptureManager: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate{
    
    //var audioUnit: AudioUnit?
    //var local_record_buffers = [AVAudioPCMBuffer]()
    //var local_record_Array = [[String: Any]]()
    
    var superVC: RealTimeTalkVC!
    var current_camera_state = CameraStatus.unKnown
    
    private let captureSession = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "camera.session.queue")
    private var videoDeviceInput: AVCaptureDeviceInput?
    private let videoOutput = AVCaptureVideoDataOutput()
    private var currentPosition: AVCaptureDevice.Position = .back
    
    private var captureTimer: Timer?
    private var allowSendCapturedImage = false
    
    static let shared = CameraCaptureManager()
    private override init(){
        super.init()
    }
    //MARK: 1.GetCameraAuthoroth
    func requestCameraAccess(completion: @escaping (Bool) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            completion(true)
            
        case .notDetermined:
            // Alert To Ask
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
            
        case .denied, .restricted:
            completion(false)
            
        @unknown default:
            completion(false)
        }
    }
    //MARK: 2.OpenCamera
    func openCamera(){
        requestCameraAccess { isOrNotHaveCameraAccess in
            if isOrNotHaveCameraAccess{
                self.setupSession()
            }else{
                MBProgressHUD.showTextWithTitleAndSubTitle(title: "Not yet granted camera permission", subTitle: "", view: self.superVC.view)
            }
        }
    }
    //MARK: 3.setupSession
    func setupSession(){
        sessionQueue.async {
            
            self.captureSession.beginConfiguration()
            self.captureSession.sessionPreset = .high
            
            self.captureSession.inputs.forEach(self.captureSession.removeInput(_:))
            
            guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: self.currentPosition),
                  let input = try? AVCaptureDeviceInput(device: device),
                  self.captureSession.canAddInput(input)
            else{
                return
            }
            
            self.captureSession.addInput(input)
            self.videoDeviceInput = input
            
            if self.captureSession.canAddOutput(self.videoOutput){
                self.captureSession.addOutput(self.videoOutput)
            }
            
            self.videoOutput.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]
            self.videoOutput.alwaysDiscardsLateVideoFrames = true
            self.videoOutput.setSampleBufferDelegate(self, queue: self.sessionQueue)
            
            if let connection = self.videoOutput.connection(with: .video),
               connection.isVideoOrientationSupported{
                connection.videoOrientation = .portrait
            }
            self.captureSession.commitConfiguration()
            
            // Start
            self.startRunningSession()
        }
    }
    //MARK: 4.startRunningSession
    func startRunningSession(){
        sessionQueue.async {
            if !self.captureSession.isRunning{
                self.captureSession.startRunning()
                self.current_camera_state = .opened
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "CameraStateIsChanged"), object: nil)
            }
        }
        DispatchQueue.main.async{
            if self.captureTimer != nil{
                self.captureTimer?.invalidate()
                self.captureTimer = nil
            }
            self.captureTimer = Timer(timeInterval: 3, repeats: true, block: { timer in
                //print("Run Timer Task")
                self.allowSendCapturedImage = true
            })
            RunLoop.current.add(self.captureTimer!, forMode: .common)
        }
    }
    
    //MARK: 5.stopRunningSession
    func stopRunningSession(){
        sessionQueue.async {
            if self.captureSession.isRunning{
                self.captureSession.stopRunning()
                self.current_camera_state = .closed
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "CameraStateIsChanged"), object: nil)
                if self.captureTimer != nil{
                    self.captureTimer?.invalidate()
                    self.captureTimer = nil
                }
                self.allowSendCapturedImage = false
            }
        }
    }
    
    //MARK: 6.Capture Each Image From Camera
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        if current_camera_state != .opened{
            print("fail--1")
            return
        }
        if allowSendCapturedImage == false{
            print("fail--2")
            return
        }
        self.allowSendCapturedImage = false
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            print("fail--3")
            return
        }
        print("===========================")
        print("Capture Each Image From Camera")
        
        //(1). PixelBuffer → UIImage
        let image = pixelBufferToUIImage(pixelBuffer: pixelBuffer)

        //(2).UIImage → JPEG Data
        guard let jpegData = image.jpegData(compressionQuality: 0.7) else {
            print("fail--4")
            return
        }

        // 3. JPEG → Base64
        let base64String = jpegData.base64EncodedString()

        let imageUrl = "data:image/jpeg;base64,\(base64String)"

        //4.组装和 Web 端一致的消息
        let event: [String: Any] = [
            "type": "conversation.item.create",
            "item": [
                "type": "message",
                "role": "user",
                "content": [
                    [
                    "type": "input_image",
                    "image_url": imageUrl
                    ]
                ]
            ]
        ]
        //5. 发送 WebSocket
        if let jsonData = try? JSONSerialization.data(withJSONObject: event),
            let jsonString = String(data: jsonData, encoding: .utf8) {
               WebSocketManager.shared.socket.write(string: jsonString) {
                //print("send message of audio data success---\(event)")
                print("send message of video data success---")
            }
        }
    }
    func pixelBufferToUIImage(pixelBuffer: CVPixelBuffer) -> UIImage {
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        let rect = CGRect(
            x: 0,
            y: 0,
            width: CVPixelBufferGetWidth(pixelBuffer),
            height: CVPixelBufferGetHeight(pixelBuffer)
        )

        guard let cgImage = context.createCGImage(ciImage, from: rect) else {
            return UIImage()
        }

        return UIImage(cgImage: cgImage)
    }
}

