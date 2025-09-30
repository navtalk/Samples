package com.example.navtalkdemo

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatActivity.MODE_PRIVATE
import androidx.compose.ui.graphics.Color
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.example.navtalkdemo.databinding.ActivityRealtimeBinding
import com.example.navtalkdemo.databinding.ItemChatBinding
import com.hjq.permissions.XXPermissions
import com.hjq.permissions.permission.PermissionLists
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import org.webrtc.*
import java.net.URLEncoder


class RealtimeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRealtimeBinding

    // TODO: Replace with your service configuration
    private val baseUrl = "transfer.navtalk.ai"
    private var license = "your_license"

    // Currently supported characters include: navtalk.Alex, navtalk.Ethan, navtalk.Leo, navtalk.Lily, navtalk.Emma, navtalk.Sophia, navtalk.Mia, navtalk.Chloe, navtalk.Zoe, navtalk.Ava
    // Currently supported voices include: alloy, ash, ballad, cedar, coral, echo, marin, sage, shimmer, verse
    private val characterName = "navtalk.Alex"
    // WebRTC
    private lateinit var eglBase: EglBase
    private lateinit var peerConnectionFactory: PeerConnectionFactory
    private var peerConnectionA: PeerConnection? = null

    // WebSocket
    private var realtimeSocket: WebSocket? = null
    private var resultSocket: WebSocket? = null

    // Audio
    private var audioRecord: AudioRecord? = null
    private var audioTrack:  android.media.AudioTrack? = null

    private var audioJob: Job? = null
    private var audioSending = false
    private val sampleRate = 24000
    private val webSocketClient by lazy { OkHttpClient() }

    // Chat UI
    private val chatAdapter by lazy { ChatAdapter(this) }

    // Historical storage
    private val sp by lazy { getSharedPreferences("realtime_demo", MODE_PRIVATE) }

    private val requestPerm = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { map ->
        val granted = map.all { it.value }
        if (granted) {
            toggleRealtime()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRealtimeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupUi()
        initWebRtc()

        // Initialize History
        loadHistory()
    }

    private fun setupUi() {
        val imageUrl = "https://api.navtalk.ai/uploadFiles/$characterName.png"
        binding.staticImage.load(imageUrl)
        binding.chatList.layoutManager = LinearLayoutManager(this).apply { stackFromEnd = true }
        binding.chatList.addItemDecoration(FadeItemDecoration())
        binding.chatList.adapter = chatAdapter
        binding.llRealtime.setOnClickListener {
            requestPerm.launch(arrayOf(Manifest.permission.RECORD_AUDIO))
        }
    }

    private fun initWebRtc() {

        eglBase = EglBase.create()
        binding.remoteRenderer.init(eglBase.eglBaseContext, null)
        binding.remoteRenderer.setEnableHardwareScaler(true)
        binding.remoteRenderer.setMirror(false)

        val initializationOptions = PeerConnectionFactory.InitializationOptions.builder(this)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(initializationOptions)

        val encoderFactory = DefaultVideoEncoderFactory(
            eglBase.eglBaseContext, true, true
        )
        val decoderFactory = DefaultVideoDecoderFactory(eglBase.eglBaseContext)

        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory()
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private fun setSpeakerphoneOn() {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION)
        val devices = audioManager.availableCommunicationDevices
        val speaker = devices.find { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
        speaker?.let {
            val success = audioManager.setCommunicationDevice(it)
            Log.d("Audio", "Set speaker success: $success")
        }
    }

    private fun toggleRealtime() {
        if(license.isNotEmpty()) {
            val active = binding.llRealtime.tag == true
            if (active) {
                stopRealtime()
            } else {
                startRealtime()
            }
        }else{
            toast("Please Enter Key first!")
        }
    }

    @SuppressLint("SetTextI18n")
    private fun startRealtime() {
        binding.llRealtime.tag = true
        binding.llRealtime.setBackgroundResource(R.drawable.circular_button_call_end_bg)
        binding.tvRealtime.text ="Hung Up"
        // Open WebSockets
        openRealtimeSocket()
        openResultWebrtcSocket()
    }

    @SuppressLint("SetTextI18n")
    private fun stopRealtime() {
        binding.llRealtime.tag = false
        binding.llRealtime.setBackgroundResource(R.drawable.circular_button_call_bg)
        binding.tvRealtime.text ="Call"

        // Close audio, WebSocket, and WebRTC connections
        stopAudioCapture()
        realtimeSocket?.close(1000, "bye")
        resultSocket?.close(1000, "bye")

        peerConnectionA?.close()
        peerConnectionA = null

        binding.staticImage.visibility = View.VISIBLE
    }

    private fun openRealtimeSocket() {
        val url = "wss://$baseUrl/api/realtime-api?license=${license.urlEncode()}&characterName=${characterName.urlEncode()}"
        val req = Request.Builder().url(url).build()
        realtimeSocket = webSocketClient.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i("RT", "realtime WS open")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleRealtimeMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("RT", "realtime failure", t)
                showErrorMessageAndDisConnect("Websocket Failure:" + t.message)
                stopAudioCapture()
            }
        })
    }

    private fun openResultWebrtcSocket() {
        val url = "wss://$baseUrl/api/webrtc?userId=${license.urlEncode()}"
        val req = Request.Builder().url(url).build()
        resultSocket = webSocketClient.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i("RT", "webrtc WS open")
                val targetSessionId = "123"
                val createMsg = JSONObject()
                    .put("type", "create")
                    .put("targetSessionId", targetSessionId)
                webSocket.send(createMsg.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val msg = JSONObject(text)
                    when (msg.optString("type")) {
                        "offer" -> handleOffer(msg)
                        "answer" -> handleAnswer(msg)
                        "iceCandidate" -> handleRemoteIceCandidate(msg)
                    }
                } catch (e: Exception) {
                    Log.e("RT", "parse webrtc msg error", e)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("RT", "webrtc failure", t)
                t.message?.let { showErrorMessageAndDisConnect(it) }
                cleanupWebrtc()
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.i("RT", "webrtc closed: $code,$reason")
                cleanupWebrtc()
            }
        })
    }

    private fun cleanupWebrtc() {
        peerConnectionA?.close()
        peerConnectionA = null
    }


    fun stopCurrentAudioPlayback() {

    }

    private fun handleRealtimeMessage(text: String) {
        val data = JSONObject(text)
        when (data.optString("type")) {
            "session.created" -> sendSessionUpdate()
            "session.updated" -> startAudioCapture()
            "session.backend.error" -> {
                showErrorMessageAndDisConnect(data.optString("message").toString())
            }
            "input_audio_buffer.speech_started" -> {
                stopCurrentAudioPlayback()
            }
            "input_audio_buffer.speech_stopped" -> {
            /* Handle speech start */
            }
            "conversation.item.input_audio_transcription.completed" -> {
                val transcript = data.optString("transcript")
                appendChat("user", transcript, persist = true)
            }
            "response.function_call_arguments.done" -> {
                handleFunctionCall(data)
            }
            "response.audio_transcript.delta" -> {
                val delta = data.optString("delta")
                appendChat("assistant", delta, persist = false)
            }
            "response.audio_transcript.done" -> {
                val transcript = data.optString("transcript")
                appendChat("assistant", transcript, persist = true)
            }
            "session.gpu_full" -> toast("GPU resources are full")
            "session.insufficient_balance" -> toast("Insufficient balance")
            else -> { /* Ignore other types */ }
        }
    }

    private fun sendSessionUpdate() {
        val session = JSONObject().apply {
            put("instructions", "chat")
            put("turn_detection", JSONObject().apply {
                put("type", "server_vad")
                put("threshold", 0.5)
                put("prefix_padding_ms", 300)
                put("silence_duration_ms", 500)
            })
            put("voice", "ash")
            put("temperature", 1)
            put("max_response_output_tokens", 4096)
            put("modalities",JSONArray().apply {
                put("text")
                put("audio")
            })
            put("input_audio_format", "pcm16")
            put("output_audio_format", "pcm16")
            put("input_audio_transcription", JSONObject().apply {
                put("model", "whisper-1")
            })
            put("tools", JSONArray().apply {
                put(JSONObject().apply {
                    put("type", "function")
                    put("name", "function_call_judge")
                    put("description", "Are there any function calls or tasks beyond your capability...")
                    put("parameters", JSONObject().apply {
                        put("type", "object")
                        put("properties", JSONObject().apply {
                            put("userInput", JSONObject().apply {
                                put("type", "string")
                                put("description", "the user input")
                            })
                        })
                        put("required", JSONArray().apply {
                            put("userInput")
                        })
                    })
                })
            })
        }

        val message = JSONObject().apply {
            put("type", "session.update")
            put("session", session)
        }
        realtimeSocket?.send(message.toString())

        // Send historical user messages
        val history = loadHistoryFromSp()
        history.filter { it.role == "user" }.forEach { msg ->
            val item = JSONObject().apply {
                put("type", "conversation.item.create")
                put("item", JSONObject().apply {
                    put("type", "message")
                    put("role", "user")
                    put("content", JSONArray().apply {
                        put(JSONObject().apply {
                            put("type", "input_text")
                            put("text", msg.content)
                        })
                    })
                })
            }

            realtimeSocket?.send(item.toString())
        }
    }

    private fun handleFunctionCall(eventJson: JSONObject) {
        val callId = eventJson.optString("call_id")
        val argsStr = eventJson.optString("arguments")
        val userInput = try {
            JSONObject(argsStr).optString("userInput")
        } catch (e: Exception) { "" }

        if (userInput.isBlank()) return

        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                // Define the MediaType as a constant
                val mediaType = "application/json".toMediaType()
                val reqBody: RequestBody = JSONObject().apply {
                    put("userInput", userInput)
                    put("license", license)
                    put("chatId", sp.getString("chatId", "") ?: "")
                }.toString().toRequestBody(mediaType)

                val req = Request.Builder()
                    .url("https://$baseUrl/api/realtime_function_call")
                    .post(reqBody)
                    .build()
                val resp = webSocketClient.newCall(req).execute()
                val result = resp.body?.string() ?: ""
                val resultJson = JSONObject().apply {
                    put("type", "conversation.item.create")
                    put("item", JSONObject().apply {
                        put("type", "function_call_output")
                        put("output", result)
                        put("call_id", callId)
                    })
                }
                realtimeSocket?.send(resultJson.toString())
                val rpJson = JSONObject().apply { put("type", "response.create") }
                realtimeSocket?.send(rpJson.toString())
            }.onFailure {
                Log.e("RT", "function call error", it)
            }
        }
    }

    private fun showErrorMessageAndDisConnect(msg:String){
        toast(msg)
        runOnUiThread {
            toggleRealtime()
        }
    }

    private fun startAudioCapture() {
        if (audioSending) return
        audioSending = true
        val minBuf = AudioRecord.getMinBufferSize(
            sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        val bufferSize = (minBuf * 2).coerceAtLeast(4096)

        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Toast.makeText(this, "Please grant RECORD_AUDIO permission", Toast.LENGTH_SHORT).show()
            audioSending = false
            return
        }

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION, sampleRate,
            AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, bufferSize
        )

        audioRecord?.let { ar ->
            if (NoiseSuppressor.isAvailable()) {
                NoiseSuppressor.create(audioRecord!!.audioSessionId)
            }
            if (AcousticEchoCanceler.isAvailable()) {
                AcousticEchoCanceler.create(audioRecord!!.audioSessionId)
            }
            if (AutomaticGainControl.isAvailable()) {
                AutomaticGainControl.create(audioRecord!!.audioSessionId)
            }
        }

        audioRecord?.startRecording()

        audioJob = CoroutineScope(Dispatchers.IO).launch {
            val buf = ByteArray(bufferSize)
            while (isActive && audioSending && realtimeSocket != null) {
                val n = audioRecord?.read(buf, 0, buf.size) ?: 0
                if (n > 0) {
                    val b64 = Base64.encodeToString(buf.copyOf(n), Base64.NO_WRAP)
                    val chunkSize = 4096
                    var i = 0
                    while (i < b64.length) {
                        val end = (i + chunkSize).coerceAtMost(b64.length)
                        val chunk = b64.substring(i, end)
                        val msg = JSONObject().apply {
                            put("type", "input_audio_buffer.append")
                            put("audio", chunk)
                        }
                        realtimeSocket?.send(msg.toString())
                        i = end
                    }
                } else {
                    delay(10)
                }
            }
        }

        runOnUiThread { binding.staticImage.visibility = View.GONE }
    }

    private fun stopAudioCapture() {
        audioSending = false
        audioJob?.cancel()
        audioJob = null
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        audioTrack?.stop()
        audioTrack?.release()
        audioTrack = null

    }

    // WebRTC signaling processing
    private fun handleOffer(msg: JSONObject) {
        val sdpObj = msg.getJSONObject("sdp")
        val desc = SessionDescription(
            SessionDescription.Type.OFFER, sdpObj.getString("sdp")
        )
        if (peerConnectionA == null) buildPeerConnection()

        peerConnectionA?.setRemoteDescription(object : SdpObserverAdapter() {
            override fun onSetSuccess() {
                peerConnectionA?.createAnswer(object : SdpObserverAdapter() {
                    override fun onCreateSuccess(sdp: SessionDescription?) {
                        if (sdp == null) return
                        peerConnectionA?.setLocalDescription(object : SdpObserverAdapter() {
                            override fun onSetSuccess() {
                                val targetId = msg.optString("targetSessionId")
                                val answerMsg = JSONObject().apply {
                                    put("type", "answer")
                                    put("targetSessionId", targetId)
                                    put("sdp", JSONObject().apply {
                                        put("type", "answer")
                                        put("sdp", sdp.description)
                                    })
                                }
                                resultSocket?.send(answerMsg.toString())
                            }
                        }, sdp)
                    }
                }, MediaConstraints())
            }
        }, desc)
    }

    private fun handleAnswer(msg: JSONObject) {
        // Handle WebRTC answer
    }

    private fun handleRemoteIceCandidate(msg: JSONObject) {
        val candObj = msg.getJSONObject("candidate")
        val candidate = IceCandidate(
            candObj.optString("sdpMid"),
            candObj.optInt("sdpMLineIndex"),
            candObj.optString("candidate")
        )
        peerConnectionA?.addIceCandidate(candidate)
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private fun buildPeerConnection() {
        setSpeakerphoneOn()
        val rtcConfig = PeerConnection.RTCConfiguration(
            listOf(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer())
        ).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        }
        peerConnectionA = peerConnectionFactory.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate?) {
                candidate ?: return
                val msg = JSONObject().apply {
                    put("type", "iceCandidate")
                    put("targetSessionId", "123")
                    put("candidate", JSONObject().apply {
                        put("candidate", candidate.sdp)
                        put("sdpMid", candidate.sdpMid)
                        put("sdpMLineIndex", candidate.sdpMLineIndex)
                    })
                }
                resultSocket?.send(msg.toString())
            }

            override fun onTrack(transceiver: RtpTransceiver?) {
                val track = transceiver?.receiver?.track()
                if (track is VideoTrack) {
                    track.addSink(binding.remoteRenderer)
                    runOnUiThread { binding.staticImage.visibility = View.GONE }
                }
                if (track is AudioTrack){
                    track.setEnabled(true)
                }
            }

            // Other callbacks can be implemented as needed
            override fun onSignalingChange(p0: PeerConnection.SignalingState?) {}
            override fun onIceConnectionChange(newState: PeerConnection.IceConnectionState?) {
            }

            override fun onConnectionChange(newState: PeerConnection.PeerConnectionState?) {}
            override fun onIceConnectionReceivingChange(receiving: Boolean) {
            }

            override fun onIceGatheringChange(p0: PeerConnection.IceGatheringState?) {}
            override fun onIceCandidatesRemoved(p0: Array<out IceCandidate>?) {}
            override fun onAddStream(p0: MediaStream?) {}
            override fun onRemoveStream(p0: MediaStream?) {}
            override fun onDataChannel(p0: DataChannel?) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(p0: RtpReceiver?, p1: Array<out MediaStream>?) {}
        })
    }

    private val assistantQueue = Channel<Pair<String, Boolean>>(Channel.UNLIMITED)
    private var isAssistantProcessing = false
    private var currentDeltaBuffer = StringBuilder()
    private var currentDeltaPosition: Int? = null

    private fun appendChat(role: String, content: String, persist: Boolean) {
        if (content.isBlank()) return

        runOnUiThread {
            if (role == "assistant") {
                CoroutineScope(Dispatchers.Main).launch {
                    assistantQueue.send(Pair(content, persist))
                    processAssistantQueue()
                }
            } else {
                chatAdapter.submit(ChatMsg(role, content))
                binding.chatList.scrollToPosition(chatAdapter.itemCount - 1)

                if (persist) {
                    val all = loadHistoryFromSp().toMutableList()
                    all.add(ChatMsg(role, content))
                    saveHistoryToSp(all)
                }
            }
        }
    }

    private fun processAssistantQueue() {
        if (isAssistantProcessing) return
        isAssistantProcessing = true

        CoroutineScope(Dispatchers.Main).launch {
            for ((delta, persist) in assistantQueue) {
                currentDeltaBuffer.append(delta)

                if (currentDeltaPosition == null) {
                    val insertIndex = chatAdapter.itemCount
                    val msg = ChatMsg("assistant", currentDeltaBuffer.toString())
                    chatAdapter.add(insertIndex, msg)
                    currentDeltaPosition = insertIndex
                } else {
                    chatAdapter.updateAt(currentDeltaPosition!!, currentDeltaBuffer.toString())
                }

                binding.chatList.scrollToPosition(chatAdapter.itemCount - 1)

                if (persist) {
                    val all = loadHistoryFromSp().toMutableList()
                    all.add(ChatMsg("assistant", currentDeltaBuffer.toString()))
                    saveHistoryToSp(all)

                    currentDeltaBuffer.clear()
                    currentDeltaPosition = null
                }

                delay(50)
            }
            isAssistantProcessing = false
        }
    }



    private fun loadHistory() {
        val list = loadHistoryFromSp()
        chatAdapter.setAll(list)
        binding.chatList.scrollToPosition(chatAdapter.itemCount - 1)
    }

    private fun loadHistoryFromSp(): List<ChatMsg> {
        val json = sp.getString("realtimeChatHistory", "[]") ?: "[]"
        return runCatching {
            val arr = JSONArray(json)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(ChatMsg(o.optString("role"), o.optString("content")))
                }
            }
        }.getOrElse { emptyList() }
    }

    private fun saveHistoryToSp(list: List<ChatMsg>) {
        val arr = JSONArray()
        list.forEach {
            arr.put(JSONObject().apply {
                put("role", it.role)
                put("content", it.content)
            })
        }
        sp.edit().putString("realtimeChatHistory", arr.toString()).apply()
    }

    // Helper functions
    private fun String.urlEncode(): String = URLEncoder.encode(this, "UTF-8")
    private fun toast(msg: String) = runOnUiThread {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRealtime()
        binding.remoteRenderer.release()
        eglBase.release()
    }
}

