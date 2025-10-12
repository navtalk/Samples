import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sound_stream/sound_stream.dart';
import 'package:uuid/uuid.dart';

import 'models/chat_message.dart';

enum NavTalkStatus { notConnected, connecting, connected }

class NavTalkController extends ChangeNotifier {
  NavTalkController();

  final RTCVideoRenderer remoteRenderer = RTCVideoRenderer();
  final RecorderStream _recorder = RecorderStream();

  final List<ChatMessage> _messages = <ChatMessage>[];
  final List<ChatMessage> _history = <ChatMessage>[];

  NavTalkStatus _status = NavTalkStatus.notConnected;
  SharedPreferences? _prefs;
  StreamSubscription<dynamic>? _realtimeSub;
  StreamSubscription<dynamic>? _webrtcSub;
  StreamSubscription<List<int>>? _recorderSub;
  WebSocket? _realtimeSocket;
  WebSocket? _webrtcSocket;
  RTCPeerConnection? _peerConnection;

  String _errorMessage = '';
  String _license = 'your_license';
  String characterName = 'navtalk.Leo';
  String voiceType = 'verse';
  String baseUrl = 'transfer.navtalk.ai';
  String instructions = 'Flutter Demo Chat';

  final int sampleRate = 24000;
  final String _historyKey = 'realtimeChatHistory';
  final String _licenseKey = 'navtalkLicense';
  String _localSessionId = const Uuid().v4();
  bool _isDisposed = false;
  bool _isRecorderInitialized = false;
  bool _recording = false;

  StringBuffer _assistantBuffer = StringBuffer();
  int? _assistantIndex;

  NavTalkStatus get status => _status;
  List<ChatMessage> get messages => List<ChatMessage>.unmodifiable(_messages);
  String get license => _license;
  String? get lastError => _errorMessage.isEmpty ? null : _errorMessage;
  bool get hasRemoteVideo => remoteRenderer.srcObject != null;
  String get characterImageUrl =>
      'https://api.navtalk.ai/uploadFiles/${Uri.encodeComponent(characterName)}.png';

  Future<void> initialize() async {
    await remoteRenderer.initialize();
    _prefs = await SharedPreferences.getInstance();
    final savedLicense = _prefs?.getString(_licenseKey);
    if (savedLicense != null && savedLicense.isNotEmpty) {
      _license = savedLicense;
    }
    final saved = _prefs?.getString(_historyKey);
    if (saved != null && saved.isNotEmpty) {
      try {
        final List<dynamic> parsed = jsonDecode(saved) as List<dynamic>;
        for (final dynamic item in parsed) {
          if (item is Map<String, dynamic>) {
            final message = ChatMessage.fromJson(item);
            _history.add(message);
            _messages.add(message);
          }
        }
      } catch (error, stackTrace) {
        debugPrint('Failed to load history: $error\n$stackTrace');
      }
    }
  }

  Future<void> toggleConnection() async {
    if (_status == NavTalkStatus.notConnected) {
      await connect();
    } else {
      await disconnect();
    }
  }

  Future<void> connect() async {
    if (_status != NavTalkStatus.notConnected) {
      return;
    }

    if (_license.trim().isEmpty || _license.trim() == 'your_license') {
      _setError('Please configure your NavTalk license key before connecting.');
      return;
    }

    final PermissionStatus micStatus = await Permission.microphone.request();
    if (!micStatus.isGranted) {
      _setError('Microphone permission is required to start the call.');
      return;
    }

    _updateStatus(NavTalkStatus.connecting);

    try {
      await Helper.setSpeakerphoneOn(true);
    } catch (_) {
      // Ignore, best effort.
    }

    try {
      await Future.wait(<Future<void>>[
        _openRealtimeSocket(),
        _openWebrtcSocket(),
      ]);
    } catch (error) {
      _setError('Failed to start NavTalk session: $error');
      await disconnect();
    }
  }

  Future<void> disconnect() async {
    await _stopAudioCapture();
    await _realtimeSub?.cancel();
    await _webrtcSub?.cancel();
    _recorderSub?.cancel();
    _recorderSub = null;

    if (_realtimeSocket != null) {
      await _realtimeSocket!.close(1000, 'bye');
      _realtimeSocket = null;
    }
    if (_webrtcSocket != null) {
      await _webrtcSocket!.close(1000, 'bye');
      _webrtcSocket = null;
    }

    if (_peerConnection != null) {
      await _peerConnection!.close();
      _peerConnection = null;
    }

    remoteRenderer.srcObject = null;
    _assistantBuffer = StringBuffer();
    _assistantIndex = null;
    if (!_isDisposed) {
      _updateStatus(NavTalkStatus.notConnected);
    }
  }

  void updateLicense(String value) {
    if (value == _license) {
      return;
    }
    _license = value;
    unawaited(_prefs?.setString(_licenseKey, value));
    notifyListeners();
  }

