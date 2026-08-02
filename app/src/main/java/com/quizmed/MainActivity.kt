package com.quizmed

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    QuizMedHome()
                }
            }
        }
    }
}

@Composable
fun QuizMedHome() {
    var selected by remember { mutableStateOf(0) }
    val screens = listOf("إنشاء اختبار", "بنك الأسئلة", "توليد شرائح", "السجل")
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(48.dp))
        Text("QuizMed", fontSize = 36.sp, style = MaterialTheme.typography.displayLarge)
        Text("كلية الطب – جامعة الأزهر", fontSize = 16.sp, color = MaterialTheme.colorScheme.secondary)
        Text("Prepared By: Dr Mohamed Arafat", fontSize = 12.sp, color = MaterialTheme.colorScheme.tertiary)
        Spacer(Modifier.height(32.dp))
        Text("رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي", fontSize = 18.sp, textAlign = TextAlign.Center)
        Spacer(Modifier.height(48.dp))
        screens.forEachIndexed { idx, title ->
            Button(
                onClick = { selected = idx },
                modifier = Modifier.fillMaxWidth(0.9f).padding(vertical = 8.dp)
            ) {
                Text(title)
            }
        }
    }
}
