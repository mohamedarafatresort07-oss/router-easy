# -*- coding: utf-8 -*-
"""Desktop/Kivy extractor facade. APK implementation uses local JS equivalents."""
from pathlib import Path
from .cleaner import clean_text

def extract_text(path):
    p = Path(path)
    if p.suffix.lower() in {".txt", ".md", ".csv", ".html", ".htm"}:
        return clean_text(p.read_text(encoding="utf-8", errors="ignore"))
    return f"[Extractor placeholder for {p.name}: use the APK Super Extractor for bundled offline parsers]"
