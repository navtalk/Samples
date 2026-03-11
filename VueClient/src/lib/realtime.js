// Ported from HtmlClient/demo.js to an ES module for Vue usage

// Message type constants
const NavTalkMessageType = Object.freeze({
  CONNECTED_SUCCESS: "conversation.connected.success",
  CONNECTED_FAIL: "conversation.connected.fail",
  CONNECTED_CLOSE: "conversation.connected.close",
  INSUFFICIENT_BALANCE: "conversation.connected.insufficient_balance",
  WEB_RTC_OFFER: "webrtc.signaling.offer",
  WEB_RTC_ANSWER: "webrtc.signaling.answer",
  WEB_RTC_ICE_CANDIDATE: "webrtc.signaling.iceCandidate",

  REALTIME_SESSION_CREATED: "realtime.session.created",
  REALTIME_SESSION_UPDATED: "realtime.session.updated",

  REALTIME_SPEECH_STARTED: "realtime.input_audio_buffer.speech_started",
  REALTIME_SPEECH_STOPPED: "realtime.input_audio_buffer.speech_stopped",

  REALTIME_CONVERSATION_ITEM_COMPLETED:
      "realtime.conversation.item.input_audio_transcription.completed",

  REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA:
      "realtime.response.audio_transcript.delta",

  REALTIME_RESPONSE_AUDIO_DELTA: "realtime.response.audio.delta",

  REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE:
      "realtime.response.audio_transcript.done",

  REALTIME_RESPONSE_AUDIO_DONE: "realtime.response.audio.done",

  REALTIME_RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE:
      "realtime.response.function_call_arguments.done",

  REALTIME_INPUT_AUDIO_BUFFER_APPEND: "realtime.input_audio_buffer.append",

  REALTIME_INPUT_TEXT: "realtime.input_text",

  REALTIME_INPUT_IMAGE: "realtime.input_image",

  UNKNOWN_TYPE: "unknow"
});

// ❗You need to manually modify the following variables.
// ✒️ api key
const LICENSE = "sk_navtalk_your_key";

// ✒️ model. Currently supported models include: gpt-realtime, gpt-realtime-mini
// ✒️ character name. Currently supported characters include: navtalk.Ethan, navtalk.Leo, navtalk.Emma, navtalk.Sophia, navtalk.Mia, navtalk.Chloe, navtalk.Zoe, navtalk.Ava
// You can check the specific images on the official website: https://console.navtalk.ai/login#/playground/realtime_digital_human.
const CHARACTER_NAME = "navtalk.Zoe";

// Note: model, voice, and prompt configurations are managed through the console, not in client code

let baseUrl = "wss://transfer.navtalk.ai/wss/v2/realtime-chat";
let configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
let peerConnectionA = null;

