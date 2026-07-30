# -*- coding: utf-8 -*-
"""Rule-based question generation. No AI/model calls."""
import re, random
from .utils import split_sentences, uid
from .cleaner import clean_text, comparable

MEDICAL_TERMS = "diagnosis treatment drug dose anatomy physiology pathology microbiology تشخيص علاج دواء جرعة تشريح فسيولوجيا باثولوجيا عدوى التهاب".split()

def _keyword(sentence):
    norm = comparable(sentence)
    for t in sorted(MEDICAL_TERMS, key=len, reverse=True):
        if comparable(t) in norm:
            return t
    m = re.search(r"[A-Za-z][A-Za-z-]{4,}|[\u0600-\u06FF]{4,}|\d+(?:\.\d+)?%?", sentence)
    return m.group(0) if m else ""

def _distractors(answer, pool):
    cands = [p for p in dict.fromkeys(pool + MEDICAL_TERMS) if comparable(p) != comparable(answer)]
    random.shuffle(cands)
    return cands[:3] or ["All of the above", "None of the above", "غير ذلك"]

def generate_questions(text, profile="all"):
    text = clean_text(text)
    pool = re.findall(r"[A-Za-z][A-Za-z-]{4,}|[\u0600-\u06FF]{4,}", text)[:400]
    out = []
    allow = lambda t: profile in ("all", t)
    for sent in split_sentences(text):
        kw = _keyword(sent)
        if not kw: continue
        blank = re.sub(re.escape(kw), "________", sent, count=1, flags=re.I)
        if allow("fill"):
            out.append({"id": uid("q"), "type": "fill", "stem": f"أكمل / Fill: {blank}", "answer": kw, "options": [], "explanation": sent})
        if allow("mcq"):
            opts = [kw] + _distractors(kw, pool); random.shuffle(opts)
            out.append({"id": uid("q"), "type": "mcq", "stem": f"Which term completes this statement? {blank}", "answer": kw, "options": opts, "explanation": sent})
        if allow("tf"):
            out.append({"id": uid("q"), "type": "tf", "stem": sent, "answer": "True", "options": ["True", "False"], "explanation": "Source sentence."})
    # de-duplicate by normalized stem
    seen, unique = set(), []
    for q in out:
        k = comparable(q["stem"])
        if k not in seen:
            seen.add(k); unique.append(q)
    return unique
