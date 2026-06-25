#!/usr/bin/env python3
"""
Transform each game's merged_jp_zh.json into the split structure:
  - groups/   : NON-deduped, one row per in-game position, each with its own speaker.
                duplicate sentences carry dup=<dup_id> (read-only mirror); unique ones dup=null (editable).
  - dups/     : deduped by sentence text ALONE (no speaker), split into one file per category.
  - merged_jp_zh.json : flat per-position list (same ids as groups) so the search page stays consistent.
  - index.json / dups_index.json / dup_map.json : indexes + dup routing.

Outputs to tools/_staging/<game>/ . Does NOT touch the live public/ files — deploy is a separate copy step.
Run:  python3 tools/gen_split.py
"""
import json, os, glob, hashlib, collections

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
ROOT = os.path.join(REPO, 'frontend', 'public', 'games')
OUT = os.path.join(HERE, '_staging')

GAMES = {
    'p2is': ['script','field','strtbl','config','contactui','mainmenu','map_names','names','nametable'],
    'p2ep': ['script','field','strtbl','SLUS','free'],
}

def cat_of(s, cats):
    for c in cats:
        if s.startswith(c): return c
    return '其他'

def dup_id(jp):
    return 'dup:' + hashlib.sha1(jp.encode('utf-8')).hexdigest()[:12]

def write_merged(out_dir, flat, max_bytes=20_000_000):
    """Write the search index, split into <max_bytes parts (Cloudflare Pages caps files at 25 MiB).
    Part 0 stays named merged_jp_zh.json; a merged_index.json lists all parts."""
    parts, buf, size, idx = [], [], 2, 0
    def flush():
        nonlocal buf, size, idx
        name = 'merged_jp_zh.json' if idx == 0 else f'merged_{idx}.json'
        json.dump(buf, open(f'{out_dir}/{name}', 'w'), ensure_ascii=False)
        parts.append(name); buf = []; size = 2; idx += 1
    for r in flat:
        rs = len(json.dumps(r, ensure_ascii=False).encode('utf-8')) + 1
        if buf and size + rs > max_bytes:
            flush()
        buf.append(r); size += rs
    flush()
    json.dump(parts, open(f'{out_dir}/merged_index.json', 'w'), ensure_ascii=False)
    return parts

def build_positions(game, cats):
    items = json.load(open(f'{ROOT}/{game}/merged_jp_zh.json'))
    # p2ep source must be the ORIGINAL deduped merged (with srcs); if the live file has already
    # been replaced by the per-position output, read the original from the backup instead.
    if game == 'p2ep' and not any(it.get('srcs') for it in items[:50]):
        backup = os.path.join(HERE, '_backup', 'p2ep_backup', 'merged_jp_zh.json')
        if os.path.exists(backup):
            items = json.load(open(backup))
            print('  [note] p2ep: live merged already transformed, reading original from p2ep_backup')
    positions = []
    if game == 'p2ep':
        def grp(s): return ':'.join(s.split(':')[:2])
        for it in items:
            for s in it.get('srcs', []):
                positions.append({
                    'pos_id': s, 'group': grp(s), 'category': cat_of(s, cats),
                    'jp': it.get('jp',''), 'zh': it.get('zh',''),
                    'speaker_jp': it.get('meta','') or '', 'speaker_zh': '',
                })
    else:
        # p2is is already per-position. group = first two ':'-segments of the id
        # (reproduces the original index.json group keys exactly — keep the colons!).
        for it in items:
            group = ':'.join(it['id'].split(':')[:2])
            positions.append({
                'pos_id': it['id'], 'group': group, 'category': cat_of(it['id'], cats),
                'jp': it.get('jp',''), 'zh': it.get('zh',''),
                'speaker_jp': it.get('speaker_jp','') or '', 'speaker_zh': it.get('speaker_zh','') or '',
            })
    return positions

def run(game, cats):
    positions = build_positions(game, cats)
    # a few addresses are shared by redundant legacy/manual entries (same jp) -> keep first per pos_id
    seen_pos = set(); deduped = []
    for p in positions:
        if p['pos_id'] in seen_pos: continue
        seen_pos.add(p['pos_id']); deduped.append(p)
    dropped = len(positions) - len(deduped)
    if dropped: print(f'  [note] dropped {dropped} duplicate-address rows ({game})')
    positions = deduped

    jp_count = collections.Counter(p['jp'] for p in positions)
    jp_cats = collections.defaultdict(collections.Counter)
    for p in positions:
        jp_cats[p['jp']][p['category']] += 1

    dups = {}
    for p in positions:
        jp = p['jp']
        if jp_count[jp] > 1 and jp not in dups:
            primary_cat = jp_cats[jp].most_common(1)[0][0]
            dups[jp] = {'id': dup_id(jp), 'jp': jp, 'zh': p['zh'],
                        'count': jp_count[jp], 'category': primary_cat}

    def fname(s): return s.replace(":","_").replace("@","_")

    ndir = f'{OUT}/{game}/groups'; os.makedirs(ndir, exist_ok=True)
    by_group = collections.defaultdict(list)
    for p in positions:
        jp = p['jp']
        row = {'id': p['pos_id'], 'jp': jp, 'zh': p['zh']}
        if p['speaker_jp']: row['speaker_jp'] = p['speaker_jp']
        if p['speaker_zh']: row['speaker_zh'] = p['speaker_zh']
        row['dup'] = dups[jp]['id'] if jp_count[jp] > 1 else None
        by_group[p['group']].append(row)
    for grp, rows in by_group.items():
        json.dump(rows, open(f'{ndir}/{fname(grp)}.json','w'), ensure_ascii=False)

    ddir = f'{OUT}/{game}/dups'; os.makedirs(ddir, exist_ok=True)
    by_cat = collections.defaultdict(list)
    for d in dups.values():
        by_cat[d['category']].append({'id': d['id'], 'jp': d['jp'], 'zh': d['zh'], 'count': d['count']})
    for cat, rows in by_cat.items():
        json.dump(rows, open(f'{ddir}/{fname(cat)}.json','w'), ensure_ascii=False)

    flat = []
    for grp, rows in by_group.items():
        flat.extend(rows)
    write_merged(f'{OUT}/{game}', flat)

    json.dump([{'group': g, 'count': len(r)} for g,r in sorted(by_group.items())],
              open(f'{OUT}/{game}/index.json','w'), ensure_ascii=False, indent=0)
    json.dump([{'category': c, 'set_key': f'dup:{c}', 'count': len(r)} for c,r in sorted(by_cat.items())],
              open(f'{OUT}/{game}/dups_index.json','w'), ensure_ascii=False, indent=0)
    json.dump({d['id']: {'category': d['category'], 'zh': d['zh']} for d in dups.values()},
              open(f'{OUT}/{game}/dup_map.json','w'), ensure_ascii=False)

    editable = sum(1 for p in positions if jp_count[p['jp']] == 1)
    print(f'  {game}: positions={len(positions)} groups={len(by_group)} '
          f'dup_sentences={len(dups)} editable={editable}')

if __name__ == '__main__':
    for game, cats in GAMES.items():
        run(game, cats)
    print(f'done -> {OUT}')
