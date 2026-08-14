import 'package:permission_handler/permission_handler.dart';

class NavTalkPermissionHandler{

  //单例
  NavTalkPermissionHandler._internal();
  static final NavTalkPermissionHandler instance = NavTalkPermissionHandler._internal();

  //1.麦克风权限
  //1.1.获取App的麦克风权限的当前状态
  Future<PermissionStatus> getMicphonePermissionStatus() async{
    return Permission.microphone.status;
  }
  //1.2.快捷判断是否已经授权
  Future<bool> hasMicphonePermission() async {
    return Permission.microphone.isGranted;
  }
  //1.3.主动请求权限
  Future<PermissionStatus> requestMicrophonePermission() async {
    return Permission.microphone.request();
  }

  //2.处理相机权限：
  //2.1.获取App的相机的当前状态
  Future<PermissionStatus> getCameraPermissionStatus() async{
    return Permission.camera.status;
  }
  //2.2.快捷判断是否已经授权
  Future<bool> hasCameraPermission() async {
    return Permission.camera.isGranted;
  }
  //2.3.主动请求权限
  Future<PermissionStatus> requestCameraPermission() async {
    return Permission.camera.request();
  }

  //3.Android 12及以上蓝牙连接权限：
  //用于连接和使用已经配对的蓝牙耳机，不包含扫描附近设备。
  //Android 11及以下的蓝牙权限不是运行时权限，permission_handler会按平台处理。
  Future<PermissionStatus> getBluetoothConnectPermissionStatus() async {
    return Permission.bluetoothConnect.status;
  }

  Future<bool> hasBluetoothConnectPermission() async {
    return Permission.bluetoothConnect.isGranted;
  }

  Future<PermissionStatus> requestBluetoothConnectPermission() async {
    return Permission.bluetoothConnect.request();
  }

}  
