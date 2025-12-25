import {NavTalkMessageType} from "../components/constants.js";

let peerConnection;

export const socket = {};

// ICE server configuration for NAT traversal
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export function handleOffer(message) {
    const offer = new RTCSessionDescription(message.sdp);
    console.log("Received offer SDP:", offer);

    // Fetch ICE servers configuration
    fetch('https://transfer.navtalk.ai/api/webrtc/generate-ice-servers', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            const servers = data?.data?.iceServers ?? data?.iceServers;
            if (Array.isArray(servers) && servers.length > 0) {
                configuration.iceServers = servers;
            }

            // Create RTCPeerConnection
            peerConnection = new RTCPeerConnection(configuration);

            // Set remote description
            peerConnection.setRemoteDescription(offer)
                .then(() => peerConnection.createAnswer())
                .then(answer => peerConnection.setLocalDescription(answer))
                .then(() => {
                    // Send answer back to server through unified WebSocket
                    sendAnswerMessage(peerConnection.localDescription);
                })
                .catch(err => console.error('Error handling offer:', err));

            // Handle incoming tracks (audio/video)
            peerConnection.ontrack = (event) => {
                console.log('Received remote track:', event);
                const remoteVideo = socket.videoElement();
                if (remoteVideo) {
                    remoteVideo.srcObject = event.streams[0];
                    remoteVideo.play().catch(e => console.error('Video play failed:', e));
                }
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    // Send ICE candidate through unified WebSocket
                    sendIceMessage(event.candidate);
                }
            };

            // Monitor connection state
            peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', peerConnection.iceConnectionState);
                if (peerConnection.iceConnectionState === 'connected') {
                    console.log('WebRTC connection fully established!');
                } else if (peerConnection.iceConnectionState === 'failed') {
                    console.log('ICE connection failed');
                }
            };
        })
        .catch(err => console.error('Error fetching ICE servers:', err));
}

export function handleIceCandidate(message) {
    const candidate = new RTCIceCandidate(message.candidate);

    if (peerConnection) {
        peerConnection.addIceCandidate(candidate)
            .then(() => console.log('ICE candidate added successfully'))
            .catch(err => console.error('Error adding ICE candidate:', err));
    }
}

// Helper functions to send WebRTC signaling messages
function sendOfferMessage(sdp) {
    const message = {
        type: NavTalkMessageType.WEB_RTC_OFFER,
        data: { sdp: sdp }
    };
    socket.send(JSON.stringify(message));
}

function sendAnswerMessage(sdp) {
    const message = {
        type: NavTalkMessageType.WEB_RTC_ANSWER,
        data: { sdp: sdp }
    };
    socket.send(JSON.stringify(message));
}

function sendIceMessage(candidate) {
    const message = {
        type: NavTalkMessageType.WEB_RTC_ICE_CANDIDATE,
        data: { candidate: candidate }
    };
    socket.send(JSON.stringify(message));
}
export function handleAnswer(message) {
    const answer = new RTCSessionDescription(message.sdp);
    peerConnection.setRemoteDescription(answer)
        .catch(err => console.error('Failed to handle Answer:', err));

}