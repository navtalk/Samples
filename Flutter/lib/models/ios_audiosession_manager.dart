import 'dart:io';

import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:record/record.dart';

class IOSAudioSessionManager {
  IOSAudioSessionManager._internal();

  static final IOSAudioSessionManager instance =
      IOSAudioSessionManager._internal();

  bool _isPrepared = false;
  Future<void>? _preparingFuture;

  Future<void> prepareForCall(AudioRecorder recorder) async {
    if (!Platform.isIOS || _isPrepared) {
      return;
    }

    if (_preparingFuture != null) {
      await _preparingFuture;
      return;
    }

    _preparingFuture = _prepare(recorder);

    try {
      await _preparingFuture;
      _isPrepared = true;
    } finally {
      _preparingFuture = null;
    }
  }

  Future<void> _prepare(AudioRecorder recorder) async {
    final iosRecorder = recorder.ios;

    if (iosRecorder == null) {
      throw StateError('当前 AudioRecorder 不支持 iOS 接口');
    }

    await iosRecorder.manageAudioSession(false);
    await _configureAudioSession();

    print('iOS AudioSession 配置成功');
  }

  Future<void> confirmOutputRoute() async {
    if (!Platform.isIOS || !_isPrepared) {
      return;
    }

    try {
      await _configureAudioSession();
      print('iOS 音频输出路由确认成功');
    } catch (error) {
      print('iOS 音频输出路由确认失败：$error');
    }
  }

  Future<void> _configureAudioSession() async {
    await Helper.setAppleAudioConfiguration(
      AppleAudioConfiguration(
        appleAudioCategory: AppleAudioCategory.playAndRecord,
        appleAudioCategoryOptions: {
          AppleAudioCategoryOption.defaultToSpeaker,
          AppleAudioCategoryOption.allowBluetooth,
          AppleAudioCategoryOption.allowBluetoothA2DP,
        },
        appleAudioMode: AppleAudioMode.videoChat,
      ),
    );

    await Helper.ensureAudioSession();
    await Helper.setSpeakerphoneOnButPreferBluetooth();
  }

  void reset() {
    _isPrepared = false;
    _preparingFuture = null;
  }
}