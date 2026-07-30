# -*- coding: utf-8 -*-
import csv, json
from pathlib import Path

def export_json(data, path):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def export_csv(rows, path):
    rows = list(rows)
    if not rows: return
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
