package com.example.musicswipe

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.res.Configuration
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import coil.load
import com.example.musicswipe.databinding.OverlayPanelBinding

class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private var panelView: View? = null
    private var binding: OverlayPanelBinding? = null
    private lateinit var mediaController: MediaControllerManager
    private var panelWidth = 0

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        mediaController = MediaControllerManager(this).apply {
            onTrackChanged = { info -> updateUi(info) }
        }
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW_PANEL -> {
                startInForeground()
                showPanel()
            }
            ACTION_HIDE_PANEL -> hidePanel()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        removePanelImmediate()
        mediaController.disconnect()
        super.onDestroy()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (panelView != null) {
            removePanelImmediate()
            showPanel()
        }
    }

    private fun startInForeground() {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
            android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), type)
    }

    private fun buildNotification(): Notification {
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Music Swipe", NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun showPanel() {
        if (panelView != null) return

        val b = OverlayPanelBinding.inflate(LayoutInflater.from(this))
        binding = b
        val panel = b.root
        panelView = panel

        val metrics = resources.displayMetrics
        panelWidth = (metrics.widthPixels * 0.85f).coerceAtMost(dp(360)).toInt()

        val params = WindowManager.LayoutParams(
            panelWidth,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = dp(8)
            y = dp(120)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags = flags or WindowManager.LayoutParams.FLAG_BLUR_BEHIND
                setBlurBehindRadius(dp(80))
            }
        }

        panel.translationX = -panelWidth.toFloat()

        try {
            windowManager.addView(panel, params)
        } catch (e: Exception) {
            Log.e(TAG, "addView failed", e)
            panelView = null; binding = null
            stopSelf()
            return
        }

        bindControls(b)
        mediaController.connect()

        panel.animate()
            .translationX(0f)
            .setDuration(SLIDE_MS)
            .setInterpolator(DecelerateInterpolator())
            .start()
    }

    private fun bindControls(b: OverlayPanelBinding) {
        b.btnPlayPause.setOnClickListener { mediaController.togglePlayPause() }
        b.btnNext.setOnClickListener { mediaController.skipToNext() }
        b.btnPrevious.setOnClickListener { mediaController.skipToPrevious() }
        b.btnClose.setOnClickListener { hidePanel() }
    }

    private fun updateUi(info: MediaControllerManager.TrackInfo) {
        val b = binding ?: return
        b.tvTitle.text = info.title ?: getString(R.string.unknown_title)
        b.tvArtist.text = info.artist ?: getString(R.string.unknown_artist)
        b.btnPlayPause.setImageResource(
            if (info.isPlaying) R.drawable.ic_pause else R.drawable.ic_play
        )

        val art: ImageView = b.imgAlbumArt
        when {
            info.albumArt != null -> art.setImageBitmap(info.albumArt)
            !info.albumArtUri.isNullOrEmpty() -> art.load(info.albumArtUri) { crossfade(true) }
            else -> art.setImageResource(R.drawable.ic_album_placeholder)
        }
    }

    private fun hidePanel() {
        val panel = panelView ?: return
        panel.animate()
            .translationX(-panelWidth.toFloat())
            .setDuration(SLIDE_MS)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                removePanelImmediate()
                stopSelf()
            }
            .start()
    }

    private fun removePanelImmediate() {
        panelView?.let {
            try { windowManager.removeView(it) } catch (e: Exception) {
                Log.e(TAG, "removeView failed", e)
            }
        }
        panelView = null
        binding = null
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    companion object {
        private const val TAG = "OverlayService"
        private const val CHANNEL_ID = "music_swipe_channel"
        private const val NOTIFICATION_ID = 1001
        private const val SLIDE_MS = 280L

        const val ACTION_SHOW_PANEL = "com.example.musicswipe.SHOW_PANEL"
        const val ACTION_HIDE_PANEL = "com.example.musicswipe.HIDE_PANEL"
    }
}
