import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

object NotificationCenter {
    // 内部共享流
    private val _events = MutableSharedFlow<Pair<String, Any>>(extraBufferCapacity = 100)
    val events = _events.asSharedFlow()  // 只读流

    // 发送事件
    fun post(eventName: String, data: Any) {
        CoroutineScope(Dispatchers.Default).launch {
            _events.emit(eventName to data)
        }
    }

    // 订阅事件
    fun observe(eventName: String, onEvent: (Any) -> Unit) {
        CoroutineScope(Dispatchers.Main).launch {
            events.collect { (name, data) ->
                if (name == eventName) {
                    onEvent(data)
                }
            }
        }
    }
}