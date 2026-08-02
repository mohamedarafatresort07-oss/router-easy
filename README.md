# QuizMed

تطبيق Android أصلي عالي القيمة مبني بـ Kotlin + Jetpack Compose.

## الهوية
- QuizMed
- كلية الطب – جامعة الأزهر
- Prepared By: Dr Mohamed Arafat

## المتطلبات المنفذة
- Kotlin + Jetpack Compose
- Navigation مبدئي
- Theme RTL
- AI Provider Router
- Source Entity (Room)
- JobStore مبدئي
- Main Screen مع الثلاث وحدات
- DataStore إعدادات
- Android Keystore (عبر androidx.security)

## ما يحتاج إعداد
- مفاتيح AI حقيقية لكل مزود (Gemini / Groq / Cerebras / Mistral / Nvidia / OpenRouter)
- خادم Gateway آمن
- معالجة PDF فعلية
- OCR وصور
- تصدير PDF / PPTX / HTML
- WorkManager كامل للمهام الطويلة
- اختبارات وحدة وواجهة

## البناء
./gradlew assembleRelease

## ملاحظات
لا يحتوي APK على مفاتيح API مدمجة.
