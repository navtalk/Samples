package com.navtalk.androidsample

import CameraCaptureManager
import CameraStatus
import NavTalkManager
import NotificationCenter
import WebRTCManager
import WebRTCStatus
import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.view.PreviewView
import androidx.constraintlayout.widget.ConstraintSet
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.navtalk.androidsample.SingleClass.SocketStatus
import com.navtalk.androidsample.SingleClass.WebsocketManager
import com.navtalk.androidsample.audio.RecordAudioManager
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okio.IOException
import org.json.JSONObject
import org.webrtc.*


class ChatActivity : AppCompatActivity() {

    lateinit var remote_RenderCiew: SurfaceViewRenderer
    private var isCkeckWebSocketStatus: Boolean = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.chat_activity)
        initUI()
        fetchAvatarDetailInformation()
        addAllListenerOfNotificationCenter()
    }

    //1.配置UI
    fun initUI(){
        val callStatusView: FrameLayout = findViewById(R.id.callStatusView)
        callStatusView.setOnClickListener {
            clickCallButton()
        }
        val microphoneStatusView: FrameLayout = findViewById(R.id.microphoneStatusView)
        microphoneStatusView.setOnClickListener {
            clickMicrophoneButton()
        }
        val cameraStatusView: FrameLayout = findViewById(R.id.cameraStatusView)
        cameraStatusView.setOnClickListener {
            clickCameraButton()
        }
        val switchCameraDirectionIcon: ImageView = findViewById(R.id.switchCameraDirectionIcon)
        switchCameraDirectionIcon.setOnClickListener {
            switchCameraDirection()
        }

        //初始化remoteVideoView
        val eglBase = EglBase.create()
        val remoteVideoView: SurfaceViewRenderer = findViewById(R.id.remoteVideoView)
        remoteVideoView.apply {
            init(eglBase.eglBaseContext, null)
            //setZOrderMediaOverlay(true) // 设置为覆盖层（在其他 UI 上层）
            setEnableHardwareScaler(true) // 启用硬件缩放
            setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL) // 保持比例填充
        }
        remoteVideoView.alpha = 0f
        remoteVideoView.visibility = View.INVISIBLE
        remote_RenderCiew = remoteVideoView
        WebRTCManager.remoteRenderView = remote_RenderCiew

        //刷新摄像头按钮视图
        updateCameraButtonUI()
        //确保预览画面不会超出父视图
        val cameraPreview: PreviewView = findViewById(R.id.cameraPreview)
        cameraPreview.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        cameraPreview.scaleType = PreviewView.ScaleType.FILL_CENTER

        //消息列表
        setupMessagesListUI()
        val messagesListView: RecyclerView = findViewById(R.id.messagesListView)
        messagesListView.visibility = View.INVISIBLE
    }

    //2.获取Avatar详情
    fun fetchAvatarDetailInformation(){
        val urlString = "https://api.navtalk.ai/api/open/v1/avatar/getByName?license=${NavTalkManager.license}&name=${NavTalkManager.characterName}"
        println("NavTalk-->Fetch Avatar Detail Information--urlString: ${urlString}")
        val client = OkHttpClient()
        val request = Request.Builder()
            .url(urlString)
            .get()
            .addHeader("license",NavTalkManager.license)
            .build()
        client.newCall(request).enqueue(object : Callback{
            override fun onFailure(call: Call, e: IOException) {
                println("NavTalk-->Fetch Avatar Detail Information--Fail $e")
            }
            override fun onResponse(call: Call, response: Response){
                val body = response.body?.string()
                println("NavTalk-->Fetch Avatar Detail Information--Success $body")
                //序列化JSON
                try {
                    val json = JSONObject(body)
                    val data = json.getJSONObject("data")
                    val imageURL = data.getString("url")
                    val providerName = data.getString("providerName")
                    println("NavTalk-->Fetch Avatar Detail Information--imageURL=${imageURL},  providerName=${providerName}")
                    if (imageURL.length > 0 && providerName.length > 0){
                        NavTalkManager.avatar_image_url = imageURL
                        NavTalkManager.avatar_provider_type = providerName
                        //主线程中更新UI
                        runOnUiThread {
                            //设置背景图片
                            val backgroundImageView: ImageView = findViewById(R.id.backgroundImageView)
                            Glide.with(this@ChatActivity)
                                .load(imageURL)
                                .placeholder(R.drawable.default_background)
                                .into(backgroundImageView)
                            //根据providerName判断是否允许操作camera
                            val cameraStatusView: FrameLayout = findViewById(R.id.cameraStatusView)
                            if (providerName != "openai"){
                                cameraStatusView.isEnabled = false
                                cameraStatusView.alpha = 0.5f
                                //请求麦克风权限
                                requestPermissionOfMicrophone()
                            }else{
                                cameraStatusView.isEnabled = true
                                cameraStatusView.alpha = 1f
                                //请求摄像头权限--请求完再顺序请求麦克风权限
                                requestPermissionOfCamera()
                            }
                        }
                    }
                }catch (e: Exception){
                    println("NavTalk-->Fetch Avatar Detail Information--Parse error: $e")
                }
            }
        })
    }

    //3.点击事件：
    //3.1.点击--通话按钮
    fun clickCallButton(){
        println("NavTalk-->点击事件--callStatusView")
        if (WebsocketManager.socketStatus == SocketStatus.NOT_CONNECTED){
            isCkeckWebSocketStatus = true
            WebsocketManager.startToConnectWebSocketOfNavTalk(applicationContext)
        }else if (WebsocketManager.socketStatus == SocketStatus.CONNECTING){
            println("Websocket is connecting...")
        }else if (WebsocketManager.socketStatus == SocketStatus.CONNECTED){
            //更新视图
            val callStatusView: FrameLayout = findViewById(R.id.callStatusView)
            callStatusView.isEnabled = false
            callStatusView.alpha = 0.7f
            val microphoneStatusView: FrameLayout = findViewById(R.id.microphoneStatusView)
            microphoneStatusView.visibility = View.INVISIBLE
            val cameraStatusView: FrameLayout = findViewById(R.id.cameraStatusView)
            cameraStatusView.visibility = View.INVISIBLE
            hiddenRTCRemoteVideoChangeShowStatus()
            //停止相关业务:
            //断开WebScoket
            WebsocketManager.disconnectWebSocket()
            //断开WebRTC
            WebRTCManager.disconnectWebRTC()
            //停止采集音频
            RecordAudioManager.stopCaptureAudio()
            //停止采集视频
            if (CameraCaptureManager.currentCameraStatus == CameraStatus.OPENED){
                CameraCaptureManager.release()
            }
        }
    }
    //3.2.点击--麦克风按钮
    fun clickMicrophoneButton(){
        println("NavTalk-->点击事件--microphoneStatusView")
        if (RecordAudioManager.recordStatus == "no"){
            RecordAudioManager.resumeSendAudioMessageToAI()
        }else{
            RecordAudioManager.pauseSendAudioMessageToAI()
        }
    }
    //3.3.点击--摄像头按钮
    fun clickCameraButton(){
        println("NavTalk-->点击事件--cameraStatusView")
        if (CameraCaptureManager.currentCameraStatus == CameraStatus.UNKNOWN || CameraCaptureManager.currentCameraStatus == CameraStatus.CLOSED){
            val cameraPreview: PreviewView = findViewById(R.id.cameraPreview)
            CameraCaptureManager.startPreview(this, cameraPreview)
        }else{
            CameraCaptureManager.release()
        }
    }
    //3.4.切换摄像头前后镜头
    fun switchCameraDirection(){
        val cameraPreview: PreviewView = findViewById(R.id.cameraPreview)
        CameraCaptureManager.switchCamera(this, cameraPreview)
    }
    //4.通知回调
    //4.0.接收通知
    fun addAllListenerOfNotificationCenter(){
        NotificationCenter.observe("WebSocketStatusIsChanged"){data ->
            webSocketStatusIsChanged()
        }
        NotificationCenter.observe("RecordAudioStatusIsChanged"){data ->
            recordAudioStatusIsChanged()
        }
        NotificationCenter.observe("WebRTCStatusIsChanged"){data ->
            webRTCStatusIsChanged()
        }
        NotificationCenter.observe("ShowRTCRemoteVideoChangeShowStatus"){data ->
            showRTCRemoteVideoChangeShowStatus()
        }
        NotificationCenter.observe("ConnectTalkFail"){data ->
            //更新视图
            val callStatusView: FrameLayout = findViewById(R.id.callStatusView)
            callStatusView.isEnabled = false
            callStatusView.alpha = 0.7f
            val microphoneStatusView: FrameLayout = findViewById(R.id.microphoneStatusView)
            microphoneStatusView.visibility = View.INVISIBLE
            val cameraStatusView: FrameLayout = findViewById(R.id.cameraStatusView)
            cameraStatusView.visibility = View.INVISIBLE
            hiddenRTCRemoteVideoChangeShowStatus()
            //这里就不要再去重复判断了
            isCkeckWebSocketStatus = false
            //停止相关业务:
            //断开WebScoket
            WebsocketManager.disconnectWebSocket()
            //断开WebRTC
            WebRTCManager.disconnectWebRTC()
            //停止采集音频
            RecordAudioManager.stopCaptureAudio()
            //消息列表
            val messagesListView: RecyclerView = findViewById(R.id.messagesListView)
            messagesListView.visibility = View.INVISIBLE
        }
        NotificationCenter.observe("RecieveFunctionCall"){ data ->
            recieveFunctionCall(data as String)
        }
        NotificationCenter.observe("ChangeCameraStatus"){ data ->
            changeCameraStatus()
        }
        NotificationCenter.observe("MessagesListIsChanged"){ data ->
            messagesListIsChanged()
        }
    }
    //4.1.WebSocket连接状态发生改变
    fun webSocketStatusIsChanged(){
        println("NavTalk-->WebSocket连接状态发生改变==${WebsocketManager.socketStatus}")
        updateCallStatusUI()
    }
    //4.2.webRTC连接状态发生改变
    fun webRTCStatusIsChanged(){
        println("NavTalk-->webRTC连接状态发生改变==${WebRTCManager.webRTCStaus}")
        updateCallStatusUI()
    }
    //4.3.WebSocket连接状态发生改变
    fun recordAudioStatusIsChanged(){
        val microphoneStatusIcon: ImageView = findViewById(R.id.microphoneStatusIcon)
        if (RecordAudioManager.recordStatus == "no"){
            microphoneStatusIcon.setImageResource(R.drawable.micphone_closed)
        }else{
            microphoneStatusIcon.setImageResource(R.drawable.micphone_opend)
        }
    }
    //4.4.根据WebSocket和WebRTC的状态更新视图
    fun updateCallStatusUI(){
        if (WebsocketManager.socketStatus == SocketStatus.NOT_CONNECTED){
            //通话视图
            val callStatusView: FrameLayout = findViewById(R.id.callStatusView)
            callStatusView.isEnabled = true
            callStatusView.alpha = 1f
            val callFullIconView: FrameLayout = findViewById(R.id.callFullIconView)
            callFullIconView.setBackgroundResource(R.drawable.view_radius)
            val callStatusIcon: ImageView = findViewById(R.id.callStatusIcon)
            callStatusIcon.setImageResource(R.drawable.call_open)
            val callStatusText: TextView = findViewById(R.id.callStatusText)
            callStatusText.text = "Call"
            //麦克风视图
            val microphoneStatusView: FrameLayout = findViewById(R.id.microphoneStatusView)
            microphoneStatusView.visibility = View.INVISIBLE
            //相机视图
            val cameraStatusView: FrameLayout = findViewById(R.id.cameraStatusView)
            cameraStatusView.visibility = View.INVISIBLE
            //远程视频视图：
            hiddenRTCRemoteVideoChangeShowStatus()
            //停止采集视频
            if (CameraCaptureManager.currentCameraStatus == CameraStatus.OPENED){
                CameraCaptureManager.release()
            }
            //消息列表
            val messagesListView: RecyclerView = findViewById(R.id.messagesListView)
            messagesListView.visibility = View.INVISIBLE
        }else if (WebsocketManager.socketStatus == SocketStatus.CONNECTING || WebRTCManager.webRTCStaus == WebRTCStatus.CONNECTING){
            //通话视图
            val callStatusView: FrameLayout = findViewById(R.id.callStatusView)
            callStatusView.isEnabled = false
            callStatusView.alpha = 0.7f
            val callFullIconView: FrameLayout = findViewById(R.id.callFullIconView)
            callFullIconView.setBackgroundResource(R.drawable.view_radius_red)
            val callStatusIcon: ImageView = findViewById(R.id.callStatusIcon)
            callStatusIcon.setImageResource(R.drawable.talk_connecting_icon)
            val callStatusText: TextView = findViewById(R.id.callStatusText)
            callStatusText.text = "Connecting..."
            //麦克风视图
            val microphoneStatusView: FrameLayout = findViewById(R.id.microphoneStatusView)
            microphoneStatusView.visibility = View.INVISIBLE
            //相机视图
            val cameraStatusView: FrameLayout = findViewById(R.id.cameraStatusView)
            cameraStatusView.visibility = View.INVISIBLE
            //消息列表
            val messagesListView: RecyclerView = findViewById(R.id.messagesListView)
            messagesListView.visibility = View.INVISIBLE
        }else if (WebsocketManager.socketStatus == SocketStatus.CONNECTED && WebRTCManager.webRTCStaus == WebRTCStatus.CONNECTED){
            //通话视图
            val callStatusView: FrameLayout = findViewById(R.id.callStatusView)
            callStatusView.isEnabled = true
            callStatusView.alpha = 1f
            val callFullIconView: FrameLayout = findViewById(R.id.callFullIconView)
            callFullIconView.setBackgroundResource(R.drawable.view_radius_red)
            val callStatusIcon: ImageView = findViewById(R.id.callStatusIcon)
            callStatusIcon.setImageResource(R.drawable.call_close)
            val callStatusText: TextView = findViewById(R.id.callStatusText)
            callStatusText.text = "Hang Up"
            //麦克风视图
            val microphoneStatusView: FrameLayout = findViewById(R.id.microphoneStatusView)
            microphoneStatusView.visibility = View.VISIBLE
            //相机视图
            val cameraStatusView: FrameLayout = findViewById(R.id.cameraStatusView)
            cameraStatusView.visibility = View.VISIBLE
            //停止采集视频
            if (CameraCaptureManager.currentCameraStatus == CameraStatus.OPENED){
                CameraCaptureManager.release()
            }
            //消息列表
            val messagesListView: RecyclerView = findViewById(R.id.messagesListView)
            messagesListView.visibility = View.VISIBLE
        }
    }
    //5.申请麦克风权限：
    fun requestPermissionOfMicrophone(){
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED) {
            println("NavTalk-->Microphone permission have granted")
            RecordAudioManager.isOrNotHaveMicrophonePermission = true
            updateMicrophoneBottonUI()
        }else{
            //请求权限
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 1001)
        }
    }
    //处理用户的选择结果
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String?>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001){
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED){
                //用户同意后继续执行
                println("NavTalk-->用户同意麦克风权限")
                RecordAudioManager.isOrNotHaveMicrophonePermission = true
                updateMicrophoneBottonUI()
            }else{
                //用户拒绝麦克风权限
                println("NavTalk-->用户拒绝麦克风权限")
                RecordAudioManager.isOrNotHaveMicrophonePermission = false
                updateMicrophoneBottonUI()
            }
        }else if (requestCode == 1002) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // 用户允许权限，打开摄像头
                println("NavTalk-->请求摄像头权限，允许打开摄像头")
                CameraCaptureManager.isOrNotHaveCameraPermission = true
                updateCameraButtonUI()
            } else {
                // 用户允许权限，拒绝打开摄像头
                println("NavTalk-->请求摄像头权限，拒绝打开摄像头")
                CameraCaptureManager.isOrNotHaveCameraPermission = false
                updateCameraButtonUI()
            }
            //顺序请求权限
            requestPermissionOfMicrophone()
        }
    }
    //更新麦克风视图
    fun updateMicrophoneBottonUI(){
        runOnUiThread {
            if (RecordAudioManager.isOrNotHaveMicrophonePermission == false){
                if (RecordAudioManager.recordStatus == "yes"){
                    RecordAudioManager.stopCaptureAudio()
                }
                val microphoneStatusIcon: ImageView = findViewById(R.id.microphoneStatusIcon)
                microphoneStatusIcon.setImageResource(R.drawable.micphone_closed)

                val microphoneStatusView: FrameLayout = findViewById(R.id.microphoneStatusView)
                microphoneStatusView.isEnabled = false
                microphoneStatusView.alpha = 0.5f
            }else{
                val microphoneStatusIcon: ImageView = findViewById(R.id.microphoneStatusIcon)
                microphoneStatusIcon.setImageResource(R.drawable.micphone_opend)

                val microphoneStatusView: FrameLayout = findViewById(R.id.microphoneStatusView)
                microphoneStatusView.isEnabled = true
                microphoneStatusView.alpha = 1f
            }
        }
    }
    //6.是否展示远端视屏
    fun showRTCRemoteVideoChangeShowStatus(){
        val remoteVideoView: org.webrtc.SurfaceViewRenderer = findViewById(R.id.remoteVideoView)
        remoteVideoView.visibility = View.VISIBLE
        val handler = Handler(Looper.getMainLooper())
        handler.postDelayed({
            // 这里写你想延迟执行的代码
            remoteVideoView.alpha = 1f
        }, 500) // 延迟1000毫秒 = 1秒
        println("NavTalk-->展示远端视屏")
    }
    fun hiddenRTCRemoteVideoChangeShowStatus(){
        val remoteVideoView: org.webrtc.SurfaceViewRenderer = findViewById(R.id.remoteVideoView)
        remoteVideoView.alpha = 0f
        val handler = Handler(Looper.getMainLooper())
        handler.postDelayed({
            remoteVideoView.visibility = View.INVISIBLE
        }, 500) // 延迟1000毫秒 = 1秒

        println("NavTalk-->隐藏远端视屏")
    }

    //7.请求摄像头权限
    private fun requestPermissionOfCamera() {
        // 检查是否已拥有摄像头权限
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            println("NavTalk-->请求摄像头权限，还没有权限，去申请权限")
            // 申请权限
            ActivityCompat.requestPermissions(
                this,
                arrayOf(android.Manifest.permission.CAMERA),
                1002 // 请求码，可自定义
            )
        } else {
            //已经有权限
            println("NavTalk-->请求摄像头权限，已经有权限")
            CameraCaptureManager.isOrNotHaveCameraPermission = true
            updateCameraButtonUI()
            //顺序请求权限
            requestPermissionOfMicrophone()
        }
    }
    //更新摄像头按钮的视图
    fun updateCameraButtonUI(){
        val cameraStatusView: FrameLayout = findViewById(R.id.cameraStatusView)
        val cameraFullView: FrameLayout = findViewById(R.id.cameraFullView)
        if (CameraCaptureManager.isOrNotHaveCameraPermission == false){
            cameraStatusView.isEnabled = false
            cameraStatusView.alpha = 0.5f
            cameraFullView.visibility = View.INVISIBLE
        }else{
            cameraStatusView.isEnabled = true
            cameraStatusView.alpha = 1f
        }
    }
    //更新相机预览的视图
    fun changeCameraStatus(){
        val cameraStatusIcon: ImageView =  findViewById(R.id.cameraStatusIcon)
        val cameraFullView: FrameLayout = findViewById(R.id.cameraFullView)
        if (CameraCaptureManager.currentCameraStatus == CameraStatus.OPENED){
            cameraFullView.visibility = View.VISIBLE
            cameraStatusIcon.setImageResource(R.drawable.camera_opened)
        }else{
            cameraFullView.visibility = View.INVISIBLE
            cameraStatusIcon.setImageResource(R.drawable.camera_closed)
        }
    }
    //8.处理FunctionCall
    fun recieveFunctionCall(message: String){
        val jsonObject = JSONObject(message)
        val data = jsonObject.optJSONObject("data")
        val function_name = data.getString("function_name")
        if (function_name == "function_call_close_talk"){
            clickCallButton()
        }
    }
    //9.处理消息列表
    fun setupMessagesListUI(){
        val messagesListView: RecyclerView = findViewById(R.id.messagesListView)
        //(1).setLayoutManager--设置 RecyclerView 的布局管理器
        val layoutManager = LinearLayoutManager(this)  //默认垂直展示
        messagesListView.layoutManager = layoutManager
        //(2).ItemDecoration（分割线）
        messagesListView.addItemDecoration(object : RecyclerView.ItemDecoration() {
            override fun getItemOffsets(
                outRect: android.graphics.Rect,
                view: android.view.View,
                parent: RecyclerView,
                state: RecyclerView.State
            ) {
                outRect.bottom = 1 // 每个 item 底部间距（1px）
            }
        })
        // 自定义 ViewHolder
        // RecyclerView 的核心是 ViewHolder，它持有 item 视图中的控件引用
        class MyViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val itemBackgroudView: FrameLayout = itemView.findViewById(R.id.itemBackgroudView)
            val itemMessageTextView: TextView = itemView.findViewById(R.id.itemMessageTextView)
        }
        //(3).setAdapter--设置 RecyclerView 的数据适配器
         messagesListView.adapter = object : RecyclerView.Adapter<RecyclerView.ViewHolder>(){
             //(a).返回 item 数量
             override fun getItemCount(): Int {
                 return WebsocketManager.allUserAndAIMessages.count()
             }
             //(b).创建每个 item 视图
             override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
                 //从XML 布局加载 item_message.xml
                 val myViewFile = LayoutInflater.from(parent.context).inflate(R.layout.item_message,parent,false)
                 //创建自定义的 MyViewHolder 并返回
                 val myView = MyViewHolder(myViewFile)
                 return myView
             }
             //(c).设置每个item内容
             override fun onBindViewHolder(
                 holder: RecyclerView.ViewHolder,
                 position: Int
             ) {
                 //获取数据源
                 val current_message = WebsocketManager.allUserAndAIMessages[position]
                 //获取到我们的自定义的消息UI的对象
                 val messageItem = holder as MyViewHolder
                 //设置背景颜色:
                 if (current_message["sender"] == "user"){
                     messageItem.itemBackgroudView.setBackgroundResource(R.drawable.message_item_radius_user)
                 }else{
                     messageItem.itemBackgroudView.setBackgroundResource(R.drawable.message_item_radius_ai)
                 }
                 //设置TextView文本
                 messageItem.itemMessageTextView.text = current_message["content"] as String

             }
         }
    }

    //消息列表更新了
    fun messagesListIsChanged(){
        //println("NavTalk-->消息列表更新了-->${WebsocketManager.allUserAndAIMessages.count()}")
        val messagesListView: RecyclerView = findViewById(R.id.messagesListView)
        messagesListView.adapter?.notifyDataSetChanged()
        // 滚动到底部
        messagesListView.scrollToPosition(WebsocketManager.allUserAndAIMessages.count() - 1)
    }
}