
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:navtalk_flutter_sample/models/notification_manager.dart';
import 'package:navtalk_flutter_sample/models/webrtc_manager.dart';
import 'package:navtalk_flutter_sample/models/websocket_namager.dart';
import 'package:image/image.dart' as img;

enum CameraCaptureStatus {
  unknown,
  opening,
  opened,
  closing,
  closed,
  failed,
}

class CameraCaptureManager {

  //单例
  CameraCaptureManager._internal();
  static final CameraCaptureManager instance = CameraCaptureManager._internal();

  //属性
  bool isAllowedCaptrueCameraPhoto = false;
  CameraCaptureStatus currentCameraStatus = CameraCaptureStatus.unknown;
  List<CameraDescription> camerasList = [];
  CameraController? currentCameraController;
  CameraLensDirection currentLensDirection = CameraLensDirection.back;
  Timer? captureTimer;

  // 定时器每两秒将它设置为true，ImageStream随后抽取一帧
  bool allowCaptureFrame = false;
  // 防止上一帧还在转换时又开始处理下一帧
  bool isProcessingFrame = false;

  //函数
  //1.打开摄像头
  Future<bool> startCaptruePhoto() async{
    if (currentCameraStatus == .opening || currentCameraStatus == .opened){
      return true;
    }
    currentCameraStatus = CameraCaptureStatus.opening;
    try{
      //获取当前设备
      camerasList = await availableCameras();
      if (camerasList.isEmpty){
        print('当前设备没有可用摄像头');
        currentCameraStatus = CameraCaptureStatus.failed;
        return false;
      }
      //获取符合条件的摄像头
      CameraDescription? finalCamera;
      for (final camera in camerasList){
        if (camera.lensDirection == currentLensDirection){
          finalCamera = camera;
        }
      }
      if (finalCamera == null){
        print('没有找到指定方向的摄像头');
        currentCameraStatus = CameraCaptureStatus.failed;
        return false;
      }
      captureTimer?.cancel();
      captureTimer = null;
      //摄像头画面预览对象
      final newController = CameraController(
            finalCamera, 
            ResolutionPreset.medium,
            enableAudio: false,
            imageFormatGroup: Platform.isIOS ? ImageFormatGroup.bgra8888 : ImageFormatGroup.yuv420 //iOS通常返回BGRA，Android通常返回YUV420
      );
      await newController.initialize();
      currentCameraController = newController;
      currentCameraStatus = CameraCaptureStatus.opened;
      //启动连续预览帧流。这里不会触发拍照、快门声音或拍照动画。
      await startCameraImageStream();
      //每两秒抽取一帧并上传
      startCaptureTimer();

      print('摄像头打开成功');
      NotificationManager.instance.appNotifictionCenter.add('openCameraSuccess');
      return true;
    }catch(error){
      print('摄像头打开失败：${error}');
      currentCameraStatus = CameraCaptureStatus.failed;
      NotificationManager.instance.appNotifictionCenter.add('openCameraSuccess');
      await releaseController();
      return false;
    }
  }
  //2.关闭摄像头：
  Future<void> closeCamera() async {
    if (currentCameraStatus == CameraCaptureStatus.closed || currentCameraStatus == CameraCaptureStatus.closing) {
      return;
    }
    currentCameraStatus = CameraCaptureStatus.closing;
    captureTimer?.cancel();
    captureTimer = null;
    await releaseController();
    currentCameraStatus = CameraCaptureStatus.closed;
    print('摄像头已关闭');
  }
  //3.释放摄像头
  Future<void> releaseController() async {
    final controller = currentCameraController;
    currentCameraController = null;
    if (controller != null) {
      try {
        await controller.dispose();
      } catch (error) {
        debugPrint('释放摄像头失败：$error');
      }
    }
  }
  //4.切换摄像头
  Future<void> switchCameraPosition() async {
    if (currentCameraStatus != CameraCaptureStatus.opened) {
      return;
    }
    currentLensDirection = (currentLensDirection == CameraLensDirection.back) ? CameraLensDirection.front : CameraLensDirection.back;
    CameraDescription? targetCamera;
    for (final camera in camerasList){
      if (camera.lensDirection == currentLensDirection){
        targetCamera = camera;
      }
    }
    if (targetCamera == null) {
      print('设备没有目标方向的摄像头');
      return;
    }

    captureTimer?.cancel();
    captureTimer = null;

    final oldController = currentCameraController;
    currentCameraController = null;
    try {
      // 先让页面移除旧的CameraPreview
      currentCameraController = null;
      NotificationManager.instance.appNotifictionCenter.add('CameraStateIsChanged');
      // 释放旧摄像头，避免同时占用摄像头资源
      await oldController?.dispose();
      //初始化新的摄像头并展示新的画面
      final newController = CameraController(
            targetCamera, 
            ResolutionPreset.medium,
            enableAudio: false,
            imageFormatGroup: Platform.isIOS ? ImageFormatGroup.bgra8888 : ImageFormatGroup.yuv420 //iOS通常返回BGRA，Android通常返回YUV420
      );
      await newController.initialize();
      currentCameraController = newController;
      NotificationManager.instance.appNotifictionCenter.add('CameraStateIsChanged');
      //开始获取帧视图画面
      //启动连续预览帧流。这里不会触发拍照、快门声音或拍照动画。
      await startCameraImageStream();
      //每两秒抽取一帧并上传
      startCaptureTimer();
      print('摄像头切换成功：$currentLensDirection');
    } catch (error, stackTrace) {
      debugPrint('切换摄像头失败：$error');
      //切换失败时尝试继续使用原摄像头
      currentCameraController = oldController;
      //startCaptureTimer();
      NotificationManager.instance.appNotifictionCenter.add('openCameraSuccess');
    }
  }