data class ChatMsg(
    val role: String,   // "user" or "assistant"
    var content: String // Message content
)


class ChatAdapter(context: Context) : RecyclerView.Adapter<ChatAdapter.ChatViewHolder>() {
    private val sp by lazy { context.getSharedPreferences("realtime_demo", MODE_PRIVATE) }

    private val chatMessages = mutableListOf<ChatMsg>()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatViewHolder {
        val binding = ItemChatBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ChatViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ChatViewHolder, position: Int) {
        val chatMsg = chatMessages[position]
        holder.bind(chatMsg)
    }

    override fun getItemCount(): Int = chatMessages.size

    @SuppressLint("NotifyDataSetChanged")
    fun setAll(messages: List<ChatMsg>) {
        chatMessages.clear()
        chatMessages.addAll(messages)
        notifyDataSetChanged()
    }

    fun submit(message: ChatMsg) {
        chatMessages.add(message)
        notifyItemInserted(chatMessages.size - 1)
    }

    fun add(insertIndex:Int,message: ChatMsg) {
        chatMessages.add(insertIndex,message)
        notifyItemInserted(insertIndex)
    }

    fun updateAt(index: Int, newContent: String) {
        if (index in chatMessages.indices) {
            val oldMessage = chatMessages[index]
            chatMessages[index] = oldMessage.copy(content = newContent)
            notifyItemChanged(index)
        }
    }

    inner class ChatViewHolder(private val binding: ItemChatBinding) : RecyclerView.ViewHolder(binding.root) {

        @SuppressLint("ResourceAsColor")
        fun bind(chatMsg: ChatMsg) {
            binding.apply {
                val textView = binding.root.findViewById<TextView>(R.id.messageTextView)
                val params = textView.layoutParams as LinearLayout.LayoutParams
                when (chatMsg.role) {
                    "user" -> {
                        messageTextView.text = chatMsg.content
                        messageTextView.setBackgroundResource(R.drawable.bg_user_message)
                        params.gravity = Gravity.START
                        textView.layoutParams = params
                    }
                    "assistant" -> {
                        messageTextView.text = chatMsg.content
                        messageTextView.setBackgroundResource(R.drawable.bg_assistant_message)
                        params.gravity = Gravity.START
                        textView.layoutParams = params
                    }
                }
            }
        }
    }
}


// SdpObserver Adapter class
open class SdpObserverAdapter : SdpObserver {
    override fun onCreateSuccess(p0: SessionDescription?) {}
    override fun onSetSuccess() {}
    override fun onCreateFailure(p0: String?) {}
    override fun onSetFailure(p0: String?) {}
}
