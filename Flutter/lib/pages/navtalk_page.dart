import 'dart:convert';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:http/http.dart' as http;
import 'package:navtalk_flutter_sample/models/audio_record.dart';
import 'package:navtalk_flutter_sample/models/camera_capture_manager.dart';
import 'package:navtalk_flutter_sample/models/navatlk_manager.dart';
import 'package:navtalk_flutter_sample/models/navtalk_permission.dart';
import 'package:navtalk_flutter_sample/models/notification_manager.dart';
import 'package:navtalk_flutter_sample/models/webrtc_manager.dart';
import 'package:navtalk_flutter_sample/models/websocket_namager.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum NavTalkStatus{
  disconnected,
  connecting,
  connected,
}


class NavTalkPage extends StatefulWidget {
  const NavTalkPage({super.key});

  @override
  State<NavTalkPage> createState() => _NavTalkPageState();
}

class _NavTalkPageState extends State<NavTalkPage> {

  String? _thumbnailUrl;
  bool _isAllowedCamera = true;
  bool _hasMicphonePermission = false;
  bool _hasCameraPermission = false;
  NavTalkStatus _currentNavTalkStatus = NavTalkStatus.disconnected;
  String? currentHandleType = '';//当前按钮的操作是：接通/挂断（start/stop）
  List<Map<String, dynamic>> currentListMessages = [];
  final ScrollController messageScrollController = ScrollController();
  
