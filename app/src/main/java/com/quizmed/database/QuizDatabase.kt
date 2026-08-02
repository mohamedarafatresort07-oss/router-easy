package com.quizmed.database

import androidx.room.*

@Dao
interface QuestionDao {
    @Insert suspend fun insert(q: Question)
    @Query("SELECT * FROM questions") suspend fun all(): List<Question>
}

@Entity(tableName = "questions")
data class Question(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val text: String,
    val type: String,
    val sourceId: Long,
    val answer: String?,
    val isInferred: Boolean = false
)
