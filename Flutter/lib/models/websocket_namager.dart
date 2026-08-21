//枚举
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:navtalk_flutter_sample/models/audio_record.dart';
import 'package:navtalk_flutter_sample/models/navatlk_manager.dart';
import 'package:navtalk_flutter_sample/models/notification_manager.dart';
import 'package:navtalk_flutter_sample/models/webrtc_manager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';



enum WebSocketStatus{
  disconnected,
  connecting,
  connected,
}

class WebsocketManager{
  
  //单例
  WebsocketManager._internal();
  static final WebsocketManager instance = WebsocketManager._internal();

  //属性
  WebSocketStatus currentWebSocketStatus = WebSocketStatus.disconnected;
  BuildContext? currentPageContext;
  WebSocketChannel? currentWebSocketChannel;
  StreamSubscription<dynamic>? currentWebSocketSubscription;

  //1.尝试链接WebSocket
  Future<void> startConnectWebSocket(BuildContext context) async{
    currentPageContext = context;
    //确保已经获取到角色详情了
    if (NavTalkManager.instance.characterProviderName == '' || NavTalkManager.instance.characterThumbnailUrl == ''){
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please wait. The character details have not been retrieved yet.')),
      );
      return;
    }
    //确保当前的状态正确
    if (currentWebSocketStatus != WebSocketStatus.disconnected){
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('The WebSocket is not currently in the disconnected state.')),
      );
      return;
    }
    //拼接WebSocket的连接地址 
    String current_WebSocket_url = '';
    if (NavTalkManager.instance.characterId.trim().isNotEmpty){
      current_WebSocket_url = '${NavTalkManager.instance.navtalkBaseURL}?license=${Uri.encodeQueryComponent(NavTalkManager.instance.license)}&avatarId=${Uri.encodeQueryComponent(NavTalkManager.instance.characterId)}'; 
    }else{
      current_WebSocket_url = '${NavTalkManager.instance.navtalkBaseURL}?license=${Uri.encodeQueryComponent(NavTalkManager.instance.license)}&name=${Uri.encodeQueryComponent(NavTalkManager.instance.characterName)}';
    }
    try{
      //开始连接WebSocket
      currentWebSocketStatus = WebSocketStatus.connecting;
      NotificationManager.instance.appNotifictionCenter.add('WebSocketStatusChanged');
      print('开始连接WebSocket');
      currentWebSocketChannel = WebSocketChannel.connect(
        Uri.parse(current_WebSocket_url),
      );
      //等待WebSocket握手完成
      await currentWebSocketChannel!.ready;
      currentWebSocketStatus = WebSocketStatus.connected;
      NotificationManager.instance.appNotifictionCenter.add('WebSocketStatusChanged');
      print('WebSocket连接成功');
      //链接成功后，直接发送FuncctionCall相关内容
      sendFunctionCall();
      //监听服务器：收到的消息，错误，断开状态
      currentWebSocketSubscription = currentWebSocketChannel!.stream.listen(
        //收到消息
        (message){
          handleWebSocketMessage(message);
        },
        onDone: ()=>{
          //断开
          print('webSocket断开链接'),
          currentWebSocketStatus = WebSocketStatus.disconnected,
          NotificationManager.instance.appNotifictionCenter.add('WebSocketStatusChanged'),
          currentWebSocketChannel = null,
          currentWebSocketSubscription = null,
        },
        onError: (Object error, StackTrace stackTrace)=>{
          //发生错误
          print('webSocket链接发生错误:error=$error'),
          currentWebSocketStatus = WebSocketStatus.disconnected,
          NotificationManager.instance.appNotifictionCenter.add('WebSocketStatusChanged'),
        },
        cancelOnError: false,
      );
      
    }catch (error){
      //连接发生错误
      currentWebSocketStatus = WebSocketStatus.disconnected;
      NotificationManager.instance.appNotifictionCenter.add('WebSocketStatusChanged');
      currentWebSocketChannel = null;
      currentWebSocketSubscription = null;
    }
  }
  //2.断开链接WebSocket
  Future<void> disconnectedWebSocket() async{
    if (currentWebSocketStatus == .disconnected){
      return;
    }
    if (currentWebSocketChannel == null){
      return;
    }
    await currentWebSocketChannel!.sink.close();
  }
  //3.处理收到的消息
  void handleWebSocketMessage(dynamic message) {
  if (!(message is String)) {
    print('收到非文本消息');
    return;
  }
  //print('收到文本消息：$message');
  final messageDict = jsonDecode(message) as  Map<String, dynamic>;
  final message_type = messageDict['type'] as String;
  print('收到文本消息--type：${message_type}');
  final message_data = messageDict['data'] as Map<String, dynamic>;

  //3.1.已经打通长链接
  if (message_type == 'conversation.connected.success'){
    //保存sessionId和iceServers
    NavTalkManager.instance.sessionId = message_data['sessionId'] as String;
    //print('NavTalkManager.instance.sessionId==${NavTalkManager.instance.sessionId}');
    NavTalkManager.instance.iceServers = message_data['iceServers'] as List<dynamic>;
    //print('NavTalkManager.instance.iceServers=${NavTalkManager.instance.iceServers}');
  }
  //3.2.已经创建实时对话任务
  if (message_type == 'realtime.session.created'){
    //未完成任务：发送历史消息
    sendHistoryToCurrentChat();
  }
  //3.3.会话任务已经更新
  if (message_type == 'realtime.session.updated'){
    //开启录音
    AudioRecordManager.instance.startAudioRecord();
  }
  //3.4.监测到用户输入的内容
  if (message_type == 'realtime.conversation.item.input_audio_transcription.completed'){
    Map<String, dynamic> currentMessage = {};
    currentMessage['type'] = 'user_ask';
    currentMessage['content'] = message_data['content'] as String;
    print('监测到用户输入的内容:${currentMessage}');
    handleUserOrAIMessage(currentMessage);
  }
  //3.5.监测到数字人输出的内容
  if (message_type == 'realtime.response.audio_transcript.done'){
    Map<String, dynamic> currentMessage = {};
    currentMessage['type'] = 'ai_answer';
    currentMessage['content'] = message_data['content'] as String;
    print('监测到数字人输出的内容:${currentMessage}');
    //保存数据并发送通知
    handleUserOrAIMessage(currentMessage);
  }
  //3.6.触发Function Call
  if (message_type == 'realtime.response.function_call_arguments.done'){
    handleFunctionCallMessage(message);
  }
  //3.7.WebRTC相关
  if (message_type == 'webrtc.signaling.offer'){
    final sdp_dict = message_data['sdp'] as Map<String, dynamic>;
    final sdp_string = sdp_dict['sdp'] as String; 
    WebRTCManager.instance.exchangeSdpDataInWebRTC(sdp_string,currentPageContext!);
  }
  if (message_type == 'webrtc.signaling.answer'){}
  if (message_type == 'webrtc.signaling.iceCandidate'){}
  //3.8.Other:
  if (message_type == 'conversation.connected.fail'){}
  if (message_type == 'conversation.connected.close'){}
  if (message_type == 'conversation.connected.insufficient_balance'){}
  if (message_type == 'conversation.connected.warning'){}

  }
  //4.发送FuncctionCall相关内容
  Future<void> sendFunctionCall() async {
    if (currentWebSocketStatus != .connected || currentWebSocketChannel == null){
      return;
    }
    if (NavTalkManager.instance.characterProviderName != 'openai'){
      print('只有open ai模型才支持在对话中添加Function Call');
      return;
    }
    if (NavTalkManager.instance.functionCalls.length <= 0){
      print('没有有效的Function Call数据');
      return;
    }
    final functions = NavTalkManager.instance.functionCalls;
    try{
      final functionsJsonString = jsonEncode(functions);
      final message = <String, dynamic>{
        'type': 'realtime.input_function_call',
        'data': {
          'content': functionsJsonString,
        },
      };
      final messageJsonString = jsonEncode(message);
      currentWebSocketChannel?.sink.add(messageJsonString);
      print('===========================');
      print('Send Function Call Data: $messageJsonString');
    }catch (error){
      print('发送Function Call失败');
    }
  }
 //5.处理FuncctionCall相关消息
 Future<void> handleFunctionCallMessage(String message) async {
  print('===========================');
  print('处理FuncctionCall相关消息--：${message}');
  NotificationManager.instance.functionCallNotifictionCenter.add(message);
 }
 //6.处理用户/AI的消息
 Future<void> handleUserOrAIMessage(Map<String,dynamic> currentMessage) async{
   final preferences = await SharedPreferences.getInstance();
   // 读取之前保存的消息
   List<Map<String, dynamic>> messages = [];
   var oldMessageList_string = preferences.getString('allLocalMessageListData');
   try{
    if (oldMessageList_string != null &&oldMessageList_string.isNotEmpty){
        final decoded = jsonDecode(oldMessageList_string) as List<dynamic>;
        messages = decoded
          .map(
            (item) => Map<String, dynamic>.from(
              item as Map,
            ),
          )
          .toList();
    }
    messages.add(currentMessage);
    final encodedString = jsonEncode(messages);
    final success = await preferences.setString('allLocalMessageListData', encodedString);
     if (success) {
      print('保存消息成功');
      NotificationManager.instance.appNotifictionCenter.add('MessageListChanged');
     }else{
      print('保存消息失败');
     }
   }catch (error){
    print('保存消息发生错误${error}');
   }
 }
 //7.发送历史数据：
 Future<void> sendHistoryToCurrentChat() async{
  if (currentWebSocketStatus != WebSocketStatus.connected || currentWebSocketChannel == null) {
    print('发送历史数据失败：WebSocket尚未连接');
    return;
  }
   try{
    final preferences = await SharedPreferences.getInstance();
    final oldMessageListString = preferences.getString('allLocalMessageListData');
    if (oldMessageListString == null ||  oldMessageListString.isEmpty) {
      print('没有需要发送的历史消息');
      return;
    }
    final decoded = jsonDecode(oldMessageListString) as List<dynamic>;
    final allMessages = decoded
        .map(
          (item) => Map<String, dynamic>.from(
            item as Map,
          ),
        )
        .toList();
    // 只发送用户提出的问题，不发送AI历史回复
    final userMessages = allMessages.where((message) {
      return message['type'] == 'user_ask';
    }).toList();
    if (userMessages.isEmpty) {
      print('没有需要发送的用户历史消息');
      return;
    }
    print('准备发送历史消息，共${userMessages.length}条');
    for (final historyMessage in userMessages) {
      final content =
          historyMessage['content'] as String? ?? '';
      // 跳过空消息
      if (content.trim().isEmpty) {
        continue;
      }
      // 对应Swift中的conversation.item.create
      final message = <String, dynamic>{
        'type': 'conversation.item.create',
        'item': {
          'type': 'message',
          'role': 'user',
          'content': [
            {
              'type': 'input_text',
              'text': content,
            },
          ],
        },
      };
      final jsonString = jsonEncode(message);
      // 循环期间连接可能断开，再次检查
      if (currentWebSocketStatus !=
              WebSocketStatus.connected ||
          currentWebSocketChannel == null) {
        print('发送历史数据中断：WebSocket已经断开');
        return;
      }
      currentWebSocketChannel!.sink.add(jsonString);
      print('===========================');
      print('Send History Data: $jsonString');
    }
    print('历史消息发送完成');
   }catch (error){
      print('读取消息发生错误${error}');
   }
   
 } 

}