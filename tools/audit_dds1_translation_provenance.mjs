#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const [dumpPath, baselinePath, dupMapPath, outputPath] = process.argv.slice(2);
if (!dumpPath || !baselinePath || !dupMapPath || !outputPath) {
  console.error('usage: audit_dds1_translation_provenance.mjs <dump.sql> <baseline.json> <dup_map.json> <output.json>');
  process.exit(2);
}

const dump = fs.readFileSync(dumpPath, 'utf8');

function decodeCopy(value) {
  if (value === '\\N') return null;
  return value.replace(/\\([\\btnrf])/g, (_, escaped) => ({
    '\\': '\\', b: '\b', t: '\t', n: '\n', r: '\r', f: '\f',
  })[escaped]);
}

function copyRows(tableName) {
  const marker = `COPY "public"."${tableName}" (`;
  const headerStart = dump.indexOf(marker);
  if (headerStart < 0) throw new Error(`COPY block not found: ${tableName}`);
  const headerEnd = dump.indexOf('\n', headerStart);
  const header = dump.slice(headerStart, headerEnd);
  const columns = [...header.matchAll(/"([^"]+)"/g)].slice(2).map((match) => match[1]);
  const dataEnd = dump.indexOf('\n\\.\n', headerEnd);
  return dump.slice(headerEnd + 1, dataEnd).split('\n').filter(Boolean).map((line) => {
    const values = line.split('\t').map(decodeCopy);
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  });
}

const profiles = new Map(copyRows('profiles').map((row) => [row.id, row.username]));
const sets = copyRows('translation_sets');
const ddsSets = sets.filter((row) => row.game_slug === 'dds1');
const ddsSetIds = new Set(ddsSets.map((row) => row.id));
const officialSetIds = new Set(ddsSets.filter((row) => row.is_official === 't').map((row) => row.id));
const entries = copyRows('translation_entries').filter((row) => ddsSetIds.has(row.set_id));
const mergeRequests = copyRows('merge_requests')
  .filter((row) => row.game_slug === 'dds1' && row.status === 'merged')
  .map((row) => ({
    ...row,
    snapshotObject: row.snapshot ? JSON.parse(row.snapshot) : {},
  }));

const baselineRows = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const baseline = new Map(baselineRows.map((row) => [row.id, row.zh ?? '']));
const dupMap = JSON.parse(fs.readFileSync(dupMapPath, 'utf8'));
for (const [id, row] of Object.entries(dupMap)) baseline.set(id, row.zh ?? '');

function lastMatchingMerge(entry) {
  return mergeRequests
    .filter((request) => request.snapshotObject[entry.string_id] === entry.content)
    .sort((a, b) => String(b.merged_at).localeCompare(String(a.merged_at)))[0];
}

function describe(entry) {
  const set = ddsSets.find((row) => row.id === entry.set_id);
  const request = lastMatchingMerge(entry);
  return {
    entry_id: entry.id,
    set_id: entry.set_id,
    string_id: entry.string_id,
    source_file: set?.source_file ?? null,
    updated_at: entry.updated_at,
    last_matching_merge_id: request?.id ?? null,
    last_matching_merge_at: request?.merged_at ?? null,
    last_matching_merge_author: request ? (profiles.get(request.user_id) ?? request.user_id) : null,
  };
}

const official = entries.filter((row) => officialSetIds.has(row.set_id));
const personal = entries.filter((row) => !officialSetIds.has(row.set_id));
const exactImported = (row) => baseline.has(row.string_id) && row.content === baseline.get(row.string_id) && row.content !== '';
const officialExact = official.filter(exactImported).map(describe);
const officialDifferent = official.filter((row) => !exactImported(row)).map(describe);
const personalExact = personal.filter(exactImported).map(describe);

const report = {
  generated_at: new Date().toISOString(),
  inputs: {
    database_dump: path.resolve(dumpPath),
    imported_baseline: path.resolve(baselinePath),
    duplicate_map: path.resolve(dupMapPath),
  },
  policy: {
    clear_static_zh: true,
    preserve_source_ids_and_japanese: true,
    preserve_official_entries_different_from_imported_baseline: true,
    official_entries_exactly_matching_imported_baseline: 'manual decision required',
    preserve_personal_sets: true,
    preserve_merge_request_history: true,
  },
  counts: {
    static_rows: baselineRows.length,
    static_nonempty_zh: baselineRows.filter((row) => row.zh).length,
    dds_sets: ddsSets.length,
    official_sets: officialSetIds.size,
    personal_sets: ddsSets.length - officialSetIds.size,
    official_entries: official.length,
    official_entries_to_preserve: officialDifferent.length,
    official_entries_exactly_matching_imported_baseline: officialExact.length,
    personal_entries: personal.length,
    personal_entries_exactly_matching_imported_baseline: personalExact.length,
    merged_requests: mergeRequests.length,
  },
  candidates: {
    official_exact_imported: officialExact,
    personal_exact_imported_preserve: personalExact,
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.counts, null, 2));
