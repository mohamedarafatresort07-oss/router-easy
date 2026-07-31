package com.stealthrecorder.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.Environment
import android.os.IBinder
import android.widget.Toast
import androidx.core.app.NotificationCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RecorderService : Service() {

    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: String? = null
    private var phoneNumber: String? = null
    private var isOutgoing: Boolean = false
    private var startTime: Long = 0

    companion object {
        const val CHANNEL_ID = "RecorderChannel"
        const val NOTIFICATION_ID = 1002
        var isRecording = false
            private set
        
        private var isUsingVoiceCall = false
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        phoneNumber = intent?.getStringExtra("phone_number")
        isOutgoing = intent?.getBooleanExtra("is_outgoing", false) ?: false

        if (!isRecording) {
            startRecording()
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRecording()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Recording Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when recording is active"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val stopIntent = Intent(this, RecorderService::class.java).apply {
            action = "STOP_RECORDING"
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        val callType = if (isOutgoing) "Outgoing" else "Incoming"
        val number = phoneNumber ?: "Unknown"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🔴 Recording $callType Call")
            .setContentText("📞 $number")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun startRecording() {
        try {
            // Create output directory
            val recordingsDir = File(
                getExternalFilesDir(null),
                "StealthRecordings"
            )
            if (!recordingsDir.exists()) {
                recordingsDir.mkdirs()
            }

            // Generate filename
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val callType = if (isOutgoing) "OUT" else "IN"
            val displayNumber = phoneNumber?.replace("[^0-9]".toRegex(), "") ?: "Unknown"
            val fileName = "${callType}_${displayNumber}_$timestamp.mp4"
            
            outputFile = File(recordingsDir, fileName).absolutePath

            // Initialize MediaRecorder
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            // Try to use VOICE_CALL first (records both parties on speaker/earpiece)
            try {
                mediaRecorder?.apply {
                    setAudioSource(MediaRecorder.AudioSource.VOICE_CALL)
                    setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                    setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                    setAudioEncodingBitRate(128000)
                    setAudioSamplingRate(44100)
                    setOutputFile(outputFile)
                    prepare()
                    start()
                    isUsingVoiceCall = true
                }
            } catch (e: Exception) {
                // Fallback to MIC
                try {
                    mediaRecorder?.release()
                    mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        MediaRecorder(this)
                    } else {
                        @Suppress("DEPRECATION")
                        MediaRecorder()
                    }
                    
                    mediaRecorder?.apply {
                        setAudioSource(MediaRecorder.AudioSource.MIC)
                        setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                        setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                        setAudioEncodingBitRate(128000)
                        setAudioSamplingRate(44100)
                        setOutputFile(outputFile)
                        prepare()
                        start()
                        isUsingVoiceCall = false
                    }
                } catch (e2: Exception) {
                    Toast.makeText(this, "Recording failed: ${e2.message}", Toast.LENGTH_SHORT).show()
                    stopSelf()
                    return
                }
            }

            isRecording = true
            startTime = System.currentTimeMillis()
            
            // Start foreground with notification
            startForeground(NOTIFICATION_ID, createNotification())
            
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(this, "Error starting recording: ${e.message}", Toast.LENGTH_SHORT).show()
            stopSelf()
        }
    }

    private fun stopRecording() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false

            // Show completion message
            if (outputFile != null) {
                val duration = (System.currentTimeMillis() - startTime) / 1000
                val durationStr = String.format(
                    Locale.getDefault(),
                    "%02d:%02d",
                    duration / 60,
                    duration % 60
                )
                
                Toast.makeText(
                    this,
                    "✓ Recording saved\nDuration: $durationStr",
                    Toast.LENGTH_LONG
                ).show()
            }

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
