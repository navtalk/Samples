package com.navtalk.androidsample;
import android.app.Activity;
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.graphics.Color
import android.view.WindowInsetsController
import androidx.core.view.WindowCompat

// MainActivity 继承 Activity，表示这是一个 Android 页面
class MainActivity: Activity(){
    //Activity 第一次创建时调用
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        println("Activity--当活动第一次被创建时调用")
        setContentView(R.layout.main_activity)
        setupStatusBarUI()
        initUI()
    }
    //设置状态栏UI：
    fun setupStatusBarUI(){
        // ① 内容延伸到状态栏
        WindowCompat.setDecorFitsSystemWindows(window, false)
        // ② 状态栏透明（必须手动设）
        window.statusBarColor = Color.TRANSPARENT
        // ③ 设置状态栏字体颜色（根据背景选）：把“状态栏样式”设置为“深色文字模式”
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+
            window.insetsController?.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            )
        }else{
            // 兼容旧版本
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }
    }
    //设置UI：
    fun initUI(){
        val chatButton: Button = findViewById(R.id.ChatButton)
        chatButton.setOnClickListener {
            startActivity(Intent(this, ChatActivity::class.java))
        }

    }
}