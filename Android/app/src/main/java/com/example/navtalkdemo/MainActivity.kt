package com.example.navtalkdemo

import android.content.Intent
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.AppCompatButton
import androidx.compose.ui.platform.LocalContext
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import coil.load
import com.example.navtalkdemo.databinding.ActivityMainBinding
import com.example.navtalkdemo.databinding.ActivityRealtimeBinding
import com.hjq.permissions.OnPermissionCallback
import com.hjq.permissions.XXPermissions
import com.hjq.permissions.permission.PermissionLists
import com.hjq.permissions.permission.base.IPermission

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        XXPermissions.with(this)
            .permission(PermissionLists.getRecordAudioPermission())
            .request { grantedList, deniedList ->{

            } }
        findViewById<AppCompatButton>(R.id.btn_realtime).setOnClickListener{
            startActivity(Intent(this, RealtimeActivity::class.java))
        }

        findViewById<AppCompatButton>(R.id.btn_video).setOnClickListener{
            startActivity(Intent(this, VideoActivity::class.java))
        }
    }
}