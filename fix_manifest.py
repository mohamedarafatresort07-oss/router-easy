#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""QuizMed X manifest hardening.

The APK is fully offline. This script removes network permissions that are not
needed by the local WebView app and sets clear offline-friendly metadata.
"""
from pathlib import Path
import re

p = Path("android/app/src/main/AndroidManifest.xml")
if not p.exists():
    raise SystemExit("AndroidManifest.xml not found")

s = p.read_text(encoding="utf-8")
# Remove network permissions to make the no-external-API guarantee visible.
for perm in [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.ACCESS_WIFI_STATE",
]:
    s = re.sub(rf"\s*<uses-permission\s+android:name=\"{re.escape(perm)}\"\s*/>", "", s)

s = s.replace(' android:usesCleartextTraffic="true"', '')
s = s.replace(' android:usesCleartextTraffic="false"', '')
if 'android:label="QuizMed X"' not in s:
    s = re.sub(r'android:label="[^"]+"', 'android:label="QuizMed X"', s, count=1)

p.write_text(s, encoding="utf-8")
print("QuizMed X manifest hardened for offline APK")
