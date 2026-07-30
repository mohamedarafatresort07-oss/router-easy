# -*- coding: utf-8 -*-
"""Arabic/English medical text cleaning utilities (offline, rule-based)."""
import re

DIACRITICS = re.compile(r"[\u064B-\u065F\u0670]")
CORRECTIONS = {
    "pharamcology": "pharmacology", "pharmocology": "pharmacology",
    "pathalogy": "pathology", "anatonmy": "anatomy", "physiolog y": "physiology",
    "اال": "ال", "ا ل": "ال", "ـ": "",
}

def normalize_arabic(text: str) -> str:
    text = DIACRITICS.sub("", text or "").replace("ـ", "")
    return (text.replace("إ", "ا").replace("أ", "ا").replace("آ", "ا")
                .replace("ى", "ي").replace("ؤ", "و").replace("ئ", "ي").replace("ة", "ه"))

def clean_text(text: str) -> str:
    s = str(text or "").replace("\ufeff", "")
    for bad, good in CORRECTIONS.items():
        s = s.replace(bad, good)
    s = re.sub(r"[\u200e\u200f\u202a-\u202e]", " ", s)
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"([^\n])\n([^\n•\-\d\u0660-\u0669])", r"\1 \2", s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def comparable(text: str) -> str:
    return re.sub(r"[^\w\s\u0600-\u06FF]", " ", normalize_arabic(clean_text(text)).lower()).strip()
