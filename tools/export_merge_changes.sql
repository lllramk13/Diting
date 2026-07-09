-- Read-only recovery export for merge request translations.
--
-- Run this in the Supabase SQL editor, then export the result as CSV.
-- Change target_game below when recovering another game.
--
-- Important: historical merge requests used an incorrect baseline. A row in
-- this result is therefore a recovery candidate, not proof that the PR author
-- personally edited it. Review candidates locally before importing anything.

with params as (
  select 'p2is'::text as target_game
),
expanded as (
  select
    mr.game_slug,
    target.source_file,
    mr.to_set_id,
    mr.id as request_id,
    mr.status as request_status,
    mr.created_at as request_created_at,
    mr.title as request_title,
    coalesce(profile.username, mr.user_id::text) as author,
    change.key as string_id,
    coalesce(mr.base_snapshot::jsonb, '{}'::jsonb) ->> change.key as base_content,
    change.value as proposed_content
  from public.merge_requests as mr
  join params on params.target_game = mr.game_slug
  join public.translation_sets as target on target.id = mr.to_set_id
  left join public.profiles as profile on profile.id = mr.user_id
  cross join lateral jsonb_each_text(
    coalesce(mr.snapshot::jsonb, '{}'::jsonb)
  ) as change(key, value)
),
changed as (
  select *
  from expanded
  -- Deliberately do not trim or reject empty strings: clearing a translation
  -- is a real change and whitespace/control codes can be significant.
  where proposed_content is distinct from base_content
),
ranked as (
  select
    changed.*,
    count(*) over (
      partition by game_slug, source_file, string_id
    ) as candidate_count,
    row_number() over (
      partition by game_slug, source_file, string_id
      order by request_created_at desc nulls last, request_id desc
    ) as newest_candidate_rank
  from changed
)
select
  game_slug,
  source_file,
  string_id,
  base_content,
  proposed_content,
  candidate_count,
  newest_candidate_rank,
  request_status,
  request_id,
  request_created_at,
  request_title,
  author
from ranked
order by source_file, string_id, newest_candidate_rank;
