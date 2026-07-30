# -*- coding: utf-8 -*-
from .cleaner import comparable
from .utils import cosine, jaccard, tokenize

def objective_grade(expected, actual):
    return comparable(expected) == comparable(actual)

def essay_grade(model_answer, student_answer):
    c, j = cosine(model_answer, student_answer), jaccard(model_answer, student_answer)
    score = round((0.65 * c + 0.35 * j) * 100, 2)
    missing = [t for t in tokenize(model_answer) if t not in set(tokenize(student_answer))][:50]
    return {"score": score, "cosine": c, "jaccard": j, "missing_terms": missing}
