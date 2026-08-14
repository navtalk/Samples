import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:navtalk_flutter_sample/models/ios_audiosession_manager.dart';
import 'package:navtalk_flutter_sample/models/navatlk_manager.dart';
import 'package:navtalk_flutter_sample/models/notification_manager.dart';
import 'package:navtalk_flutter_sample/models/websocket_namager.dart';

enum WebRTCStatus{
  disconnected,
  connecting,
  connected,
}

class WebRTCManager{
  
  //单例
   WebRTCManager._internal();
  static final WebRTCManager instance = WebRTCManager._internal();

  //属性
  WebRTCStatus currentWebRTCStatus = WebRTCStatus.disconnected;
  RTCPeerConnection? currentPeerConnection;
  MediaStream? currentRemoteStream;
  RTCVideoRenderer? currentRTCVideoRenderer;

  //方法
  //1.交换SDP
  Future<void> exchangeSdpDataInWebRTC(String messageSdpData, BuildContext context) async{
    print('WebRTC--开始任务--交换SDP');
    if (currentWebRTCStatus != WebRTCStatus.disconnected){
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('The status of Webrtc is not disconnected.')),
      );
      return;
    }
    if (NavTalkManager.instance.sessionId.trim().isEmpty || NavTalkManager.instance.iceServers.isEmpty || messageSdpData.trim().isEmpty){
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('You have not get correct param for webrtc.')),
      );
      return;
    }
    try{
      //1.0. 准备工作
      currentRTCVideoRenderer = RTCVideoRenderer();
      await currentRTCVideoRenderer!.initialize();
      currentWebRTCStatus = WebRTCStatus.connecting;
      NotificationManager.instance.appNotifictionCenter.add('WebRTCStatusChanged');
      print('WebRTC--链接状态--链接中');
      //1.1.创建PeerConnection
      //print('iceServers===>${NavTalkManager.instance.iceServers}');
      //print('SDP==${messageSdpData}');
      final configuration = <String, dynamic>{
        'iceTransportPolicy': 'all',
        'rtcpMuxPolicy': 'require',
        'bundlePolicy': 'max-bundle',
        'sdpSemantics': 'unified-plan',
        'iceServers': NavTalkManager.instance.iceServers,

      };
      currentPeerConnection = await createPeerConnection(configuration);
      //1.2.监听到本地ICE Candidate
      //通过WebSocket发送给服务器
      currentPeerConnection!.onIceCandidate = (RTCIceCandidate candidate){
         final candidateString = candidate.candidate;
         if (candidateString == null || candidateString.isEmpty) {
          return;
         }
         if (WebsocketManager.instance.currentWebSocketStatus != WebSocketStatus.connected){
          return;
         }
         if (WebsocketManager.instance.currentWebSocketChannel == null){
          return;
         }
         final candidateMessage = <String, dynamic>{
          'type': 'webrtc.signaling.iceCandidate',
          'data': {
            'candidate': {
              'candidate': candidateString,
              'sdpMLineIndex':
              candidate.sdpMLineIndex,
              'sdpMid': candidate.sdpMid ?? '',
              },
            },
          };
          WebsocketManager.instance.currentWebSocketChannel!.sink.add(jsonEncode(candidateMessage));
      };
      //1.3.监听ICE连接状态
      currentPeerConnection!.onIceConnectionState = (RTCIceConnectionState state){
        print('ICE连接状态:${state}');
        switch(state){
          case RTCIceConnectionState.RTCIceConnectionStateConnected:{
            currentWebRTCStatus = WebRTCStatus.connected;
            NotificationManager.instance.appNotifictionCenter.add('WebRTCStatusChanged');
            print('WebRTC--链接状态--成功');
          }
          case RTCIceConnectionState.RTCIceConnectionStateCompleted:{
            //currentWebRTCStatus = WebRTCStatus.connected;
            //print('WebRTC--链接状态--成功');
          }
          case RTCIceConnectionState.RTCIceConnectionStateFailed:{
            //currentWebRTCStatus = WebRTCStatus.disconnected;
          }
          case RTCIceConnectionState.RTCIceConnectionStateDisconnected:{
            //currentWebRTCStatus = WebRTCStatus.disconnected;
          }
          case RTCIceConnectionState.RTCIceConnectionStateClosed:{
            print('WebRTC--链接状态--失败');
            currentWebRTCStatus = WebRTCStatus.disconnected;
            NotificationManager.instance.appNotifictionCenter.add('WebRTCStatusChanged');
            clearAllWebRTCStatus();
          }
          default:
          break;
        }
      };
      //1.4.监听远端音视频Track
      currentPeerConnection!.onTrack = (RTCTrackEvent event){
        print('WebRTC--收到远端Track--${event.track.kind}');
        if (event.streams.isEmpty) {
          return;
        }
        final remoteStream = event.streams.first;
        currentRemoteStream = remoteStream;//需要全局持有这个对象
        currentRTCVideoRenderer!.srcObject = remoteStream;
        if (remoteStream.getAudioTracks().isNotEmpty){
          print('收到远端音频');
          IOSAudioSessionManager.instance.confirmOutputRoute().catchError((Object error){
            print('确认iOS音频路由失败：$error');
          });
        }
        if (remoteStream.getVideoTracks().isNotEmpty){
          print('收到远端视频');
        }
        NotificationManager.instance.appNotifictionCenter.add('RecievedRemoteStream');
      };
      //1.5.收到服务端发来的SDP信息后，去交换SDP信息
      //(1).设置远端SDP
      final remoteOffer = RTCSessionDescription(messageSdpData, 'offer');
      await currentPeerConnection!.setRemoteDescription(remoteOffer);
      //(2).创建Answer
      final answer = await currentPeerConnection!.createAnswer({
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': true,
      });
      //(3).设置本地 SDP：
      await currentPeerConnection!.setLocalDescription(answer);
      //(4).发送发送Answer(本地的sdp)到服务器
      final answerSdp = answer.sdp;
      if (answerSdp == null || answerSdp.isEmpty){
        print('本地Answer SDP为空');
        return;
      }
      final answerMessage = <String, dynamic>{
        'type': 'webrtc.signaling.answer',
        'data': {
          'sdp':{
            'type': 'answer',
            'sdp': answerSdp,
          }
        }
      };
      WebsocketManager.instance.currentWebSocketChannel!.sink.add(jsonEncode(answerMessage));
    }catch (error){
      print("WebRTC--交换SDP失败:${error}");
      currentWebRTCStatus = WebRTCStatus.disconnected;
      NotificationManager.instance.appNotifictionCenter.add('WebRTCStatusChanged');
      clearAllWebRTCStatus();
    }
  }
  //2.断开WebRTC
  Future<void> disconnectWebRTC() async{
    final peerConnection = currentPeerConnection;
    final remoteStream = currentRemoteStream;
    final renderer = currentRTCVideoRenderer;
    //先清空引用，避免 close() 触发状态回调后重复清理
    currentPeerConnection = null;
    currentRemoteStream = null;
    currentRTCVideoRenderer = null;
    //更新状态
    currentWebRTCStatus = WebRTCStatus.disconnected;
    NotificationManager.instance.appNotifictionCenter.add('WebRTCStatusChanged');
    // 停止远端音视频 Track
    if (remoteStream != null) {
      for (final track in remoteStream.getTracks()) {
        await track.stop();
      }
      await remoteStream.dispose();
    }
     // 释放视频渲染器
    if (renderer != null) {
      renderer.srcObject = null;
      await renderer.dispose();
    }
    // 关闭 PeerConnection
    if (peerConnection != null) {
      await peerConnection.close();
      await peerConnection.dispose();
    }
    //重置音频通道
    IOSAudioSessionManager.instance.reset();
     print('WebRTC--已断开并释放资源');
  }
  //3.清理WebRTC的状态
  Future<void> clearAllWebRTCStatus() async{
    currentPeerConnection = null;
    currentRemoteStream = null;
    currentRTCVideoRenderer = null;
  }
}