  //5.启动相机帧流
  Future<void> startCameraImageStream() async {
    final controller = currentCameraController;
    if (controller == null || !controller.value.isInitialized || controller.value.isStreamingImages) {
      return;
    }
    await controller.startImageStream((CameraImage cameraImage){
      if (!allowCaptureFrame){
        return;
      }
      if (currentCameraStatus != CameraCaptureStatus.opened) {
        return;
      }
      if (!isAllowedCaptrueCameraPhoto) {
        return;
      }
      //上一帧还没有转换完成，丢弃当前帧
      if (isProcessingFrame) {
        return;
      }
      //已经取到本周期的一帧，等待下一个两秒周期
      allowCaptureFrame = false;
      isProcessingFrame = true;
      //处理每一帧
      unawaited(
        processAndSendCameraFrame(cameraImage).whenComplete(() {
          isProcessingFrame = false;
        }),
      );
    });
  }
  //6.每两秒允许抽取一帧
  void startCaptureTimer() {
    captureTimer?.cancel();
    // 打开摄像头后立即允许发送第一帧。
    // 如果希望等待两秒再发送，可以改成false。
    allowCaptureFrame = true;
    captureTimer = Timer.periodic(
    const Duration(seconds: 2),(_) {
      if (currentCameraStatus == CameraCaptureStatus.opened && isAllowedCaptrueCameraPhoto && !isProcessingFrame) {
          allowCaptureFrame = true;
      }
    },
    );
  }
  //7.将相机帧转换为JPEG并上传
  Future<void> processAndSendCameraFrame(CameraImage cameraImage) async {
    print('开始处理帧画面并发送到服务器');
    if (WebsocketManager.instance.currentWebSocketStatus != .connected || WebsocketManager.instance.currentWebSocketChannel == null){
      return;
    }
    if (WebRTCManager.instance.currentWebRTCStatus != .connected){
      return;
    }
    try{
      //CameraImage由原生相机持有。回调结束后缓冲区可能被复用，因此必须立即复制字节数据。
      final frameData = copyCameraImageData(cameraImage);
      //YUV/BGRA转JPEG比较耗时。使用compute放到后台Isolate，避免相机预览和UI卡顿。
      final jpegBytes = await compute(
        convertCameraFrameToJpeg,
        frameData,
      );
      if (jpegBytes.isEmpty) {
        print('相机帧转换结果为空');
        return;
      }
      //图片转换期间WebSocket可能已经断开，需要再次检查
      if (WebsocketManager.instance.currentWebSocketStatus != .connected || WebsocketManager.instance.currentWebSocketChannel == null){return;}
      if (WebRTCManager.instance.currentWebRTCStatus != .connected){return;}
      final base64String = base64Encode(jpegBytes);
      final event = <String, dynamic>{
        'type': 'realtime.input_image',
        'data': {
          'content': 'data:image/jpeg;base64,$base64String',
          // 0：发送图片但不要求AI立即回复
          // 1：要求AI根据这张图片立即回复
          'reply': 0,
        },
      };
      WebsocketManager.instance.currentWebSocketChannel!.sink.add(jsonEncode(event));
      print('发送图片数据成功：${jpegBytes.length} bytes');
    }catch (error){
      print('处理帧画面发生错误$error');
    }
  }
  //8.复制CameraImage的数据
  Map<String, dynamic> copyCameraImageData(CameraImage cameraImage) {
    final cameraDescription = currentCameraController?.description;
    return <String, dynamic>{
      'width': cameraImage.width,
      'height': cameraImage.height,
      'format': cameraImage.format.group.name,
      'sensorOrientation': cameraDescription?.sensorOrientation ?? 0,
      'lensDirection': cameraDescription?.lensDirection.name ?? 'back',
      'planes': cameraImage.planes.map((plane) {
        return <String, dynamic>{
          // 必须复制，不能把原生相机缓冲区直接交给异步任务
          'bytes': Uint8List.fromList(plane.bytes),
          'bytesPerRow': plane.bytesPerRow,
          'bytesPerPixel': plane.bytesPerPixel ?? 1,
          };
        }).toList(),
    };
  }
}

