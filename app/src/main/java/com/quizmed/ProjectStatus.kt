package com.quizmed

object ProjectStatus {
    val completed = listOf(
        "هيكل Android Studio كامل",
        "Compose UI مع RTL وثيم طبي",
        "Manifest + Permissions + Keystore إعداد",
        "Room Database (Sources, Questions)",
        "DataStore إعدادات",
        "WorkManager (ExtractWorker)",
        "AI Provider Router (6 مزودين)",
        "JobStore لمتابعة المهام",
        "Presentation Generator (شرائح أولية)",
        "ExportEngine (PDF/PPTX/HTML هيكل)",
        "اختبارات أساسية",
        "README واضح مع تعليمات البناء"
    )

    val missingForRealApk = listOf(
        "Android SDK مثبت في البيئة",
        "Gradle Wrapper + JDK 17+",
        "توقيع Keystore حقيقي (jks)",
        "مفاتيح API حقيقية لكل مزود (Gateway آمن)",
        "معالجة PDF فعلية (PdfRenderer/OCR)",
        "Vision AI متكامل للصور والعلامات",
        "خوارزمية Jaccard لإزالة التكرار",
        "تصدير PPTX حقيقي (Apache POI)",
        "تصدير HTML تفاعلي",
        "اختبارات واجهة كاملة (Espresso)",
        "اختبارات الأداء والشبكة",
        "بناء APK/AAB وتوقيعه وتثبيته"
    )
}
