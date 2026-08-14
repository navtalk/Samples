class NavTalkManager{
  
  //单例
  NavTalkManager._internal();
  static final NavTalkManager instance = NavTalkManager._internal();

  //属性
  String license = '********';
  String characterName = '********';
  String characterId = '********';

  String baseUrl = 'https://api.navtalk.ai/api/open/v1';
  String websocketUrl = 'wss://transfer.navtalk.ai/wss/v2/realtime-chat';


 String characterThumbnailUrl = "";
 String characterProviderName = "";
 
 String sessionId = "";
 List<dynamic> iceServers = [];

 bool isOrNotSaveHistoryChatMessages = false;



  



}