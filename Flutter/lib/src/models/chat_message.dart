import 'package:flutter/foundation.dart';

enum ChatRole { user, assistant }

class ChatMessage {
  ChatMessage({
    required this.role,
    required this.content,
    this.isFinal = true,
  });

  final ChatRole role;
  final String content;
  final bool isFinal;

  ChatMessage copyWith({
    ChatRole? role,
    String? content,
    bool? isFinal,
  }) {
    return ChatMessage(
      role: role ?? this.role,
      content: content ?? this.content,
      isFinal: isFinal ?? this.isFinal,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'role': describeEnum(role),
      'content': content,
    };
  }

  static ChatMessage fromJson(Map<String, dynamic> json) {
    final roleValue = json['role'] as String? ?? 'assistant';
    final role = ChatRole.values.firstWhere(
      (element) => describeEnum(element) == roleValue,
      orElse: () => ChatRole.assistant,
    );
    return ChatMessage(
      role: role,
      content: json['content'] as String? ?? '',
    );
  }
}
