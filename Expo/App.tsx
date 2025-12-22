import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import MaskedView from '@react-native-masked-view/masked-view';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

const CHARACTER_NAME = 'navtalk.Leo';
const REMOTE_BACKGROUND = `https://api.navtalk.ai/uploadFiles/${CHARACTER_NAME}.png`;
const FALLBACK_BACKGROUND_COLORS = ['#1a1a1a', '#050505'];

const CONNECTING_DELAY_MS = 1600;
const MESSAGE_INTERVAL_MS = 2400;

type NavTalkStatus = 'notConnected' | 'connecting' | 'connected';

type Message = {
  id: string;
  type: 'question' | 'answer';
  content: string;
};

const SAMPLE_CONVERSATION: Message[] = [
  {
    id: 'answer-greeting',
    type: 'answer',
    content: "Hi there! I'm Leo with NavTalk. I can see and hear you perfectly."
  },
  {
    id: 'question-capabilities',
    type: 'question',
    content: 'Great! Could you walk me through what you can help with during a call?'
  },
  {
    id: 'answer-capabilities',
    type: 'answer',
    content:
      'Absolutely. I manage the real-time conversation, keep context, and surface relevant knowledge instantly while we talk.'
  },
  {
    id: 'question-adapt',
    type: 'question',
    content: 'How quickly can you adjust if I change topics or ask something unexpected?'
  },
  {
    id: 'answer-adapt',
    type: 'answer',
    content:
      'NavTalk adapts on the fly. The underlying model listens continuously and pivots the dialogue in under a second.'
  },
  {
    id: 'question-summary',
    type: 'question',
    content: 'Nice. Could you summarise what we have covered so far?'
  },
  {
    id: 'answer-summary',
    type: 'answer',
    content:
      'Sure thing! We established the connection, reviewed my role in guiding the call, and highlighted how fast I adjust. '
  },
  {
    id: 'question-wrap',
    type: 'question',
    content: "Thanks Leo—that's all I needed for now."
  },
  {
    id: 'answer-wrap',
    type: 'answer',
    content: 'Happy to help! Feel free to reconnect any time you want to dive deeper.'
  }
];

const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

