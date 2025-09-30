// Ported from HtmlClient/demo.js to an ES module for Vue usage

 // ❗You need to manually modify the following variables.
// ✒️ api key
const LICENSE = "sk_navtalk_your_key";

// ✒️ character name. Currently supported characters include: navtalk.Alex, navtalk.Ethan, navtalk.Leo, navtalk.Lily, navtalk.Emma, navtalk.Sophia, navtalk.Mia, navtalk.Chloe, navtalk.Zoe, navtalk.Ava
// You can check the specific images on the official website: https://console.navtalk.ai/login#/playground/realtime_digital_human.
const CHARACTER_NAME = "navtalk.Alex";

// ✒️ voice. Currently supported voices include: alloy, ash, ballad, cedar, coral, echo, marin, sage, shimmer, verse
    // You can check the specific voices on the official website: https://console.navtalk.ai/login#/playground/realtime_digital_human.
const VOICE = "cedar";

// ✒️ prompt. You want him to act in the conversation, or the knowledge he needs to have, and things to watch out for.
const PROMPT = "You are a helpful assistant.";

let baseUrl = "transfer.navtalk.ai";

let peerConnectionA = null;
let resultSocket = null;
let pc = null;
let currentTracks = [];
let configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

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

  let activeCharacterLogId = await getFromStorage("digitalHumanLogId");
  let loading = document.querySelector('.ah-chat-loading');
  let aiMessageElement;
  let accumulatedTranscript = '';
  let audioQueue = [];
  let isPlaying = false;
  let responseSpans = new Map();
  let playVideo = false;
  let markdownBuffer = new Map();

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
      if (pc) {
        pc.removeEventListener('icecandidate', on_icecandidate);
        pc.removeEventListener('connectionstatechange', on_connectionstatechange);
        pc.removeEventListener('iceconnectionstatechange', iceconnectionstatechange);
        pc.removeEventListener('signalingstatechange', signalingstatechange);
        if (pc.connectionState !== 'closed') {
          await pc.close();
        }
        pc = null;
      }
      if (peerConnectionA) {
        peerConnectionA.onicecandidate = null;
        peerConnectionA.close();
        peerConnectionA = null;
      }
      currentTracks.forEach(track => {
        if (track.stop) track.stop();
        if (track.dispatchEvent) {
          track.dispatchEvent(new Event('ended'));
        }
      });
      currentTracks = [];
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
    const websocketUrl = "wss://" + baseUrl + "/api/realtime-api";
    const websocketUrlWithParams = `${websocketUrl}?license=${encodeURIComponent(LICENSE)}&characterName=${CHARACTER_NAME}`;
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
      } else if (event.data instanceof ArrayBuffer) {
        const arrayBuffer = event.data;
        handleReceivedBinaryMessage(arrayBuffer);
      } else {
        console.warn("Unknown WebSocket message type");
      }
    };

    socket.onopen = function () {
      console.log("WebSocket connection established");
    };

    socket.onerror = function (error) {
      console.error("WebSocket error: ", error);
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

    let remoteVideoA = document.getElementById('character-avatar-video');
    let targetSessionId = "123";
    resultSocket = new WebSocket('wss://'+baseUrl+'/api/webrtc?userId=' + targetSessionId);

    resultSocket.onopen = () => {
      const message = { type: 'create', targetSessionId: targetSessionId };
      resultSocket.send(JSON.stringify(message));
    };

    resultSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'offer') {
        handleOffer(message);
      } else if (message.type === 'answer') {
        handleAnswer(message);
      } else if (message.type === 'iceCandidate') {
        handleIceCandidate(message);
      }
    };

    resultSocket.onerror = () => {
      cleanupResources();
    };

    resultSocket.onclose = () => {};

    function handleOffer(message) {
      const targetId = message.targetSessionId;
      const offer = new RTCSessionDescription(message.sdp);
      peerConnectionA = new RTCPeerConnection(configuration);
      peerConnectionA.setRemoteDescription(offer)
        .then(() => peerConnectionA.createAnswer())
        .then(answer => peerConnectionA.setLocalDescription(answer))
        .then(() => {
          const responseMessage = {
            type: 'answer',
            targetSessionId: targetId,
            sdp: peerConnectionA.localDescription
          };
          resultSocket.send(JSON.stringify(responseMessage));
        })
        .catch(err => console.error('Error handling offer:', err));

      peerConnectionA.oniceconnectionstatechange = () => {};

      peerConnectionA.ontrack = (event) => {
        if (remoteVideoA) {
          remoteVideoA.srcObject = event.streams[0];
          setTimeout(() => { try { remoteVideoA.play(); } catch {} }, 1000);
        }
      };

      peerConnectionA.onicecandidate = (event) => {
        if (event.candidate) {
          const message = {
            type: 'iceCandidate',
            targetSessionId: targetSessionId,
            candidate: event.candidate
          };
          resultSocket.send(JSON.stringify(message));
        }
      };
    }

    const events_maps = new Map();

    function handleAnswer(message) {
      const targetSessionId = message.targetSessionId;
      const map_item = events_maps.get(targetSessionId);
      if (!map_item) return;
      pc = map_item.peerConnection;
      const answer = new RTCSessionDescription(message.sdp);
      if (pc.signalingState === 'stable') {
        pc.restartIce();
        recreateOffer(pc, targetSessionId, map_item.socket);
      } else if (pc.signalingState === 'have-local-offer') {
        pc.setRemoteDescription(answer).catch(err => console.error('Failed to handle Answer:', err));
      }
    }

    async function recreateOffer(pc, targetSessionId, socket) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: 'offer', targetSessionId: targetSessionId, sdp: pc.localDescription }));
      } catch (err) {
        console.error('Failed to recreate Offer:', err);
      }
    }

    function handleIceCandidate(message) {
      const candidate = new RTCIceCandidate(message.candidate);
      peerConnectionA.addIceCandidate(candidate).catch(err => console.error('Error adding ICE candidate:', err));
    }

    function showErrorTip(message) {
      const realtimeButton = document.getElementById('btnRealtime');
      if (realtimeButton && realtimeButton.classList.contains('active')) {
        realtimeButton.click();
      }
      console.error(message);
    }

    async function sendSessionUpdate() {
      const history = localStorage.getItem("realtimeChatHistory");
      const conversationHistory = history ? JSON.parse(history) : [];
      let userLanguage = await getFromStorage("userLanguage");
      let activeCharacterLogId = await getFromStorage("digitalHumanLogId");
      let realtimeChatHistory = await getFromStorage("realtimeChatHistory");
      try { realtimeChatHistory = JSON.parse(realtimeChatHistory); } catch { realtimeChatHistory = []; }

      let sessionConfig = {
        type: "session.update",
        session: {
          instructions: PROMPT,
          turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500 },
          voice: VOICE,
          temperature: 1,
          max_response_output_tokens: 4096,
          modalities: ["text", "audio"],
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
          tools: [
            { type: "function", name: "function_call_judge", description: "judge function calls", parameters: { type: "object", properties: { userInput: { type: "string" } }, required: ["userInput"] } }
          ]
        }
      };

      try { socket.send(JSON.stringify(sessionConfig)); } catch (e) { console.error("Error sending session update:", e); }

      conversationHistory.forEach((msg) => {
        const messageConfig = {
          type: "conversation.item.create",
          item: { type: "message", role: msg.role, content: [ { type: msg.role === "user" ? "input_text" : "text", text: msg.content } ] }
        };
        try {
          if (msg.role === "user") socket.send(JSON.stringify(messageConfig));
        } catch (e) { console.error("Error sending message:", e); }
      });
    }

    async function handleReceivedMessage(data) {
      switch (data.type) {
        case "session.created":
          await sendSessionUpdate();
          break;
        case "session.updated":
          startRecording();
          break;
        case "input_audio_buffer.speech_started":
          stopCurrentAudioPlayback();
          audioQueue = [];
          isPlaying = false;
          playVideo = false;
          break;
        case "conversation.item.input_audio_transcription.completed": {
          const userMessageContainer = document.createElement('div');
          userMessageContainer.classList.add('character-chat-item', 'item-user');
          const userMessage = document.createElement('span');
          userMessage.textContent = data.transcript;
          userMessageContainer.appendChild(userMessage);
          const chatContent = document.querySelector('.ah-character-chat');
          if (chatContent) {
            chatContent.appendChild(userMessageContainer);
            chatContent.scrollTop = chatContent.scrollHeight;
          }
          await appendRealtimeChatHistory("user", data.transcript);
          break; }
        case "response.audio_transcript.delta": {
          playVideo = true;
          const transcript = data.delta;
          const responseId = data.response_id;
          if (!markdownBuffer.has(responseId)) markdownBuffer.set(responseId, "");
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
            if (chatContainer) chatContainer.appendChild(aiMessageContainer);
            responseSpans.set(responseId, aiMessageSpan);
          }
          const fullContent = markdownBuffer.get(responseId);
          const parsedContent = (window.marked ? window.marked : { parse: (t)=>t }).parse(fullContent);
          aiMessageSpan.innerHTML = parsedContent;
          if (window.Prism && window.Prism.highlightAllUnder) {
            window.Prism.highlightAllUnder(aiMessageSpan);
          }
          const chatContainer = document.querySelector('.ah-character-chat');
          if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
          break; }
        case "response.audio_transcript.done":
          await appendRealtimeChatHistory("assistant", data.transcript);
          break;
        case "response.audio.done":
          isPlaying = false;
          playVideo = false;
          break;
        case "response.function_call_arguments.done":
          handleFunctionCall(data);
          break;
        case "session.gpu_full":
          console.error("The gpu resources are full. Please try again later!");
          break;
        case "session.insufficient_balance":
          console.error("Insufficient balance, service has stopped, please recharge!");
          break;
        default:
          break;
      }
    }

    function handleFunctionCall(eventJson) {
      try {
        const args = eventJson.arguments;
        const functionCallArgs = JSON.parse(args);
        const userInput = functionCallArgs.userInput;
        const callId = eventJson.call_id;
        if (userInput) {
          handleWithMemAgent(userInput)
            .then(result => { sendFunctionCallResult(result, callId); })
            .catch(error => { console.error("Error calling MemAgent:", error); });
        }
      } catch (error) {
        console.error("Error parsing function call arguments: ", error);
      }
    }

    function handleWithMemAgent(userInput) {
      return new Promise(async (resolve, reject) => {
        let chatId = await getFromStorage("chatId");
        fetch('https://' + baseUrl + '/api/realtime_function_call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userInput, license: LICENSE, chatId })
        })
          .then(response => response.text())
          .then(result => resolve(result))
          .catch(error => reject(error));
      });
    }

    function sendFunctionCallResult(result, callId) {
      const resultJson = { type: "conversation.item.create", item: { type: "function_call_output", output: result, call_id: callId } };
      socket.send(JSON.stringify(resultJson));
      const rpJson = { type: "response.create" };
      socket.send(JSON.stringify(rpJson));
    }

    function stopCurrentAudioPlayback() {
      if (currentAudioSource) {
        currentAudioSource.stop();
        currentAudioSource = null;
      }
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
                socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: chunk }));
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

    function stopRecording() {
      if (audioProcessor) audioProcessor.disconnect();
      if (audioStream) audioStream.getTracks().forEach(track => track.stop());
      if (socket) socket.close();
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


