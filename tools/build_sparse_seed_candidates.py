#!/usr/bin/env python3
"""Build reviewed sparse-seed candidates without writing to Supabase.

High confidence means either the hand-edited final text differs from the
current bundled text, or a merged PR has a non-null stored baseline. Legacy
merged rows without a baseline are kept in a separate review file.
"""

import json
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
GAME = REPO / "frontend/public/games/p2is"
FINAL = HERE / "_recovery/rebased/merged_jp_zh.json"
PR = HERE / "pr.json"
OUT = HERE / "_recovery/sparse_seed"

final_rows = json.loads(FINAL.read_text(encoding="utf-8"))
current_rows = json.loads((GAME / "merged_jp_zh.json").read_text(encoding="utf-8"))
pr_rows = json.loads(PR.read_text(encoding="utf-8"))
final_by_id = {row["id"]: row for row in final_rows}
current_by_id = {row["id"]: row for row in current_rows}

position_dup = {}
dup_positions = defaultdict(list)
for path in (GAME / "groups").glob("*.json"):
    for row in json.loads(path.read_text(encoding="utf-8")):
        position_dup[row["id"]] = row.get("dup")
        if row.get("dup"):
            dup_positions[row["dup"]].append(row["id"])

dup_map = json.loads((GAME / "dup_map.json").read_text(encoding="utf-8"))
candidates = defaultdict(lambda: {"contents": set(), "reasons": set()})
low_confidence = {}


def group_for(position_id):
    return ":".join(position_id.split(":")[:2])


def add_target(source_file, string_id, content, reason):
    item = candidates[(source_file, string_id)]
    item["contents"].add(content)
    item["reasons"].add(reason)


def final_dup_contents(dup_id):
    return {
        final_by_id[position_id].get("zh", "")
        for position_id in dup_positions.get(dup_id, [])
        if position_id in final_by_id
    }


# Direct hand edits relative to the current bundled website text.
for string_id, final_row in final_by_id.items():
    current_row = current_by_id.get(string_id)
    if current_row is None or final_row.get("zh", "") == current_row.get("zh", ""):
        continue
    dup_id = position_dup.get(string_id)
    if dup_id and dup_id in dup_map:
        add_target(
            f'dup:{dup_map[dup_id]["category"]}',
            dup_id,
            final_row.get("zh", ""),
            "manual_diff",
        )
    else:
        add_target(group_for(string_id), string_id, final_row.get("zh", ""), "manual_diff")


# Accepted PR history recovers human changes already present in the old bundle.
for row in pr_rows:
    if row.get("request_status") != "merged":
        continue
    source_file = row.get("source_file", "")
    string_id = row["string_id"]
    if row.get("base_content") is None:
        low_confidence[(source_file, string_id)] = {
            "source_file": source_file,
            "string_id": string_id,
            "reason": "merged_pr_missing_base",
        }
        continue
    if source_file.startswith("dup:"):
        contents = final_dup_contents(string_id)
        for content in contents:
            add_target(source_file, string_id, content, "merged_pr_with_base")
    elif string_id in final_by_id:
        add_target(
            source_file,
            string_id,
            final_by_id[string_id].get("zh", ""),
            "merged_pr_with_base",
        )


seed, conflicts = [], []
for (source_file, string_id), item in sorted(candidates.items()):
    contents = sorted(item["contents"])
    record = {
        "source_file": source_file,
        "string_id": string_id,
        "contents": contents,
        "reasons": sorted(item["reasons"]),
    }
    if len(contents) == 1:
        seed.append({**record, "content": contents[0]})
    else:
        conflicts.append(record)

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "high_confidence.json").write_text(
    json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "duplicate_conflicts.json").write_text(
    json.dumps(conflicts, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "legacy_missing_base.json").write_text(
    json.dumps(list(low_confidence.values()), ensure_ascii=False, indent=2), encoding="utf-8")
summary = {
    "high_confidence": len(seed),
    "duplicate_conflicts": len(conflicts),
    "legacy_missing_base": len(low_confidence),
}
(OUT / "summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
