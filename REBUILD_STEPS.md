# خطوات إعادة البناء بالتفصيل

1. استنسخ المستودع من GitHub:
   git clone https://github.com/mohamedarafatresort07-oss/router-easy.git
   cd router-easy
   git checkout arena/019fc14f-router-easy

2. افتح المشروع في Android Studio (File > Open)

3. انتظر حتى ينتهي Gradle Sync

4. اذهب إلى Build > Rebuild Project

5. لإنشاء APK موقع شخصي:
   Build > Generate Signed Bundle / APK > APK
   اختر keystore موجود أو أنشئ جديد
   اختر release
   اضغط Finish

6. الملف الناتج في:
   app/build/outputs/apk/release/app-release.apk
