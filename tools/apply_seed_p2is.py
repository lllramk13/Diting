#!/usr/bin/env python3
"""
Bake dup_seed.json (the chosen translation per duplicate sentence, from migrate_p2is.py)
into the p2is staging files, so the dup sets + mirror rows show the consolidated translation
from the file baseline — no DB write needed.

  - dups/*.json   : row.zh = seed[row.id]
  - groups/*.json : for rows with .dup, row.zh = seed[row.dup]
  - merged_jp_zh.json : rebuilt as the concat of groups (kept consistent)

Run AFTER gen_split.py + migrate_p2is.py:  python3 tools/apply_seed_p2is.py
"""
import os, json, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ST = os.path.join(HERE, '_staging', 'p2is')

seed = json.load(open(f'{ST}/dup_seed.json'))
print('seed entries:', len(seed))

# dup sets
d_changed = 0
for f in glob.glob(f'{ST}/dups/*.json'):
    rows = json.load(open(f))
    for r in rows:
        if r['id'] in seed:
            r['zh'] = seed[r['id']]; d_changed += 1
    json.dump(rows, open(f, 'w'), ensure_ascii=False)
print('dup-set rows updated:', d_changed)

# normal groups (mirror rows) + rebuild merged
g_changed = 0
flat = []
for f in sorted(glob.glob(f'{ST}/groups/*.json')):
    rows = json.load(open(f))
    for r in rows:
        if r.get('dup') and r['dup'] in seed:
            r['zh'] = seed[r['dup']]; g_changed += 1
    json.dump(rows, open(f, 'w'), ensure_ascii=False)
    flat.extend(rows)
print('normal mirror rows updated:', g_changed)

json.dump(flat, open(f'{ST}/merged_jp_zh.json', 'w'), ensure_ascii=False)
print('rebuilt merged_jp_zh.json rows:', len(flat))
print('done.')
