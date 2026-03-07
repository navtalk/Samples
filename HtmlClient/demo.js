// NavTalk v2 API Message Type Constants
const NavTalkMessageType = Object.freeze({
    CONNECTED_SUCCESS: "conversation.connected.success",
    CONNECTED_FAIL: "conversation.connected.fail",
    CONNECTED_CLOSE: "conversation.connected.close",
    INSUFFICIENT_BALANCE: "conversation.connected.insufficient_balance",
    CONNECTION_LIMIT_EXCEEDED: "conversation.connected.connection_limit_exceeded",
    GPU_FULL: "conversation.connected.gpu_full",
    BACKEND_ERROR: "conversation.connected.backend_error",
    WEB_RTC_OFFER: "webrtc.signaling.offer",
    WEB_RTC_ANSWER: "webrtc.signaling.answer",
    WEB_RTC_ICE_CANDIDATE: "webrtc.signaling.iceCandidate",
    REALTIME_SESSION_CREATED: "realtime.session.created",
    REALTIME_SESSION_UPDATED: "realtime.session.updated",
    REALTIME_SPEECH_STARTED: "realtime.input_audio_buffer.speech_started",
    REALTIME_SPEECH_STOPPED: "realtime.input_audio_buffer.speech_stopped",
    REALTIME_CONVERSATION_ITEM_COMPLETED: "realtime.conversation.item.input_audio_transcription.completed",
    REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA: "realtime.response.audio_transcript.delta",
    REALTIME_RESPONSE_AUDIO_DELTA: "realtime.response.audio.delta",
    REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE: "realtime.response.audio_transcript.done",
    REALTIME_RESPONSE_AUDIO_DONE: "realtime.response.audio.done",
    REALTIME_INPUT_AUDIO_BUFFER_APPEND: "realtime.input_audio_buffer.append",
    REALTIME_INPUT_TEXT: "realtime.input_text",
    REALTIME_INPUT_IMAGE: "realtime.input_image",
    UNKNOWN_TYPE: "unknown"
});

// ❗You need to manually modify the following variables.
// ✒️ api key
const LICENSE = "sk_navtalk_pbxJGVOTi7XYtzFaVQ2kSlgezTF426sI"

// ✒️ // ✒️ character name. Currently supported characters include: navtalk.Ethan, navtalk.Leo, navtalk.Emma, navtalk.Sophia, navtalk.Mia, navtalk.Chloe, navtalk.Zoe, navtalk.Ava
// You can check the specific images on the official website: https://console.navtalk.ai/login#/playground/realtime_digital_human.
const CHARACTER_NAME = "navtalk.Zoe"

// web server url (v2 uses unified endpoint)
let baseUrl = "wss://transfer.navtalk.ai/wss/v2/realtime-chat"

