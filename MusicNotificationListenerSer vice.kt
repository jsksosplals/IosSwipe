package com.example.musicswipe

import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.util.Log

class MusicNotificationListenerService : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification listener connected")
        instance = this
    }

    override fun onListenerDisconnected() {
        instance = null
        Log.d(TAG, "Notification listener disconnected")
        super.onListenerDisconnected()
    }

    companion object {
        private const val TAG = "NLService"

        @Volatile
        var instance: MusicNotificationListenerService? = null
            private set

        fun isEnabled(context: Context): Boolean {
            val flat = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            val target = component(context).flattenToString()
            return flat.split(':').any { it.equals(target, ignoreCase = true) }
        }

        fun component(context: Context): ComponentName =
            ComponentName(context, MusicNotificationListenerService::class.java)
    }
}
