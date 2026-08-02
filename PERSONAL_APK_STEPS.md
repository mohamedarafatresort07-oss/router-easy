# خطوات بناء APK شخصي بالتفصيل

## هل يمكن من الهاتف؟
- نعم جزئيًا عبر Termux، لكن صعب جدًا لبناء Compose + Room + Gradle كامل.
- الأفضل: كمبيوتر (Windows/Mac/Linux) مع Android Studio.

## الخطوات الدقيقة
1. افتح المشروع في Android Studio
2. اذهب إلى Build > Generate Signed Bundle / APK > APK
3. اختر Create new keystore (quizmed.jks)
4. املأ البيانات واحفظ كلمة المرور
5. اختر release
6. اضغط Finish

## بدون مفاتيح AI
- التطبيق يعمل بدونها مؤقتًا؛ ستظهر رسالة عند استخدام AI.

## للتثبيت الشخصي
- انقل ملف APK من app/build/outputs/apk/release/
- ثبته على هاتفك مباشرة
