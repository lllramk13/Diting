-- Sparse translation overrides and conflict-safe merge requests.
-- Apply before deploying the matching frontend. No existing rows are deleted.

begin;

alter table public.translation_entries
  add column if not exists base_content text;


alter table public.translation_sets
  add column if not exists storage_version smallint not null default 1;

alter table public.translation_sets
  drop constraint if exists translation_sets_storage_version_check;
alter table public.translation_sets
  add constraint translation_sets_storage_version_check
  check (storage_version in (1, 2));

alter table public.merge_requests
  add column if not exists format_version smallint not null default 1,
  add column if not exists merged_at timestamptz;

alter table public.merge_requests
  drop constraint if exists merge_requests_format_version_check;
alter table public.merge_requests
  add constraint merge_requests_format_version_check
  check (format_version in (1, 2));


create or replace function public.effective_translation_content(
  p_set_id uuid,
  p_string_id text
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with recursive set_chain as (
    select id, forked_from, 0 as depth
    from public.translation_sets
    where id = p_set_id
    union all
    select parent.id, parent.forked_from, child.depth + 1
    from public.translation_sets parent
    join set_chain child on parent.id = child.forked_from
  )
  select coalesce((
    select entry.content
    from set_chain chain
    join public.translation_entries entry on entry.set_id = chain.id
    where entry.string_id = p_string_id
    order by chain.depth
    limit 1
  ), '');
$$;

create or replace function public.merge_translation_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.merge_requests%rowtype;
  change_row record;
  expected_content text;
  current_content text;
  target_parent_id uuid;
  conflicts jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin is true
  ) then
    raise exception 'admin_required';
  end if;

  select * into request_row
  from public.merge_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'request_not_found'; end if;
  if request_row.status <> 'open' then raise exception 'request_not_open'; end if;
  if request_row.format_version <> 2 then raise exception 'legacy_snapshot_not_mergeable'; end if;
  if request_row.snapshot is null or request_row.base_snapshot is null then
    raise exception 'delta_payload_missing';
  end if;


  select forked_from into target_parent_id
  from public.translation_sets
  where id = request_row.to_set_id;

  for change_row in
    select key as string_id, value as new_content
    from jsonb_each_text(request_row.snapshot::jsonb)
  loop
    if not (request_row.base_snapshot::jsonb ? change_row.string_id) then
      raise exception 'base_content_missing:%', change_row.string_id;
    end if;
    expected_content := request_row.base_snapshot::jsonb ->> change_row.string_id;
    current_content := public.effective_translation_content(
      request_row.to_set_id,
      change_row.string_id
    );

    if current_content is distinct from expected_content then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object(
        'string_id', change_row.string_id,
        'expected', expected_content,
        'current', current_content,
        'proposed', change_row.new_content
      ));
    end if;
  end loop;

  if jsonb_array_length(conflicts) > 0 then
    raise exception 'merge_conflict:%', conflicts::text;
  end if;

  for change_row in
    select key as string_id, value as new_content
    from jsonb_each_text(request_row.snapshot::jsonb)
  loop
    if change_row.new_content = '' and target_parent_id is null then
      delete from public.translation_entries
      where set_id = request_row.to_set_id
        and string_id = change_row.string_id;
    else
      insert into public.translation_entries (
        set_id, string_id, content, sort_order, base_content, updated_at
      ) values (
        request_row.to_set_id, change_row.string_id,
        change_row.new_content, 0, null, now()
      )
      on conflict (set_id, string_id) do update set
        content = excluded.content,
        base_content = null,
        updated_at = excluded.updated_at;
    end if;
  end loop;

  update public.merge_requests
  set status = 'merged', merged_at = now()
  where id = request_row.id;

  return jsonb_build_object(
    'request_id', request_row.id,
    'changed_count', (select count(*) from jsonb_object_keys(request_row.snapshot::jsonb)),
    'status', 'merged'
  );
end;
$$;

revoke all on function public.merge_translation_request(uuid) from public;
grant execute on function public.merge_translation_request(uuid) to authenticated;
revoke all on function public.effective_translation_content(uuid, text) from public;

commit;
