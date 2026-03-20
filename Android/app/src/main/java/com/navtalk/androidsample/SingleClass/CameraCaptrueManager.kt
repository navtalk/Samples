import android.app.NotificationManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.util.Base64
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.navtalk.androidsample.SingleClass.WebsocketManager
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.Timer
import java.util.TimerTask
import java.util.concurrent.Executors

enum class CameraStatus { UNKNOWN, OPENED, CLOSED }

object CameraCaptureManager{

    var currentCameraStatus = CameraStatus.UNKNOWN
    var isOrNotHaveCameraPermission: Boolean = false

    private var cameraProvider: ProcessCameraProvider? = null
    private var preview: Preview? = null
    // 默认选择后置摄像头
    private var cameraSelector: CameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

    // 单线程处理每一帧
    private val cameraExecutor = Executors.newSingleThreadExecutor()

    private var timer: Timer? = null
    private var isAllowSendImage = true

    /* 1.启动摄像头预览 */
    //@param context Activity 或 Context，必须是 LifecycleOwner
    //@param previewView CameraX PreviewView，用于显示画面
    fun startPreview(context: Context, previewView: androidx.camera.view.PreviewView) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            //创建 Preview 用例
            cameraProvider = cameraProviderFuture.get()
            preview = Preview.Builder().build()
            //设置输出到 PreviewView 的 Surface
            preview?.setSurfaceProvider(previewView.surfaceProvider)

            //创建 ImageAnalysis 用例（获取每一帧）
            val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
            // 直接在这里处理每一帧, 单独的线程中去处理
            //val cameraExecutor = ContextCompat.getMainExecutor(context)
            imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                if (isAllowSendImage == true){
                    val bitmap = imageProxy.toBitmap()  // 私有扩展函数
                    bitmap?.let {
                        // 在这里处理每一帧，比如转 Base64 上传
                        val bytes = ByteArrayOutputStream().apply {
                            it.compress(Bitmap.CompressFormat.JPEG, 70, this)
                        }.toByteArray()
                        val base64String = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        //println("NavTalk-->Captured frame base64 size: ${base64String.length}")
                        val imageUrl = "data:image/jpeg;base64,$base64String"
                        // 0 = no immediate reply, 1 = request reply
                        val message = JSONObject().apply {
                            put("type","realtime.input_image")
                            put("data", JSONObject().apply {
                                put("content",imageUrl)
                                put("reply", 0)
                            })
                        }
                        WebsocketManager.webSocket?.send(message.toString())
                        isAllowSendImage = false
                        println("NavTalk-->发送截取自相机的图片Size: ${message.toString().length}")
                    }
                    //Test Code：
                    //isAllowSendImage = false
                    //println("NavTalk-->发送截取自相机的图片")
                }
                imageProxy.close()
            }
            try {
                // 解绑之前所有用例
                cameraProvider?.unbindAll()
                // 绑定生命周期与用例
                cameraProvider?.bindToLifecycle(
                    context as androidx.lifecycle.LifecycleOwner,
                    cameraSelector,
                    preview,
                    imageAnalysis
                )
                currentCameraStatus = CameraStatus.OPENED
                NotificationCenter.post("ChangeCameraStatus","")
            } catch (e: Exception) {
                currentCameraStatus = CameraStatus.CLOSED
                NotificationCenter.post("ChangeCameraStatus","")
                e.printStackTrace()
            }
        }, ContextCompat.getMainExecutor(context))

        //开启定时器
        startTimer()
    }
    /* 2.切换前后摄像头 */
    fun switchCamera(context: Context, previewView: androidx.camera.view.PreviewView) {
        cameraSelector = if (cameraSelector == CameraSelector.DEFAULT_BACK_CAMERA)
            CameraSelector.DEFAULT_FRONT_CAMERA
        else
            CameraSelector.DEFAULT_BACK_CAMERA
        startPreview(context, previewView)
    }

    /*3.定时器*/
    fun startTimer() {
        if (timer != null) {
            stopTimer()
        }
        timer = Timer()
        timer?.schedule(object : TimerTask() {
            override fun run() {
                //这里运行的是子线程--定时器执行任务
                isAllowSendImage = true
            }
        }, 0, 2000) // 延迟0ms开始，每隔2s执行一次
    }
    fun stopTimer() {
        timer?.cancel()  // 停止任务
        timer = null
    }

    /*4.释放摄像头资源 */
    fun release() {
        cameraProvider?.unbindAll()
        stopTimer()
        currentCameraStatus = CameraStatus.CLOSED
        NotificationCenter.post("ChangeCameraStatus","")
    }
    /** ImageProxy -> Bitmap 转换 */
    private fun ImageProxy.toBitmap(): Bitmap? {
        if (format != ImageFormat.YUV_420_888) return null
        val yBuffer = planes[0].buffer
        val uBuffer = planes[1].buffer
        val vBuffer = planes[2].buffer

        val ySize = yBuffer.remaining()
        val uSize = uBuffer.remaining()
        val vSize = vBuffer.remaining()

        val nv21 = ByteArray(ySize + uSize + vSize)

        yBuffer.get(nv21, 0, ySize)
        vBuffer.get(nv21, ySize, vSize)   // 注意顺序：V U
        uBuffer.get(nv21, ySize + vSize, uSize)

        val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)
        val out = ByteArrayOutputStream()
        yuvImage.compressToJpeg(Rect(0, 0, width, height), 80, out)
        val imageBytes = out.toByteArray()
        return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
    }

    /** Bitmap -> Base64 */
    fun bitmapToBase64(bitmap: Bitmap): String {
        val byteArrayOutputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, byteArrayOutputStream)
        val bytes = byteArrayOutputStream.toByteArray()
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}
