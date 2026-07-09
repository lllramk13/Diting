#!/usr/bin/env python3
"""Read-only comparison of exported PR candidates and local P2IS sets."""

import csv, json
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
GAME = REPO / "frontend/public/games/p2is"
OUT = HERE / "_staging/p2is/pr_recovery_audit"


def source_path(source_file):
    if source_file.startswith("dup:"):
        name = source_file[4:].replace(":", "_")
        return GAME / "dups" / f"{name}.json"
    return GAME / "groups" / f'{source_file.replace(":", "_")}.json'


candidates = json.loads((HERE / "pr.json").read_text(encoding="utf-8"))
grouped = defaultdict(list)
for candidate in candidates:
    grouped[(candidate["source_file"], candidate["string_id"])].append(candidate)

cache, report = {}, []
for (source_file, string_id), rows in sorted(grouped.items()):
    path = source_path(source_file)
    if path not in cache:
        cache[path] = ({r["id"]: r for r in json.loads(path.read_text(encoding="utf-8"))}
                       if path.exists() else None)
    indexed = cache[path]
    local_row = indexed.get(string_id) if indexed is not None else None
    local = local_row.get("zh") if local_row is not None else None
    rows.sort(key=lambda r: (r.get("request_created_at") or "", r["request_id"]),
              reverse=True)
    versions = list(dict.fromkeys(r.get("proposed_content") for r in rows))
    merged = list(dict.fromkeys(r.get("proposed_content") for r in rows
                                if r.get("request_status") == "merged"))
    merged_rows = [r for r in rows if r.get("request_status") == "merged"]
    local_is_merged_base = any(r.get("base_content") is not None and
                               r.get("base_content") == local for r in merged_rows)

    if indexed is None:
        classification = "missing_file"
    elif local_row is None:
        classification = "missing_id"
    elif local not in versions and not merged:
        classification = "no_merged_candidate"
    elif local not in versions and len(merged) > 1:
        classification = "merged_versions_conflict"
    elif local not in versions and local_is_merged_base:
        classification = "safe_merged_patch"
    elif local not in versions:
        classification = "local_conflict_review"
    elif len(versions) > 1:
        classification = "multiple_versions_review"
    else:
        classification = "local_matches_candidate"

    report.append({
        "classification": classification,
        "source_file": source_file,
        "string_id": string_id,
        "local_path": str(path.relative_to(REPO)),
        "jp": local_row.get("jp") if local_row else None,
        "local_content": local,
        "candidate_contents": versions,
        "merged_contents": merged,
        "requests": rows,
    })

counts = defaultdict(int)
for row in report:
    counts[row["classification"]] += 1
summary = {"total_ids": len(report), "classifications": dict(sorted(counts.items()))}

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2),
                                encoding="utf-8")
(OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2),
                                  encoding="utf-8")
(OUT / "safe_merged_patch.json").write_text(json.dumps([
    {
        "source_file": row["source_file"],
        "string_id": row["string_id"],
        "original": row["local_content"],
        "new": row["merged_contents"][0],
    }
    for row in report if row["classification"] == "safe_merged_patch"
], ensure_ascii=False, indent=2), encoding="utf-8")
with (OUT / "needs_review.csv").open("w", encoding="utf-8-sig", newline="") as f:
    fields = ["classification", "source_file", "string_id", "local_path", "jp",
              "local_content", "candidate_contents_json", "merged_contents_json"]
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    for row in report:
        if row["classification"] not in {
            "local_conflict_review", "merged_versions_conflict",
            "multiple_versions_review"
        }:
            continue
        writer.writerow({
            **{key: row[key] for key in fields[:6]},
            "candidate_contents_json": json.dumps(row["candidate_contents"], ensure_ascii=False),
            "merged_contents_json": json.dumps(row["merged_contents"], ensure_ascii=False),
        })

print(json.dumps(summary, ensure_ascii=False, indent=2))
print(f"review: {OUT / 'needs_review.csv'}")
