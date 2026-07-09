# Sparse translation rollout

Deploy in this order:

1. Back up `translation_sets`, `translation_entries`, and `merge_requests`.
2. Apply `migrations/20260628_sparse_translation_overrides.sql` in Supabase.
3. Deploy the matching frontend.
4. Create a new Fork and verify that it starts with zero child entries.
5. Edit one sentence, save it, and verify that exactly one child entry exists
   with `base_content` set to the inherited parent value.
6. Submit and merge the version-2 PR. Verify that the parent changes and the PR
   receives `merged_at` in the same transaction.

Do not clear or replace existing official entries yet. The local seed analysis
currently contains unresolved duplicate-sentence choices and legacy PR rows
without a trustworthy baseline. Existing PRs remain `format_version = 1` and
are preserved for reading, comments, votes, and statistics, but cannot be
merged through the new transaction.

Generated recovery reports live under `tools/_recovery/sparse_seed/`:

- `high_confidence.json`: locally validated candidate overrides;
- `duplicate_conflicts.json`: duplicate sentences with competing translations;
- `legacy_missing_base.json`: old merged PR rows whose original value is
  unknown and therefore cannot be auto-imported.
