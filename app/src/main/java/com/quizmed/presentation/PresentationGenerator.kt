package com.quizmed.presentation

data class Slide(
    val title: String,
    val type: String,
    val content: String
)

object PresentationGenerator {
    fun generate(sources: List<String>): List<Slide> = listOf(
        Slide("عنوان العرض", "title", "من إعداد QuizMed"),
        Slide("ملخص", "summary", "محتوى مستخرج من المصادر")
    )
}
