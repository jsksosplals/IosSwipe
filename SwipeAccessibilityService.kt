package com.example.musicswipe

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.MotionEvent
import android.view.accessibility.AccessibilityEvent
import androidx.annotation.RequiresApi
import kotlin.math.abs

class SwipeAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "SwipeAccessibility"
        private const val EDGE_THRESHOLD_PX = 60
        private const val MIN_SWIPE_DISTANCE_PX = 150
        private const val MAX_SWIPE_DURATION_MS = 600L
        private const val VERTICAL_TOLERANCE_PX = 100
    }

    private var startX = 0f
    private var startY = 0f
    private var startTime = 0L
    private var trackingFromEdge = false

    override fun onAccessibilityEvent(event: AccessibilityEvent?) { /* not used */ }

    override fun onInterrupt() {
        Log.d(TAG, "Service interrupted")
        trackingFromEdge = false
    }

    @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    override fun onMotionEvent(event: MotionEvent) {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                trackingFromEdge = event.x <= EDGE_THRESHOLD_PX
                if (trackingFromEdge) {
                    startX = event.x
                    startY = event.y
                    startTime = System.currentTimeMillis()
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (trackingFromEdge) handleSwipeEnd(event)
                trackingFromEdge = false
            }
        }
    }

    private fun handleSwipeEnd(event: MotionEvent) {
        val duration = System.currentTimeMillis() - startTime
        val dx = event.x - startX
        val dy = abs(event.y - startY)

        val isHorizontal = dy <= VERTICAL_TOLERANCE_PX
        val isRightward = dx >= MIN_SWIPE_DISTANCE_PX
        val isFast = duration in 1..MAX_SWIPE_DURATION_MS

        if (isHorizontal && isRightward && isFast) {
            Log.d(TAG, "Left-to-right swipe detected")
            startOverlayService()
        }
    }

    private fun startOverlayService() {
        try {
            val intent = Intent(this, OverlayService::class.java).apply {
                action = OverlayService.ACTION_SHOW_PANEL
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start OverlayService", e)
        }
    }
}
