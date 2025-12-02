// NavTalk WebSocket and WebRTC connection service
// Based on new.vue logic

type NavTalkStatus = 'notConnected' | 'connecting' | 'connected';

interface NavTalkConfig {
  license: string;
  characterName: string;
  baseUrl: string;
  voiceType?: string;
  instructions?: string;
}

interface NavTalkMessage {
  type: string;
  [key: string]: any;
}

class NavTalkService {
  private config: NavTalkConfig;
  private realtimeSocket: WebSocket | null = null;
  private webrtcSocket: WebSocket | null = null;
  private proxySessionId: string | null = null;
  private targetSessionId: string | null = null;
  private status: NavTalkStatus = 'notConnected';
  private statusListeners: Set<(status: NavTalkStatus) => void> = new Set();
  private messageListeners: Set<(message: NavTalkMessage) => void> = new Set();

  constructor(config: NavTalkConfig) {
    this.config = config;
  }

  // Status management
  onStatusChange(listener: (status: NavTalkStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onMessage(listener: (message: NavTalkMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  getStatus(): NavTalkStatus {
    return this.status;
  }

  private setStatus(status: NavTalkStatus) {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.status !== 'notConnected') {
      return;
    }

    this.proxySessionId = null;
    if (this.webrtcSocket) {
      this.webrtcSocket.close();
      this.webrtcSocket = null;
    }

    this.setStatus('connecting');
    await this.openRealtimeSocket();
  }

  async disconnect(): Promise<void> {
    if (this.realtimeSocket) {
      this.realtimeSocket.close();
      this.realtimeSocket = null;
    }
    if (this.webrtcSocket) {
      this.webrtcSocket.close();
      this.webrtcSocket = null;
    }
    this.proxySessionId = null;
    this.targetSessionId = null;
    this.setStatus('notConnected');
  }

  // Main WebSocket connection
  private async openRealtimeSocket(): Promise<void> {
    const encodedLicense = encodeURIComponent(this.config.license);
    const encodedCharacterName = encodeURIComponent(this.config.characterName);
    const url = `wss://${this.config.baseUrl}/api/realtime-api?license=${encodedLicense}&characterName=${encodedCharacterName}`;

    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(url);
        
        socket.onopen = () => {
          console.log('Realtime WebSocket connected');
          this.realtimeSocket = socket;
          resolve();
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as NavTalkMessage;
            this.handleRealtimeMessage(data);
          } catch (error) {
            console.error('Failed to parse realtime message:', error);
          }
        };

        socket.onerror = (error) => {
          console.error('Realtime WebSocket error:', error);
          this.setStatus('notConnected');
          reject(error);
        };

        socket.onclose = () => {
          console.log('Realtime WebSocket closed');
          if (this.status !== 'notConnected') {
            this.setStatus('notConnected');
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // WebRTC signaling socket setup
  private setupSignalingSocketIfReady(): void {
    if (!this.proxySessionId || this.webrtcSocket) {
      return;
    }

    // Close existing socket if any
    if (this.webrtcSocket) {
      this.webrtcSocket.close();
      this.webrtcSocket = null;
    }

    this.targetSessionId = `target-${this.proxySessionId}`;
    const encodedSessionId = encodeURIComponent(this.proxySessionId);
    const url = `wss://${this.config.baseUrl}/api/webrtc?userId=${encodedSessionId}`;

    console.log('Starting WebRTC signaling connection for session:', this.proxySessionId);

    try {
      const socket = new WebSocket(url);
      
      socket.onopen = () => {
        console.log('WebRTC signaling WebSocket connected');
        this.webrtcSocket = socket;
        
        // Send create message
        const createMessage = {
          type: 'create',
          targetSessionId: this.targetSessionId,
        };
        socket.send(JSON.stringify(createMessage));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NavTalkMessage;
          this.handleWebrtcMessage(data);
        } catch (error) {
          console.error('Failed to parse WebRTC message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebRTC signaling WebSocket error:', error);
      };

      socket.onclose = () => {
        console.log('WebRTC signaling WebSocket closed');
        this.webrtcSocket = null;
      };
    } catch (error) {
      console.error('Failed to setup WebRTC signaling socket:', error);
    }
  }

  // Message handlers
  private handleRealtimeMessage(data: NavTalkMessage): void {
    const type = data.type;
    
    switch (type) {
      case 'session.created':
        this.sendSessionUpdate();
        break;
      
      case 'session.updated':
        this.setStatus('connected');
        break;
      
      case 'session.session_id':
        const sessionId = data.sessionId ?? data.session_id;
        if (sessionId && sessionId !== this.proxySessionId) {
          console.log('Received proxy session_id:', sessionId);
          this.proxySessionId = sessionId;
          if (this.webrtcSocket) {
            this.webrtcSocket.close();
            this.webrtcSocket = null;
          }
          this.setupSignalingSocketIfReady();
        }
        break;
      
      case 'session.backend.error':
        console.error('Backend error:', data.message);
        this.disconnect();
        break;
      
      case 'session.gpu_full':
        console.error('GPU resources are full');
        this.disconnect();
        break;
      
      case 'session.insufficient_balance':
        console.error('Insufficient balance');
        this.disconnect();
        break;
      
      default:
        // Forward other messages to listeners
        this.messageListeners.forEach(listener => listener(data));
        break;
    }
  }

  private handleWebrtcMessage(data: NavTalkMessage): void {
    const type = data.type;
    
    switch (type) {
      case 'offer':
        // Handle WebRTC offer
        console.log('Received WebRTC offer');
        break;
      
      case 'answer':
        // Handle WebRTC answer
        console.log('Received WebRTC answer');
        break;
      
      case 'iceCandidate':
        // Handle ICE candidate
        console.log('Received ICE candidate');
        break;
      
      default:
        break;
    }
  }

  private sendSessionUpdate(): void {
    if (!this.realtimeSocket) {
      return;
    }

    const session = {
      instructions: this.config.instructions || 'You are a helpful assistant.',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      voice: this.config.voiceType || 'verse',
      temperature: 1,
      max_response_output_tokens: 4096,
      modalities: ['text', 'audio'],
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
    };

    const message = {
      type: 'session.update',
      session: session,
    };

    this.realtimeSocket.send(JSON.stringify(message));
  }
}

export default NavTalkService;

