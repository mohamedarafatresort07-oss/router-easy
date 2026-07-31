package com.stealthrecorder.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.TextView
import androidx.core.app.NotificationCompat

class FloatingBubbleService : Service() {

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null
    private var phoneNumber: String? = null
    private var isOutgoing: Boolean = false
    
    private var initialX: Int = 0
    private var initialY: Int = 0
    private var initialTouchX: Float = 0f
    private var initialTouchY: Float = 0f

    companion object {
        const val CHANNEL_ID = "StealthRecorderChannel"
        const val NOTIFICATION_ID = 1001
        var isServiceRunning = false
            private set
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isServiceRunning = true
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        phoneNumber = intent?.getStringExtra("phone_number")
        isOutgoing = intent?.getBooleanExtra("is_outgoing", false) ?: false
        
        if (bubbleView == null) {
            createBubble()
        }
        
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        removeBubble()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Stealth Recorder Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Call recording service"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🔴 Ready to Record")
            .setContentText("Tap bubble during call to record")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createBubble() {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val inflater = LayoutInflater.from(this)
        bubbleView = inflater.inflate(R.layout.layout_floating_bubble, null)

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = 200
        }

        // Setup bubble appearance
        val ivBubble = bubbleView?.findViewById<ImageView>(R.id.ivBubble)
        val tvStatus = bubbleView?.findViewById<TextView>(R.id.tvBubbleStatus)
        
        ivBubble?.setImageResource(android.R.drawable.ic_btn_speak_now)
        tvStatus?.text = if (RecorderService.isRecording) "REC" else "TAP"
        
        if (RecorderService.isRecording) {
            ivBubble?.setBackgroundResource(R.drawable.bg_bubble_recording)
        } else {
            ivBubble?.setBackgroundResource(R.drawable.bg_bubble_normal)
        }

        // Touch handling for drag
        bubbleView?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX + (event.rawX - initialTouchX).toInt()
                    params.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager?.updateViewLayout(bubbleView, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (Math.abs(event.rawX - initialTouchX) < 10 && 
                        Math.abs(event.rawY - initialTouchY) < 10) {
                        // Single tap - toggle recording
                        toggleRecording()
                    }
                    true
                }
                else -> false
            }
        }

        windowManager?.addView(bubbleView, params)
    }

    private fun toggleRecording() {
        if (RecorderService.isRecording) {
            // Stop recording
            stopRecorderService()
            updateBubbleUI(false)
        } else {
            // Start recording
            startRecorderService()
            updateBubbleUI(true)
        }
    }

    private fun startRecorderService() {
        val recorderIntent = Intent(this, RecorderService::class.java).apply {
            putExtra("phone_number", phoneNumber)
            putExtra("is_outgoing", isOutgoing)
        }
        startService(recorderIntent)
    }

    private fun stopRecorderService() {
        stopService(Intent(this, RecorderService::class.java))
    }

    private fun updateBubbleUI(isRecording: Boolean) {
        val ivBubble = bubbleView?.findViewById<ImageView>(R.id.ivBubble)
        val tvStatus = bubbleView?.findViewById<TextView>(R.id.tvBubbleStatus)
        
        tvStatus?.text = if (isRecording) "REC" else "TAP"
        
        if (isRecording) {
            ivBubble?.setBackgroundResource(R.drawable.bg_bubble_recording)
        } else {
            ivBubble?.setBackgroundResource(R.drawable.bg_bubble_normal)
        }
    }

    private fun removeBubble() {
        try {
            if (bubbleView != null) {
                windowManager?.removeView(bubbleView)
                bubbleView = null
            }
        } catch (e: Exception) {
            // View might already be removed
        }
    }
}
