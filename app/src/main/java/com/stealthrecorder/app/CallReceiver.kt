package com.stealthrecorder.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.widget.Toast

class CallReceiver : BroadcastReceiver() {

    companion object {
        var lastState = TelephonyManager.CALL_STATE_IDLE
        var isRecording = false
        var incomingNumber: String? = null
        
        const val ACTION_START_BUBBLE = "com.stealthrecorder.START_BUBBLE"
        const val ACTION_STOP_BUBBLE = "com.stealthrecorder.STOP_BUBBLE"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_NEW_OUTGOING_CALL) {
            // Outgoing call
            incomingNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
            if (isStealthModeEnabled(context)) {
                startBubbleService(context, incomingNumber, true)
            }
        } else {
            // Incoming call
            val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            
            when (state) {
                TelephonyManager.EXTRA_STATE_RINGING -> {
                    incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                    if (isStealthModeEnabled(context)) {
                        startBubbleService(context, incomingNumber, false)
                    }
                }
                TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                    // Call answered - recording starts when bubble is tapped
                }
                TelephonyManager.EXTRA_STATE_IDLE -> {
                    if (lastState != TelephonyManager.CALL_STATE_IDLE) {
                        // Call ended
                        stopBubbleService(context)
                        stopRecorderService(context)
                    }
                }
            }
            lastState = TelephonyManager.CALL_STATE_IDLE
        }
    }

    private fun isStealthModeEnabled(context: Context): Boolean {
        return context.getSharedPreferences("stealth_prefs", Context.MODE_PRIVATE)
            .getBoolean("stealth_mode", false)
    }

    private fun startBubbleService(context: Context, phoneNumber: String?, isOutgoing: Boolean) {
        val serviceIntent = Intent(context, FloatingBubbleService::class.java).apply {
            putExtra("phone_number", phoneNumber ?: "Unknown")
            putExtra("is_outgoing", isOutgoing)
        }
        context.startService(serviceIntent)
    }

    private fun stopBubbleService(context: Context) {
        context.stopService(Intent(context, FloatingBubbleService::class.java))
    }

    private fun stopRecorderService(context: Context) {
        context.stopService(Intent(context, RecorderService::class.java))
    }
}
