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

```bash
npm ci
npm run build:web
npx cap add android   # first time only
npx cap sync android
cd android
./gradlew assembleDebug
```

The GitHub workflow `.github/workflows/build-apk.yml` builds and publishes `QuizMedX-offline-debug.apk` from branch `arena/019fb24a-router-easy`.

## Offline guarantee

- The web bundle is self-contained inside `www/`.
- OCR worker, WASM core, and Arabic/English trained data are copied into `www/assets/`.
- The Android manifest is hardened by `fix_manifest.py` to remove network permissions.
- Any `fetch()` usage is limited to local `data:` URLs for converting generated note images to downloadable blobs.

## Notes on platform constraints

This implementation uses Capacitor/WebView to reliably produce an APK in the current repository. The requested Python/Kivy libraries are represented by local browser equivalents where possible (PDF.js, JSZip, SheetJS, Tesseract.js, Canvas, pptxgenjs) because several desktop Python packages requested by the prompt (for example pandas/scikit-learn/OpenCV/Tesseract binaries) are not reliably packageable into an Android APK without a custom native distribution. The final app remains offline and rule-based.