//添加 JPEG 转换函数
Uint8List convertCameraFrameToJpeg(
  Map<String, dynamic> frameData,
) {
  final width = frameData['width'] as int;
  final height = frameData['height'] as int;
  final format = frameData['format'] as String;
  final sensorOrientation =
      frameData['sensorOrientation'] as int;
  final lensDirection =
      frameData['lensDirection'] as String;

  final planes = (frameData['planes'] as List)
      .cast<Map<String, dynamic>>();

  img.Image convertedImage;

  if (format == ImageFormatGroup.bgra8888.name) {
    convertedImage = convertBgra8888ToImage(
      width: width,
      height: height,
      plane: planes.first,
    );
  } else {
    convertedImage = convertYuv420ToImage(
      width: width,
      height: height,
      planes: planes,
    );
  }

  // 根据传感器方向旋转图片
  if (sensorOrientation == 90 ||
      sensorOrientation == 180 ||
      sensorOrientation == 270) {
    convertedImage = img.copyRotate(
      convertedImage,
      angle: sensorOrientation,
    );
  }

  // 前置摄像头按照预览效果进行水平镜像
  if (lensDirection == CameraLensDirection.front.name) {
    convertedImage = img.flipHorizontal(convertedImage);
  }

  // 限制上传尺寸，降低WebSocket数据量
  if (convertedImage.width > 720) {
    convertedImage = img.copyResize(
      convertedImage,
      width: 720,
      interpolation: img.Interpolation.linear,
    );
  }

  return Uint8List.fromList(
    img.encodeJpg(
      convertedImage,
      quality: 70,
    ),
  );
}

//iOS BGRA 转换：
img.Image convertBgra8888ToImage({
  required int width,
  required int height,
  required Map<String, dynamic> plane,
}) {
  final bytes = plane['bytes'] as Uint8List;
  final bytesPerRow = plane['bytesPerRow'] as int;

  final result = img.Image(
    width: width,
    height: height,
  );

  for (int y = 0; y < height; y++) {
    final rowOffset = y * bytesPerRow;

    for (int x = 0; x < width; x++) {
      final index = rowOffset + x * 4;

      if (index + 3 >= bytes.length) {
        continue;
      }

      final blue = bytes[index];
      final green = bytes[index + 1];
      final red = bytes[index + 2];
      final alpha = bytes[index + 3];

      result.setPixelRgba(
        x,
        y,
        red,
        green,
        blue,
        alpha,
      );
    }
  }

  return result;
}
//Android YUV420 转换：
img.Image convertYuv420ToImage({
  required int width,
  required int height,
  required List<Map<String, dynamic>> planes,
}) {
  if (planes.length < 3) {
    throw StateError(
      '当前YUV格式需要3个Plane，实际为${planes.length}',
    );
  }

  final yPlane = planes[0];
  final uPlane = planes[1];
  final vPlane = planes[2];

  final yBytes = yPlane['bytes'] as Uint8List;
  final uBytes = uPlane['bytes'] as Uint8List;
  final vBytes = vPlane['bytes'] as Uint8List;

  final yRowStride = yPlane['bytesPerRow'] as int;
  final uRowStride = uPlane['bytesPerRow'] as int;
  final vRowStride = vPlane['bytesPerRow'] as int;

  final yPixelStride = yPlane['bytesPerPixel'] as int;
  final uPixelStride = uPlane['bytesPerPixel'] as int;
  final vPixelStride = vPlane['bytesPerPixel'] as int;

  final result = img.Image(
    width: width,
    height: height,
  );

  for (int y = 0; y < height; y++) {
    final uvY = y ~/ 2;

    for (int x = 0; x < width; x++) {
      final uvX = x ~/ 2;

      final yIndex =
          y * yRowStride + x * yPixelStride;

      final uIndex =
          uvY * uRowStride + uvX * uPixelStride;

      final vIndex =
          uvY * vRowStride + uvX * vPixelStride;

      if (yIndex >= yBytes.length ||
          uIndex >= uBytes.length ||
          vIndex >= vBytes.length) {
        continue;
      }

      final yValue = yBytes[yIndex];
      final uValue = uBytes[uIndex];
      final vValue = vBytes[vIndex];

      final c = yValue - 16;
      final d = uValue - 128;
      final e = vValue - 128;

      final red = clampColor(
        (298 * c + 409 * e + 128) >> 8,
      );

      final green = clampColor(
        (298 * c - 100 * d - 208 * e + 128) >> 8,
      );

      final blue = clampColor(
        (298 * c + 516 * d + 128) >> 8,
      );

      result.setPixelRgb(
        x,
        y,
        red,
        green,
        blue,
      );
    }
  }

  return result;
}

int clampColor(int value) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}