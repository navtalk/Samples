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
            this.currentLoadingOverlay = null;
            this.callStartAudio = '';
            this.callEndAudio = '';
            this.defaultCallStartAudio = navtalkConfig.pluginUrl + 'public/audio/call-start.mp3';
            this.defaultCallEndAudio = navtalkConfig.pluginUrl + 'public/audio/call-end.mp3';
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
                    tools: $(this).data('config-tools') || '',
                    callStartAudio: $(this).data('call-start-audio') || '',
                    callEndAudio: $(this).data('call-end-audio') || ''
                };
                
                console.log('NavTalk Modal: Raw config data:', {
                    voice: $(this).data('config-voice'),
                    prompt: $(this).data('config-prompt'),
                    tools: $(this).data('config-tools')
                });
                console.log('NavTalk Modal: Modal config object:', modalConfig);
                
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
                
                // Get session configuration from data attributes
                const voice = $button.data('config-voice') || '';
                const prompt = $button.data('config-prompt') || '';
                const tools = $button.data('config-tools') || '';
                
                console.log('NavTalk Inline: Raw config data:', {
                    voice: $button.data('config-voice'),
                    prompt: $button.data('config-prompt'),
                    tools: $button.data('config-tools')
                });
                
                // Store session configuration for inline mode
                self.sessionConfig = {
                    voice: voice,
                    prompt: prompt,
                    tools: tools ? self.parseTools(tools) : []
                };
                
                console.log('NavTalk Inline: Parsed session config:', self.sessionConfig);
                
                // Get audio configuration
                const callStartAudio = $button.data('call-start-audio') || '';
                const callEndAudio = $button.data('call-end-audio') || '';
                
                // Store audio configuration for inline mode
                self.callStartAudio = callStartAudio;
                self.callEndAudio = callEndAudio;
                
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
            
            console.log('NavTalk: openChatModal called with modalConfig:', modalConfig);
            
            // Read session configuration
            this.sessionConfig = {
                voice: modalConfig.voice || '',
                prompt: modalConfig.prompt || '',
                tools: (modalConfig.tools && modalConfig.tools !== 'undefined') ? this.parseTools(modalConfig.tools) : []
            };
            
            console.log('NavTalk: Session config initialized:', this.sessionConfig);
            console.log('NavTalk: hasSessionConfig():', this.hasSessionConfig());
            
            // Store audio configuration
            this.callStartAudio = modalConfig.callStartAudio || '';
            this.callEndAudio = modalConfig.callEndAudio || '';
            
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
            
            // Play call start audio
            this.playCallAudio('start');
            
            // Update button state
            $button.addClass('active');
            
            // Hide preview video (if exists)
            const $previewVideo = $container.find('.navtalk-avatar-preview-video');
            if ($previewVideo.length) {
                $previewVideo.hide().addClass('hidden');
            }
            
            // Hide static image
            $staticImg.hide().addClass('hidden');
            
            // Show loading overlay for inline mode
            const $loadingOverlay = $container.find('.navtalk-inline-loading-overlay');
            console.log('NavTalk: Showing inline loading overlay, found:', $loadingOverlay.length, 'for avatar:', avatarName);
            if ($loadingOverlay.length) {
                $loadingOverlay.show().css('display', 'flex');
                console.log('NavTalk: Inline loading overlay displayed');
                
                // Set timeout to auto-hide loading overlay after 10 seconds
                setTimeout(() => {
                    if ($loadingOverlay.is(':visible')) {
                        console.warn('NavTalk: Loading overlay timeout - auto hiding after 10s');
                        $loadingOverlay.fadeOut(300);
                    }
                }, 10000);
            } else {
                console.warn('NavTalk: Inline loading overlay not found in container');
            }
            this.currentLoadingOverlay = $loadingOverlay;
            this.currentInlineContainer = $container;
            
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
            
            // Play call end audio
            this.playCallAudio('end');
            
            // Update button state
            $button.removeClass('active');
            
            // Hide loading overlay if still visible
            const $loadingOverlay = $container.find('.navtalk-inline-loading-overlay');
            if ($loadingOverlay.length) {
                console.log('NavTalk: Hiding inline loading overlay on stop');
                $loadingOverlay.hide();
            }
            this.currentLoadingOverlay = null;
            
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
            
            // Play call start audio
            this.playCallAudio('start');
            
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
            
            // Play call end audio
            this.playCallAudio('end');
            
            const button = $('#btnRealtime');
            button.removeClass('active');
            
            // Hide loading overlay if still visible
            if (this.currentLoadingOverlay && this.currentLoadingOverlay.length) {
                console.log('NavTalk: Hiding loading overlay on stop');
                this.currentLoadingOverlay.hide();
            }
            this.currentLoadingOverlay = null;
            
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
            
            // Show loading overlay for modal mode
            const $loadingOverlay = $('#navtalk-modal-loading-overlay');
            console.log('NavTalk: Showing modal loading overlay, found:', $loadingOverlay.length);
            if ($loadingOverlay.length) {
                $loadingOverlay.show().css('display', 'flex');
                console.log('NavTalk: Modal loading overlay displayed');
                
                // Set timeout to auto-hide loading overlay after 10 seconds
                setTimeout(() => {
                    if ($loadingOverlay.is(':visible')) {
                        console.warn('NavTalk: Loading overlay timeout - auto hiding after 10s');
                        $loadingOverlay.fadeOut(300);
                    }
                }, 10000);
            }
            this.currentLoadingOverlay = $loadingOverlay;
            
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
                    console.log("NavTalk: Current sessionConfig:", this.sessionConfig);

                    // If there is configuration, send it first
                    const hasConfig = this.hasSessionConfig();
                    console.log("NavTalk: Has session config:", hasConfig);

                    if (hasConfig) {
                        console.log("NavTalk: Sending session config...");
                        this.sendSessionConfig();
                    } else {
                        console.log("NavTalk: No session config to send");
                    }

                    // Then send session update
                    console.log("NavTalk: Sending session update");
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
                    
                case NavTalkMessageType.REALTIME_RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE:
                    this.handleFunctionCall(navData);
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
                    
                    // Hide loading overlay when video actually starts playing
                    const hideLoadingOnPlay = () => {
                        console.log('NavTalk: Video playing, hiding loading overlay');
                        if (this.currentLoadingOverlay && this.currentLoadingOverlay.length) {
                            this.currentLoadingOverlay.fadeOut(300, function() {
                                console.log('NavTalk: Loading overlay hidden after video play');
                            });
                        }
                        remoteVideo.removeEventListener('playing', hideLoadingOnPlay);
                    };
                    
                    remoteVideo.addEventListener('playing', hideLoadingOnPlay);
                    
                    setTimeout(() => {
                        remoteVideo.play().catch(err => {
                            console.error('NavTalk: Video play error:', err);
                            // Try to hide loading overlay even if video fails to play
                            if (this.currentLoadingOverlay && this.currentLoadingOverlay.length) {
                                console.log('NavTalk: Hiding loading overlay due to play error');
                                this.currentLoadingOverlay.fadeOut(300);
                            }
                        });
                    }, 1000);
                } else {
                    console.error('NavTalk: No video element found');
                    // Hide loading overlay if no video element
                    if (this.currentLoadingOverlay && this.currentLoadingOverlay.length) {
                        this.currentLoadingOverlay.fadeOut(300);
                    }
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
            // 防御性检查：确保 sessionConfig 存在
            if (!this.sessionConfig) {
                console.warn('NavTalk: sessionConfig is undefined');
                return false;
            }
            
            const hasConfig = this.sessionConfig.voice !== '' || 
                   this.sessionConfig.prompt !== '' || 
                   (this.sessionConfig.tools && this.sessionConfig.tools.length > 0);
            
            console.log('NavTalk: hasSessionConfig check:', {
                voice: this.sessionConfig.voice,
                prompt: this.sessionConfig.prompt,
                toolsLength: this.sessionConfig.tools ? this.sessionConfig.tools.length : 0,
                result: hasConfig
            });
            
            return hasConfig;
        }
        
        parseTools(toolsString) {
            console.log('NavTalk: parseTools called with:', toolsString);
            
            if (!toolsString || toolsString.trim() === '') {
                console.log('NavTalk: parseTools - empty string, returning []');
                return [];
            }
            
            // Convert angle brackets to square brackets (fallback if PHP conversion failed)
            let processedString = toolsString;
            if (toolsString.includes('<') || toolsString.includes('>')) {
                console.log('NavTalk: Found angle brackets, converting to square brackets');
                processedString = toolsString.replace(/</g, '[').replace(/>/g, ']');
                console.log('NavTalk: Converted string:', processedString);
            }
            
            try {
                const parsed = JSON.parse(processedString);
                console.log('NavTalk: parseTools - parsed successfully:', parsed);
                const result = Array.isArray(parsed) ? parsed : [];
                console.log('NavTalk: parseTools - returning:', result);
                return result;
            } catch (e) {
                console.error('NavTalk: Failed to parse tools JSON:', e);
                console.error('NavTalk: Original string was:', toolsString);
                console.error('NavTalk: Processed string was:', processedString);
                return [];
            }
        }
        
        sendSessionConfig() {
            console.log('NavTalk: sendSessionConfig called');
            console.log('NavTalk: Socket state:', this.socket ? this.socket.readyState : 'null');
            console.log('NavTalk: WebSocket.OPEN =', WebSocket.OPEN);
            
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                console.warn('NavTalk: Cannot send config - socket not ready');
                return;
            }
            
            // 防御性检查：确保 sessionConfig 存在
            if (!this.sessionConfig) {
                console.warn('NavTalk: sessionConfig is undefined, cannot send');
                return;
            }
            
            const config = {
                voice: this.sessionConfig.voice || '',
                prompt: this.sessionConfig.prompt || '',
                tools: this.sessionConfig.tools || []
            };
            
            const configJson = JSON.stringify(config);
            
            console.log('NavTalk: Sending session config:', config);
            console.log('NavTalk: Config JSON:', configJson);
            
            const message = { 
                type: NavTalkMessageType.REALTIME_INPUT_CONFIG, 
                data: { content: configJson } 
            };
            
            console.log('NavTalk: Full message to send:', message);
            
            this.socket.send(JSON.stringify(message));
            
            console.log("NavTalk: Session config sent successfully");
        }
        
        playCallAudio(audioType) {
            try {
                let audioUrl = '';
                
                if (audioType === 'start') {
                    audioUrl = this.callStartAudio || this.defaultCallStartAudio;
                } else if (audioType === 'end') {
                    audioUrl = this.callEndAudio || this.defaultCallEndAudio;
                }
                
                if (audioUrl) {
                    console.log('NavTalk: Playing', audioType, 'audio:', audioUrl);
                    const audio = new Audio(audioUrl);
                    audio.volume = 0.5;
                    audio.play().catch(err => {
                        console.warn('NavTalk: Failed to play', audioType, 'audio:', err);
                    });
                }
            } catch (err) {
                console.error('NavTalk: Error playing call audio:', err);
            }
        }
        
        handleFunctionCall(data) {
            console.log("Received function call event: ", data);
            
            switch (data.function_name) {
                case "end_call":
                case "end_conversation":
                    console.log("Received end conversation function call");
                    this.handleEndConversation();
                    break;
                default:
                    this.tryCallGlobalFunction(data);
                    break;
            }
        }
        
        handleEndConversation() {
            console.log("Handling end conversation...");
            
            if (this.currentInlineContainer && this.currentInlineContainer.length > 0) {
                this.stopInlineCall();
            } else {
                this.stopCall();
            }
        }
        
        tryCallGlobalFunction(data) {
            const functionName = data.function_name;
            
            if (typeof window[functionName] === 'function') {
                console.log(`Calling global function: ${functionName}`);
                try {
                    window[functionName](data);
                } catch (err) {
                    console.error(`Error calling global function ${functionName}:`, err);
                }
            } else {
                console.warn(`Global function ${functionName} not found on window object`);
            }
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
