

import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    var window: UIWindow?
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        NetworkMonitor.shared.start()
        initRootWindow()
        return true
    }

    func initRootWindow(){
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.backgroundColor = .white
        let vc = RealTimeTalkVC()
        window?.rootViewController = vc
        window?.makeKeyAndVisible()
    }

}

