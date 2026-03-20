
import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Looper
import android.util.Log
import com.navtalk.androidsample.SingleClass.WebsocketManager
import org.json.JSONArray
import org.json.JSONObject
import org.webrtc.*


enum class WebRTCStatus { NOT_CONNECTED, CONNECTING, CONNECTED }

object WebRTCManager{
    var iceServers: JSONArray? = null
    var targetSessionId: String? = null
    var peerConnection: PeerConnection? = null
    private var peerConnectionFactory: PeerConnectionFactory? = null
    var webRTCStaus: WebRTCStatus = WebRTCStatus.NOT_CONNECTED
    var remoteVideoTrack: VideoTrack? = null // 远端视频轨道
    var remoteRenderView: SurfaceViewRenderer? = null // 渲染远端视频的View
    private lateinit var eglBase: EglBase

    //0.Init PeerConnectionFactory -- 只初始化一次
    private var isInitialized = false
    fun initWebRTC(context: Context){
        if (isInitialized == true){
            println("NavTalk-->WebRTC-->1111-->已经初始化了PeerConnectionFactory")
            return
        }
        println("NavTalk-->WebRTC-->1111-->还没有初始化PeerConnectionFactory")
        val options = PeerConnectionFactory.InitializationOptions.builder(context.applicationContext)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(options)
        eglBase = EglBase.create()
        val encoderFactory = DefaultVideoEncoderFactory(
            eglBase.eglBaseContext, true, true
        )
        val decoderFactory = DefaultVideoDecoderFactory(eglBase.eglBaseContext)
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory()

        //查看当前音频类型：
        checkCurrentAudioType(context)
        //开启扬声器:
        openSpeakerAudioType(context)
        //查看当前音频类型：
        checkCurrentAudioType(context)

        isInitialized = true
    }
    //查看当前音频类型：
    fun checkCurrentAudioType(context: Context){
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val currentDevice = audioManager.communicationDevice
            when (currentDevice?.type) {
                AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> println("NavTalk-->当前是扬声器")
                AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> println("NavTalk-->当前是听筒")
                AudioDeviceInfo.TYPE_WIRED_HEADSET -> println("NavTalk-->当前是有线耳机")
                AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> println("NavTalk-->当前是蓝牙")
                else -> println("NavTalk-->当前是其他设备")
            }
        } else {
            // 低版本
            if (audioManager.isSpeakerphoneOn) println("NavTalk-->当前是扬声器")
            else println("NavTalk-->当前是听筒")
        }
    }
    //开启扬声器:
    fun openSpeakerAudioType(context: Context){
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val devices = audioManager.availableCommunicationDevices.toList()
            //设置为扬声器
            val speakerDevice = devices.find { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
            speakerDevice?.let { audioManager.setCommunicationDevice(it) }
            //设置为听筒
            //val earpieceDevice = devices.find { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE }
            //earpieceDevice?.let { audioManager.setCommunicationDevice(it) }
        } else {
            //设置为扬声器
            audioManager.isSpeakerphoneOn = true
            //设置为听筒
            //audioManager.isSpeakerphoneOn = false
        }
    }

    //1.Handle Offer
    fun handleOfferMessage(message: String, context: Context){
        //更新状态
        webRTCStaus = WebRTCStatus.CONNECTING
        NotificationCenter.post("WebRTCStatusIsChanged","")
        //创建PeerConnectionFactory -- 全局创建一次
        initWebRTC(context)
        //第一步: 创建并启动PeerConnection
        gotoCreatePeerConnecttion(message)
        //第二步：直接setRemoteDescription
        gotoSetRemoteDescription(message)
    }
    //第一步: 创建PeerConnecttion
    fun  gotoCreatePeerConnecttion(message: String){
        println("NavTalk-->WebRTC-->第一步: 创建PeerConnecttion")
        val icee_array = parseIceServers(iceServers) ?: emptyList()
        val config = PeerConnection.RTCConfiguration(icee_array)
        //println("NavTalk-->WebRTC-->1111-->${iceServers}")
        //println("NavTalk-->WebRTC-->1111-->${icee_array}")
        config.iceTransportsType = PeerConnection.IceTransportsType.ALL
        config.bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE
        config.rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE
        config.tcpCandidatePolicy = PeerConnection.TcpCandidatePolicy.ENABLED
        config.continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        if (peerConnection != null) {
            println("NavTalk-->peerConnection-->已有连接，请先断开")
            return
        }
        if (peerConnectionFactory == null) {
            println("NavTalk-->peerConnectionFactory->peerConnectionFactory还没有创建成功")
            return
        }
        peerConnection = peerConnectionFactory?.createPeerConnection(config,
            object : PeerConnection.Observer{
                //本地产生 ICE Candidate 时回调（需要发送给对端）
                override fun onIceCandidate(candidate: IceCandidate?) {
                    println("NavTalk-->WebRTC-->本地产生 ICE Candidate")
                    candidate?.let { sendIceCandidate(it) }
                }
                //收到远端媒体流（旧API）
                override fun onAddStream(stream: MediaStream?) {
                    println("NavTalk-->WebRTC-->收到远端媒体流（旧API）")
                    /*
                    stream?.videoTracks?.firstOrNull()?.let { track ->
                        //在主线程操作UI
                        android.os.Handler(Looper.getMainLooper()).post {
                            println("NavTalk-->WebRTC-->是视频轨道")
                            remoteVideoTrack = track
                            remoteVideoTrack?.addSink(remoteRenderView)
                            println("NavTalk-->VideoTrack detected, is remoteVideoView attached=${remoteRenderView?.isAttachedToWindow}")
                        }
                    }
                    stream?.audioTracks?.forEach {
                        println("NavTalk-->WebRTC-->是音频轨道")
                        it.setEnabled(true)
                    }
                    */
                }
                //新版API：Track回调（推荐用这个替代 onAddStream）
                override fun onAddTrack(p0: RtpReceiver?, p1: Array<out MediaStream>?) {
                    println("NavTalk-->WebRTC-->收到远端媒体流（新版API）")
                    val track = p0?.track()
                    if (track is VideoTrack){
                        //在主线程操作UI
                        //android.os.Handler(Looper.getMainLooper()).post {
                            println("NavTalk-->WebRTC-->是视频轨道-->${track.enabled()}")
                            remoteVideoTrack = track
                            remoteVideoTrack?.addSink(remoteRenderView)
                            println("NavTalk-->VideoTrack detected, is remoteVideoView attached=${remoteRenderView?.isAttachedToWindow}")
                       //}
                    }
                    if (track is AudioTrack){
                        println("NavTalk-->WebRTC-->是音频轨道")
                        track.setEnabled(true)
                    }
                }
                //Plan-A就在这里接收轨道：取决于服务端采用什么方式
                override fun onTrack(transceiver: RtpTransceiver?) {
                    /*
                    println("NavTalk-->WebRTC-->收到远端媒体流-->在这里接收轨道")
                    val track = transceiver?.receiver?.track()
                    if (track is VideoTrack){
                        //在主线程操作UI
                        android.os.Handler(Looper.getMainLooper()).post {
                            println("NavTalk-->WebRTC-->是视频轨道")
                            remoteVideoTrack = track
                            remoteVideoTrack?.addSink(remoteRenderView)
                            println("NavTalk-->VideoTrack detected, is remoteVideoView attached=${remoteRenderView?.isAttachedToWindow}")
                        }
                    }
                    if (track is AudioTrack){
                        println("NavTalk-->WebRTC-->是音频轨道")
                        track.setEnabled(true)
                    }
                     */
                }
                //ICE状态发生改变
                override fun onIceConnectionChange(p0: PeerConnection.IceConnectionState?) {
                    println("NavTalk-->ICE状态发生改变：${p0}")
                    p0.let {
                        if (it == PeerConnection.IceConnectionState.CONNECTED){
                            webRTCStaus = WebRTCStatus.CONNECTED
                            NotificationCenter.post("WebRTCStatusIsChanged","")
                            NotificationCenter.post("ShowRTCRemoteVideoChangeShowStatus","")
                        }else if (it == PeerConnection.IceConnectionState.DISCONNECTED
                            || it == PeerConnection.IceConnectionState.CLOSED
                            || it == PeerConnection.IceConnectionState.FAILED){
                            webRTCStaus = WebRTCStatus.NOT_CONNECTED
                            NotificationCenter.post("WebRTCStatusIsChanged","")
                        }
                    }
                }
                override fun onSignalingChange(p0: PeerConnection.SignalingState?) {
                    println("NavTalk-->WebRTC-->第一步: onSignalingChange-->${p0}")
                }
                override fun onIceConnectionReceivingChange(p0: Boolean) {}
                override fun onIceGatheringChange(p0: PeerConnection.IceGatheringState?) {}
                override fun onDataChannel(p0: DataChannel?) {}
                override fun onRemoveStream(p0: MediaStream?) {}
                override fun onRenegotiationNeeded() {}
                override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) {}
            }
        )

    }
    //第二步: setRemoteDescription
    fun gotoSetRemoteDescription(message: String){
        //(1).确保此时已经创建了peerConnection
        println("NavTalk-->WebRTC-->第二步: setRemoteDescription")
        println("NavTalk-->WebRTC-->第二步: peerConnection=${peerConnection}")
        if (peerConnection == null){
            NotificationCenter.post("ConnectTalkFail","")
            println("NavTalk-->peerConnection-->创建失败")
            return
        }
        println("NavTalk-->peerConnection-->创建成功")
        //(2).确保此时peerConnection的状态正常
        println("NavTalk-->WebRTC-->第二步: SignalingState=${peerConnection?.signalingState()}")
        if (peerConnection?.signalingState() != PeerConnection.SignalingState.STABLE){
            NotificationCenter.post("ConnectTalkFail","")
            return
        }
        //(3).获取远端的SDP
        val json = JSONObject(message)
        val data = json.optJSONObject("data") ?: return
        val sdpObj = data.optJSONObject("sdp") ?: return
        val sdpRaw = sdpObj.get("sdp").toString()
        //println("NavTalk-->WebRTC-->3333-->${sdpObj}")
        //Log.d("NavTalk-->WebRTC-->3333-->",sdpRaw)
        val remoteOffer = SessionDescription(SessionDescription.Type.OFFER, sdpRaw)
        println("NavTalk-->WebRTC-->3333-->${remoteOffer}")
        //(4).setRemoteDescription
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                println("NavTalk-->WebRTC-->setRemoteDescription-->SetSuccess")
                //设置Answer成功后创建Answer
                createAnswer()
            }
            override fun onSetFailure(p0: String?) {
                println("NavTalk-->WebRTC-->setRemoteDescription-->SetFailure-->${p0}")
                NotificationCenter.post("ConnectTalkFail","")
            }
            override fun onCreateSuccess(p0: SessionDescription?) {
                println("NavTalk-->WebRTC-->setRemoteDescription-->CreateSuccess")
            }
            override fun onCreateFailure(p0: String?) {
                println("NavTalk-->WebRTC-->setRemoteDescription-->CreateFailure")
            }
        }, remoteOffer)
    }
    //第三步：创建Answer
    fun createAnswer(){
        val constraints = MediaConstraints()
        constraints.mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        constraints.mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
        println("NavTalk-->WebRTC-->第三步：创建Answer")
        peerConnection?.createAnswer(object : SdpObserver{
            override fun onCreateSuccess(sdp: SessionDescription?) {
                println("NavTalk-->WebRTC-->createAnswer-->onCreateSucces")
                if (sdp==null) return
                peerConnection?.setLocalDescription(object : SdpObserver {
                    override fun onSetSuccess() {
                        println("NavTalk-->WebRTC-->setLocalDescription-->SetSuccess")
                        //发送 Answer
                        sendAnswer(sdp)
                    }
                    override fun onSetFailure(p0: String?) {}
                    override fun onCreateSuccess(p0: SessionDescription?) {}
                    override fun onCreateFailure(p0: String?) {}
                }, sdp)
            }
            override fun onCreateFailure(p0: String?) {}
            override fun onSetSuccess() {}
            override fun onSetFailure(p0: String?) {}
        }, constraints)
    }
    //处理ICEArray为WebRTC需要的数据
    fun parseIceServers(jsonArray: JSONArray?): List<PeerConnection.IceServer>? {
        if (jsonArray == null) return null
        val iceServerList = mutableListOf<PeerConnection.IceServer>()
        for (i in 0 until jsonArray.length()) {
            val obj = jsonArray.getJSONObject(i)
            // 1. urls
            val urlsJson = obj.getJSONArray("urls") ?: continue
            val urls = mutableListOf<String>()
            for (j in 0 until urlsJson.length()) {
                urls.add(urlsJson.getString(j))
            }
            // 2. username & credential（可能没有）
            val username = obj.optString("username", null)
            val credential = obj.optString("credential", null)
            val iceServer = if (!username.isNullOrEmpty() && !credential.isNullOrEmpty()) {
                PeerConnection.IceServer
                    .builder(urls)
                    .setUsername(username)
                    .setPassword(credential)
                    .createIceServer()
            } else {
                PeerConnection.IceServer
                    .builder(urls)
                    .createIceServer()
            }
            iceServerList.add(iceServer)
        }
        return iceServerList
    }

    //2.发送Answer消息给远端设备
    private fun sendAnswer(sdp: SessionDescription) {
        val message = JSONObject().apply {
            put("type", "webrtc.signaling.answer")
            put("data", JSONObject().apply {
                put("sdp", JSONObject().apply {
                    put("type", "answer")
                    put("sdp", sdp.description)
                })
            })
        }
        WebsocketManager.webSocket?.send(message.toString())
        println("NavTalk-->发送Answer消息-->${message.toString()}")
    }
    //3.发送本地的ICE消息给远端设备
    private fun sendIceCandidate(candidate: IceCandidate) {
        val message = JSONObject().apply {
            put("type", "webrtc.signaling.iceCandidate")
            put("data", JSONObject().apply {
                put("candidate", JSONObject().apply {
                    put("candidate", candidate.sdp)
                    put("sdpMLineIndex", candidate.sdpMLineIndex)
                    put("sdpMid", candidate.sdpMid)
                })
            })
        }
        WebsocketManager.webSocket?.send(message.toString())
        println("NavTalk-->发送本地的ICE消息-->${message.toString()}")
    }

    //4.处理服务器发送过来的answer消息
    fun handleAnswerMessage(message: String){
        val json = JSONObject(message)
        val sdpDict = json.optJSONObject("sdp") ?: return
        val sdpString = sdpDict.optString("sdp", null) ?: return
        val answer = SessionDescription(SessionDescription.Type.ANSWER, sdpString)
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                println("NavTalk-->Set remote description success")
            }
            override fun onSetFailure(error: String?) {
                println("NavTalk-->Set remote description failed: $error")
            }
            override fun onCreateSuccess(p0: SessionDescription?) {}
            override fun onCreateFailure(p0: String?) {}
        }, answer)
    }
    //5.处理服务器发送过来的iceCandidate消息
    fun handleIceCandidateMessage(message: String){
        val json = JSONObject(message)
        val data = json.optJSONObject("data") ?: return
        val candidateDict = data.optJSONObject("candidate") ?: return
        val sdp = candidateDict.optString("candidate", null) ?: return
        val sdpMLineIndex = candidateDict.optInt("sdpMLineIndex", -1)
        if (sdpMLineIndex == -1) return
        val sdpMid = candidateDict.optString("sdpMid", null) ?: return
        val candidate = IceCandidate(sdpMid, sdpMLineIndex, sdp)
        peerConnection?.addIceCandidate(candidate)
        println("NavTalk-->Set remote IceCandidate success")
    }
    //6.断开连接
    fun disconnectWebRTC(){
        // 1. 移除视频绑定
        remoteVideoTrack?.removeSink(remoteRenderView)
        remoteVideoTrack = null
        // 2. 关闭 PeerConnection
        try {
            peerConnection?.close()
        } catch (e: Exception) {
            println("NavTalk-->WebRTC-->peerConnection close error: ${e.message}")
        }

        try {
            peerConnection?.dispose()
        } catch (e: Exception) {
            println("NavTalk-->WebRTC-->peerConnection dispose error: ${e.message}")
        }
        peerConnection = null
        // 3. 理会话级参数
        targetSessionId = null
        iceServers = null

        println("NavTalk-->WebRTC-->断开连接完成")
    }
}

