package com.example.musicswipe

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Handler
import android.os.Looper
import android.util.Log

class MediaControllerManager(private val context: Context) {

    data class TrackInfo(
        val title: String?,
        val artist: String?,
        val albumArt: Bitmap?,
        val albumArtUri: String?,
        val isPlaying: Boolean
    )

    var onTrackChanged: ((TrackInfo) -> Unit)? = null

    private var controller: MediaController? = null
    private val handler = Handler(Looper.getMainLooper())

    private val callback = object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: MediaMetadata?) = emit()
        override fun onPlaybackStateChanged(state: PlaybackState?) = emit()
        override fun onSessionDestroyed() {
            handler.post { onTrackChanged?.invoke(empty()) }
        }
    }

    fun connect() {
        disconnect()

        val pkg = PlayerPrefs(context).selectedPackage ?: run {
            Log.d(TAG, "No player selected")
            return
        }

        if (!MusicNotificationListenerService.isEnabled(context)) {
            Log.d(TAG, "Notification listener disabled")
            return
        }

        val sessions = try {
            context.getSystemService(MediaSessionManager::class.java)
                .getActiveSessions(MusicNotificationListenerService.component(context))
        } catch (e: SecurityException) {
            Log.e(TAG, "getActiveSessions denied", e)
            emptyList()
        }

        val session = sessions.firstOrNull { it.packageName == pkg } ?: run {
            Log.d(TAG, "No active session for $pkg")
            return
        }

        controller = MediaController(context, session.sessionToken).also {
            it.registerCallback(callback, handler)
        }
        emit()
    }

    private fun emit() {
        val c = controller ?: return
        val md = c.metadata
        val state = c.playbackState?.state

        val info = TrackInfo(
            title = md?.getString(MediaMetadata.METADATA_KEY_TITLE),
            artist = md?.getString(MediaMetadata.METADATA_KEY_ARTIST)
                ?: md?.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST),
            albumArt = md?.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART)
                ?: md?.getBitmap(MediaMetadata.METADATA_KEY_ART),
            albumArtUri = md?.getString(MediaMetadata.METADATA_KEY_ALBUM_ART_URI)
                ?: md?.getString(MediaMetadata.METADATA_KEY_ART_URI),
            isPlaying = state == PlaybackState.STATE_PLAYING
        )
        handler.post { onTrackChanged?.invoke(info) }
    }

    private fun empty() = TrackInfo(null, null, null, null, false)

    fun togglePlayPause() {
        val c = controller ?: return
        when (c.playbackState?.state) {
            PlaybackState.STATE_PLAYING -> c.transportControls.pause()
            else -> c.transportControls.play()
        }
    }

    fun skipToNext() = controller?.transportControls?.skipToNext()
    fun skipToPrevious() = controller?.transportControls?.skipToPrevious()

    fun disconnect() {
        controller?.unregisterCallback(callback)
        controller = null
    }

    private companion object { const val TAG = "MediaControllerMgr" }
}
