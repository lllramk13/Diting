#!/usr/bin/env python3
"""
p2is dup-set seed migration. Run AFTER `python3 tools/gen_split.py`.

For each duplicate sentence, the dup-set translation = the translation of its
MOST-RECENTLY-EDITED position (translation_entries.updated_at). Positions never
edited in-app fall back to the file `zh` baseline (treated as oldest).

Needs READ access to Supabase:
    export SUPABASE_URL=https://xxxx.supabase.co
    export SUPABASE_KEY=<service-role or a key with read on translation_sets/_entries>
    python3 tools/migrate_p2is.py

Outputs into tools/_staging/p2is/:
    dup_seed.json        {dup_id: chosen_content}   -> load into the dup sets' translation_entries
    conflict_report.csv  sentences whose positions disagreed (chosen + alternatives) for review

It does NOT write to the DB. Review the outputs, then load dup_seed.json yourself.
"""
import os, json, glob, csv, urllib.request, urllib.parse, collections

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
STAGING = os.path.join(HERE, '_staging', 'p2is')

def load_env_file(path):
    env = {}
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

# credentials: explicit env vars win, else read frontend/.env.local then frontend/.env
_fe = {}
for _name in ('.env.local', '.env'):
    _fe.update({k: v for k, v in load_env_file(os.path.join(REPO, 'frontend', _name)).items()
                if k not in _fe})

URL = (os.environ.get('SUPABASE_URL') or _fe.get('VITE_SUPABASE_URL') or '').rstrip('/')
KEY = os.environ.get('SUPABASE_KEY') or _fe.get('VITE_SUPABASE_ANON_KEY') or ''
if not URL or not KEY:
    raise SystemExit('找不到 Supabase 连接信息：请确认 frontend/.env.local 里有 '
                     'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，或手动 export SUPABASE_URL / SUPABASE_KEY')
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}

def page(path, params):
    out, frm = [], 0
    while True:
        h = dict(HDR); h['Range'] = f'{frm}-{frm+999}'
        q = urllib.parse.urlencode(params, doseq=True)
        req = urllib.request.Request(f'{URL}/rest/v1/{path}?{q}', headers=h)
        with urllib.request.urlopen(req) as r:
            chunk = json.load(r)
        out += chunk
        if len(chunk) < 1000: break
        frm += 1000
    return out

sets = page('translation_sets', {'select': 'id', 'game_slug': 'eq.p2is', 'is_official': 'eq.true'})
set_ids = [s['id'] for s in sets]
print('official p2is sets:', len(set_ids))

latest = {}
for i in range(0, len(set_ids), 50):
    batch = set_ids[i:i+50]
    rows = page('translation_entries',
                {'select': 'string_id,content,updated_at', 'set_id': f'in.({",".join(batch)})'})
    for r in rows:
        sid, ts = r['string_id'], r.get('updated_at') or ''
        if sid not in latest or ts > latest[sid][1]:
            latest[sid] = (r.get('content') or '', ts)
print('positions with in-app edits:', len(latest))

dup_positions = collections.defaultdict(list)
file_zh = {}
for f in glob.glob(f'{STAGING}/groups/*.json'):
    for row in json.load(open(f)):
        file_zh[row['id']] = row.get('zh', '')
        if row.get('dup'):
            dup_positions[row['dup']].append(row['id'])

seed, conflicts = {}, []
for dup_id, pos_ids in dup_positions.items():
    cands = []
    for pid in pos_ids:
        if pid in latest:
            cands.append((latest[pid][0], latest[pid][1], pid))
        else:
            cands.append((file_zh.get(pid, ''), '', pid))
    cands.sort(key=lambda c: c[1])
    chosen = cands[-1][0]
    seed[dup_id] = chosen
    distinct = {c[0] for c in cands}
    if len(distinct) > 1:
        conflicts.append((dup_id, chosen, ' || '.join(sorted(distinct - {chosen}))[:500]))

json.dump(seed, open(f'{STAGING}/dup_seed.json', 'w'), ensure_ascii=False)
with open(f'{STAGING}/conflict_report.csv', 'w', newline='') as fp:
    w = csv.writer(fp); w.writerow(['dup_id', 'chosen', 'alternatives'])
    w.writerows(conflicts)

print(f'dup sentences seeded: {len(seed)}')
print(f'conflicts (divergent, logged for review): {len(conflicts)}')
print(f'-> {STAGING}/dup_seed.json , conflict_report.csv')