export async function initDigtalHumanRealtimeButton() {
  let realtimeChatHistory = await getFromStorage("realtimeChatHistory");

  async function getFromStorage(key) {
    return new Promise((resolve) => {
      const value = localStorage.getItem(key);
      resolve(value !== null ? value : null);
    });
  }

  try {
    realtimeChatHistory = JSON.parse(realtimeChatHistory);
  } catch (e) {
    realtimeChatHistory = [];
  }

  const realtimeButton = document.getElementById('btnRealtime');
  const conversationBg = document.querySelector('.conversation-bg');

  let socket;
  let audioContext;
  let audioProcessor;
  let audioStream;
  let currentAudioSource = null;

  let audioQueue = [];
  let isPlaying = false;
  let responseSpans = new Map();
  let markdownBuffer = new Map();
  let pendingUserMessageSpan = null;
  let playVideo = false;

  function stopRecording() {
    if (audioProcessor) audioProcessor.disconnect();
    if (audioStream) audioStream.getTracks().forEach(track => track.stop());
    if (socket) socket.close();
  }

  if (realtimeButton) {
    realtimeButton.addEventListener('click', async function () {
      const staticImage = document.getElementById('character-static-image');
      const videoElement = document.getElementById('character-avatar-video');

      if (realtimeButton.classList.contains('active')) {
        realtimeButton.classList.remove('active');
        stopRecording();
        if (conversationBg) conversationBg.style.display = 'none';
        if (staticImage) staticImage.style.display = 'block';
        if (videoElement) {
          videoElement.style.display = 'none';
          try { videoElement.pause(); } catch {}
        }
        audioQueue = [];
        isPlaying = false;
        document.querySelectorAll('.character-chat-item').forEach(item => {
          item.style.display = 'none';
        });
      } else {
        realtimeButton.classList.add('active');
        startWebSocket();
        if (conversationBg) conversationBg.style.display = 'block';
        if (staticImage) staticImage.style.display = 'none';
        if (videoElement) {
          videoElement.style.display = 'block';
          try { await videoElement.play(); } catch (e) { console.error('Video play failed:', e); }
        }
        document.querySelectorAll('.character-chat-item').forEach(item => {
          item.style.display = 'block';
        });
      }
    });
  }

  async function cleanupResources() {
    try {
      if (peerConnectionA) {
        peerConnectionA.onicecandidate = null;
        peerConnectionA.close();
        peerConnectionA = null;
      }

      const remoteVideo = document.getElementById('character-avatar-video');
      if (remoteVideo) {
        remoteVideo.srcObject = null;
        remoteVideo.removeAttribute('src');
        remoteVideo.load();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error('Resource cleanup error:', err);
    }
  }

  async function startWebSocket() {
    const websocketUrlWithParams = `${baseUrl}?license=${LICENSE}&name=${CHARACTER_NAME}`;
    socket = new WebSocket(websocketUrlWithParams);
    socket.binaryType = 'arraybuffer';

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          handleReceivedMessage(data);
        } catch (e) {
          console.error("Failed to parse JSON message:", e);
        }
      } else {
        console.warn("Unknown WebSocket message type");
      }
    };

    socket.onopen = function () {
      console.log("WebSocket connection established");
    };

    socket.onerror = function (error) {
      cleanupResources();
      console.error("WebSocket error:", error);
    };

    socket.onclose = async function (event) {
      if (event.reason === 'Insufficient points') {
        showErrorTip("You need more points to complete this action.");
      }
      console.log("WebSocket connection closed", event.code, event.reason);
      await cleanupResources();
      stopRecording();
      responseSpans = new Map();
    };
  }

  function sendOfferMessage(sdp) {
    const message = {
      type: NavTalkMessageType.WEB_RTC_OFFER,
      data: { sdp: sdp }
    };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  function sendAnswerMessage(sdp) {
    const message = {
      type: NavTalkMessageType.WEB_RTC_ANSWER,
      data: { sdp: sdp }
    };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  function sendIceMessage(candidate) {
    const message = {
      type: NavTalkMessageType.WEB_RTC_ICE_CANDIDATE,
      data: { candidate: candidate }
    };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  async function handleOffer(message) {
    const offer = new RTCSessionDescription(message.sdp);
    peerConnectionA = new RTCPeerConnection(configuration);

    peerConnectionA.setRemoteDescription(offer)
        .then(() => peerConnectionA.createAnswer())
        .then(answer => peerConnectionA.setLocalDescription(answer))
        .then(() => {
          sendAnswerMessage(peerConnectionA.localDescription)
        })
        .catch(err => console.error('Error handling offer:', err));

    peerConnectionA.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnectionA.iceConnectionState);
      if (peerConnectionA.iceConnectionState === 'connected') {
        console.log('WebRTC connection fully established!');
      } else if (peerConnectionA.iceConnectionState === 'failed') {
        console.log('ICE connection failed, attempting reconnection...');
      } else if (peerConnectionA.iceConnectionState === 'disconnected') {
        console.log('ICE connection disconnected, attempting reconnection...');
      }
    };

    peerConnectionA.onnegotiationneeded = async () => {
      console.log("onnegotiationneeded")
      const offer = await peerConnectionA.createOffer();
      await peerConnectionA.setLocalDescription(offer);
      sendOfferMessage(offer);
    };

    peerConnectionA.ontrack = (event) => {
      console.log("ontrack")
      console.log(event)
      let remoteVideoA = document.getElementById('character-avatar-video');
      if (remoteVideoA) {
        remoteVideoA.srcObject = event.streams[0];
        setTimeout(() => {
          try {
            remoteVideoA.play();
            console.log('Video play started successfully');
          } catch (e) {
            console.error('Video play failed:', e);
          }
        }, 1000);
      }
    };

    peerConnectionA.onicecandidate = (event) => {
      console.log('onicecandidate:', event.candidate ? 'new candidate' : 'gathering complete');
      if (event.candidate) {
        sendIceMessage(event.candidate);
      }
    };
  }

  function handleAnswer(message) {
    const answer = new RTCSessionDescription(message.sdp);
    if (peerConnectionA) {
      peerConnectionA.setRemoteDescription(answer)
          .catch(err => console.error('Failed to handle Answer:', err));
    }
  }

  function handleIceCandidate(message) {
    const candidate = new RTCIceCandidate(message.candidate);
    console.log(candidate)
    if (peerConnectionA) {
      peerConnectionA.addIceCandidate(candidate)
          .catch(err => console.error('Error adding ICE candidate:', err));
    }
  }

  function showErrorTip(message) {
    const realtimeButton = document.getElementById('btnRealtime');
    if (realtimeButton && realtimeButton.classList.contains('active')) {
      realtimeButton.click();
    }
    console.error(message);
  }

  async function handleReceivedMessage(data) {
    let nav_data = data.data;

    switch (data.type) {
        // ======================== connection start===================
      case NavTalkMessageType.CONNECTED_FAIL:
      case NavTalkMessageType.CONNECTED_CLOSE:
        const errorMessage = data.message || "Unknown error";
        console.log(`Connection error: ${errorMessage}`);
        break;

      case NavTalkMessageType.CONNECTED_SUCCESS:
        if (data.data && data.data.iceServers) {
          configuration.iceServers = data.data.iceServers
          console.log("NavTalkMessageType.CONNECTED_SUCCESS")
          console.log(configuration.iceServers)
        }
        console.log("conversation.connected.success");
        console.log(configuration);
        break;

            // Session created
            case NavTalkMessageType.REALTIME_SESSION_CREATED:
                console.log("Session created.");
                break;

        // Session established after configuration
      case NavTalkMessageType.REALTIME_SESSION_UPDATED:
        console.log("Session updated. Ready to receive audio.");
        startRecording();
        break;

      case NavTalkMessageType.INSUFFICIENT_BALANCE:
        console.log("INSUFFICIENT_BALANCE");
        break;
        // ======================== connection end===================
        // ======================== signaling exchange start===================
      case NavTalkMessageType.WEB_RTC_OFFER: {
        handleOffer(data.data);
        break;
      }
      case NavTalkMessageType.WEB_RTC_ANSWER: {
        handleAnswer(data.data);
        break;
      }
      case NavTalkMessageType.WEB_RTC_ICE_CANDIDATE: {
        handleIceCandidate(data.data);
        break;
      }
        // ======================== signaling exchange end===================
        // ======================== Message start===================
        // User starts speaking
      case NavTalkMessageType.REALTIME_SPEECH_STARTED:
        console.log("Speech started detected by server.");
        stopCurrentAudioPlayback();
        audioQueue = [];
        isPlaying = false;
        playVideo = false;
        pendingUserMessageSpan = null;
        break;

        // User stops speaking
      case NavTalkMessageType.REALTIME_SPEECH_STOPPED:
        console.log("Speech stopped detected by server.");
        pendingUserMessageSpan = createTypingPlaceholder();
        break;

        // Full transcription of user speech
      case NavTalkMessageType.REALTIME_CONVERSATION_ITEM_COMPLETED:
        console.log("Received transcription: " + nav_data.content);
        if (nav_data && nav_data.content && nav_data.content.trim()) {
          if (pendingUserMessageSpan) {
            pendingUserMessageSpan.innerHTML = '';
            pendingUserMessageSpan.classList.remove('typing-indicator');
            pendingUserMessageSpan.textContent = nav_data.content;
            pendingUserMessageSpan = null;
          } else {
            const userMessageContainer = document.createElement('div');
            userMessageContainer.classList.add('character-chat-item', 'item-user');

            const userMessage = document.createElement('span');
            userMessage.textContent = nav_data.content;
            userMessageContainer.appendChild(userMessage);

            const chatContent = document.querySelector('.ah-character-chat');
            if (chatContent) {
              chatContent.appendChild(userMessageContainer);
              chatContent.scrollTop = chatContent.scrollHeight;
            }
          }
          await appendRealtimeChatHistory("user", nav_data.content);
        } else if (pendingUserMessageSpan) {
          if (pendingUserMessageSpan.parentElement && pendingUserMessageSpan.parentElement.parentElement) {
            pendingUserMessageSpan.parentElement.parentElement.remove();
          }
          pendingUserMessageSpan = null;
        }
        break;

        // Response text stream
      case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA:
        playVideo = true;
        const transcript = nav_data.content;
        const responseId = nav_data.id;

        if (!markdownBuffer.has(responseId)) {
          markdownBuffer.set(responseId, "");
        }

        const existingBuffer = markdownBuffer.get(responseId);
        markdownBuffer.set(responseId, existingBuffer + transcript);

        let aiMessageSpan = responseSpans.get(responseId);

        if (!aiMessageSpan) {
          const aiMessageContainer = document.createElement('div');
          aiMessageContainer.classList.add('character-chat-item', 'item-character');

          aiMessageSpan = document.createElement('span');
          aiMessageSpan.classList.add('markdown-content');
          aiMessageContainer.appendChild(aiMessageSpan);

          const chatContainer = document.querySelector('.ah-character-chat');
          if (chatContainer) {
            chatContainer.appendChild(aiMessageContainer);
            responseSpans.set(responseId, aiMessageSpan);
          }
        }

        const fullContent = markdownBuffer.get(responseId);
        const parsedContent = fullContent;

        if (aiMessageSpan) {
          aiMessageSpan.innerHTML = parsedContent;
          const chatContainer = document.querySelector('.ah-character-chat');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }
        break;

        // Response audio stream
      case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_DELTA:
        if (data.delta) {
          // Handle audio delta
        }
        break;

        // Full assistant transcription
      case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE:
        console.log("Received transcription: " + nav_data.content);
        await appendRealtimeChatHistory("assistant", nav_data.content);
        break;

        // Response completed
      case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_DONE:
        console.log("Audio response complete.");
        isPlaying = false;
        playVideo = false;
        break;

        // ======================== Message end===================

      default:
        console.warn("Unhandled event type: " + data.type);
    }
  }

  function stopCurrentAudioPlayback() {
    if (currentAudioSource) {
      currentAudioSource.stop();
      currentAudioSource = null;
    }
  }

  function sendAudioMessage(chunk) {
    if (!chunk || !socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not open or empty input.");
      return;
    }
    socket.send(JSON.stringify({ type: NavTalkMessageType.REALTIME_INPUT_AUDIO_BUFFER_APPEND, data: { audio: chunk } }));
  }

  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
          audioStream = stream;
          const source = audioContext.createMediaStreamSource(stream);
          audioProcessor = audioContext.createScriptProcessor(8192, 1, 1);
          audioProcessor.onaudioprocess = (event) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              const inputBuffer = event.inputBuffer.getChannelData(0);
              const pcmData = floatTo16BitPCM(inputBuffer);
              const base64PCM = base64EncodeAudio(new Uint8Array(pcmData));
              const chunkSize = 4096;
              for (let i = 0; i < base64PCM.length; i += chunkSize) {
                const chunk = base64PCM.slice(i, i + chunkSize);
                sendAudioMessage(chunk);
              }
            }
          };
          source.connect(audioProcessor);
          audioProcessor.connect(audioContext.destination);
        })
        .catch(error => { console.error("Unable to access microphone: ", error); });
  }

  function floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  function base64EncodeAudio(uint8Array) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  // Create animated user message placeholder
  function createTypingPlaceholder() {
    const userMessageContainer = document.createElement('div');
    userMessageContainer.classList.add('character-chat-item', 'item-user');

    const userMessage = document.createElement('span');
    userMessage.classList.add('typing-indicator');

    // Create three bouncing dots
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.classList.add('typing-dot');
      userMessage.appendChild(dot);
    }

    userMessageContainer.appendChild(userMessage);

    const chatContent = document.querySelector('.ah-character-chat');
    if (chatContent) {
      chatContent.appendChild(userMessageContainer);
      chatContent.scrollTop = chatContent.scrollHeight;
    }

    return userMessage;
  }

  function playNextAudio() {
    if (audioQueue.length > 0) {
      isPlaying = true;
      const audioData = audioQueue.shift();
      playPCM(audioData, playNextAudio);
    } else {
      isPlaying = false;
    }
  }

  function playPCM(pcmBuffer, callback) {
    const wavBuffer = createWavBuffer(pcmBuffer, 24000);
    audioContext.decodeAudioData(wavBuffer, function (audioBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = callback;
      source.start(0);
      currentAudioSource = source;
    }, function () { callback(); });
  }

  function createWavBuffer(pcmBuffer, sampleRate) {
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmBuffer.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmBuffer.byteLength, true);
    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
    return concatenateBuffers(wavHeader, pcmBuffer);
  }

  function concatenateBuffers(buffer1, buffer2) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  }

  async function appendRealtimeChatHistory(role, content) {
    let history = localStorage.getItem("realtimeChatHistory");
    let realtimeChatHistory = history ? JSON.parse(history) : [];
    realtimeChatHistory.push({ role, content });
    localStorage.setItem("realtimeChatHistory", JSON.stringify(realtimeChatHistory));
  }
}