  void clearError() {
    if (_errorMessage.isEmpty) {
      return;
    }
    _errorMessage = '';
    notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    unawaited(disconnect());
    remoteRenderer.dispose();
    super.dispose();
  }

  Future<void> _openRealtimeSocket() async {
    final uri = Uri.parse(
      'wss://$baseUrl/api/realtime-api?license='
      '${Uri.encodeComponent(_license)}&characterName='
      '${Uri.encodeComponent(characterName)}',
    );
    final WebSocket socket = await WebSocket.connect(uri.toString());
    socket.pingInterval = const Duration(seconds: 20);
    _realtimeSocket = socket;
    _realtimeSub = socket.listen(
      (dynamic event) {
        if (event is String) {
          _handleRealtimeMessage(event);
        }
      },
      onError: (Object error) {
        _setError('Realtime WebSocket error: $error');
        unawaited(disconnect());
      },
      onDone: () {
        if (_status != NavTalkStatus.notConnected) {
          _setError('Realtime WebSocket closed unexpectedly.');
          unawaited(disconnect());
        }
      },
      cancelOnError: true,
    );
  }

  Future<void> _openWebrtcSocket() async {
    final uri = Uri.parse(
      'wss://$baseUrl/api/webrtc?userId=${Uri.encodeComponent(_license)}',
    );
    final WebSocket socket = await WebSocket.connect(uri.toString());
    socket.pingInterval = const Duration(seconds: 20);
    _localSessionId = const Uuid().v4();
    final Map<String, dynamic> createMessage = <String, dynamic>{
      'type': 'create',
      'targetSessionId': _localSessionId,
    };
    socket.add(jsonEncode(createMessage));
    _webrtcSocket = socket;
    _webrtcSub = socket.listen(
      (dynamic event) {
        if (event is String) {
          _handleWebrtcMessage(event);
        }
      },
      onError: (Object error) {
        _setError('WebRTC signaling error: $error');
        unawaited(disconnect());
      },
      onDone: () {
        if (_status != NavTalkStatus.notConnected) {
          _setError('WebRTC signaling closed unexpectedly.');
          unawaited(disconnect());
        }
      },
      cancelOnError: true,
    );
  }

  void _handleRealtimeMessage(String payload) {
    Map<String, dynamic> data;
    try {
      data = jsonDecode(payload) as Map<String, dynamic>;
    } catch (error) {
      debugPrint('Failed to decode realtime message: $error');
      return;
    }

    final String type = data['type'] as String? ?? '';
    switch (type) {
      case 'session.created':
        _sendSessionUpdate();
        break;
      case 'session.updated':
        unawaited(_startAudioCapture());
        if (_status != NavTalkStatus.connected) {
          _updateStatus(NavTalkStatus.connected);
        }
        break;
      case 'session.backend.error':
        _setError(data['message'] as String? ?? 'Backend error.');
        unawaited(disconnect());
        break;
      case 'session.gpu_full':
        _setError('GPU resources are full. Please try again later.');
        unawaited(disconnect());
        break;
      case 'session.insufficient_balance':
        _setError('Insufficient balance for the NavTalk session.');
        unawaited(disconnect());
        break;
      case 'conversation.item.input_audio_transcription.completed':
        final String transcript = data['transcript'] as String? ?? '';
        if (transcript.isNotEmpty) {
          _appendUserMessage(transcript);
        }
        break;
      case 'response.function_call_arguments.done':
        unawaited(_handleFunctionCall(data));
        break;
      case 'response.audio_transcript.delta':
        final String delta = data['delta'] as String? ?? '';
        if (delta.isNotEmpty) {
          _appendAssistantDelta(delta, false);
        }
        break;
      case 'response.audio_transcript.done':
        final String transcript = data['transcript'] as String? ?? '';
        if (transcript.isNotEmpty) {
          _appendAssistantDelta(transcript, true);
        }
        break;
      default:
        break;
    }
  }

  Future<void> _handleFunctionCall(Map<String, dynamic> data) async {
    final String callId = data['call_id'] as String? ?? '';
    final String args = data['arguments'] as String? ?? '';
    String userInput = '';
    try {
      final Map<String, dynamic> parsed =
          jsonDecode(args) as Map<String, dynamic>;
      userInput = parsed['userInput'] as String? ?? '';
    } catch (_) {
      userInput = '';
    }
    if (userInput.isEmpty) {
      return;
    }

    try {
      final Uri uri = Uri.parse('https://$baseUrl/api/realtime_function_call');
      final Map<String, dynamic> body = <String, dynamic>{
        'userInput': userInput,
        'license': _license,
        'chatId': _prefs?.getString('chatId') ?? '',
      };
      final http.Response response = await http
          .post(uri, body: jsonEncode(body), headers: <String, String>{
        HttpHeaders.contentTypeHeader: 'application/json',
      });
      final String result = response.body;
      final Map<String, dynamic> payload = <String, dynamic>{
        'type': 'conversation.item.create',
        'item': <String, dynamic>{
          'type': 'function_call_output',
          'output': result,
          'call_id': callId,
        },
      };
      _realtimeSocket?.add(jsonEncode(payload));
    } catch (error) {
      _setError('Function call failed: $error');
    }
  }

