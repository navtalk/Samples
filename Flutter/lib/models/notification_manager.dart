import 'dart:async';

class NotificationManager {
    NotificationManager._internal();
    static final NotificationManager instance = NotificationManager._internal();
    
    final StreamController<String> appNotifictionCenter = StreamController<String>.broadcast();
    final StreamController<String> functionCallNotifictionCenter = StreamController<String>.broadcast();
    
  }