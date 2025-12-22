import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:provider/provider.dart';

import 'src/models/chat_message.dart';
import 'src/navtalk_controller.dart';
import 'src/widgets/chat_bubble.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final NavTalkController controller = NavTalkController();
  await controller.initialize();
  runApp(NavTalkApp(controller: controller));
}

class NavTalkApp extends StatelessWidget {
  const NavTalkApp({super.key, required this.controller});

  final NavTalkController controller;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<NavTalkController>.value(
      value: controller,
      child: MaterialApp(
        title: 'NavTalk Flutter',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6B6AF3)),
          scaffoldBackgroundColor: Colors.black,
          useMaterial3: true,
        ),
        home: const NavTalkHomePage(),
      ),
    );
  }
}

class NavTalkHomePage extends StatefulWidget {
  const NavTalkHomePage({super.key});

  @override
  State<NavTalkHomePage> createState() => _NavTalkHomePageState();
}

class _NavTalkHomePageState extends State<NavTalkHomePage> {
  final ScrollController _scrollController = ScrollController();
  final FocusNode _licenseFocusNode = FocusNode();
  late TextEditingController _licenseController;
  int _lastMessageCount = 0;
  String? _shownError;

  @override
  void initState() {
    super.initState();
    _licenseController = TextEditingController();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final NavTalkController controller =
        Provider.of<NavTalkController>(context, listen: false);
    if (_licenseController.text != controller.license) {
      _licenseController.text = controller.license;
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _licenseController.dispose();
    _licenseFocusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) {
      return;
    }
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<NavTalkController>(
      builder: (BuildContext context, NavTalkController controller, _) {
        if (controller.messages.length != _lastMessageCount) {
          _lastMessageCount = controller.messages.length;
          WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
        }

        final String? error = controller.lastError;
        if (error != null && error != _shownError) {
          _shownError = error;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(
                SnackBar(content: Text(error)),
              );
            controller.clearError();
          });
        }

        final bool isConnecting = controller.status == NavTalkStatus.connecting;
        final bool isConnected = controller.status == NavTalkStatus.connected;

        return Scaffold(
          backgroundColor: Colors.black,
          body: Stack(
            children: <Widget>[
              Positioned.fill(
                child: _BackgroundImage(url: controller.characterImageUrl),
              ),
              if (controller.hasRemoteVideo)
                Positioned.fill(
                  child: IgnorePointer(
                    ignoring: true,
                    child: RTCVideoView(
                      controller.remoteRenderer,
                      objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                    ),
                  ),
                ),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: <Color>[
                        Colors.black.withOpacity(0.25),
                        Colors.black.withOpacity(0.45),
                        Colors.black.withOpacity(0.65),
                      ],
                    ),
                  ),
                ),
              ),
              SafeArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    _buildHeader(controller),
                    const SizedBox(height: 16),
                    Expanded(child: _buildChatList(controller)),
                    const SizedBox(height: 16),
                    _buildFooter(controller, isConnecting, isConnected),
                  ],
                ),
              ),
              if (isConnecting)
                const _ConnectingBanner(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(NavTalkController controller) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: <Widget>[
          Expanded(
            child: TextField(
              controller: _licenseController,
              focusNode: _licenseFocusNode,
              style: const TextStyle(color: Colors.white),
              cursorColor: Colors.white,
              decoration: InputDecoration(
                labelText: 'License',
                labelStyle: TextStyle(
                  color: Colors.white.withOpacity(0.7),
                ),
                filled: true,
                fillColor: Colors.black.withOpacity(0.45),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              onSubmitted: controller.updateLicense,
              onChanged: controller.updateLicense,
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.45),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  controller.characterName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Voice: ${controller.voiceType}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.75),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatList(NavTalkController controller) {
    return ShaderMask(
      shaderCallback: (Rect rect) {
        return const LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: <Color>[Colors.white, Colors.transparent],
          stops: <double>[0.0, 0.12],
        ).createShader(rect);
      },
      blendMode: BlendMode.dstIn,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.only(bottom: 48),
        itemCount: controller.messages.length,
        itemBuilder: (BuildContext context, int index) {
          final ChatMessage message = controller.messages[index];
          return ChatBubble(message: message);
        },
      ),
    );
  }

  Widget _buildFooter(
    NavTalkController controller,
    bool isConnecting,
    bool isConnected,
  ) {
    final ThemeData theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 24, left: 20, right: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          if (!isConnected)
            SizedBox(
              width: 160,
              height: 48,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  shape: const StadiumBorder(),
                  textStyle: const TextStyle(fontSize: 16),
                ),
                onPressed: isConnecting
                    ? null
                    : () {
                        _licenseFocusNode.unfocus();
                        controller.toggleConnection();
                      },
                child: const Text('Call'),
              ),
            ),
          if (isConnected)
            SizedBox(
              width: 160,
              height: 48,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFF51D48),
                  shape: const StadiumBorder(),
                  textStyle: const TextStyle(fontSize: 16),
                ),
                onPressed: () {
                  _licenseFocusNode.unfocus();
                  controller.toggleConnection();
                },
                child: const Text('Hang Up'),
              ),
            ),
        ],
      ),
    );
  }
}

class _BackgroundImage extends StatelessWidget {
  const _BackgroundImage({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: <Color>[
                Color(0xFF050713),
                Color(0xFF15182C),
                Color(0xFF0B0C18),
              ],
            ),
          ),
        ),
        if (url.isNotEmpty)
          Image.network(
            url,
            fit: BoxFit.cover,
            color: Colors.black.withOpacity(0.25),
            colorBlendMode: BlendMode.darken,
            errorBuilder: (_, __, ___) {
              return const SizedBox.shrink();
            },
            loadingBuilder: (
              BuildContext context,
              Widget child,
              ImageChunkEvent? progress,
            ) {
              if (progress == null) {
                return child;
              }
              return const SizedBox.shrink();
            },
          ),
      ],
    );
  }
}

class _ConnectingBanner extends StatelessWidget {
  const _ConnectingBanner();

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 120,
      child: Center(
        child: Container(
          width: 220,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF51D48).withOpacity(0.75),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const <Widget>[
              SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 12),
              Text(
                'Connecting…',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
