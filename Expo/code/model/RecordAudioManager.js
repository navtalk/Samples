import inCallManager from "react-native-incall-manager";
import WebRTCManager from "./WebRTCManager";

class RecordAudioManager{

  static instance;
  static getInstance() {
    if (!RecordAudioManager.instance) {
      RecordAudioManager.instance = new RecordAudioManager();
    }
    return RecordAudioManager.instance;
  }

  record_audio_status = true; //true/false

  floatTo16BitPCM(input) {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  mustSpeaker() {
    console.log("Force the speaker to work");
    inCallManager.start({
      media: "audio",
      auto: true,
      ringback: false
    });
    inCallManager.setForceSpeakerphoneOn(true);
    inCallManager.setSpeakerphoneOn(true);
    inCallManager.stopProximitySensor();
    inCallManager.setKeepScreenOn(true);
  }
}
//Export class
export default RecordAudioManager.getInstance();