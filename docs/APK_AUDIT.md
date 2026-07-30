# QuizMed X APK Audit

## Previous failure

The first locally attached APK was packaged with an emergency Java-free path and only a legacy signing style. Some Android package installers reject that profile and display "Package appears to be invalid" / "الحزمة غير صالحة".

## Corrective rebuild

The current `QuizMedX-offline-debug.apk` was rebuilt with:

- Android package id: `com.quizmedx.offline`
- App name: `QuizMed X`
- `minSdkVersion`: `26` (Android 8.0+)
- `targetSdkVersion`: `28`
- No `android.permission.INTERNET` in the packaged manifest
- `android:usesCleartextTraffic="false"`
- Android APK Signature Scheme v2 block: `APK Sig Block 42`
- Local bundled assets:
  - `assets/index.html`
  - `assets/bundle.js`
  - local Tesseract worker/core
  - Arabic and English trained data

## Local verification commands

```bash
npm run build:apk:valid
unzip -t QuizMedX-offline-debug.apk
python3 - <<'PY'
from pathlib import Path
import struct, zipfile
apk = Path('QuizMedX-offline-debug.apk')
b = apk.read_bytes()
eocd = None
for i in range(len(b)-22, max(0, len(b)-65557)-1, -1):
    if b[i:i+4] == b'PK\x05\x06' and i + 22 + struct.unpack_from('<H', b, i+20)[0] == len(b):
        eocd = i; break
cd_off = struct.unpack_from('<I', b, eocd + 16)[0]
assert b.rfind(b'APK Sig Block 42', 0, cd_off) != -1
with zipfile.ZipFile(apk) as z:
    assert 'AndroidManifest.xml' in z.namelist()
    assert 'classes.dex' in z.namelist()
    assert 'assets/index.html' in z.namelist()
print('APK structure and v2 signing block found')
PY
```

## Runtime no-network guard

`src/app.js` overrides `window.fetch` so external `http://` or `https://` requests are rejected at runtime. Local `data:`, `blob:`, and packaged asset loading remain available.
