// ❗You need to manually modify the following variables.
// ✒️ api key
const LICENSE = "sk_navtalk_your_key"

// ✒️ // ✒️ character name. Currently supported characters include: navtalk.Alex, navtalk.Ethan, navtalk.Leo, navtalk.Lily, navtalk.Emma, navtalk.Sophia, navtalk.Mia, navtalk.Chloe, navtalk.Zoe, navtalk.Ava
// You can check the specific images on the official website: https://console.navtalk.ai/login#/playground/realtime_digital_human.
const CHARACTER_NAME = "navtalk.Alex"

// ✒️ voice. Currently supported voices include: alloy, ash, ballad, cedar, coral, echo, marin, sage, shimmer, verse
// You can check the specific voices on the official website: https://console.navtalk.ai/login#/playground/realtime_digital_human.
const VOICE = "cedar"

// ✒️ prompt. You want him to act in the conversation, or the knowledge he needs to have, and things to watch out for.
const PROMPT = "You are a helpful assistant."

// web server url
let baseUrl = "transfer.navtalk.ai"

// Global variable for connection state
let peerConnectionA = null;
let resultSocket = null;
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
    // Use a Map to store the span element corresponding to each response_id
    let responseSpans = new Map();

    // Define a buffer object to accumulate incomplete Markdown content
    let markdownBuffer = new Map();

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

            if (pc) {
                console.log('Closing PeerConnection');
                pc.removeEventListener('icecandidate', on_icecandidate);
                pc.removeEventListener('connectionstatechange', on_connectionstatechange);
                pc.removeEventListener('iceconnectionstatechange', iceconnectionstatechange);
                pc.removeEventListener('signalingstatechange', signalingstatechange);

                if (pc.connectionState !== 'closed') {
                    await pc.close();
                    console.log('PeerConnection closed');
                }
                pc = null;
            }

            if (peerConnectionA) {
                console.log('Closing peerConnectionA');
                peerConnectionA.onicecandidate = null;
                peerConnectionA.close();
                peerConnectionA = null;  // Ensure it's completely reset
            }

            currentTracks.forEach(track => {
                if (track.stop) track.stop();
                if (track.dispatchEvent) {
                    track.dispatchEvent(new Event('ended'));
                }
            });
            currentTracks = [];
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
        websocketUrl = "wss://"+baseUrl+"/api/realtime-api";
        // Retrieve license information from Chrome storage
        const websocketUrlWithParams = `${websocketUrl}?license=${encodeURIComponent(LICENSE)}&characterName=${CHARACTER_NAME}`;

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


        // WebSocket for receiving video results
        let remoteVideoA = document.getElementById('character-avatar-video');

        let targetSessionId = LICENSE;
        console.log("Start connecting " + (new Date()).toLocaleTimeString())
        resultSocket = new WebSocket('wss://'+baseUrl+'/api/webrtc?userId=' + targetSessionId);  // Replace with your WebSocket server address

        let localStream;

        resultSocket.onopen = () => {
            console.log("WebSocketResult connection established.");
            console.log("Connection successful " + (new Date()).toLocaleTimeString())
            const message = { type: 'create', targetSessionId: targetSessionId };
            resultSocket.send(JSON.stringify(message));
        };

        resultSocket.onmessage = (event) => {
            console.log("Received message:", event.data);
            const message = JSON.parse(event.data);
            console.log("Received message:", message.type);
            console.log("Received message:", message);
            if (message.type === 'offer') {
                handleOffer(message);
            } else if (message.type === 'answer') {
                handleAnswer(message);
            } else if (message.type === 'iceCandidate') {
                handleIceCandidate(message);
            }
        };

        resultSocket.onerror = (error) => {
            // Clean up old connection
            cleanupResources();
            console.error("WebSocket error:", error);
        };

        resultSocket.onclose = (event) => {
            console.log("WebSocket connection closed:");
            console.log("  code:", event);
            console.log("  code:", event.code);
            console.log("  reason:", event.reason);
            console.log("  wasClean:", event.wasClean);
            console.log("  readyState:", resultSocket.readyState);
        };

        function handleOffer(message) {
            console.log("Handling offer for targetSessionId:", message.targetSessionId);
            const targetId = message.targetSessionId;
            const offer = new RTCSessionDescription(message.sdp);
            console.log("Created offer SDP:", offer);
            peerConnectionA = new RTCPeerConnection(configuration);
            console.log("Created peer connection:", peerConnectionA);

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

            // Add ICE state monitoring
            peerConnectionA.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', peerConnectionA.iceConnectionState);
                if (peerConnectionA.iceConnectionState === 'connected') {
                    console.log('WebRTC connection fully established!');
                } else if (peerConnectionA.iceConnectionState === 'failed') {
                    console.log('ICE connection failed, attempting reconnection...');
                    // You can add reconnection logic here
                }
            };

            peerConnectionA.ontrack = (event) => {
                console.log("Received remote track:", event);
                console.log("Streams:", event.streams);
                if (remoteVideoA) {
                    remoteVideoA.srcObject = event.streams[0]; // Show remote video
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

            // Logs when handling ICE Candidate
            peerConnectionA.onicecandidate = (event) => {
                console.log('onicecandidate:', event.candidate ? 'new candidate' : 'gathering complete');
                if (event.candidate) {
                    const message = {
                        type: 'iceCandidate',
                        targetSessionId: targetId,
                        candidate: event.candidate
                    };
                    resultSocket.send(JSON.stringify(message));
                }
            };
        }

        // Function to handle Answer messages
        function handleAnswer(message) {
            const targetSessionId = message.targetSessionId;
            const map_item = events_maps.get(targetSessionId);
            if (!map_item) return;

            pc = map_item.peerConnection;
            const answer = new RTCSessionDescription(message.sdp);

            if (pc.signalingState === 'stable') {
                console.warn('Triggering renegotiation: State is stable');
                pc.restartIce(); // Force refresh ICE candidates
                recreateOffer(pc, targetSessionId, map_item.socket); // Call renegotiation function
            } else if (pc.signalingState === 'have-local-offer') {
                pc.setRemoteDescription(answer)
                    .catch(err => console.error('Failed to handle Answer:', err));
            }
        }

        // Function to recreate Offer
        async function recreateOffer(pc, targetSessionId, socket) {
            try {
                // Create a new Offer
                const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                await pc.setLocalDescription(offer);

                // Send the new Offer to the peer
                socket.send(JSON.stringify({
                    type: 'offer',
                    targetSessionId: targetSessionId,
                    sdp: pc.localDescription
                }));
            } catch (err) {
                console.error('Failed to recreate Offer:', err);
            }
        }

        function handleIceCandidate(message) {
            console.log('Handling ICE candidate:', message.candidate);
            const candidate = new RTCIceCandidate(message.candidate);
            console.log('Created ICE candidate:', candidate);
            peerConnectionA.addIceCandidate(candidate)
                .then(() => console.log('ICE candidate added successfully'))
                .catch(err => console.error('Error adding ICE candidate:', err));
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
        const history = localStorage.getItem("realtimeChatHistory");
        const conversationHistory = history ? JSON.parse(history) : [];

        let userLanguage = await getFromChromeStorage("userLanguage");

        let activeCharacterLogId = await getFromChromeStorage("digitalHumanLogId");
        let realtimeChatHistory = await getFromChromeStorage("realtimeChatHistory");
        realtimeChatHistory = JSON.parse(realtimeChatHistory);

        // Session configuration
        let sessionConfig = {
            type: "session.update",
            session: {
                instructions: PROMPT,
                turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                },
                voice: VOICE,
                temperature: 1,
                max_response_output_tokens: 4096,
                modalities: ["text", "audio"],
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1"
                },
                tools: [
                    {
                        type: "function",
                        name: "function_call_judge",
                        description: "Are there any function calls or tasks beyond your capability...",
                        parameters: {
                            type: "object",
                            properties: {
                                userInput: {
                                    type: "string",
                                    description: "the user input"
                                }
                            },
                            required: ["userInput"]
                        }
                    }
                ]
            }
        };

        // Send session update
        try {
            socket.send(JSON.stringify(sessionConfig));
        } catch (e) {
            console.error("Error sending session update:", e);
        }

        // Send each item in history
        conversationHistory.forEach((msg) => {
            const messageConfig = {
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: msg.role,
                    content: [
                        {
                            type: msg.role === "user" ? "input_text" : "text",
                            text: msg.content
                        }
                    ]
                }
            };

            try {
                if (msg.role === "user") {
                    console.log("Sending message:", JSON.stringify(messageConfig));
                    socket.send(JSON.stringify(messageConfig));
                }
            } catch (e) {
                console.error("Error sending message:", e);
            }
        });
    }

    async function handleReceivedMessage(data) {
        let activeCharacterLogId = await getFromChromeStorage("digitalHumanLogId");
        let realtimeChatHistory = await getFromChromeStorage("realtimeChatHistory");
        realtimeChatHistory = JSON.parse(realtimeChatHistory);

        switch (data.type) {
            // Session created, send configuration
            case "session.created":
                console.log("Session created, sending session update.");
                await sendSessionUpdate();
                break;

            // Session established after configuration
            case "session.updated":
                console.log("Session updated. Ready to receive audio.");
                startRecording();
                break;

            // User starts speaking
            case "input_audio_buffer.speech_started":
                console.log("Speech started detected by server.");
                stopCurrentAudioPlayback();
                audioQueue = [];
                isPlaying = false;
                playVideo = false;
                break;

            // User stops speaking
            case "input_audio_buffer.speech_stopped":
                console.log("Speech stopped detected by server.");
                break;

            // Full transcription of user speech
            case "conversation.item.input_audio_transcription.completed":
                console.log("Received transcription: " + data.transcript);
                const userMessageContainer = document.createElement('div');
                userMessageContainer.classList.add('character-chat-item', 'item-user');

                const userMessage = document.createElement('span');
                userMessage.textContent = data.transcript;
                userMessageContainer.appendChild(userMessage);

                const chatContent = document.querySelector('.ah-character-chat');
                chatContent.appendChild(userMessageContainer);
                chatContent.scrollTop = chatContent.scrollHeight;

                await appendRealtimeChatHistory("user", data.transcript);
                break;

            // Response text stream
            case "response.audio_transcript.delta":
                playVideo = true;
                const transcript = data.delta;
                const responseId = data.response_id;

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
                const parsedContent = marked.parse(fullContent);
                aiMessageSpan.innerHTML = parsedContent;
                Prism.highlightAllUnder(aiMessageSpan);

                const chatContainer = document.querySelector('.ah-character-chat');
                chatContainer.scrollTop = chatContainer.scrollHeight;
                break;

            // Response audio stream
            case "response.audio.delta":
                if (data.delta) {
                    // Handle audio delta
                }
                break;

            // Full assistant transcription
            case "response.audio_transcript.done":
                console.log("Received transcription: " + data.transcript);
                await appendRealtimeChatHistory("assistant", data.transcript);
                break;

            // Response completed
            case "response.audio.done":
                console.log("Audio response complete.");
                isPlaying = false;
                playVideo = false;
                break;

            // Function call response
            case "response.function_call_arguments.done":
                console.log("data：" + data)
                handleFunctionCall(data);
                break;
            
            case "session.gpu_full":
                this.$message.error("The gpu resources are full. Please try again later!")
                break;

            case "session.insufficient_balance":
                this.$message.error("Insufficient balance, service has stopped, please recharge!")
                break;
      
            default:
                console.warn("Unhandled event type: " + data.type);
        }
    }

    function handleFunctionCall(eventJson) {
        try {
            const arguments = eventJson.arguments;
            const functionCallArgs = JSON.parse(arguments);
            const userInput = functionCallArgs.userInput;
            const callId = eventJson.call_id;

            if (userInput) {
                // Call handleWithMemAgent to process user input
                handleWithMemAgent(userInput)
                    .then(result => {
                        // Print the response from backend
                        console.log("Result from backend: " + result);
                        // Send the result back to the caller
                        sendFunctionCallResult(result, callId);
                    })
                    .catch(error => {
                        console.error("Error calling MemAgent:", error);
                    });
            } else {
                console.log("City not provided for get_weather function.");
            }
        } catch (error) {
            console.error("Error parsing function call arguments: ", error);
        }
    }

    function handleWithMemAgent(userInput) {
        return new Promise(async (resolve, reject) => {
            let chatId = await getFromChromeStorage("chatId");
            // Send request to Java backend API
            fetch('https://'+baseUrl + '/api/realtime_function_call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userInput: userInput,  // Pass user input to backend
                    license: LICENSE,
                    chatId: chatId
                }),
            })
                .then(response => response.text())  // Parse response content
                .then(result => {
                    // Handle the returned result
                    resolve(result);  // Return result to caller
                })
                .catch(error => {
                    console.error("Error during function call:", error);
                    reject(error);  // Handle error
                });
        });
    }

    function sendFunctionCallResult(result, callId) {
        const resultJson = {
            type: "conversation.item.create",
            item: {
                type: "function_call_output",
                output: result,
                call_id: callId
            }
        };

        socket.send(JSON.stringify(resultJson));
        console.log("Sent function call result: ", resultJson);

        // Actively request a response.create to get the result
        const rpJson = {
            type: "response.create"
        };
        socket.send(JSON.stringify(rpJson));
        console.log("Response sent: ", rpJson);
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
                            socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: chunk }));
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


