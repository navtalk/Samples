package com.navtalk.androidsample.SingleClass

import android.content.Context
import android.os.Looper
import com.navtalk.androidsample.audio.RecordAudioManager
import es.dmoral.toasty.Toasty
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okhttp3.internal.http2.Http2Reader
import okio.ByteString
import org.json.JSONObject
import java.net.URLEncoder

enum class SocketStatus { NOT_CONNECTED, CONNECTING, CONNECTED }

object WebsocketManager{

    private var websocketUrl: String = "wss://transfer.navtalk.ai/wss/v2/realtime-chat"
    private val client = OkHttpClient()
    var webSocket: WebSocket? = null
    var socketStatus = SocketStatus.NOT_CONNECTED
        private set // 只能内部修改，外部只能读
    //避免内存泄漏，必须持有 Application Context，避免 Activity 泄漏  -- 这个就是显示弹窗的底部页面
    var appContext: Context? = null
    //保存用户的问题和AI的回答
    var allUserAndAIMessages: MutableList<Map<String, Any>> = mutableListOf()

    //2.开始连接Socket
    fun startToConnectWebSocketOfNavTalk(context: Context){
        appContext = context.applicationContext
        if (NavTalkManager.avatar_provider_type.length <= 0){
            Toasty.error(appContext!!, "Please retrieve the avatar details first.", Toasty.LENGTH_SHORT,true).show()
            return
        }
        if (socketStatus == SocketStatus.CONNECTED){
            Toasty.error(appContext!!, "The WebSocket is already connected, no need to connect again.", Toasty.LENGTH_SHORT,true).show()
            return
        }
        if (socketStatus == SocketStatus.CONNECTING){
            Toasty.error(appContext!!, "The WebSocket is currently connecting, please try again later.", Toasty.LENGTH_SHORT,true).show()
            return
        }

        socketStatus = SocketStatus.CONNECTING
        NotificationCenter.post("WebSocketStatusIsChanged","")

        val encodedLicense = URLEncoder.encode(NavTalkManager.license, "UTF-8")
        val encodedCharacterName = URLEncoder.encode(NavTalkManager.characterName, "UTF-8")
        val request = Request.Builder()
            .url("${websocketUrl}?license=${encodedLicense}&name=${encodedCharacterName}")
            .build()
        webSocket = client.newWebSocket(request, object: WebSocketListener(){
            override fun onOpen(ws: WebSocket, response: Response) {
                socketStatus = SocketStatus.CONNECTED
                NotificationCenter.post("WebSocketStatusIsChanged","")
                sendFunctionCall()
            }
            override fun onMessage(ws: WebSocket, text: String) {
                hanleMessageFromSocket(text)
            }
            override fun onMessage(ws: WebSocket, bytes: ByteString) {
            }
            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                ws.close(1000, null)
            }
            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                socketStatus = SocketStatus.NOT_CONNECTED
                NotificationCenter.post("WebSocketStatusIsChanged","")
            }
            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                socketStatus = SocketStatus.NOT_CONNECTED
                NotificationCenter.post("WebSocketStatusIsChanged","")
                Toasty.error(appContext!!, "WebSocket connect fail, please try again later.", Toasty.LENGTH_SHORT,true).show()
            }
        })
    }

    //3.处理Socket收到的消息
    fun hanleMessageFromSocket(message: String){
        //println("NavTalk-->WebSocket收到消息：${message}")
        val jsonObject = JSONObject(message)
        val type = jsonObject.getString("type")
        //println("NavTalk-->WebSocket收到消息的类型--Tye==${type}")

        //(1).type == conversation.connected.success
        if (type == "conversation.connected.success"){
            //println("NavTalk-->WebSocket收到消息数据-->${message}")
            //保存sessionId和iceServers
            val data = jsonObject.optJSONObject("data")
            if (data != null){
                val sessionId = data.optString("sessionId")
                WebRTCManager.targetSessionId = sessionId
                println("NavTalk-->sessionId-->${sessionId}")
                val iceServersJsonArray = data.optJSONArray("iceServers")
                WebRTCManager.iceServers = iceServersJsonArray
                println("NavTalk-->iceServers-->${iceServersJsonArray}")
            }
        }
        //(2).type ==realtime.session.created
        if (type == "realtime.session.created"){
            sendHistoryMessages()
        }
        //(3).type == realtime.session.updated
        if (type == "realtime.session.updated"){
            //RecordAudioManager.shared.startRecordAudio()
            if (appContext != null){
                RecordAudioManager.startRecordAudio(appContext!!)
            }
        }
        //(4).type == realtime.conversation.item.input_audio_transcription.completed
        if (type == "realtime.conversation.item.input_audio_transcription.completed"){
            val data = jsonObject.optJSONObject("data")
            if (data != null){
                val  content = data.optString("content")
                val userMessage = mapOf(
                    "sender" to "user",
                    "content" to content
                )
                allUserAndAIMessages.add(userMessage)
                NotificationCenter.post("MessagesListIsChanged","")
                println("NavTalk-->收到用户的内容-->${content}")
            }
        }
        //(5).type == realtime.response.audio_transcript.done
        if (type == "realtime.response.audio_transcript.done"){
            val data = jsonObject.optJSONObject("data")
            if (data != null){
                val  content = data.optString("content")
                val userMessage = mapOf(
                    "sender" to "ai",
                    "content" to content
                )
                allUserAndAIMessages.add(userMessage)
                println("NavTalk-->NavTalk回答的内容-->${content}")
                NotificationCenter.post("MessagesListIsChanged","")
            }
        }
        //(6).type == realtime.response.function_call_arguments.done
        if (type == "realtime.response.function_call_arguments.done"){
            handleFunctionCall(message)
        }
        //(7).WebRTC相关
        //type == webrtc.signaling.offer
        if (type == "webrtc.signaling.offer"){
            WebRTCManager.handleOfferMessage(message, appContext!!)
        }
        //type == webrtc.signaling.answer
        if (type == "webrtc.signaling.answer"){
            WebRTCManager.handleAnswerMessage(message)
        }
        //type == webrtc.signaling.iceCandidate
        if (type == "conversation.connected.success"){
            WebRTCManager.handleIceCandidateMessage(message)
        }

        if (type == "unknow") {
            // 处理未知类型
            //println("NavTalk-->WebSocket收到消息的类型-->${message}")
        }

    }

    //4.FunctionCall
    //4.1.发送函数：
    fun sendFunctionCall(){
        //(1).构建参数数据：Functions
        val functions = listOf(
            mapOf(
                "type" to "function",
                "name" to "function_call_close_talk",
                "description" to "Please trigger this method when you receive a message or when the conversation is closed.",
                "parameters" to mapOf(
                    "type" to "object",
                    "properties" to mapOf(
                        "userInput" to mapOf(
                            "type" to "string",
                            "description" to "Raw user request content to be processed"
                        )
                    ),
                    "required" to listOf("userInput")
                )
            )
        )
        val functionsJsonString = org.json.JSONObject(mapOf("functions" to functions)).getJSONArray("functions").toString()
        //(2).构建Message
        val message = mapOf(
            "type" to "realtime.input_function_call",
            "data" to mapOf("content" to functionsJsonString)
        )
        val messageJsonString = org.json.JSONObject(message).toString()
        //(3).发送Message
        webSocket?.send(messageJsonString)
        println("NavTalk-->Send Function Call Data:${messageJsonString}")
    }
    //4.2.处理函数回调:
    fun handleFunctionCall(message: String){
        /*
         ["data": {
             arguments =     {
                 userInput = "\U5173\U95ed\U5bf9\U8bdd";
             };
             "call_id" = "call_JZ0DWumfrsN5Kxgm";
             "function_name" = "function_call_close_talk";
         }, "raw_data": {
             arguments = "{  \n  \"userInput\": \"\U5173\U95ed\U5bf9\U8bdd\"\n}";
             "call_id" = "call_JZ0DWumfrsN5Kxgm";
             "event_id" = "event_DIVB1JW5bGHAYIDBeVdoo";
             "item_id" = "item_DIVB0UxgBhrlBwcyFyrbB";
             name = "function_call_close_talk";
             "output_index" = 0;
             "response_id" = "resp_DIVB0YYUxlS7kL93EncQZ";
             type = "response.function_call_arguments.done";
         }, "type": realtime.response.function_call_arguments.done]
         */
        println("NavTalk-->处理函数回调:${message}")
        NotificationCenter.post("RecieveFunctionCall", message)
    }
    //5.Send History
    fun sendHistoryMessages(){
        if (allUserAndAIMessages.count() <= 0) return
        val content_array: MutableList<Map<String, Any>> = mutableListOf()
        for (message in allUserAndAIMessages){
            val sender = message["sender"]
            val content = message["content"] as String
            if (sender == "user" && content.count()>0){
                val current_content: MutableMap<String, Any> = mutableMapOf()
                current_content["type"] = "input_text"
                current_content["text"] = content
                content_array.add(current_content)
            }
        }
        if (content_array.count() <= 0) return
        val message = JSONObject().apply {
            put("type", "conversation.item.create")
            put("item", JSONObject().apply {
                put("type", "message")
                put("role", "user")
                put("content", content_array)
            })
        }
        webSocket?.send(message.toString())
        println("NavTalk-->发送历史消息-->${message.toString()}")
    }

    //6.断开链接
    fun disconnectWebSocket(){
        webSocket?.close(1000, "Normal Closure")
        webSocket = null
    }
}