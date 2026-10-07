package com.example.musicswipe

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.musicswipe.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: PlayerPrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = PlayerPrefs(this)

        binding.btnOverlayPermission.setOnClickListener { requestOverlayPermission() }
        binding.btnAccessibilitySettings.setOnClickListener {
            openSettings(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        }
        binding.btnNotificationAccess.setOnClickListener {
            openSettings("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
        }
        binding.btnPickPlayer.setOnClickListener {
            startActivity(Intent(this, PlayerPickerActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            startActivity(Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            ))
        } else {
            Toast.makeText(this, R.string.permission_already_granted, Toast.LENGTH_SHORT).show()
        }
    }

    private fun openSettings(action: String) {
        try { startActivity(Intent(action)) } catch (e: Exception) {
            Toast.makeText(this, R.string.cannot_open_settings, Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateStatus() {
        val overlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)
        binding.tvOverlayStatus.text = status(overlay)
        binding.tvAccessibilityStatus.text = status(isAccessibilityEnabled())
        binding.tvNotificationStatus.text = status(MusicNotificationListenerService.isEnabled(this))
        binding.tvSelectedPlayer.text = prefs.selectedLabel ?: getString(R.string.no_player_selected)
    }

    private fun status(granted: Boolean) =
        getString(if (granted) R.string.permission_granted else R.string.permission_not_granted)

    private fun isAccessibilityEnabled(): Boolean {
        val service = "$packageName/${SwipeAccessibilityService::class.java.name}"
        val enabled = Settings.Secure.getString(
            contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabled.split(':').any { it.equals(service, ignoreCase = true) }
    }
}
