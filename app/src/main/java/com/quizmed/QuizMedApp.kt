package com.quizmed

import android.app.Application

class QuizMedApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize Room, WorkManager, DataStore
    }
}
