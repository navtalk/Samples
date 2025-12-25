// Global variables for audio processing
let audioContext;
let audioProcessor;
let audioStream;

export function startRecording(messageReceiverCall) {
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // Create AudioContext with 24kHz sample rate (required by API)
            audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 24000
            });
            audioStream = stream;

            // Create audio source from microphone stream
            const source = audioContext.createMediaStreamSource(stream);

            // Create ScriptProcessorNode to process audio chunks
            // Parameters: bufferSize (8192), inputChannels (1), outputChannels (1)
            audioProcessor = audioContext.createScriptProcessor(8192, 1, 1);

            // Process audio data in real-time
            audioProcessor.onaudioprocess = (event) => {
                // Only send if WebSocket is open
                // if (socket && socket.readyState === WebSocket.OPEN) {
                //
                // }
                // Get audio data from input buffer (Float32Array, range -1.0 to 1.0)
                const inputBuffer = event.inputBuffer.getChannelData(0);

                // Step 3.1: Convert Float32Array to PCM16 (16-bit signed integers)
                const pcmData = floatTo16BitPCM(inputBuffer);

                // Step 3.2: Encode PCM16 data to base64 for JSON transmission
                const base64PCM = base64EncodeAudio(new Uint8Array(pcmData));

                // Step 3.3: Send audio chunks (split large base64 strings into smaller chunks)
                // Chunk size: 4096 characters to avoid message size limits
                const chunkSize = 4096;
                for (let i = 0; i < base64PCM.length; i += chunkSize) {
                    const chunk = base64PCM.slice(i, i + chunkSize);
                    messageReceiverCall(chunk)
                }
            };

            // Connect audio processing chain
            source.connect(audioProcessor);
            audioProcessor.connect(audioContext.destination);

            console.log('Recording started');
        })
        .catch(error => {
            console.error('Unable to access microphone:', error);
            // Handle microphone access errors
        });
}

// Helper function: Convert Float32Array to 16-bit PCM
// Input: Float32Array with values in range [-1.0, 1.0]
// Output: ArrayBuffer containing 16-bit PCM data
function floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2); // 2 bytes per sample
    const view = new DataView(buffer);
    let offset = 0;

    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        // Clamp value to [-1, 1] range
        let s = Math.max(-1, Math.min(1, float32Array[i]));

        // Convert to 16-bit signed integer
        // Negative values: s * 0x8000 (range: -32768 to 0)
        // Positive values: s * 0x7FFF (range: 0 to 32767)
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
}

// Helper function: Encode audio to base64
// Input: Uint8Array of PCM16 data
// Output: Base64-encoded string
function base64EncodeAudio(uint8Array) {
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow

    // Convert binary data to string (chunk by chunk)
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }

    // Encode to base64
    return btoa(binary);
}

// Stop recording and cleanup
export function stopRecording() {
    // Disconnect audio processor
    if (audioProcessor) {
        audioProcessor.disconnect();
        audioProcessor = null;
    }

    // Stop all audio tracks
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
    console.log('Recording stopped');
}