  void _appendUserMessage(String transcript) {
    final ChatMessage message = ChatMessage(
      role: ChatRole.user,
      content: transcript,
    );
    _messages.add(message);
    _persistHistory(message);
    notifyListeners();
  }

  void _appendAssistantDelta(String chunk, bool finalize) {
    if (_assistantIndex == null) {
      _assistantBuffer = StringBuffer(chunk);
      final ChatMessage message = ChatMessage(
        role: ChatRole.assistant,
        content: _assistantBuffer.toString(),
        isFinal: finalize,
      );
      _messages.add(message);
      _assistantIndex = _messages.length - 1;
    } else {
      _assistantBuffer.write(chunk);
      final int index = _assistantIndex!;
      final ChatMessage existing = _messages[index];
      _messages[index] = existing.copyWith(
        content: _assistantBuffer.toString(),
        isFinal: finalize,
      );
    }

    if (finalize && _assistantIndex != null) {
      final ChatMessage finalMessage = _messages[_assistantIndex!];
      _persistHistory(finalMessage);
      _assistantIndex = null;
      _assistantBuffer = StringBuffer();
    }
    notifyListeners();
  }

  void _persistHistory(ChatMessage message) {
    if (!message.isFinal) {
      return;
    }
    _history.add(message);
    final List<Map<String, dynamic>> serialized =
        _history.map((ChatMessage e) => e.toJson()).toList();
    unawaited(_prefs?.setString(_historyKey, jsonEncode(serialized)));
  }

  Future<void> _sendSessionUpdate() async {
    final Map<String, dynamic> session = <String, dynamic>{
      'instructions': instructions,
      'turn_detection': <String, dynamic>{
        'type': 'server_vad',
        'threshold': 0.5,
        'prefix_padding_ms': 300,
        'silence_duration_ms': 500,
      },
      'voice': voiceType,
      'temperature': 1,
      'max_response_output_tokens': 4096,
      'modalities': <String>['text', 'audio'],
      'input_audio_format': 'pcm16',
      'output_audio_format': 'pcm16',
      'input_audio_transcription': <String, dynamic>{'model': 'whisper-1'},
      'tools': <Map<String, dynamic>>[
        <String, dynamic>{
          'type': 'function',
          'name': 'function_call_judge',
          'description':
              'Are there any function calls or tasks beyond your capability?',
          'parameters': <String, dynamic>{
            'type': 'object',
            'properties': <String, dynamic>{
              'userInput': <String, dynamic>{
                'type': 'string',
                'description': 'Raw user request content to process.',
              },
            },
            'required': <String>['userInput'],
          },
        },
      ],
    };

    final Map<String, dynamic> message = <String, dynamic>{
      'type': 'session.update',
      'session': session,
    };
    _realtimeSocket?.add(jsonEncode(message));

    for (final ChatMessage item in _history) {
      if (item.role != ChatRole.user) {
        continue;
      }
      final Map<String, dynamic> historyMessage = <String, dynamic>{
        'type': 'conversation.item.create',
        'item': <String, dynamic>{
          'type': 'message',
          'role': 'user',
          'content': <Map<String, dynamic>>[<String, dynamic>{
            'type': 'input_text',
            'text': item.content,
          }],
        },
      };
      _realtimeSocket?.add(jsonEncode(historyMessage));
    }
  }

  Future<void> _handleWebrtcMessage(String payload) async {
    Map<String, dynamic> data;
    try {
      data = jsonDecode(payload) as Map<String, dynamic>;
    } catch (error) {
      debugPrint('Failed to decode WebRTC message: $error');
      return;
    }

    switch (data['type']) {
      case 'offer':
        await _handleOffer(data);
        break;
      case 'iceCandidate':
        await _handleRemoteIceCandidate(data);
        break;
      case 'answer':
        break;
      default:
        break;
    }
  }

