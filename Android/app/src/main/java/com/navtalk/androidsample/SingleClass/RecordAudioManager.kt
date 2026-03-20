package com.navtalk.androidsample.audio

import android.Manifest
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import androidx.core.app.ActivityCompat
import com.navtalk.androidsample.SingleClass.WebsocketManager
import kotlinx.coroutines.*

object RecordAudioManager {

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordJob: Job? = null
    private const val SAMPLE_RATE = 24000
    private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
    private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT

    private val audioBufferList = mutableListOf<ByteArray>()
    private val audioEventList = mutableListOf<Map<String, Any>>()
    var recordStatus = "no"

    var isOrNotHaveMicrophonePermission = false

    // 启动录音
    fun startRecordAudio(context: Context) {
        if (audioRecord != null) {
            // 清空缓存
            audioEventList.clear()
            audioBufferList.clear()
            isRecording = true
            return
        }

        // (1).检查权限
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED) {
            println("NavTalk-->Microphone permission is not granted")
            isOrNotHaveMicrophonePermission = false
            return
        }

        // (2). 初始化 AudioRecord
        val bufferSize =
            AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
            bufferSize
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            println("NavTalk-->AudioRecord init failed")
            return
        }

        audioRecord?.startRecording()
        isRecording = true
        recordStatus = "yes"
        NotificationCenter.post("RecordAudioStatusIsChanged","")

        // (3).开启协程读取音频数据
        recordJob = CoroutineScope(Dispatchers.IO).launch {
            val buffer = ByteArray(bufferSize)
            var sequenceNumber = 0
            while (isRecording) {
                val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                if (read > 0) {
                    val data = buffer.copyOf(read)
                    audioBufferList.add(data)

                    val base64Data = Base64.encodeToString(data, Base64.NO_WRAP)
                    val event = mapOf(
                        "type" to "realtime.input_audio_buffer.append",
                        "data" to mapOf("audio" to base64Data, "sequenceNumber" to sequenceNumber)
                    )
                    audioEventList.add(event)
                    // 发送给 WebSocket
                    if (recordStatus == "yes"){
                        sendAudioEvent(event)
                        sequenceNumber++
                    }

                }
            }
        }
    }

    private fun sendAudioEvent(event: Map<String, Any>) {
        try {
            val jsonString = org.json.JSONObject(event).toString()
            WebsocketManager.webSocket?.send(jsonString)
            //println("NavTalk-->Send audio data-->${jsonString}")
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // 停止录音
    fun stopCaptureAudio() {
        audioEventList.clear()
        isRecording = false
        recordStatus = "no"
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        recordJob?.cancel()
        recordJob = null
        NotificationCenter.post("RecordAudioStatusIsChanged","")
        println("NavTalk-->Stop Audio Recording")
    }

    // 暂停发送音频
    fun pauseSendAudioMessageToAI() {
        recordStatus = "no"
        NotificationCenter.post("RecordAudioStatusIsChanged","")
        println("NavTalk-->Pause Audio Recording")
    }

    // 恢复发送音频
    fun resumeSendAudioMessageToAI() {
        recordStatus = "yes"
        NotificationCenter.post("RecordAudioStatusIsChanged","")
        println("NavTalk-->Resume Audio Recording")
    }
}