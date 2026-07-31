package com.stealthrecorder.app

import android.Manifest
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.stealthrecorder.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    
    private val requiredPermissions = mutableListOf(
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.READ_CALL_LOG
    )

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            Toast.makeText(this, "✓ All permissions granted", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "⚠ Some permissions denied", Toast.LENGTH_SHORT).show()
        }
        updateUI()
    }

    private val overlayLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        updateUI()
    }

    private val notificationLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        updateUI()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
        updateUI()
    }

    override fun onResume() {
        super.onResume()
        updateUI()
    }

    private fun setupUI() {
        binding.btnRequestPermissions.setOnClickListener {
            requestAllPermissions()
        }

        binding.btnOverlayPermission.setOnClickListener {
            requestOverlayPermission()
        }

        binding.switchStealthMode.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                if (hasAllPermissions()) {
                    saveStealthMode(true)
                    Toast.makeText(this, "🔴 Stealth Mode ACTIVATED", Toast.LENGTH_LONG).show()
                } else {
                    binding.switchStealthMode.isChecked = false
                    showPermissionDialog()
                }
            } else {
                saveStealthMode(false)
                Toast.makeText(this, "Stealth Mode deactivated", Toast.LENGTH_SHORT).show()
                stopServices()
            }
        }
    }

    private fun updateUI() {
        // Update permission status
        val hasAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) 
            == PackageManager.PERMISSION_GRANTED
        val hasPhone = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) 
            == PackageManager.PERMISSION_GRANTED
        val hasOverlay = Settings.canDrawOverlays(this)
        val hasNotification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                == PackageManager.PERMISSION_GRANTED
        } else true

        binding.tvAudioStatus.text = if (hasAudio) "✓ RECORD_AUDIO" else "✗ RECORD_AUDIO"
        binding.tvPhoneStatus.text = if (hasPhone) "✓ READ_PHONE_STATE" else "✗ READ_PHONE_STATE"
        binding.tvOverlayStatus.text = if (hasOverlay) "✓ SYSTEM_ALERT_WINDOW" else "✗ SYSTEM_ALERT_WINDOW"
        binding.tvNotificationStatus.text = if (hasNotification) "✓ NOTIFICATIONS" else "✗ NOTIFICATIONS"

        // Update switch state
        binding.switchStealthMode.isChecked = isStealthModeEnabled()
    }

    private fun requestAllPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requiredPermissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(requiredPermissions.toTypedArray())
    }

    private fun requestOverlayPermission() {
        if (!Settings.canDrawOverlays(this)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            overlayLauncher.launch(intent)
        } else {
            Toast.makeText(this, "Overlay permission already granted", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showPermissionDialog() {
        AlertDialog.Builder(this)
            .setTitle("⚠️ Permissions Required")
            .setMessage("Please grant all permissions to use Stealth Mode.\n\nClick 'Request Permissions' first.")
            .setPositiveButton("Request Permissions") { _, _ ->
                requestAllPermissions()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun hasAllPermissions(): Boolean {
        val hasAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) 
            == PackageManager.PERMISSION_GRANTED
        val hasPhone = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) 
            == PackageManager.PERMISSION_GRANTED
        val hasOverlay = Settings.canDrawOverlays(this)
        
        return hasAudio && hasPhone && hasOverlay
    }

    private fun saveStealthMode(enabled: Boolean) {
        getSharedPreferences("stealth_prefs", Context.MODE_PRIVATE)
            .edit()
            .putBoolean("stealth_mode", enabled)
            .apply()
    }

    private fun isStealthModeEnabled(): Boolean {
        return getSharedPreferences("stealth_prefs", Context.MODE_PRIVATE)
            .getBoolean("stealth_mode", false)
    }

    private fun stopServices() {
        try {
            stopService(Intent(this, FloatingBubbleService::class.java))
            stopService(Intent(this, RecorderService::class.java))
        } catch (e: Exception) {
            // Service might not be running
        }
    }
}
