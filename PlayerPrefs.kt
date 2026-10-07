package com.example.musicswipe

import android.content.Context

class PlayerPrefs(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var selectedPackage: String?
        get() = prefs.getString(KEY_PACKAGE, null)
        set(value) = prefs.edit().putString(KEY_PACKAGE, value).apply()

    var selectedLabel: String?
        get() = prefs.getString(KEY_LABEL, null)
        set(value) = prefs.edit().putString(KEY_LABEL, value).apply()

    private companion object {
        const val PREFS_NAME = "music_swipe_prefs"
        const val KEY_PACKAGE = "selected_package"
        const val KEY_LABEL = "selected_label"
    }
}
