package com.quizmed.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class ExtractWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        return try {
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
