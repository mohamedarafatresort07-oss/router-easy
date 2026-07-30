# -*- coding: utf-8 -*-
import math, re, time
from collections import Counter
from .cleaner import comparable, clean_text

def uid(prefix="id"):
    return f"{prefix}_{int(time.time()*1000)}"

def tokenize(text):
    stop = {"the","and","or","of","to","in","is","are","a","an","هو","هي","من","في","على","الى","و","او"}
    return [w for w in comparable(text).split() if len(w) > 1 and w not in stop]

def cosine(a, b):
    ca, cb = Counter(tokenize(a)), Counter(tokenize(b))
    dot = sum(v * cb.get(k, 0) for k, v in ca.items())
    na = math.sqrt(sum(v*v for v in ca.values())); nb = math.sqrt(sum(v*v for v in cb.values()))
    return dot / (na * nb) if na and nb else 0.0

def jaccard(a, b):
    A, B = set(tokenize(a)), set(tokenize(b))
    return len(A & B) / len(A | B) if A or B else 0.0

def split_sentences(text):
    s = clean_text(text)
    return [x.strip() for x in re.split(r"(?<=[.!?؟])\s+|\n+", s) if len(x.strip()) > 12]
