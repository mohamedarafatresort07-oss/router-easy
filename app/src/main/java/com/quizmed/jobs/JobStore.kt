package com.quizmed.jobs

data class JobState(
    val id: String,
    val title: String,
    val total: Int = 0,
    val completed: Int = 0,
    val failed: Int = 0,
    val status: String = "waiting",
    val lastProvider: String? = null
)