  @override
  void initState() {
    super.initState();
    //让权限请求在第一帧后开始
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await handleAllPermission();
    });
    //请求当前角色的详情信息
    requestAvatarDetailInformation();
    //监听通知
    listenNotificationList();
    //获取消息列表数据
    requestLocalListMessage();
  }

  Future<void> handleAllPermission() async{
    await handleMicphonePermission();
    await handleCameraPermission();
  }

  //1.处理麦克风权限:
  Future<void> handleMicphonePermission() async {
      var current_hasMicphonePermission = false;
      final hasMicphonePermission = await NavTalkPermissionHandler.instance.hasMicphonePermission();
      if (!hasMicphonePermission){
         final status = await NavTalkPermissionHandler.instance.requestMicrophonePermission();
         if (status.isGranted) {
             print('用户允许麦克风权限');
             current_hasMicphonePermission = true;
          } else {
            print('用户没有允许麦克风权限');
            current_hasMicphonePermission = false;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('The user has not granted microphone permission.')),
            );
          }
      }else{
        print('用户允许麦克风权限');
        current_hasMicphonePermission = true;
      }
      setState(() {
        _hasMicphonePermission = current_hasMicphonePermission;
      });
    }

  //2.处理相机权限:
  Future<void> handleCameraPermission() async {
      bool current_hasCameraPermission = false;
      final hasCameraPermission = await NavTalkPermissionHandler.instance.hasCameraPermission();
      if (!hasCameraPermission){
         final status = await NavTalkPermissionHandler.instance.requestCameraPermission();
         if (status.isGranted) {
             print('用户允许相机权限');
             current_hasCameraPermission = true;
          } else {
            print('用户没有允许相机权限');
            current_hasCameraPermission = false;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('The user has not granted camera permission.')),
            );
          }
      }else{
        print('用户允许相机权限');
        current_hasCameraPermission = true;
      }
      setState(() {
        _hasCameraPermission = current_hasCameraPermission;
      });
    }

  //3.请求接口：获取角色详情
  int reRequestAvatarInfoNumber = 0;
  Future<void> requestAvatarDetailInformation() async{
    NavTalkManager.instance.characterProviderName = '';
    NavTalkManager.instance.characterThumbnailUrl = '';
    var avatart_info_url_string = '';
    if (NavTalkManager.instance.characterId.length > 0){
      avatart_info_url_string = '${NavTalkManager.instance.fetchAvatarInfoById}${NavTalkManager.instance.characterId}';
    }else{
      avatart_info_url_string = '${NavTalkManager.instance.fetchAvatarInfoByName}${NavTalkManager.instance.characterName}';
    }
    final avatart_info_url_uri = Uri.parse(avatart_info_url_string);
    try{
      final response = await http.get(
        avatart_info_url_uri,
        headers: {
          'license': NavTalkManager.instance.license
        }
      );
      if (response.statusCode == 200){
        //解析response.body
        final resultDict = jsonDecode(response.body) as  Map<String, dynamic>;
        print('请求数据成功:${resultDict}');
        final data = resultDict['data'] as Map<String, dynamic>;
        final thumbnailUrl = data["thumbnailUrl"] as String;
        if (thumbnailUrl.trim().isNotEmpty){
          NavTalkManager.instance.characterThumbnailUrl = thumbnailUrl;
        }
        final providerName = data["providerName"] as String;
        if (providerName.trim().isNotEmpty){
          NavTalkManager.instance.characterProviderName = providerName;
          if (providerName == 'openai'){
            _isAllowedCamera = true;
          }else{
            _isAllowedCamera = false;
          }
        }
        //调用 setState() 后，页面会重新执行：build()
        reRequestAvatarInfoNumber = 0;
        setState(() {
          _thumbnailUrl = thumbnailUrl;
        });
        print('NavTalkManager.instance.characterThumbnailUrl ==> ${NavTalkManager.instance.characterThumbnailUrl}');
        print('NavTalkManager.instance.characterProviderNameName ==> ${NavTalkManager.instance.characterProviderName}');
      }else{
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Request avatar information is fail.')),
        );
      }
    }catch(error){
      print('服务器返回错误：${error}');
      //ScaffoldMessenger.of(context).showSnackBar(
        //SnackBar(content: Text('Request avatar information is fail.')),
      //);
      reRequestAvatarInfoNumber += 1;
      if (reRequestAvatarInfoNumber <= 10){
        Future.delayed(const Duration(seconds: 3), () {
          requestAvatarDetailInformation(); 
        });
      }
    }
  }

   //4.监听通知事件
    Future<void> listenNotificationList() async{
      NotificationManager.instance.appNotifictionCenter.stream.listen((type) async{
        print('监听到本地通知:${type}');
        //接收到视频流
        if (type == 'RecievedRemoteStream'){
          setState((){});
        }
        //WebSocket的状态发生变化
        if (type == 'WebSocketStatusChanged'){
          refreshNavTalkStatus();
        }
        //WebRTC的状态发生变化
        if (type == 'WebRTCStatusChanged'){
          refreshNavTalkStatus();
        }
        //打开摄像头成功
        if (type == 'openCameraSuccess'){
          setState((){});
        }
        //切换摄像头
        if (type == 'CameraStateIsChanged'){
          setState((){});
        }
        //消息列表发生改变
        if (type == 'MessageListChanged'){
          List<Map<String, dynamic>> messages = [];
          final preferences = await SharedPreferences.getInstance();
          var oldMessageList_string = preferences.getString('allLocalMessageListData');
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
          setState((){
            currentListMessages = messages;
          });
          //等待ListView展示完新消息后滚动到底部
          scrollMessageListToBottom();
        }
      });
      NotificationManager.instance.functionCallNotifictionCenter.stream.listen((message){
        final messageDict = jsonDecode(message) as  Map<String, dynamic>;
        final message_data = messageDict['data'] as Map<String, dynamic>;
        final function_name = message_data['function_name'] as String;
        if (function_name == 'function_call_close_talk'){
            currentHandleType = 'stop';
            WebsocketManager.instance.disconnectedWebSocket();
            WebRTCManager.instance.disconnectWebRTC();
        }
      });
    }
    void refreshNavTalkStatus(){
      if (WebsocketManager.instance.currentWebSocketStatus == .disconnected && WebRTCManager.instance.currentWebRTCStatus == .disconnected){
         _currentNavTalkStatus = .disconnected;
         //更新状态
         AudioRecordManager.instance.stopAudioRecord();
         CameraCaptureManager.instance.closeCamera();
      }else if (WebsocketManager.instance.currentWebSocketStatus == .connected && WebRTCManager.instance.currentWebRTCStatus == .connected){
         _currentNavTalkStatus = .connected;
         //更新状态
         AudioRecordManager.instance.isAllowedRecordAudio = true;
         CameraCaptureManager.instance.isAllowedCaptrueCameraPhoto = false;
      }else{
         if (currentHandleType == 'start'){
            _currentNavTalkStatus = .connecting;
          }else if (currentHandleType == 'stop'){
            _currentNavTalkStatus = .disconnected;
          }
      }
      print('当前通话状态:${_currentNavTalkStatus}');
      setState((){});
    }
    //5.获取消息列表数据
    Future<void> requestLocalListMessage() async{
      final preferences = await SharedPreferences.getInstance();
      if (!NavTalkManager.instance.isOrNotSaveHistoryChatMessages){
        preferences.remove('allLocalMessageListData');
        return;
      }
      List<Map<String, dynamic>> messages = [];
      var oldMessageList_string = preferences.getString('allLocalMessageListData');
      if (oldMessageList_string != null && oldMessageList_string.isNotEmpty){
        final decoded = jsonDecode(oldMessageList_string) as List<dynamic>;
        messages = decoded
        .map(
          (item) => Map<String, dynamic>.from(
            item as Map,
          ),
        )
        .toList();
      }
      currentListMessages = messages;
      if (!mounted) return;
      setState(() {
        currentListMessages = messages;
      });
      scrollMessageListToBottom(animated: false);
    }
  //6.增加ListView滚动到底部的方法
  void scrollMessageListToBottom({bool animated = true,}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted ||
        !messageScrollController.hasClients) {
        return;
      }
      final bottomPosition = messageScrollController.position.maxScrollExtent;
      if (animated) {
        messageScrollController.animateTo(
          bottomPosition,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      } else {
        messageScrollController.jumpTo(bottomPosition);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    
    final screenSize = MediaQuery.sizeOf(context);
    final screenWidth = screenSize.width;
    final screenHeight = screenSize.height; 
    final padding = MediaQuery.paddingOf(context);
    final statusBarHeight = padding.top;
    final bottomSafeHeight = padding.bottom;

    //控件--背景图片:
    Widget buildBackgroudImage(){
      final current_thumbnailUrl = _thumbnailUrl;
      if (current_thumbnailUrl == null || current_thumbnailUrl.isEmpty){
        return Image.asset('lib/resource/images/default_background.png',fit: BoxFit.fill);
      }
      //print('重新加载网路图片${current_thumbnailUrl}');
      return Image.network(
        current_thumbnailUrl,
        fit: BoxFit.cover,
        // 网络图片加载期间继续显示默认图片
        loadingBuilder: (contex,child,loadingProgress){
          if (loadingProgress == null){
            return child;
          }
          //print('图片加载中');
          return Image.asset('lib/resource/images/default_background.png',fit: BoxFit.fill);
        },
        //网络图片加载失败恢复默认图片
        errorBuilder: (context,error,stackTrace){
          print('图片加载失败');
          return Image.asset('lib/resource/images/default_background.png',fit: BoxFit.fill);
        },
      );
    }
    //控件--通话按钮
    Widget callStatusView(){
      String navtalk_icon = '';
      if (_currentNavTalkStatus == .disconnected){
        navtalk_icon = 'navtalk_off.png';
      }else if (_currentNavTalkStatus == .connecting){
        navtalk_icon = 'navtalk_connecting.png';      
      }else if (_currentNavTalkStatus == .connected){
        navtalk_icon = 'navtalk_on.png';      
      }
      String navtalk_title = '';
      if (_currentNavTalkStatus == .disconnected){
        navtalk_title = 'Call';
      }else if (_currentNavTalkStatus == .connecting){
        navtalk_title = 'Connecting…';      
      }else if (_currentNavTalkStatus == .connected){
        navtalk_title = 'Hang Up';      
      }
      return Opacity(opacity: _hasMicphonePermission ? 1 : 0.5, child: GestureDetector(
        onTap: ()=>{
          if (!_hasMicphonePermission){
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('The user has not granted microphone permission.')),
            )
          }else{
            if (_currentNavTalkStatus == .disconnected){
               currentHandleType = 'start',
              WebsocketManager.instance.startConnectWebSocket(context),
            }else if (_currentNavTalkStatus == .connecting){
               currentHandleType = 'stop',
               WebsocketManager.instance.disconnectedWebSocket(),
               WebRTCManager.instance.disconnectWebRTC(),
            }else if (_currentNavTalkStatus == .connected){
              currentHandleType = 'stop',
              WebsocketManager.instance.disconnectedWebSocket(),
              WebRTCManager.instance.disconnectWebRTC(),
            }
          }
        },
        child: Stack(
          children: [
            Positioned(left: 80/2-40/2, top: 0, width: 40, height: 40, child: Image.asset('lib/resource/images/${navtalk_icon}',fit: BoxFit.fill)),
            Positioned(left: 0, top: 45, width: 80, height: 15, child: Text(navtalk_title, style: TextStyle(color: Colors.white, fontSize: 12),textAlign: .center,)),
          ],
        )
      ));
    }
    //控件--麦克风按钮
    Widget micphoneStatusView(){
      //控制是否展示它
      if (_currentNavTalkStatus != .connected) {
         return const SizedBox.shrink();
      }
      String micphoneStatusIcon = '';
      if (AudioRecordManager.instance.isAllowedRecordAudio){
        micphoneStatusIcon = 'micphone_on.png';
      }else{
        micphoneStatusIcon = 'micphone_off.png';
      }
      return Opacity(opacity: _hasMicphonePermission ? 1 : 0.5, child: GestureDetector(
        onTap: ()=>{
          if (!_hasMicphonePermission){
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('The user has not granted microphone permission.')),
            )
          }else{
            if (AudioRecordManager.instance.isAllowedRecordAudio){
              print('停止录制音频'),
              AudioRecordManager.instance.isAllowedRecordAudio = false,
              setState(() {}),
            }else{
              print('开始录制音频'),
              AudioRecordManager.instance.isAllowedRecordAudio = true,
              setState(() {}),
            }
          }
        },
        child: Stack(
          children: [
            Positioned(left: 80/2-40/2, top: 0, width: 40, height: 40, child: Image.asset('lib/resource/images/${micphoneStatusIcon}',fit: BoxFit.fill)),
            Positioned(left: 0, top: 45, width: 80, height: 15, child: Text('Micphone', style: TextStyle(color: Colors.white, fontSize: 12),textAlign: .center,)),
          ],
        )
      ));
    }
    //控件--相机按钮
    Widget cameraStatusView(){
      //控制是否展示它
      if (_currentNavTalkStatus != .connected) {
         return const SizedBox.shrink();
      }
      String cameraStatusIcon = '';
      if (CameraCaptureManager.instance.isAllowedCaptrueCameraPhoto){
        cameraStatusIcon = 'camera_on.png';
      }else{
        cameraStatusIcon = 'camera_off.png';
      }
      return Opacity(opacity: (_isAllowedCamera && _hasCameraPermission) ? 1 :  0.5, child: 
        GestureDetector(
          onTap: ()=>{
            if (!_isAllowedCamera){
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Image recognition is only supported when the selected model provider is OpenAI.')),
              )
            }else if (!_hasCameraPermission){
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('The user has not granted camera permission.')),
              )
            }else{
              if (CameraCaptureManager.instance.isAllowedCaptrueCameraPhoto){
                print('关闭相机'),
                CameraCaptureManager.instance.isAllowedCaptrueCameraPhoto = false,
                setState(() {}),
                CameraCaptureManager.instance.closeCamera(),
              }else{
                print('开启相机'),
                CameraCaptureManager.instance.isAllowedCaptrueCameraPhoto = true,
                setState(() {}),
                CameraCaptureManager.instance.startCaptruePhoto(),
              }
            }
          },
          child: Stack(
            children: [
              Positioned(left: 80/2-40/2, top: 0, width: 40, height: 40, child: Image.asset('lib/resource/images/${cameraStatusIcon}',fit: BoxFit.fill)),
              Positioned(left: 0, top: 45, width: 80, height: 15, child: Text('Camera', style: TextStyle(color: Colors.white, fontSize: 12),textAlign: .center,)),
            ],
          )
        )
      );
    }
    //控件--远端视频流
    Widget buildRemoteVideoView(){
     if (WebRTCManager.instance.currentRTCVideoRenderer == null){
      return const SizedBox.shrink();
     }
     if (_currentNavTalkStatus != .connected){
      return const SizedBox.shrink();
     }
     return RTCVideoView(
      WebRTCManager.instance.currentRTCVideoRenderer!,
      mirror: false,
      objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
     );
    }
    //控件--相机预览画面
    Widget cameraPreviewView(){
      if (!CameraCaptureManager.instance.isAllowedCaptrueCameraPhoto){
        return const SizedBox.shrink();
      }
      if (CameraCaptureManager.instance.currentCameraStatus != .opened){
        return const SizedBox.shrink();
      }
      if (CameraCaptureManager.instance.currentCameraController == null){
        return const SizedBox.shrink();
      }
      final controller = CameraCaptureManager.instance.currentCameraController!;
      final previewSize = controller.value.previewSize;
      if (previewSize == null) {
        return CameraPreview(controller);
      }
      //填满容器，保持相机比例
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        clipBehavior: .antiAlias,
        child: SizedBox.expand(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: OverflowBox(
              alignment: .center,
              child: FittedBox(
                fit: .cover,
                child: SizedBox(
                  width: previewSize.height,
                  height: previewSize.height,
                  child: CameraPreview(controller),
            ),
          ),
         ),
          ),
        ),
      );
    }
    //控件--切换摄像头
    Widget switchCameraDirectionButton(){
      if (!CameraCaptureManager.instance.isAllowedCaptrueCameraPhoto){
        return const SizedBox.shrink();
      }
      if (CameraCaptureManager.instance.currentCameraStatus != .opened){
        return const SizedBox.shrink();
      }
      if (CameraCaptureManager.instance.currentCameraController == null){
        return const SizedBox.shrink();
      }
      return GestureDetector(
        onTap: (){
          CameraCaptureManager.instance.switchCameraPosition();
        },
        child: Image.asset('lib/resource/images/switch_camera.png',fit: .cover)
      );
    }
     //控件--自定义cell
    Widget messageCellView(int index){
      if (index >= currentListMessages.length){return const SizedBox.shrink();}
      Map<String, dynamic> currentMessage = currentListMessages[index];
      String messageType = currentMessage['type'] as String;
      String messageContent = currentMessage['content'] as String;
      Color textColor;
      if (messageType == 'user_ask'){
        textColor = Colors.black;
      }else if (messageType == 'ai_answer'){
        textColor = Colors.blue;
      }else{
        textColor = Colors.grey;
      }
      //print('自定义cell--type--${messageType}');
      return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(
          messageContent,
          style: TextStyle(
            color: textColor,
            fontSize: 14,
            height: 1.2,
          ),
        ),
      );
    }
    //控件--消息列表视图
    Widget messageListView(){
      if (_currentNavTalkStatus != .connected){
        return const SizedBox.shrink();
      }
      if (currentListMessages.isEmpty){
        return const SizedBox.shrink();
      }
      return ListView.builder(
        controller: messageScrollController,
        itemCount: currentListMessages.length,
        padding: const EdgeInsets.symmetric(vertical: 10),
        itemBuilder: (context, index){
          return GestureDetector(
            onTap: (){
              print('点击第几个cell');
            },
            child: messageCellView(index),
          );
        },
      );
    }
    //控件--返回按钮
    Widget backButton(){
      if (!NavTalkManager.instance.isShowBackButtonInNavTalkPage){
        return const SizedBox.shrink();
      }
      return GestureDetector(
        onTap: (){
          if (_currentNavTalkStatus == .connecting){
            ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Please end the NavTalk call first.')),
              );
            return;
          }
          if (_currentNavTalkStatus == .connected){
            ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Please end the NavTalk call first.')),
              );
            return;
          }
          Navigator.of(context).maybePop();
        },
        child: Image.asset('lib/resource/images/navtalk_back.png',fit: .cover)
      );
    }
    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: Colors.white,
      body: Stack(
        fit: StackFit.expand,
        children: [
          //背景图片
          Positioned(left: 0, top: 0, width: screenWidth, height: screenHeight, child: buildBackgroudImage()),
          //远端视频流
          Positioned(left: 0, top: 0, width: screenWidth, height: screenHeight, child: buildRemoteVideoView()),
          //相机预览画面
          Positioned(right: 20, top: statusBarHeight, width: 10*13, height: 16*13, child: cameraPreviewView()),
          //消息列表视图
          Positioned(left: 15, top: statusBarHeight+300, width: screenWidth/2, height: screenHeight-statusBarHeight-300-bottomSafeHeight-10-60-20, child: messageListView()),
          //切换摄像头按钮
          Positioned(right: 20+10*13/2-20/2, top: statusBarHeight+16*13-20-20, width: 20, height: 20, child: switchCameraDirectionButton()),
          //通话按钮
          Positioned(left: screenWidth/2-80/2, bottom: bottomSafeHeight+10, width: 80, height: 60, child: callStatusView()),
          //麦克风按钮
          Positioned(left: screenWidth/2-80/2-80, bottom: bottomSafeHeight+10, width: 80, height: 60, child: micphoneStatusView()),
          //摄像机按钮
          Positioned(left: screenWidth/2-80/2+80, bottom: bottomSafeHeight+10, width: 80, height: 60, child: cameraStatusView()),
          //返回按钮
          Positioned(left: 20, top: statusBarHeight, width: 25, height: 25, child: backButton()),
        ],
      ),
    );
  }
  //释放页面
  @override
  void dispose() {
    messageScrollController.dispose();
    super.dispose();
  }
}