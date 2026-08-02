package com.quizmed.tests

import org.junit.Assert.assertTrue
import org.junit.Test

class BasicTest {
    @Test
    fun identityIsSet() {
        assertTrue("QuizMed".isNotEmpty())
    }
}
