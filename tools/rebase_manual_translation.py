#!/usr/bin/env python3
"""Rebase hand-edited zh text onto the current P2IS row structure.

Writes only to tools/_recovery/rebased. Existing source files are untouched.
"""

import json
import csv
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANUAL = HERE / "merged_jp_zh.json"
CURRENT = HERE.parent / "frontend/public/games/p2is/merged_jp_zh.json"
OUT = HERE / "_recovery/rebased"

manual_rows = json.loads(MANUAL.read_text(encoding="utf-8"))
current_rows = json.loads(CURRENT.read_text(encoding="utf-8"))
manual = {row["id"]: row for row in manual_rows}
current_ids = {row["id"] for row in current_rows}

rebased = []
copied = 0
for row in current_rows:
    result = dict(row)
    old = manual.get(row["id"])
    if old is not None:
        result["zh"] = old.get("zh", "")
        copied += 1
    rebased.append(result)

manual_only = [row for row in manual_rows if row["id"] not in current_ids]
current_only = [row for row in current_rows if row["id"] not in manual]

manual_by_jp = defaultdict(list)
current_by_jp = defaultdict(list)
for row in manual_rows:
    manual_by_jp[row.get("jp", "")].append(row["id"])
for row in current_rows:
    current_by_jp[row.get("jp", "")].append(row["id"])

manual_only_review = [{
    **row,
    "current_ids_with_same_jp": current_by_jp.get(row.get("jp", ""), []),
} for row in manual_only]
current_only_review = [{
    **row,
    "manual_ids_with_same_jp": manual_by_jp.get(row.get("jp", ""), []),
} for row in current_only]

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "merged_jp_zh.json").write_text(
    json.dumps(rebased, ensure_ascii=False), encoding="utf-8")
(OUT / "manual_only_rows.json").write_text(
    json.dumps(manual_only, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "current_only_rows.json").write_text(
    json.dumps(current_only, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "manual_only_review.json").write_text(
    json.dumps(manual_only_review, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "current_only_review.json").write_text(
    json.dumps(current_only_review, ensure_ascii=False, indent=2), encoding="utf-8")
with (OUT / "id_review.csv").open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "kind", "id", "jp", "zh", "same_jp_ids_json"
    ])
    writer.writeheader()
    for row in manual_only_review:
        writer.writerow({
            "kind": "manual_only",
            "id": row["id"],
            "jp": row.get("jp", ""),
            "zh": row.get("zh", ""),
            "same_jp_ids_json": json.dumps(
                row["current_ids_with_same_jp"], ensure_ascii=False),
        })
    for row in current_only_review:
        writer.writerow({
            "kind": "current_only",
            "id": row["id"],
            "jp": row.get("jp", ""),
            "zh": row.get("zh", ""),
            "same_jp_ids_json": json.dumps(
                row["manual_ids_with_same_jp"], ensure_ascii=False),
        })
(OUT / "summary.json").write_text(json.dumps({
    "current_rows": len(current_rows),
    "manual_rows": len(manual_rows),
    "copied_zh": copied,
    "manual_only": len(manual_only),
    "current_only": len(current_only),
    "manual_only_with_same_jp": sum(
        bool(row["current_ids_with_same_jp"]) for row in manual_only_review),
    "manual_only_without_same_jp": sum(
        not row["current_ids_with_same_jp"] for row in manual_only_review),
    "current_only_with_same_jp": sum(
        bool(row["manual_ids_with_same_jp"]) for row in current_only_review),
    "current_only_without_same_jp": sum(
        not row["manual_ids_with_same_jp"] for row in current_only_review),
}, ensure_ascii=False, indent=2), encoding="utf-8")

print((OUT / "summary.json").read_text(encoding="utf-8"))
print(f"candidate: {OUT / 'merged_jp_zh.json'}")
