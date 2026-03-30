
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
    
    var previewLayer: AVCaptureVideoPreviewLayer?
    var showPreviewLayerView: UIView!
    
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
            
            //Show camera Image:
            DispatchQueue.main.async {
                if self.previewLayer == nil {
                    let layer = AVCaptureVideoPreviewLayer(session: self.captureSession)
                    layer.videoGravity = .resizeAspectFill
                    layer.frame = self.showPreviewLayerView.bounds   // previewView your page's show view
                    self.showPreviewLayerView.layer.insertSublayer(layer, at: 0)
                    self.previewLayer = layer
                }
            }
            
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
            self.captureTimer = Timer(timeInterval: 2, repeats: true, block: { timer in
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

        //4.Assemble message
        // 0 = no immediate reply, 1 = request reply
        let event: [String: Any] = [
            "type": "realtime.input_image",
            "data": [
                "content": imageUrl,
                "reply": 0
            ]
        ]
        //5. Send Messae Of Image Data
        if let jsonData = try? JSONSerialization.data(withJSONObject: event),
            let jsonString = String(data: jsonData, encoding: .utf8) {
               WebSocketManager.shared.socket.write(string: jsonString) {
                //print("send message of audio data success---\(event)")
                print("send message of image data success---")
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
    
    //MARK: 7.Swicth Camera Position
    func switchCameraPosition(){
        sessionQueue.async {
            guard self.current_camera_state == .opened else { return }
            self.currentPosition = (self.currentPosition == .back) ? .front : .back
            self.captureSession.beginConfiguration()
            if let currentInput = self.videoDeviceInput {
                self.captureSession.removeInput(currentInput)
            }
            guard let newDevice = AVCaptureDevice.default(
                .builtInWideAngleCamera,
                for: .video,
                position: self.currentPosition
            ),
                  let newInput = try? AVCaptureDeviceInput(device: newDevice),
                  self.captureSession.canAddInput(newInput)
            else {
                self.captureSession.commitConfiguration()
                return
            }
    
            self.captureSession.addInput(newInput)
            self.videoDeviceInput = newInput
            
            if let connection = self.videoOutput.connection(with: .video){
                if connection.isVideoOrientationSupported {
                    connection.videoOrientation = .portrait
                }
                if connection.isVideoMirroringSupported {
                    connection.isVideoMirrored = (self.currentPosition == .front)
                }
            }
            self.captureSession.commitConfiguration()
        }
    }
}

