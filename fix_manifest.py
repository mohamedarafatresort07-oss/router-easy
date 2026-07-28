#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يضيف صلاحيات الشبكة المحلية إلى AndroidManifest.xml"""
import os, sys

P = "android/app/src/main/AndroidManifest.xml"
if not os.path.exists(P):
    print("لم أجد AndroidManifest.xml"); sys.exit(1)

s = open(P, encoding="utf-8").read()

NEEDED = ["android.permission.INTERNET",
          "android.permission.ACCESS_NETWORK_STATE",
          "android.permission.ACCESS_WIFI_STATE"]

add = [p for p in NEEDED if p not in s]
if add:
    block = "".join('    <uses-permission android:name="%s" />\n' % p for p in add)
    s = s.replace("</manifest>", block + "</manifest>")
    print("+ أضفت %d صلاحية شبكة" % len(add))

if "usesCleartextTraffic" not in s:
    s = s.replace("<application", '<application android:usesCleartextTraffic="true"', 1)
    print("+ فعّلت اتصالات HTTP العادية")

open(P, "w", encoding="utf-8").write(s)
print("تم تعديل AndroidManifest بنجاح")