  Future<void> _handleOffer(Map<String, dynamic> data) async {
    final Map<String, dynamic>? sdp =
        data['sdp'] as Map<String, dynamic>?;
    if (sdp == null) {
      return;
    }
    final String description = sdp['sdp'] as String? ?? '';
    if (description.isEmpty) {
      return;
    }
    final String? targetId = data['targetSessionId'] as String?;
    if (targetId != null && targetId.isNotEmpty) {
      _localSessionId = targetId;
    }

    await _ensurePeerConnection();
    final RTCSessionDescription remoteDescription = RTCSessionDescription(
      description,
      'offer',
    );
    await _peerConnection?.setRemoteDescription(remoteDescription);
    final RTCSessionDescription? answer =
        await _peerConnection?.createAnswer();
    if (answer == null) {
      return;
    }
    await _peerConnection?.setLocalDescription(answer);
    final Map<String, dynamic> message = <String, dynamic>{
      'type': 'answer',
      'targetSessionId': _localSessionId,
      'sdp': <String, dynamic>{
        'type': answer.type,
        'sdp': answer.sdp,
      },
    };
    _webrtcSocket?.add(jsonEncode(message));
  }

  Future<void> _handleRemoteIceCandidate(Map<String, dynamic> data) async {
    final Map<String, dynamic>? candidate =
        data['candidate'] as Map<String, dynamic>?;
    if (candidate == null) {
      return;
    }
    final String cand = candidate['candidate'] as String? ?? '';
    final String? sdpMid = candidate['sdpMid'] as String?;
    final int sdpMLineIndex = candidate['sdpMLineIndex'] is int
        ? candidate['sdpMLineIndex'] as int
        : int.tryParse('${candidate['sdpMLineIndex']}') ?? 0;
    if (cand.isEmpty) {
      return;
    }
    final RTCIceCandidate rtcCandidate =
        RTCIceCandidate(cand, sdpMid, sdpMLineIndex);
    await _ensurePeerConnection();
    await _peerConnection?.addCandidate(rtcCandidate);
  }

  Future<void> _ensurePeerConnection() async {
    if (_peerConnection != null) {
      return;
    }
    final Map<String, dynamic> configuration = <String, dynamic>{
      'iceServers': <Map<String, dynamic>>[
        <String, dynamic>{'urls': 'stun:stun.l.google.com:19302'},
      ],
      'sdpSemantics': 'unified-plan',
    };
    final RTCPeerConnection pc =
        await createPeerConnection(configuration, <String, dynamic>{});
    pc.onTrack = (RTCTrackEvent event) {
      if (event.track.kind == 'video' && event.streams.isNotEmpty) {
        remoteRenderer.srcObject = event.streams.first;
        notifyListeners();
      }
      if (event.track.kind == 'audio') {
        event.track.enabled = true;
      }
    };
    pc.onIceCandidate = (RTCIceCandidate candidate) {
      if (candidate.candidate == null || candidate.candidate!.isEmpty) {
        return;
      }
      final Map<String, dynamic> message = <String, dynamic>{
        'type': 'iceCandidate',
        'targetSessionId': _localSessionId,
        'candidate': <String, dynamic>{
          'candidate': candidate.candidate,
          'sdpMid': candidate.sdpMid,
          'sdpMLineIndex': candidate.sdpMLineIndex,
        },
      };
      _webrtcSocket?.add(jsonEncode(message));
    };
    pc.onConnectionState = (RTCPeerConnectionState state) {
      if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
        _setError('WebRTC connection failed.');
        unawaited(disconnect());
      }
    };
    _peerConnection = pc;
  }

  Future<void> _startAudioCapture() async {
    if (_recording) {
      return;
    }
    if (!_isRecorderInitialized) {
      try {
        await _recorder.initialize(sampleRate: sampleRate, numChannels: 1);
        _isRecorderInitialized = true;
      } catch (error) {
        _setError('Failed to initialise audio recorder: $error');
        return;
      }
    }

    _recorderSub ??= _recorder.audioStream.listen(
      (List<int> data) {
        if (data.isEmpty) {
          return;
        }
        final Uint8List bytes = data is Uint8List ? data : Uint8List.fromList(data);
        final String base64Audio = base64Encode(bytes);
        const int chunk = 4096;
        for (int offset = 0; offset < base64Audio.length; offset += chunk) {
          final int end = min(offset + chunk, base64Audio.length);
          final String slice = base64Audio.substring(offset, end);
          final Map<String, dynamic> message = <String, dynamic>{
            'type': 'input_audio_buffer.append',
            'audio': slice,
          };
          _realtimeSocket?.add(jsonEncode(message));
        }
      },
    );

    try {
      await _recorder.start();
      _recording = true;
    } catch (error) {
      _setError('Failed to start audio capture: $error');
    }
  }

  Future<void> _stopAudioCapture() async {
    if (!_recording) {
      return;
    }
    try {
      await _recorder.stop();
    } catch (_) {
      // Ignore.
    }
    _recording = false;
  }

  void _setError(String message) {
    _errorMessage = message;
    if (!_isDisposed) {
      notifyListeners();
    }
  }

  void _updateStatus(NavTalkStatus value) {
    if (_status == value) {
      return;
    }
    _status = value;
    if (!_isDisposed) {
      notifyListeners();
    }
  }
}
