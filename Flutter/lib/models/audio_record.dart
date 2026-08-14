
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:navtalk_flutter_sample/models/ios_audiosession_manager.dart';
import 'package:navtalk_flutter_sample/models/webrtc_manager.dart';
import 'package:navtalk_flutter_sample/models/websocket_namager.dart';
import 'package:record/record.dart';

enum AudioCaptureStatus {
    idle,
    starting,
    recording,
    stopping,
    failed,
  }

class AudioRecordManager{
    //单例
  AudioRecordManager._internal();
  static final AudioRecordManager instance = AudioRecordManager._internal();

  //属性
  bool isAllowedRecordAudio = true;
  AudioCaptureStatus _captureStatus = AudioCaptureStatus.idle;
  final AudioRecorder _audioRecorder = AudioRecorder();
  StreamSubscription<Uint8List>? _audioSubscription;
  
 //1.开始录制音频
 Future<void> startAudioRecord() async{
  if (_captureStatus == AudioCaptureStatus.recording || _captureStatus == AudioCaptureStatus.starting) {
      print('当前已经开始录音');
      return;
  }
  if (WebsocketManager.instance.currentWebSocketStatus != .connected){
    print('当前不可开始录音--WebSocket还没有连接');
    return;
  }
  if (WebsocketManager.instance.currentWebSocketChannel == null) {
    print('当前不可开始录音--WebSocketChannel为空');
    return;
  }
  _captureStatus = AudioCaptureStatus.starting;
  isAllowedRecordAudio = true;
  try{
    //虽然点击按钮之前已经判断了是否有麦克风权限，这里仍建议保留
    final hasPermission = await _audioRecorder.hasPermission();
    if (!hasPermission) {
      print('没有麦克风权限');
        _captureStatus = AudioCaptureStatus.failed;
        isAllowedRecordAudio = false;
        return;
    }
    const config = RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 24000,
        numChannels: 1,
        echoCancel: true,
        noiseSuppress: true,
        autoGain: true,
        //2400 字节约等于 50ms：
        //24000采样率 × 1声道 × 2字节 × 0.05秒
        streamBufferSize: 2400,
        audioInterruption: AudioInterruptionMode.none,//不再申请/监听自己的Audio Focus，也不会因为WebRTC获取Audio Focus而暂停Android中PCM的采集。
    );

    //在 tartStream之前调用：处理iOS中的音频输出渠道问题。
    await IOSAudioSessionManager.instance.prepareForCall(_audioRecorder);
    //获取音频流数据
    final audioStream = await _audioRecorder.startStream(config);
    _audioSubscription = audioStream.listen(
      (Uint8List audioBytes){
        if (WebsocketManager.instance.currentWebSocketStatus != .connected){return;}
        handleAudioBytes(audioBytes);
      },
      onError: (Object error, StackTrace stackTrace){
        print('录音Stream错误：${error}');
        _captureStatus = AudioCaptureStatus.failed;
        stopAudioRecord();
      },
      onDone: (){
        print('录音Stream结束');
        if (_captureStatus != AudioCaptureStatus.stopping) {
            _captureStatus = AudioCaptureStatus.idle;
          }
      },
      cancelOnError: false,
      );
      _captureStatus = AudioCaptureStatus.recording;
      isAllowedRecordAudio = true;
      print('开始录音成功');
   }catch (error){
     print('开启录音失败:${error}');
     _captureStatus = AudioCaptureStatus.failed;
     isAllowedRecordAudio = false;
     stopAudioRecord();
    };
  }
   //2.处理并发送采集到的PCM数据
   void handleAudioBytes(Uint8List audioBytes) {
    if (_captureStatus != AudioCaptureStatus.recording) {
      return;
    }
    // 相当于Swift里的 pauseSendAudioMessageToAI()
    if (!isAllowedRecordAudio) {
      return;
    }
    if (WebsocketManager.instance.currentWebSocketStatus != WebSocketStatus.connected) {
      return;
    }
    //这里需要注意，在WebRTC链接成功后再去发送：
     if (WebRTCManager.instance.currentWebRTCStatus != .connected) {
      return;
    }
    final channel = WebsocketManager.instance.currentWebSocketChannel;
    if (channel == null || audioBytes.isEmpty) {
      return;
    }
    final message = <String, dynamic>{
      'type': 'realtime.input_audio_buffer.append',
      'data': {
        'audio': base64Encode(audioBytes),
      },
    };
    try {
      channel.sink.add(jsonEncode(message));
      print('发送音频数据成功');
    } catch (error) {
      print('发送音频数据失败：$error');
    }
   }
   //3.停止采集音频并释放资源
   Future<void> stopAudioRecord() async {
    if (_captureStatus == AudioCaptureStatus.idle ||
        _captureStatus == AudioCaptureStatus.stopping) {
      return;
    }
    _captureStatus = AudioCaptureStatus.stopping;
    isAllowedRecordAudio = false;
    try {
      await _audioSubscription?.cancel();
      _audioSubscription = null;
      await _audioRecorder.stop();
      _captureStatus = AudioCaptureStatus.idle;
      print('停止录音成功');
    } catch (error, stackTrace) {
      print('停止录音失败：$error');
      print(stackTrace);
      _captureStatus = AudioCaptureStatus.failed;
    }
  }
  //4.异常时清理
  Future<void> _cleanAudioRecord() async {
    try {
      await _audioSubscription?.cancel();
    } catch (_) {}
    _audioSubscription = null;
    try {
      await _audioRecorder.stop();
    } catch (_) {}
  }
 }



