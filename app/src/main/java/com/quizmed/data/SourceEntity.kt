package com.quizmed.data

import androidx.room.*

@Entity(tableName = "sources")
data class Source(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val type: String,
    val year: String?,
    val filePath: String?,
    val sizeBytes: Long
)
