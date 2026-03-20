package com.navtalk.androidsample

import android.animation.ValueAnimator
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.graphics.Color
import android.os.Build
import android.os.Looper
import android.view.View
import android.view.WindowInsetsController
import android.view.animation.ScaleAnimation
import android.widget.ImageView
import androidx.core.view.WindowCompat
import android.os.Handler
import android.util.TypedValue


class LaunchActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.launch_activity)
        // 关键: 必须在setContentView之后配置，否则会Crush
        setupStatusBarUI()
        // 动画
        startToFitLogoImage()
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
    //动画：1s内将图标从小放到大
    fun startToFitLogoImage(){
        val logo = findViewById<ImageView>(R.id.logoImage)
        // 初始宽高 0
        logo.layoutParams.width = 0
        logo.layoutParams.height = 0
        logo.requestLayout()

        // dp -> px 转换
        val targetSizePx = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            200f,
            resources.displayMetrics
        ).toInt()

        // ValueAnimator 从 0 -> targetSizePx
        val animator = ValueAnimator.ofInt(0, targetSizePx)
        animator.duration = 1000 // 1秒
        animator.addUpdateListener { animation ->
            val value = animation.animatedValue as Int
            logo.layoutParams.width = value
            logo.layoutParams.height = value
            logo.requestLayout()
        }
        animator.start()

        // 2秒后跳转 MainActivity
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }, 2000)
    }
}