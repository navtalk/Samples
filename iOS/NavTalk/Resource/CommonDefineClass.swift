
import Foundation
import UIKit
import AVFoundation

var kMain_Screen: UIScreen{
    if #available(iOS 13.0.0, *){
        if (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.screen != nil{
            return ((UIApplication.shared.connectedScenes.first as? UIWindowScene)?.screen)!
        }else{
            return UIScreen.main
        }
    }else{
        return UIScreen.main
    }
}
let kScreen_WIDTH = kMain_Screen.bounds.size.width
let kScreen_HEIGHT = kMain_Screen.bounds.size.height

var isFullScreen: Bool {
    if #available(iOS 11, *) {
          guard let w = UIApplication.shared.delegate?.window, let unwrapedWindow = w else {
              return false
          }
          
          if unwrapedWindow.safeAreaInsets.left > 0 || unwrapedWindow.safeAreaInsets.bottom > 0 {
              print(unwrapedWindow.safeAreaInsets)
              return true
          }
    }
    return false
}

let kTabBarHeight: CGFloat = isFullScreen ? (49.0 + 34.0) : (49.0)

let kStatusBarHeight: CGFloat = isFullScreen ? (44.0) : (20.0)

let kNavBarHeight: CGFloat = 44.0

let kNavBarAndStatusBarHeight: CGFloat = isFullScreen ? (88.0) : (64.0)

func safeTop() -> CGFloat {
    if #available(iOS 13.0, *) {
        let scene = UIApplication.shared.connectedScenes.first
        guard let windowScene = scene as? UIWindowScene else { return 0 }
        guard let window = windowScene.windows.first else { return 0 }
        return window.safeAreaInsets.top
    } else if #available(iOS 11.0, *) {
        guard let window = UIApplication.shared.windows.first else { return 0 }
        return window.safeAreaInsets.top
    }
    return 44.0
}
func safeBottom() -> CGFloat {
    if #available(iOS 13.0, *) {
        let scene = UIApplication.shared.connectedScenes.first
        guard let windowScene = scene as? UIWindowScene else { return 0 }
        guard let window = windowScene.windows.first else { return 0 }
        return window.safeAreaInsets.bottom
    } else if #available(iOS 11.0, *) {
        guard let window = UIApplication.shared.windows.first else { return 0 }
        return window.safeAreaInsets.bottom
    }
    return 0
}

func calculateHeight(forText text: String, withFont font: UIFont, andWidth width: CGFloat) -> CGFloat {
    let constraintRect = CGSize(width: width, height: .greatestFiniteMagnitude)
    let boundingBox = text.boundingRect(with: constraintRect,
                                        options: .usesLineFragmentOrigin,
                                        attributes: [NSAttributedString.Key.font: font],
                                        context: nil)
    return ceil(boundingBox.height)
}
func calculateWidth(forText text: String, withFont font: UIFont, andHeight height: CGFloat) -> CGFloat {
    let constraintSize = CGSize(width: .greatestFiniteMagnitude, height: height)
    let boundingBox = text.boundingRect(with: constraintSize,
                                        options: .usesLineFragmentOrigin,
                                        attributes: [NSAttributedString.Key.font: font],
                                        context: nil)
    return ceil(boundingBox.width)
}

func getCurrentVc() -> UIViewController{
    let rootVc = UIApplication.shared.keyWindow?.rootViewController
    let currentVc = getCurrentVcFrom(rootVc!)
    return currentVc
}
func getCurrentVcFrom(_ rootVc:UIViewController) -> UIViewController{
   var currentVc:UIViewController
   var rootCtr = rootVc
   if(rootCtr.presentedViewController != nil) {
     rootCtr = rootVc.presentedViewController!
   }
   if rootVc.isKind(of:UITabBarController.classForCoder()) {
     currentVc = getCurrentVcFrom((rootVc as! UITabBarController).selectedViewController!)
   }else if rootVc.isKind(of:UINavigationController.classForCoder()){
      currentVc = getCurrentVcFrom((rootVc as! UINavigationController).visibleViewController!)
   }else{
     currentVc = rootCtr
   }
   return currentVc
}

func int16DataToPCMBuffer(int16Data: [Int16], sampleRate: Double, channels: AVAudioChannelCount) -> AVAudioPCMBuffer? {
    let audioFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: channels, interleaved: false)
    let frameLength = UInt32(int16Data.count) / channels
    guard let pcmBuffer = AVAudioPCMBuffer(pcmFormat: audioFormat!, frameCapacity: frameLength) else {
        print("Can't creat AVAudioPCMBuffer")
        return nil
    }
    pcmBuffer.frameLength = frameLength
    if let channelData = pcmBuffer.int16ChannelData {
        for channel in 0..<Int(channels) {
            let channelPointer = channelData[channel]
            let samplesPerChannel = int16Data.count / Int(channels)
            for sampleIndex in 0..<samplesPerChannel {
                channelPointer[sampleIndex] = int16Data[sampleIndex * Int(channels) + channel]
            }
        }
    }
    return pcmBuffer
}

func COLORFROMRGB(r:CGFloat,_ g:CGFloat,_ b:CGFloat, alpha:CGFloat) -> UIColor{
    return UIColor(red: (r)/255.0, green: (g)/255.0, blue: (b)/255.0, alpha: alpha)
}