export async function initDigtalHumanHistoryData() {
  let realtimeChatHistory = [];
  const historyStr = localStorage.getItem("realtimeChatHistory");
  realtimeChatHistory = historyStr ? JSON.parse(historyStr) : [];
  if (realtimeChatHistory && realtimeChatHistory.length > 0) {
    realtimeChatHistory.forEach(item => {
      appendContentToList(item.role, item.content);
    });
    const scroller = document.querySelector('.scroller');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }
}

export function appendContentToList(role, context) {
  const container = document.createElement('div');
  container.classList.add('item', role === 'user' ? 'item-right' : 'item-left');
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('item-content');
  const contentSpan = document.createElement('span');
  contentSpan.textContent = context;
  contentDiv.appendChild(contentSpan);
  container.appendChild(contentDiv);
  const chatContent = document.querySelector('.scroller');
  if (chatContent) chatContent.appendChild(container);
  return contentSpan;
}

// Add typing animation styles
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .typing-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 0;
    }

    .typing-dot {
      width: 8px;
      height: 8px;
      background: currentColor;
      border-radius: 50%;
      animation: typingAnimation 1.4s ease-in-out infinite;
      opacity: 0.6;
    }

    .typing-dot:nth-child(1) {
      animation-delay: 0s;
    }

    .typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingAnimation {
      0%,
      60%,
      100% {
        transform: translateY(0);
        opacity: 0.6;
      }
      30% {
        transform: translateY(-8px);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}