// Global variable for connection state
let peerConnectionA = null;
let resultSocket = null;
let proxySessionId = null;
let targetSessionId = null;
// Global state management
let pc = null;
let currentTracks = [];
let configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Digital human agent, real-time voice conversation button
async function initDigtalHumanRealtimeButton() {
    let realtimeChatHistory = await getFromChromeStorage("realtimeChatHistory");

    async function getFromChromeStorage(key) {
        return new Promise((resolve, reject) => {
            // Use localStorage in normal web pages
            const value = localStorage.getItem(key);
            resolve(value !== null ? value : null);
        });
    }

    realtimeChatHistory = JSON.parse(realtimeChatHistory);

    // Render chat history
    // renderRealtimeChatHistory();
    const realtimeButton = document.getElementById('btnRealtime');
    const conversationBg = document.querySelector('.conversation-bg'); // Select the entire div containing the background image

    let socket;
    let audioContext;
    let audioProcessor;
    let audioStream;
    let currentAudioSource = null; // Currently playing audio source

    let audioQueue = []; // Used to store audio chunks
    let isPlaying = false; // Flag to indicate whether audio is currently playing
    // Use a Map to store the span element corresponding to each response_id
    let responseSpans = new Map();

    let playVideo = false;
    // Define a buffer object to accumulate incomplete Markdown content
    let markdownBuffer = new Map();
    let pendingUserMessageSpan = null; // Store reference to user message placeholder

    realtimeButton.addEventListener('click', async function () {
        const staticImage = document.getElementById('character-static-image');
        const videoElement = document.getElementById('character-avatar-video');

        if (realtimeButton.classList.contains('active')) {
            // Stop state
            realtimeButton.classList.remove('active');
            stopRecording();

            if (conversationBg) {
                conversationBg.style.display = 'none';
            }

            // Show static image and hide video
            staticImage.style.display = 'block';
            videoElement.style.display = 'none';

            // Pause video playback
            videoElement.pause();

            audioQueue = []; // Clear audio queue
            isPlaying = false; // Mark not playing

            // Optional: hide chat content
            document.querySelectorAll('.character-chat-item').forEach(item => {
                item.style.display = 'none';
            });

        } else {
            // Start state
            realtimeButton.classList.add('active');
            startWebSocket();

            if (conversationBg) {
                conversationBg.style.display = 'block';
            }

            // Hide static image and show video
            staticImage.style.display = 'none';
            videoElement.style.display = 'block';

            // Start video playback (make sure video source is set)
            videoElement.play().catch(e => console.error("Video playback failed:", e));

            // Show chat content
            document.querySelectorAll('.character-chat-item').forEach(item => {
                item.style.display = 'block';
            });

            // Original GIF animation logic (commented)
            // if (conversationAnimation) {
            //     conversationAnimation.src = MyExtension.Utils.getChromeRuntimeURL('images/img-real-time.gif');
            // }
        }
    });

    // Clear the websocket on the front end
    async function cleanupResources() {
        try {
            console.log('Starting cleanup');

            if (peerConnectionA) {
                console.log('Closing peerConnectionA');
                peerConnectionA.onicecandidate = null;
                peerConnectionA.close();
                peerConnectionA = null;  // Ensure it's completely reset
            }

            console.log('Tracks cleaned up');

            const remoteVideo = document.getElementById('character-avatar-video');
            if (remoteVideo) {
                remoteVideo.srcObject = null;
                remoteVideo.removeAttribute('src');
                remoteVideo.load();
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('Cleanup complete');
        } catch (err) {
            console.error('Resource cleanup error:', err);
        }
    }

    async function startWebSocket() {
        try {
            proxySessionId = null;
            // v2 uses unified WebSocket connection, no separate resultSocket needed
            // v2 uses 'name' parameter instead of 'characterName'
            const websocketUrlWithParams = `${baseUrl}?license=${encodeURIComponent(LICENSE)}&name=${CHARACTER_NAME}`;

            // Initialize the WebSocket connection
            socket = new WebSocket(websocketUrlWithParams);
            socket.binaryType = 'arraybuffer';

        // Listen for WebSocket messages
        socket.onmessage = (event) => {
            if (typeof event.data === 'string') {
                try {
                    // Parse and handle non-binary messages
                    const data = JSON.parse(event.data);
                    // console.log("data:"+JSON.stringify(data))
                    handleReceivedMessage(data);
                } catch (e) {
                    console.error("Failed to parse JSON message:", e);
                }
            } else if (event.data instanceof ArrayBuffer) {
                // Handle binary messages
                const arrayBuffer = event.data;
                handleReceivedBinaryMessage(arrayBuffer);
            } else {
                console.warn("Unknown WebSocket message type");
            }
        };

        // Triggered when the WebSocket connection is successfully opened
        socket.onopen = function () {
            console.log("WebSocket connection established");
        };

        // Handle WebSocket errors
        socket.onerror = function (error) {
            console.error("WebSocket error: ", error);
        };

        // Triggered when the WebSocket connection is closed
        socket.onclose = async function (event) {
            // Show an error message if points are insufficient
            if (event.reason === 'Insufficient points') {
                showErrorTip("You need more points to complete this action.");
            }
            console.log("WebSocket connection closed", event.code, event.reason);
            // Clean up old connection
            await cleanupResources();

            stopRecording();

            // Update the points information

            // Clear the span record elements
            responseSpans = new Map();

        };
        } catch (error) {
            console.error('Error starting WebSocket connection:', error);
            alert('WebSocket connection failed: ' + error.message);
        }
    }

    const remoteVideoA = document.getElementById('character-avatar-video');

    // ======================== WebRTC Signaling Handlers (v2) ====================
    async function handleWebRTCOffer(nav_data) {
        console.log("Handling WebRTC offer");
        const offer = new RTCSessionDescription(nav_data.sdp);
        console.log("Created offer SDP:", offer);

        // Use ICE servers from connection success event
        peerConnectionA = new RTCPeerConnection(configuration);
        console.log("Created peer connection:", peerConnectionA);

        peerConnectionA.setRemoteDescription(offer)
            .then(() => peerConnectionA.createAnswer())
            .then(answer => peerConnectionA.setLocalDescription(answer))
            .then(() => {
                // Send answer through unified WebSocket
                const responseMessage = {
                    type: NavTalkMessageType.WEB_RTC_ANSWER,
                    data: { sdp: peerConnectionA.localDescription }
                };
                socket.send(JSON.stringify(responseMessage));
                console.log("Sent WebRTC answer");
            })
            .catch(err => console.error('Error handling offer:', err));

        // Add ICE state monitoring
        peerConnectionA.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnectionA.iceConnectionState);
            if (peerConnectionA.iceConnectionState === 'connected') {
                console.log('WebRTC connection fully established!');
            } else if (peerConnectionA.iceConnectionState === 'failed') {
                console.log('ICE connection failed, attempting reconnection...');
            }
        };

        peerConnectionA.ontrack = (event) => {
            console.log("Received remote track:", event);
            console.log("Streams:", event.streams);
            if (remoteVideoA) {
                remoteVideoA.srcObject = event.streams[0];
                console.log("Set video source object:", remoteVideoA.srcObject);
                setTimeout(() => {
                    try {
                        remoteVideoA.play();
                        console.log("Video play started successfully");
                    } catch (e) {
                        console.error("Video play failed:", e);
                    }
                }, 1000);
            } else {
                console.error("Remote video element not found");
            }
        };

        // Send ICE candidates through unified WebSocket
        peerConnectionA.onicecandidate = (event) => {
            console.log('onicecandidate:', event.candidate ? 'new candidate' : 'gathering complete');
            if (event.candidate) {
                const message = {
                    type: NavTalkMessageType.WEB_RTC_ICE_CANDIDATE,
                    data: { candidate: event.candidate }
                };
                socket.send(JSON.stringify(message));
            }
        };
    }

    function handleWebRTCAnswer(nav_data) {
        console.log("Handling WebRTC answer");
        if (peerConnectionA) {
            const answer = new RTCSessionDescription(nav_data.sdp);
            peerConnectionA.setRemoteDescription(answer)
                .then(() => console.log("Remote description set successfully"))
                .catch(err => console.error('Failed to handle Answer:', err));
        } else {
            console.warn('No peer connection available for answer');
        }
    }

    function handleWebRTCIceCandidate(nav_data) {
        console.log('Handling ICE candidate:', nav_data.candidate);
        if (peerConnectionA) {
            const candidate = new RTCIceCandidate(nav_data.candidate);
            console.log('Created ICE candidate:', candidate);
            peerConnectionA.addIceCandidate(candidate)
                .then(() => console.log('ICE candidate added successfully'))
                .catch(err => console.error('Error adding ICE candidate:', err));
        } else {
            console.warn('No peer connection available for ICE candidate');
        }
    }



    function showErrorTip(message) {
        const realtimeButton = document.getElementById('btnRealtime');
        if (realtimeButton.classList.contains('active')) {
            realtimeButton.click();
        }
        const errorTip = document.getElementById("errorTipRealtime");
        errorTip.textContent = message;
        errorTip.style.display = "block";
        errorTip.style.opacity = "1";
        errorTip.style.visibility = "visible";
        // Automatically hide error message after 3 seconds
        setTimeout(() => {
            errorTip.style.opacity = "0";
            errorTip.style.visibility = "hidden";
            setTimeout(() => {
                errorTip.style.display = "none";
            }, 500);
        }, 3000);
    }

    async function sendSessionUpdate() {
        // v2: Session configuration (instructions, voice, etc.) is passed via URL parameters
        // This function only sends conversation history
        const history = localStorage.getItem("realtimeChatHistory");
        const conversationHistory = history ? JSON.parse(history) : [];

        // Send each user message in history
        conversationHistory.forEach((msg) => {
            if (msg.role === "user") {
                const messageConfig = {
                    type: "conversation.item.create",
                    item: {
                        type: "message",
                        role: msg.role,
                        content: [
                            {
                                type: "input_text",
                                text: msg.content
                            }
                        ]
                    }
                };

                try {
                    console.log("Sending user message from history:", msg.content);
                    socket.send(JSON.stringify(messageConfig));
                } catch (e) {
                    console.error("Error sending message:", e);
                }
            }
        });
    }

    async function handleReceivedMessage(data) {
        // v2: Extract data from data.data field
        const nav_data = data.data || {};

        let activeCharacterLogId = await getFromChromeStorage("digitalHumanLogId");
        let realtimeChatHistory = await getFromChromeStorage("realtimeChatHistory");
        realtimeChatHistory = JSON.parse(realtimeChatHistory);

        switch (data.type) {
            // ======================== Connection Events ====================
            case NavTalkMessageType.CONNECTED_SUCCESS:
                console.log("WebSocket connection successful");
                const sessionId = nav_data.sessionId;
                const iceServers = nav_data.iceServers;
                if (sessionId && sessionId !== proxySessionId) {
                    console.log("Received session ID:", sessionId);
                    proxySessionId = sessionId;
                    targetSessionId = `target-${proxySessionId}`;
                    // Store ICE servers configuration for WebRTC
                    if (iceServers && Array.isArray(iceServers) && iceServers.length > 0) {
                        configuration = { iceServers: iceServers };
                        console.log("ICE servers configuration received:", configuration);
                    }
                }
                break;

            case NavTalkMessageType.CONNECTED_FAIL:
                console.error("WebSocket connection failed:", data.message);
                showErrorTip(data.message || "Connection failed");
                break;

            case NavTalkMessageType.CONNECTED_CLOSE:
                console.log("WebSocket connection closed:", data.message);
                break;

            case NavTalkMessageType.INSUFFICIENT_BALANCE:
                console.error("Insufficient balance");
                showErrorTip("Insufficient balance, service has stopped, please recharge!");
                break;

            case NavTalkMessageType.GPU_FULL:
                console.error("GPU resources full");
                showErrorTip("The gpu resources are full. Please try again later!");
                break;

            case NavTalkMessageType.CONNECTION_LIMIT_EXCEEDED:
                console.error("Connection limit exceeded");
                showErrorTip("Maximum concurrent connections exceeded. Please try again later.");
                break;

            case NavTalkMessageType.BACKEND_ERROR:
                console.error("Backend error:", data.message);
                showErrorTip("Backend error occurred. Please try again.");
                break;

            // ======================== Session Events ====================
            case NavTalkMessageType.REALTIME_SESSION_CREATED:
                console.log("Session created, sending conversation history.");
                await sendSessionUpdate();
                break;

            case NavTalkMessageType.REALTIME_SESSION_UPDATED:
                console.log("Session updated. Ready to receive audio.");
                startRecording();
                break;

            // ======================== User Speech Detection Events ====================
            case NavTalkMessageType.REALTIME_SPEECH_STARTED:
                console.log("Speech started detected by server.");
                stopCurrentAudioPlayback();
                audioQueue = [];
                isPlaying = false;
                playVideo = false;
                pendingUserMessageSpan = createTypingPlaceholder();
                break;

            case NavTalkMessageType.REALTIME_SPEECH_STOPPED:
                console.log("Speech stopped detected by server.");
                break;

            // ======================== User Transcription Events ====================
            case NavTalkMessageType.REALTIME_CONVERSATION_ITEM_COMPLETED:
                const userTranscript = nav_data.transcript || nav_data.content;
                console.log("Received transcription: " + userTranscript);
                if (userTranscript && userTranscript.trim()) {
                    // If placeholder exists, update its content; otherwise create new message
                    if (pendingUserMessageSpan) {
                        // Clear animation elements and replace with actual text
                        pendingUserMessageSpan.innerHTML = '';
                        pendingUserMessageSpan.classList.remove('typing-indicator');
                        pendingUserMessageSpan.textContent = userTranscript;
                        pendingUserMessageSpan = null; // Clear reference
                    } else {
                        // No placeholder case (e.g., via text input)
                        const userMessageContainer = document.createElement('div');
                        userMessageContainer.classList.add('character-chat-item', 'item-user');

                        const userMessage = document.createElement('span');
                        userMessage.textContent = userTranscript;
                        userMessageContainer.appendChild(userMessage);

                        const chatContent = document.querySelector('.ah-character-chat');
                        chatContent.appendChild(userMessageContainer);
                        chatContent.scrollTop = chatContent.scrollHeight;
                    }
                    await appendRealtimeChatHistory("user", userTranscript);
                } else if (pendingUserMessageSpan) {
                    // If the transcription is empty but contains placeholders, remove the placeholders.
                    pendingUserMessageSpan.parentElement.remove();
                    pendingUserMessageSpan = null;
                }
                break;

            // ======================== AI Response Events ====================
            case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA:
                playVideo = true;
                const transcript = nav_data.delta || nav_data.content;
                const responseId = nav_data.response_id || nav_data.id;

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
                    chatContainer.appendChild(aiMessageContainer);

                    responseSpans.set(responseId, aiMessageSpan);
                }

                const fullContent = markdownBuffer.get(responseId);
                const parsedContent = fullContent;
                aiMessageSpan.innerHTML = parsedContent;

                const chatContainer = document.querySelector('.ah-character-chat');
                chatContainer.scrollTop = chatContainer.scrollHeight;
                break;

            case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_DELTA:
                if (nav_data.delta) {
                    // Handle audio delta
                }
                break;

            case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE:
                const assistantTranscript = nav_data.transcript || nav_data.content;
                console.log("Received transcription: " + assistantTranscript);
                await appendRealtimeChatHistory("assistant", assistantTranscript);
                break;

            case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_DONE:
                console.log("Audio response complete.");
                isPlaying = false;
                playVideo = false;
                break;

            // ======================== WebRTC Signaling Events ====================
            case NavTalkMessageType.WEB_RTC_OFFER:
                console.log("Received WebRTC offer");
                await handleWebRTCOffer(nav_data);
                break;

            case NavTalkMessageType.WEB_RTC_ANSWER:
                console.log("Received WebRTC answer");
                handleWebRTCAnswer(nav_data);
                break;

            case NavTalkMessageType.WEB_RTC_ICE_CANDIDATE:
                console.log("Received WebRTC ICE candidate");
                handleWebRTCIceCandidate(nav_data);
                break;

            default:
                console.warn("Unhandled event type: " + data.type);
        }
    }

    function stopCurrentAudioPlayback() {
        if (currentAudioSource) {
            currentAudioSource.stop();
            currentAudioSource = null;
            console.log("Current audio playback stopped.");
        }
    }

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                audioStream = stream;
                const source = audioContext.createMediaStreamSource(stream);
                // Increase buffer size to 8192
                audioProcessor = audioContext.createScriptProcessor(8192, 1, 1);

                audioProcessor.onaudioprocess = (event) => {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        const inputBuffer = event.inputBuffer.getChannelData(0);
                        const pcmData = floatTo16BitPCM(inputBuffer);
                        const base64PCM = base64EncodeAudio(new Uint8Array(pcmData));

                        // Increase audio chunk size to 4096
                        const chunkSize = 4096;
                        for (let i = 0; i < base64PCM.length; i += chunkSize) {
                            const chunk = base64PCM.slice(i, i + chunkSize);
                            // v2: Use NavTalkMessageType constant and wrap audio in data field
                            socket.send(JSON.stringify({
                                type: NavTalkMessageType.REALTIME_INPUT_AUDIO_BUFFER_APPEND,
                                data: { audio: chunk }
                            }));
                        }
                    }
                };

                source.connect(audioProcessor);
                audioProcessor.connect(audioContext.destination);
                console.log("Recording started");
            })
            .catch(error => {
                console.error("Unable to access microphone: ", error);
            });
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
        const chunkSize = 0x8000; // Keep 32KB chunk size
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
        chatContent.appendChild(userMessageContainer);
        chatContent.scrollTop = chatContent.scrollHeight;

        return userMessage;
    }

    function stopRecording() {
        if (audioProcessor) {
            audioProcessor.disconnect();
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }
        if (socket) {
            socket.close();
        }
    }


    // Play the next audio segment and synchronize lip movement
    function playNextAudio() {
        if (audioQueue.length > 0) {
            isPlaying = true;
            const audioData = audioQueue.shift(); // Get one audio segment from the queue
            playPCM(audioData, playNextAudio); // Play the audio
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
            source.onended = callback; // Call callback after audio playback ends
            source.start(0);
            currentAudioSource = source;
            console.log("Audio played successfully.");
        }, function (error) {
            console.error("Error decoding audio data", error);
            callback(); // Continue to play the next audio if decoding fails
        });
    }

    function createWavBuffer(pcmBuffer, sampleRate) {
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);

        // RIFF header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + pcmBuffer.byteLength, true); // Chunk size
        writeString(view, 8, 'WAVE');

        // fmt subchunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1 size (16 for PCM)
        view.setUint16(20, 1, true);  // Audio format (1 for PCM)
        view.setUint16(22, 1, true);  // Number of channels (1 for mono)
        view.setUint32(24, sampleRate, true); // Sample rate
        view.setUint32(28, sampleRate * 2, true); // Byte rate (Sample Rate * Block Align)
        view.setUint16(32, 2, true);  // Block align (Channels * Bits per sample / 8)
        view.setUint16(34, 16, true); // Bits per sample

        // data subchunk
        writeString(view, 36, 'data');
        view.setUint32(40, pcmBuffer.byteLength, true); // Subchunk2 size

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

async function initDigtalHumanHistoryData(){

  let realtimeChatHistory = [];

  const historyStr = localStorage.getItem("realtimeChatHistory");
  realtimeChatHistory = historyStr ? JSON.parse(historyStr) : [];

  // Render the historical conversation when the page loads
  if (realtimeChatHistory && realtimeChatHistory.length > 0) {
    realtimeChatHistory.forEach(item => {
      appendContentToList(item.role, item.content);
    })
    document.querySelector('.scroller').scrollTop = document.querySelector('.scroller').scrollHeight;
  }
}

function appendContentToList(role, context) {
  const container = document.createElement('div');
  container.classList.add('item', role === 'user' ? 'item-right' : 'item-left');

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('item-content');
  const contentSpan = document.createElement('span');
  contentSpan.textContent = context; // Display transcribed user input text
  contentDiv.appendChild(contentSpan);
  container.appendChild(contentDiv);

  // Add the user message to the chat box
  const chatContent = document.querySelector('.scroller');
  chatContent.appendChild(container);
  return contentSpan;
}


initDigtalHumanHistoryData();

initDigtalHumanRealtimeButton();


