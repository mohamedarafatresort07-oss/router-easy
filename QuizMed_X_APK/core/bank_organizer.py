# -*- coding: utf-8 -*-
from .utils import cosine

def remove_duplicates(questions, threshold=0.90):
    kept = []
    for q in questions:
        text = f"{q.get('type')} {q.get('stem')} {q.get('answer')}"
        if not any(cosine(text, f"{k.get('type')} {k.get('stem')} {k.get('answer')}") >= threshold for k in kept):
            kept.append(q)
    return kept
