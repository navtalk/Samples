/**
 * NavTalk Real-time Communication Script
 * Handles WebSocket, WebRTC, and audio processing for digital human conversations
 */

(function($) {
    'use strict';
    
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
        REALTIME_CONVERSATION_ITEM_COMPLETED: "realtime.conversation.item.input_audio_transcription.completed",
        REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA: "realtime.response.audio_transcript.delta",
        REALTIME_RESPONSE_AUDIO_DELTA: "realtime.response.audio.delta",
        REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE: "realtime.response.audio_transcript.done",
        REALTIME_RESPONSE_AUDIO_DONE: "realtime.response.audio.done",
        REALTIME_RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE: "realtime.response.function_call_arguments.done",
        REALTIME_INPUT_AUDIO_BUFFER_APPEND: "realtime.input_audio_buffer.append",
        REALTIME_INPUT_TEXT: "realtime.input_text",
        REALTIME_INPUT_IMAGE: "realtime.input_image",
        REALTIME_INPUT_CONFIG: "realtime.input_config",
        UNKNOWN_TYPE: "unknow"
    });
    
    // NavTalk Realtime Communication Class
    class NavTalkRealtime {
        constructor() {
            this.socket = null;
            this.peerConnection = null;
            this.audioContext = null;
            this.audioProcessor = null;
            this.audioStream = null;
            this.currentAudioSource = null;
            this.audioQueue = [];
            this.isPlaying = false;
            this.responseSpans = new Map();
            this.markdownBuffer = new Map();
            this.pendingUserMessageSpan = null;
            this.configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
            this.currentAvatarName = '';
            this.currentAvatarImg = '';
            this.sessionConfig = {
                voice: '',
                prompt: '',
                tools: []
            };
            
            this.init();
        }
        
        init() {
            // Check if license is configured
            if (!navtalkConfig.hasLicense) {
                console.error('NavTalk: License key not configured');
                return;
            }
            
            // Bind event handlers
            this.bindEvents();
        }
        
        bindEvents() {
            const self = this;
            
            // Handle modal mode (list items, buttons, links)
            $(document).on('click', '.navtalk-start-chat, .navtalk-trigger-button, .navtalk-trigger-link', function(e) {
                e.preventDefault();
                const avatarName = $(this).data('avatar-name');
                const avatarImg = $(this).data('avatar-img');
                const connectImmediately = $(this).data('connect-immediately');
                
                // Get modal configuration from data attributes
                const modalConfig = {
                    width: $(this).data('modal-width'),
                    height: $(this).data('modal-height'),
                    maxWidth: $(this).data('modal-max-width'),
                    maxHeight: $(this).data('modal-max-height'),
                    overlayColor: $(this).data('modal-overlay-color'),
                    callButtonPosition: $(this).data('call-button-position'),
                    voice: $(this).data('config-voice') || '',
                    prompt: $(this).data('config-prompt') || '',
                    tools: $(this).data('config-tools') || ''
                };
                
                if (avatarName && avatarImg) {
                    self.openChatModal(avatarName, avatarImg, connectImmediately === true || connectImmediately === 'true', modalConfig);
                }
            });
            
            // Handle inline mode (single avatar cards)
            $(document).on('click', '.navtalk-inline-call', function(e) {
                e.preventDefault();
                const $button = $(this);
                const avatarName = $button.data('avatar-name');
                const avatarImg = $button.data('avatar-img');
                const containerId = $button.data('container-id');
                
                if (avatarName && containerId) {
                    self.toggleInlineCall($button, avatarName, avatarImg, containerId);
                }
            });
            
            // Handle preview video hover play (list mode)
            $(document).on('mouseenter', '.navtalk-avatar-list .navtalk-avatar-preview-video[data-hover-play="true"]', function() {
                const video = this;
                video.play().catch(err => {
                    console.log('NavTalk: Video play on hover failed:', err);
                });
            });
            
            $(document).on('mouseleave', '.navtalk-avatar-list .navtalk-avatar-preview-video[data-hover-play="true"]', function() {
                const video = this;
                video.pause();
                // Reset to beginning and show poster
                video.currentTime = 0;
                video.load();
            });
            
            // Handle modal close
            $('#navtalk-close-btn').on('click', function() {
                self.closeChatModal();
            });
            
            // Handle call button in modal
            $('#btnRealtime').on('click', function() {
                self.toggleCall();
            });
        }
        
        openChatModal(avatarName, avatarImg, connectImmediately = false, modalConfig = {}) {
            this.currentAvatarName = avatarName;
            this.currentAvatarImg = avatarImg;
            
            // Read session configuration
            this.sessionConfig = {
                voice: modalConfig.voice || '',
                prompt: modalConfig.prompt || '',
                tools: modalConfig.tools ? this.parseTools(modalConfig.tools) : []
            };
            
            // Set modal dimensions using CSS custom properties
            const modalWidth = modalConfig.width || navtalkConfig.modalWidth;
            const modalHeight = modalConfig.height || navtalkConfig.modalHeight;
            const modalMaxWidth = modalConfig.maxWidth || navtalkConfig.modalMaxWidth;
            const modalMaxHeight = modalConfig.maxHeight || navtalkConfig.modalMaxHeight;
            const overlayColor = modalConfig.overlayColor || navtalkConfig.modalOverlayColor;
            const callButtonPosition = modalConfig.callButtonPosition || navtalkConfig.callButtonPosition;
            
            const $modal = $('#navtalk-chat-modal');
            const $modalContent = $('.navtalk-modal-content');
            const $callButton = $('#btnRealtime');
            
            // Set modal styles
            $modal.css('--modal-overlay-color', overlayColor);
            $modalContent.css({
                '--modal-width': modalWidth,
                '--modal-height': modalHeight,
                '--modal-max-width': modalMaxWidth,
                '--modal-max-height': modalMaxHeight
            });
            
            // Set call button position
            $callButton.removeClass('position-center-bottom position-bottom-left position-bottom-right');
            $callButton.addClass('position-' + callButtonPosition);
            
            // Set avatar image
            $('#character-static-image').attr('src', avatarImg);
            $('#character-avatar-video').attr('poster', avatarImg);
            
            // Show modal
            $modal.addClass('active').fadeIn(300);
            
            // Clear previous chat and hide it by default
            $('.ah-character-chat').empty().hide();
            
            console.log('NavTalk: Opening chat for', avatarName);
            
            // If connect immediately is enabled, start the call automatically
            if (connectImmediately) {
                const self = this;
                setTimeout(function() {
                    self.startCall();
                }, 500); // Small delay to let modal animation complete
            }
        }
        
        closeChatModal() {
            // Stop any active call
            if (this.socket || this.peerConnection) {
                this.stopCall();
            }
            
            // Hide modal
            $('#navtalk-chat-modal').removeClass('active').fadeOut(300);
            
            console.log('NavTalk: Chat modal closed');
        }
        
        toggleInlineCall($button, avatarName, avatarImg, containerId) {
            const $container = $('#' + containerId);
            const $staticImg = $container.find('.navtalk-avatar-static-img');
            const $video = $container.find('.navtalk-avatar-inline-video');
            
            if ($button.hasClass('active')) {
                // Stop call
                this.stopInlineCall($button, $container, $staticImg, $video);
            } else {
                // Start call
                this.startInlineCall($button, avatarName, avatarImg, $container, $staticImg, $video);
            }
        }
        
        async startInlineCall($button, avatarName, avatarImg, $container, $staticImg, $video) {
            console.log('NavTalk: Starting inline call for', avatarName);
            
            // Update button state
            $button.addClass('active');
            
            // Hide preview video (if exists)
            const $previewVideo = $container.find('.navtalk-avatar-preview-video');
            if ($previewVideo.length) {
                $previewVideo.hide().addClass('hidden');
            }
            
            // Hide static image
            $staticImg.hide().addClass('hidden');
            
            // Show realtime call video
            $video.show().addClass('active');
            
            // Store current avatar info
            this.currentAvatarName = avatarName;
            this.currentAvatarImg = avatarImg;
            this.currentInlineVideo = $video[0]; // Store video element reference
            
            // Start WebSocket connection
            await this.startWebSocket();
        }
        
        stopInlineCall($button, $container, $staticImg, $video) {
            console.log('NavTalk: Stopping inline call');
            
            // Update button state
            $button.removeClass('active');
            
            // Stop recording
            this.stopRecording();
            
            // Close connections
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
            
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }
            
            // Hide realtime call video
            $video.hide().removeClass('active');
            
            // Clear video source
            $video[0].srcObject = null;
            
            // Clear reference
            this.currentInlineVideo = null;
            
            // Show preview video or static image
            const $previewVideo = $container.find('.navtalk-avatar-preview-video');
            if ($previewVideo.length) {
                // Has preview video - show and resume autoplay if needed
                $previewVideo.show().removeClass('hidden');
                // Single avatar should have autoplay attribute - resume playing
                if ($previewVideo.attr('autoplay') !== undefined) {
                    $previewVideo[0].play().catch(err => {
                        console.log('NavTalk: Resume preview video failed:', err);
                    });
                }
            } else {
                // No preview video - show static image
                $staticImg.show().removeClass('hidden');
            }
            
            console.log('NavTalk: Inline call stopped');
        }
        
        toggleCall() {
            const button = $('#btnRealtime');
            
            if (button.hasClass('active')) {
                this.stopCall();
            } else {
                this.startCall();
            }
        }
        
        async startCall() {
            console.log('NavTalk: Starting call...');
            
            const button = $('#btnRealtime');
            button.addClass('active');
            
            // Hide static image, show video
            $('#character-static-image').hide();
            $('#character-avatar-video').show();
            
            // Don't show chat messages automatically - user can click button to view
            // $('.character-chat-item').show();
            
            // Start WebSocket connection
            await this.startWebSocket();
        }
        
        async stopCall() {
            console.log('NavTalk: Stopping call...');
            
            const button = $('#btnRealtime');
            button.removeClass('active');
            
            // Stop recording
            this.stopRecording();
            
            // Close WebSocket
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
            
            // Clean up resources
            await this.cleanupResources();
            
            // Show static image, hide video
            $('#character-static-image').show();
            $('#character-avatar-video').hide().get(0).pause();
            
            // Clear audio queue
            this.audioQueue = [];
            this.isPlaying = false;
            
            // Hide chat messages (optional)
            // $('.character-chat-item').hide();
        }
        
        async cleanupResources() {
            try {
                console.log('NavTalk: Cleaning up resources...');
                
                if (this.peerConnection) {
                    this.peerConnection.onicecandidate = null;
                    this.peerConnection.close();
                    this.peerConnection = null;
                }
                
                const remoteVideo = document.getElementById('character-avatar-video');
                if (remoteVideo) {
                    remoteVideo.srcObject = null;
                    remoteVideo.removeAttribute('src');
                    remoteVideo.load();
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log('NavTalk: Cleanup complete');
            } catch (err) {
                console.error('NavTalk: Cleanup error:', err);
            }
        }
        
        async startWebSocket() {
            const websocketUrl = `${navtalkConfig.websocketUrl}?license=${navtalkConfig.license}&name=${this.currentAvatarName}`;
            
            console.log('NavTalk: Connecting to WebSocket...', websocketUrl);
            
            this.socket = new WebSocket(websocketUrl);
            this.socket.binaryType = 'arraybuffer';
            
            const self = this;
            
            this.socket.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    try {
                        const data = JSON.parse(event.data);
                        self.handleReceivedMessage(data);
                    } catch (e) {
                        console.error("NavTalk: Failed to parse JSON message:", e);
                    }
                } else {
                    console.warn("NavTalk: Unknown WebSocket message type");
                }
            };
            
            this.socket.onopen = function() {
                console.log("NavTalk: WebSocket connection established");
            };
            
            this.socket.onerror = function(error) {
                console.error("NavTalk: WebSocket error:", error);
                self.cleanupResources();
            };
            
            this.socket.onclose = async function(event) {
                console.log("NavTalk: WebSocket connection closed", event.code, event.reason);
                
                if (event.reason === 'Insufficient points') {
                    self.showError("Insufficient points to complete this action.");
                }
                
                await self.cleanupResources();
                self.stopRecording();
                self.responseSpans = new Map();
            };
        }
        
        handleReceivedMessage(data) {
            const navData = data.data;
            
            switch (data.type) {
                case NavTalkMessageType.CONNECTED_FAIL:
                case NavTalkMessageType.CONNECTED_CLOSE:
                    const errorMessage = data.message || "Unknown error";
                    console.error(`NavTalk: Connection error: ${errorMessage}`);
                    break;
                    
                case NavTalkMessageType.CONNECTED_SUCCESS:
                    if (data.data && data.data.iceServers) {
                        this.configuration.iceServers = data.data.iceServers;
                        console.log("NavTalk: Connection successful, ICE servers received");
                    }
                    break;
                    
                case NavTalkMessageType.REALTIME_SESSION_CREATED:
                    console.log("NavTalk: Session created");
                    
                    // If there is configuration, send it first
                    if (this.hasSessionConfig()) {
                        console.log("NavTalk: Sending session config");
                        this.sendSessionConfig();
                    }
                    
                    // Then send session update
                    this.sendSessionUpdate();
                    break;
                    
                case NavTalkMessageType.REALTIME_SESSION_UPDATED:
                    console.log("NavTalk: Session updated, starting recording");
                    this.startRecording();
                    break;
                    
                case NavTalkMessageType.INSUFFICIENT_BALANCE:
                    console.log("NavTalk: Insufficient balance");
                    this.showError("Insufficient balance");
                    break;
                    
                case NavTalkMessageType.WEB_RTC_OFFER:
                    this.handleOffer(data.data);
                    break;
                    
                case NavTalkMessageType.WEB_RTC_ANSWER:
                    this.handleAnswer(data.data);
                    break;
                    
                case NavTalkMessageType.WEB_RTC_ICE_CANDIDATE:
                    this.handleIceCandidate(data.data);
                    break;
                    
                case NavTalkMessageType.REALTIME_SPEECH_STARTED:
                    console.log("NavTalk: Speech started");
                    this.stopCurrentAudioPlayback();
                    this.audioQueue = [];
                    this.isPlaying = false;
                    this.pendingUserMessageSpan = this.createTypingPlaceholder();
                    break;
                    
                case NavTalkMessageType.REALTIME_SPEECH_STOPPED:
                    console.log("NavTalk: Speech stopped");
                    break;
                    
                case NavTalkMessageType.REALTIME_CONVERSATION_ITEM_COMPLETED:
                    console.log("NavTalk: Received transcription:", navData.content);
                    
                    if (navData && navData.content && navData.content.trim()) {
                        if (this.pendingUserMessageSpan) {
                            this.pendingUserMessageSpan.innerHTML = '';
                            this.pendingUserMessageSpan.classList.remove('typing-indicator');
                            this.pendingUserMessageSpan.textContent = navData.content;
                            this.pendingUserMessageSpan = null;
                        } else {
                            this.addChatMessage('user', navData.content);
                        }
                        this.appendChatHistory("user", navData.content);
                    } else if (this.pendingUserMessageSpan) {
                        $(this.pendingUserMessageSpan).parent().parent().remove();
                        this.pendingUserMessageSpan = null;
                    }
                    break;
                    
                case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA:
                    const transcript = navData.content;
                    const responseId = navData.id;
                    
                    if (!this.markdownBuffer.has(responseId)) {
                        this.markdownBuffer.set(responseId, "");
                    }
                    
                    const existingBuffer = this.markdownBuffer.get(responseId);
                    this.markdownBuffer.set(responseId, existingBuffer + transcript);
                    
                    let aiMessageSpan = this.responseSpans.get(responseId);
                    
                    if (!aiMessageSpan) {
                        const container = $('<div>').addClass('character-chat-item item-character');
                        aiMessageSpan = $('<span>').addClass('markdown-content');
                        container.append(aiMessageSpan);
                        $('.ah-character-chat').append(container);
                        this.responseSpans.set(responseId, aiMessageSpan.get(0));
                    }
                    
                    const fullContent = this.markdownBuffer.get(responseId);
                    $(aiMessageSpan).html(fullContent);
                    
                    this.scrollChatToBottom();
                    break;
                    
                case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE:
                    console.log("NavTalk: Received full transcription:", navData.content);
                    this.appendChatHistory("assistant", navData.content);
                    break;
                    
                case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_DONE:
                    console.log("NavTalk: Audio response complete");
                    this.isPlaying = false;
                    break;
                    
                default:
                    console.warn("NavTalk: Unhandled event type:", data.type);
            }
        }
        
        async handleOffer(message) {
            const offer = new RTCSessionDescription(message.sdp);
            this.peerConnection = new RTCPeerConnection(this.configuration);
            
            const self = this;
            
            this.peerConnection.setRemoteDescription(offer)
                .then(() => this.peerConnection.createAnswer())
                .then(answer => this.peerConnection.setLocalDescription(answer))
                .then(() => {
                    this.sendAnswerMessage(this.peerConnection.localDescription);
                })
                .catch(err => console.error('NavTalk: Error handling offer:', err));
            
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('NavTalk: ICE connection state:', this.peerConnection.iceConnectionState);
            };
            
            this.peerConnection.onnegotiationneeded = async () => {
                console.log("NavTalk: Negotiation needed");
                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);
                this.sendOfferMessage(offer);
            };
            
            this.peerConnection.ontrack = (event) => {
                console.log("NavTalk: Track received");
                
                // Determine which video element to use (inline or modal)
                const remoteVideo = this.currentInlineVideo || document.getElementById('character-avatar-video');
                
                if (remoteVideo) {
                    remoteVideo.srcObject = event.streams[0];
                    setTimeout(() => {
                        remoteVideo.play().catch(err => {
                            console.error('NavTalk: Video play error:', err);
                        });
                    }, 1000);
                } else {
                    console.error('NavTalk: No video element found');
                }
            };
            
            this.peerConnection.onicecandidate = (event) => {
                console.log('NavTalk: ICE candidate:', event.candidate ? 'new candidate' : 'gathering complete');
                if (event.candidate) {
                    this.sendIceMessage(event.candidate);
                }
            };
        }
        
        handleAnswer(message) {
            const answer = new RTCSessionDescription(message.sdp);
            this.peerConnection.setRemoteDescription(answer)
                .catch(err => console.error('NavTalk: Failed to handle Answer:', err));
        }
        
        handleIceCandidate(message) {
            const candidate = new RTCIceCandidate(message.candidate);
            this.peerConnection.addIceCandidate(candidate)
                .catch(err => console.error('NavTalk: Error adding ICE candidate:', err));
        }
        
        sendOfferMessage(sdp) {
            const message = {
                type: NavTalkMessageType.WEB_RTC_OFFER,
                data: { sdp: sdp }
            };
            this.socket.send(JSON.stringify(message));
        }
        
        sendAnswerMessage(sdp) {
            const message = {
                type: NavTalkMessageType.WEB_RTC_ANSWER,
                data: { sdp: sdp }
            };
            this.socket.send(JSON.stringify(message));
        }
        
        sendIceMessage(candidate) {
            const message = {
                type: NavTalkMessageType.WEB_RTC_ICE_CANDIDATE,
                data: { candidate: candidate }
            };
            this.socket.send(JSON.stringify(message));
        }
        
        sendSessionUpdate() {
            const history = localStorage.getItem("navtalk_chat_history");
            const conversationHistory = history ? JSON.parse(history) : [];
            
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
                        console.log("NavTalk: Sending message:", JSON.stringify(messageConfig));
                        this.socket.send(JSON.stringify(messageConfig));
                    }
                } catch (e) {
                    console.error("NavTalk: Error sending message:", e);
                }
            });
        }
        
        startRecording() {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                    this.audioStream = stream;
                    const source = this.audioContext.createMediaStreamSource(stream);
                    this.audioProcessor = this.audioContext.createScriptProcessor(8192, 1, 1);
                    
                    const self = this;
                    
                    this.audioProcessor.onaudioprocess = (event) => {
                        if (self.socket && self.socket.readyState === WebSocket.OPEN) {
                            const inputBuffer = event.inputBuffer.getChannelData(0);
                            const pcmData = self.floatTo16BitPCM(inputBuffer);
                            const base64PCM = self.base64EncodeAudio(new Uint8Array(pcmData));
                            
                            const chunkSize = 4096;
                            for (let i = 0; i < base64PCM.length; i += chunkSize) {
                                const chunk = base64PCM.slice(i, i + chunkSize);
                                self.sendAudioMessage(chunk);
                            }
                        }
                    };
                    
                    source.connect(this.audioProcessor);
                    this.audioProcessor.connect(this.audioContext.destination);
                    console.log("NavTalk: Recording started");
                })
                .catch(error => {
                    console.error("NavTalk: Unable to access microphone:", error);
                    this.showError("Unable to access microphone. Please allow microphone access.");
                });
        }
        
        stopRecording() {
            if (this.audioProcessor) {
                this.audioProcessor.disconnect();
                this.audioProcessor = null;
            }
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
        }
        
        sendAudioMessage(chunk) {
            if (!chunk || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
                return;
            }
            this.socket.send(JSON.stringify({ 
                type: NavTalkMessageType.REALTIME_INPUT_AUDIO_BUFFER_APPEND, 
                data: { audio: chunk } 
            }));
        }
        
        floatTo16BitPCM(float32Array) {
            const buffer = new ArrayBuffer(float32Array.length * 2);
            const view = new DataView(buffer);
            let offset = 0;
            for (let i = 0; i < float32Array.length; i++, offset += 2) {
                let s = Math.max(-1, Math.min(1, float32Array[i]));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            }
            return buffer;
        }
        
        base64EncodeAudio(uint8Array) {
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, i + chunkSize);
                binary += String.fromCharCode.apply(null, chunk);
            }
            return btoa(binary);
        }
        
        stopCurrentAudioPlayback() {
            if (this.currentAudioSource) {
                this.currentAudioSource.stop();
                this.currentAudioSource = null;
                console.log("NavTalk: Current audio playback stopped");
            }
        }
        
        addChatMessage(role, content) {
            const container = $('<div>').addClass('character-chat-item');
            container.addClass(role === 'user' ? 'item-user' : 'item-character');
            
            const message = $('<span>').text(content);
            container.append(message);
            
            $('.ah-character-chat').append(container);
            this.scrollChatToBottom();
        }
        
        createTypingPlaceholder() {
            const container = $('<div>').addClass('character-chat-item item-user');
            const message = $('<span>').addClass('typing-indicator');
            
            for (let i = 0; i < 3; i++) {
                const dot = $('<span>').addClass('typing-dot');
                message.append(dot);
            }
            
            container.append(message);
            $('.ah-character-chat').append(container);
            this.scrollChatToBottom();
            
            return message.get(0);
        }
        
        scrollChatToBottom() {
            const chatContainer = $('.ah-character-chat');
            chatContainer.scrollTop(chatContainer.prop('scrollHeight'));
        }
        
        appendChatHistory(role, content) {
            let history = localStorage.getItem("navtalk_chat_history");
            let chatHistory = history ? JSON.parse(history) : [];
            
            chatHistory.push({ role, content });
            
            localStorage.setItem("navtalk_chat_history", JSON.stringify(chatHistory));
        }
        
        showError(message) {
            alert('NavTalk Error: ' + message);
        }
        
        hasSessionConfig() {
            return this.sessionConfig.voice !== '' || 
                   this.sessionConfig.prompt !== '' || 
                   this.sessionConfig.tools.length > 0;
        }
        
        parseTools(toolsString) {
            if (!toolsString || toolsString.trim() === '') {
                return [];
            }
            
            try {
                const parsed = JSON.parse(toolsString);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error('NavTalk: Failed to parse tools JSON:', e);
                return [];
            }
        }
        
        sendSessionConfig() {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                return;
            }
            
            const config = {
                voice: this.sessionConfig.voice,
                prompt: this.sessionConfig.prompt,
                tools: this.sessionConfig.tools
            };
            
            const configJson = JSON.stringify(config);
            
            this.socket.send(JSON.stringify({ 
                type: NavTalkMessageType.REALTIME_INPUT_CONFIG, 
                data: { content: configJson } 
            }));
            
            console.log("NavTalk: Session config sent:", config);
        }
    }
    
    // Initialize when document is ready
    $(document).ready(function() {
        // Only initialize if we have the configuration
        if (typeof navtalkConfig !== 'undefined') {
            window.navtalkRealtime = new NavTalkRealtime();
        } else {
            console.error('NavTalk: Configuration not loaded');
        }
    });
    
})(jQuery);
