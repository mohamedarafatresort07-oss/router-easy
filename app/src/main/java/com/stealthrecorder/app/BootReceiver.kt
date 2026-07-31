package com.stealthrecorder.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Check if stealth mode was enabled before reboot
            val isStealthEnabled = context.getSharedPreferences("stealth_prefs", Context.MODE_PRIVATE)
                .getBoolean("stealth_mode", false)
            
            if (isStealthEnabled) {
                // Re-enable the call receiver
                // The service will start automatically when a call comes in
            }
        }
    }
}
