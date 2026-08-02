# دليل البناء الكامل من الألف إلى الياء

## 1. تجهيز البيئة
- تثبيت Android Studio
- تثبيت JDK 17
- إضافة مسار SDK إلى ANDROID_HOME

## 2. إعداد المفاتيح
- إنشاء keystore: keytool -genkeypair -v -keystore quizmed.jks -keyalg RSA -keysize 2048 -validity 10000 -alias quizmed
- حفظه بأمان وعدم رفعه

## 3. مفاتيح AI
- إنشاء حسابات أو الحصول على مفاتيح: Gemini, Groq, Cerebras, Mistral, Nvidia, OpenRouter
- حفظها في خادم Gateway آمن فقط
- لا تضعها داخل الكود

## 4. إكمال الكود
- إضافة PDF/OCR حقيقي (PdfRenderer, ML Kit)
- إكمال تصدير PPTX عبر Apache POI
- إكمال تصدير HTML
- إضافة WorkManager كامل
- إضافة اختبارات Espresso

## 5. البناء والتوقيع
- ./gradlew assembleRelease
- توقيع APK بـ keystore
- اختبار التثبيت على جهاز حقيقي

## 6. النشر
- إنشاء AAB عند الحاجة
- رفع على Google Play بعد سياسة خصوصية واضحة

## ملاحظات أمان
- لا ترسل مصادر المستخدم لأي جهة غير المزود المختار
- احذف البيانات عند الطلب
- لا تدعي أن AI يضمن صحة طبية