export default function App() {
  const [status, setStatus] = useState<NavTalkStatus>('notConnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [backgroundUri, setBackgroundUri] = useState<string | null>(REMOTE_BACKGROUND);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const listRef = useRef<FlatList<Message>>(null);

  const messageAreaHeight = useMemo(() => Math.min(height * 0.55, 450), []);
  const gradientColors = useMemo(() => ['rgba(0,0,0,0.88)', 'rgba(0,0,0,0)'], []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }, []);

  const fetchRemoteBackground = useCallback(async () => {
    try {
      const success = await Image.prefetch(REMOTE_BACKGROUND);
      if (success) {
        setBackgroundUri(REMOTE_BACKGROUND);
      } else {
        setBackgroundUri(null);
      }
    } catch (error) {
      setBackgroundUri(null);
    }
  }, []);

  useEffect(() => {
    fetchRemoteBackground();
  }, [fetchRemoteBackground]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        fetchRemoteBackground();
      }
    });

    return () => unsubscribe();
  }, [fetchRemoteBackground]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  const scheduleConversation = useCallback(() => {
    SAMPLE_CONVERSATION.forEach((message, index) => {
      const timer = setTimeout(() => {
        setMessages((prev) => {
          if (prev.find((item) => item.id === message.id)) {
            return prev;
          }

          return [...prev, { ...message }];
        });
      }, index * MESSAGE_INTERVAL_MS);

      timers.current.push(timer);
    });
  }, []);

  const handleStartCall = useCallback(() => {
    if (status !== 'notConnected') {
      return;
    }

    clearTimers();
    setMessages([]);
    setStatus('connecting');

    const connectingTimer = setTimeout(() => {
      setStatus('connected');
      scheduleConversation();
    }, CONNECTING_DELAY_MS);

    timers.current.push(connectingTimer);
  }, [clearTimers, scheduleConversation, status]);

  const handleHangUp = useCallback(() => {
    setStatus('notConnected');
    setMessages([]);
    clearTimers();
  }, [clearTimers]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isQuestion = item.type === 'question';
    const bubbleStyle = isQuestion ? styles.questionBubble : styles.answerBubble;
    const containerStyle = isQuestion ? styles.questionContainer : styles.answerContainer;

    return (
      <View style={[styles.messageRow, containerStyle]}>
        <View style={[styles.messageBubble, bubbleStyle]}>
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const messageList = (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={keyExtractor}
      renderItem={renderMessage}
      contentContainerStyle={styles.messageListContent}
      style={styles.messageList}
    />
  );

  const renderControls = () => {
    if (status === 'notConnected') {
      return (
        <TouchableOpacity
          style={[styles.controlButton, styles.callButton]}
          onPress={handleStartCall}
          activeOpacity={0.85}
        >
          <MaterialIcons name="call" size={18} color="#FFFFFF" style={styles.controlIcon} />
          <Text style={styles.controlText}>Call</Text>
        </TouchableOpacity>
      );
    }

    if (status === 'connecting') {
      return (
        <View style={[styles.controlButton, styles.connectingButton]}>
          <ActivityIndicator color="#FFFFFF" size="small" style={styles.controlSpinner} />
          <Text style={styles.controlText}>Connecting…</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.controlButton, styles.hangupButton]}
        onPress={handleHangUp}
        activeOpacity={0.85}
      >
        <MaterialIcons name="call-end" size={18} color="#FFFFFF" style={styles.controlIcon} />
        <Text style={styles.controlText}>Hang Up</Text>
      </TouchableOpacity>
    );
  };

  const renderConversationContent = () => (
    <>
      <LinearGradient colors={gradientColors} style={styles.gradientBackdrop} pointerEvents="none" />
      <View style={styles.contentArea}>
        {isNativePlatform ? (
          <MaskedView
            style={[styles.messageMaskWrapper, { height: messageAreaHeight }]}
            maskElement={
              <LinearGradient
                colors={["rgba(0,0,0,0)", 'rgba(0,0,0,1)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            }
          >
            <View style={styles.messageMaskContent}>{messageList}</View>
          </MaskedView>
        ) : (
          <View style={[styles.messageMaskWrapper, { height: messageAreaHeight }]}>{messageList}</View>
        )}
        <View style={styles.controlsContainer}>{renderControls()}</View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'default'} />
      <ExpoStatusBar style="light" />
      {backgroundUri ? (
        <ImageBackground
          source={{ uri: backgroundUri, cache: 'reload' }}
          style={styles.background}
          resizeMode="cover"
          onError={() => setBackgroundUri(null)}
        >
          <View style={styles.overlay}>{renderConversationContent()}</View>
        </ImageBackground>
      ) : (
        <LinearGradient colors={FALLBACK_BACKGROUND_COLORS} style={styles.background}>
          <View style={styles.overlay}>{renderConversationContent()}</View>
        </LinearGradient>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000'
  },
  background: {
    flex: 1
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  gradientBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6
  },
  contentArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 24
  },
  messageMaskWrapper: {
    width: '100%'
  },
  messageMaskContent: {
    flex: 1
  },
  messageList: {
    flex: 1
  },
  messageListContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: 24,
    paddingBottom: 16,
    gap: 12
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row'
  },
  questionContainer: {
    justifyContent: 'flex-end'
  },
  answerContainer: {
    justifyContent: 'flex-start'
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    maxWidth: '78%'
  },
  questionBubble: {
    backgroundColor: 'rgba(108,105,170,0.95)'
  },
  answerBubble: {
    backgroundColor: 'rgba(40,40,38,0.95)'
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22
  },
  controlsContainer: {
    alignItems: 'center'
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20
  },
  callButton: {
    backgroundColor: 'rgba(121,121,242,1)',
    minWidth: 120
  },
  connectingButton: {
    backgroundColor: 'rgba(245,29,72,1)',
    opacity: 0.35,
    minWidth: 150
  },
  hangupButton: {
    backgroundColor: 'rgba(245,29,72,1)',
    minWidth: 135
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  controlIcon: {
    marginRight: 8
  },
  controlSpinner: {
    marginRight: 10
  }
});
