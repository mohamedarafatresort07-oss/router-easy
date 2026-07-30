[app]
title = QuizMed X
package.name = quizmedx
package.domain = com.quizmedx
source.dir = .
source.include_exts = py,png,jpg,kv,atlas,ttf,txt,json
version = 1.0.0
requirements = python3,kivy==2.2.1,pillow,numpy,reportlab,openpyxl,python-docx,python-pptx
orientation = portrait
fullscreen = 0
android.minapi = 26
android.api = 35
android.permissions =

[buildozer]
log_level = 2
warn_on_root = 1
