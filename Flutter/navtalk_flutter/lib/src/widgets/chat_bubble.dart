import 'package:flutter/material.dart';

import '../models/chat_message.dart';

class ChatBubble extends StatelessWidget {
  const ChatBubble({
    super.key,
    required this.message,
  });

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == ChatRole.user;
    final theme = Theme.of(context);
    final background = isUser
        ? Colors.white.withOpacity(0.8)
        : Colors.black.withOpacity(0.45);
    final textColor = isUser ? Colors.black87 : Colors.white;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 340),
        margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 20),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(18),
          border: isUser
              ? Border.all(color: theme.colorScheme.primary.withOpacity(0.4))
              : null,
        ),
        child: Text(
          message.content,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: textColor,
            height: 1.4,
          ),
        ),
      ),
    );
  }
}
