# Translation recovery

This recovery is intentionally split into a read-only export and a later,
reviewed import. Do not delete or replace database rows before the export and
backup have been verified.

## 1. Export every merge-request candidate

1. Open `tools/export_merge_changes.sql` in the Supabase SQL editor.
2. Set `target_game` (currently `p2is`).
3. Run the query and export the result as CSV.
4. Keep the original CSV unchanged as a backup.

The export contains one row per PR candidate. `candidate_count > 1` means that
the same sentence has multiple candidate versions. `newest_candidate_rank = 1`
only identifies the newest PR; it does not automatically mean that version is
correct.

Historical PR baselines were generated from bundled `row.zh` text instead of
the parent set at fork time. Consequently, exported rows can include inherited
translations that the PR author never edited. Every retained row must be
reviewed locally.

## 2. Prepare the reviewed file

Create a new UTF-8 CSV or JSON file containing only approved translations with
these fields:

```text
game_slug,source_file,string_id,content
```

Omitting a sentence means "no reviewed translation". An explicitly included
empty `content` means "clear this translation"; it must not be treated as an
omitted row.

Do not edit the original export in place. It is evidence for resolving later
conflicts.

## 3. Before import

The importer still needs to be implemented together with the editor's new
delta model. It must:

- back up all affected `translation_sets` and `translation_entries`;
- validate every `(game_slug, source_file, string_id)` against the local source;
- reject duplicate keys and unknown sets/IDs;
- replace entries only for the explicitly selected official sets;
- run in dry-run mode by default and require an explicit apply flag;
- preserve empty strings as intentional changes;
- leave merge-request history untouched.

The editor must also stop using bundled AI `row.zh` as the editable field's
fallback. Otherwise a missing database row will still display AI text even
after the database cleanup.
