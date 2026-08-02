package com.quizmed.ai

interface AiProvider {
    val name: String
    suspend fun extract(sourcePath: String): String
    suspend fun generateQuestions(text: String): String
}

object ProviderRouter {
    private val providers = listOf("Gemini", "Groq", "Cerebras", "Mistral", "Nvidia", "OpenRouter")
    var currentIndex = 0

    fun rotate(): String {
        currentIndex = (currentIndex + 1) % providers.size
        return providers[currentIndex]
    }

    fun current(): String = providers[currentIndex]
}
