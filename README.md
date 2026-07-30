# QuizMed X — Offline Medical Education APK

QuizMed X is a fully offline Android application for medical education. It uses deterministic, rule-based algorithms on the device; the application runtime does **not** call GPT, Gemini, Llama, external APIs, cloud OCR, or remote services.

## Built engines

- Super Extractor: PDF text extraction, DOCX, PPTX, XLSX/CSV, TXT/HTML/Markdown, and local Arabic/English OCR assets via Tesseract.js.
- Cleaner: Arabic/English normalization, OCR correction dictionary, punctuation/spacing cleanup, Arabic diacritics normalization for comparison.
- Entity Extractor: seat numbers, course codes, names, GPA/CGPA, percentages, medical terms, Azhar courses and departments.
- Question Generator: rule-based MCQ, True/False, fill-in-the-blank, matching, definition and medical relation patterns.
- Question Bank Organizer: local cosine/Jaccard duplicate removal, Azhar classification, notes, CSV/Excel/HTML export.
- Handwritten Notes Generator: Canvas PNG pages preserving the full source text with `Prepared by Mohamed Arafat` signature and page counters.
- Slides Builder: local HTML and PPTX export.
- Quiz Engine: timer, progress, answer saving and detailed results.
- Grading Engine: exact normalized grading and essay grading with local similarity.
- Azhar Bylaws: five-year/ten-semester structure, course codes, electives, departments, graduate attributes, TBL/PBL/CBL, GPA/CGPA table.
- Local Storage: IndexedDB for banks, corpora, sessions, artifacts, settings.

## Android build

Preferred reproducible build for this Arena branch:

```bash
npm ci
npm run build:apk:valid
```

This performs three steps:

1. `tools/build-web.mjs` bundles the offline application and OCR assets into `www/`.
2. `tools/build-valid-apk.mjs` packages the WebView APK with Android 8+ manifest values: `minSdkVersion=26`, `targetSdkVersion=28`, and no runtime network permissions.
3. `tools/sign_apk_v2.py` signs the APK using Android APK Signature Scheme v2, producing `QuizMedX-offline-debug.apk`.

The Capacitor/Gradle path is kept for environments that have a full Android toolchain:

```bash
npm ci
npm run build:web
npx cap add android   # first time only
npx cap sync android
cd android
./gradlew assembleDebug
```

## Offline guarantee

- The web bundle is self-contained inside `www/`.
- OCR worker, WASM core, and Arabic/English trained data are copied into `www/assets/`.
- The Android manifest is hardened by `fix_manifest.py` to remove network permissions.
- Any `fetch()` usage is limited to local `data:` URLs for converting generated note images to downloadable blobs.

## Architecture note

The production APK is a native Android WebView shell containing a fully local web runtime. This choice keeps the APK installable on Android 8.0+ while still embedding the requested offline engines and assets. The repository also includes `QuizMed_X_APK/`, a Python/Kivy-compatible core structure mirroring the requested module layout for future native-Python packaging.
