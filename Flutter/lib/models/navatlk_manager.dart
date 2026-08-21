class NavTalkManager{
  
  //单例
  NavTalkManager._internal();
  static final NavTalkManager instance = NavTalkManager._internal();

  //属性：
  //1.必填属性
  String license = '';
  String characterName = '';
  String characterId = '';

  //2.选填属性
  //是否展示聊天界面左上角的返回按钮
  bool isShowBackButtonInNavTalkPage = false;
  //Custom WebSocket endpoint for self-hosted deployments.
  String navtalkBaseURL = 'wss://transfer.navtalk.ai/wss/v2/realtime-chat';
  //Custom endpoint used to fetch avatar details by name.
  String fetchAvatarInfoByName = 'https://api.navtalk.ai/api/open/v1/avatar/getByName?name=';
  //Custom endpoint used to fetch avatar details by ID.
  String fetchAvatarInfoById = 'https://api.navtalk.ai/api/open/v1/avatar/detail?avatarId=';
  //是否本地化存储历史聊天数据
  bool isOrNotSaveHistoryChatMessages = false;
  //函数回调：
  List<Map<String, dynamic>> functionCalls = [
      {
        'type': 'function',
        'name': 'function_call_close_talk',
        'description':'Close the current user session',
        'parameters': {
          'type': 'object',
          'properties': {},
          'required': [],
        },
      },
  ];


 //3.会话过程中保存数据
 String characterThumbnailUrl = "";
 String characterProviderName = "";
 String sessionId = "";
 List<dynamic> iceServers = [];

 
  



}