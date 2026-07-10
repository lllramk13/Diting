-- ============================================================
-- RPC:有规矩的多步写操作。前端 supabase.rpc('名字', {参数})
--
-- 通用套路(每个函数都一样):
--   security definer + set search_path  → 绕过 RLS 干活,但规矩写死在函数里
--   开头一律先算 v_role := member_role(项目)  → 自己做权限判断
--   校验不过就 raise exception            → 整个函数在一个事务里,一抛全回滚
-- ============================================================


-- ------------------------------------------------------------
-- review_revision:审核一条 revision(approve / needs_changes / reject / edit_and_approve)
-- 这是四个里最难的,当模板读。它要保证的五件事:
--   1. 审核人得是本项目 reviewer 或 maintainer
--   2. 这条 revision 当前确实处于 waiting_review(不能审一条草稿或已通过的)
--   3. 禁自审:审核人 ≠ 作者(唯一例外:edit_and_approve)
--   4. 写一条 review_decisions(事件日志)
--   5. 按结果推进 entry_translations 状态机;通过时把 current_revision_id 指过去
-- 五件事在同一个事务,要么全成要么全不发生。
-- ------------------------------------------------------------
create or replace function review_revision(
  p_revision_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_translation_id uuid;
  v_project_id uuid;
  v_author_member uuid;
  v_translation_state text;
  v_role text;
  v_reviewer_member uuid;
begin
  -- 取出这条 revision 的关键信息,顺带 join 出它所属翻译的当前状态
  select r.entry_translation_id, r.project_id, r.author_id, t.state
    into v_translation_id, v_project_id, v_author_member, v_translation_state
  from translation_revisions r
  join entry_translations t on t.id = r.entry_translation_id
  where r.id = p_revision_id;

  if v_translation_id is null then
    raise exception 'revision % 不存在', p_revision_id;
  end if;

  -- (1) 权限:审核人必须是本项目 reviewer / maintainer
  v_role := member_role(v_project_id);
  if v_role not in ('reviewer', 'maintainer') then
    raise exception '无权审核:需要 reviewer 或 maintainer';
  end if;

  -- 当前用户在本项目的成员行 id(review_decisions.reviewer_id 要用它,不是 auth.uid())
  select id into v_reviewer_member
  from project_members
  where project_id = v_project_id and user_id = auth.uid() and removed_at is null;

  -- (2) 状态:只有 waiting_review 的翻译能被审核
  if v_translation_state <> 'waiting_review' then
    raise exception '该翻译当前状态为 %,不可审核', v_translation_state;
  end if;

  -- (3) 参数合法性 + 禁自审
  if p_decision not in ('approved', 'needs_changes', 'rejected', 'edit_and_approve') then
    raise exception '非法的审核结果:%', p_decision;
  end if;
  if p_decision <> 'edit_and_approve' and v_author_member = v_reviewer_member then
    raise exception '不能审核自己提交的译文';
  end if;

  -- (4) 记录审核事件
  insert into review_decisions (project_id, revision_id, reviewer_id, decision, note)
  values (v_project_id, p_revision_id, v_reviewer_member, p_decision, p_note);

  -- (5) 推进状态机
  if p_decision in ('approved', 'edit_and_approve') then
    update entry_translations
      set state = 'approved', current_revision_id = p_revision_id
      where id = v_translation_id;
  elsif p_decision = 'needs_changes' then
    update entry_translations set state = 'needs_changes' where id = v_translation_id;
  else  -- rejected
    update entry_translations set state = 'rejected' where id = v_translation_id;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- create_project:建项目 + 把创建者设为第一个 maintainer(同一事务)
-- ------------------------------------------------------------
create or replace function create_project(
  p_slug text,
  p_title text,
  p_source_lang text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  -- (1) 未登录直接拒绝
  if auth.uid() is null then
    raise exception '未登录,不能创建项目';
  end if;

  -- (2) 插入项目,拿回新 id
  insert into projects (slug, title, source_lang)
  values (p_slug, p_title, p_source_lang)
  returning id into v_project_id;

  -- (3) 把当前用户插进 project_members,角色 maintainer
  insert into project_members (project_id, user_id, role)
  values (v_project_id, auth.uid(), 'maintainer');

  -- (4) 返回新项目 id
  return v_project_id;
end;
$$;

-- ------------------------------------------------------------
-- submit_for_review:把一条翻译从 draft / needs_changes 推进到 waiting_review
-- ------------------------------------------------------------
create or replace function submit_for_review(
  p_entry_translation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_state text;
begin
  -- (1) 取这条翻译的 project_id 和当前 state 到变量;不存在就 raise
  --     
  select project_id, state
  into v_project_id, v_state
  from entry_translations
  where id = p_entry_translation_id;

  if v_project_id is null then
    raise exception 'entry_translation % 不存在', p_entry_translation_id;
  end if;
  -- (2) 权限:提交者必须是本项目成员(MVP 简单版,用 is_member)
  if not is_member(v_project_id) then
    raise exception '你不属于此项目';
  end if;
  -- (3) 状态守卫:只有 draft 或 needs_changes 能提交;否则 raise
  if v_state not in ('draft', 'needs_changes') then
    raise exception '文本只有在draft和need_changes状态下才可以提交';
  end if;
  -- (4) 执行转移:update entry_translations 把 state 改成 waiting_review
  update entry_translations
  set state = 'waiting_review'
  where id = p_entry_translation_id;

end;
$$;

-- ------------------------------------------------------------
-- save_draft:保存译文 = 追加一条 revision + 把翻译状态拉回 draft
-- 四个里逻辑最密的一个,慢慢来。要干的事:
--   1. 取翻译的 project_id / 当前 state / dup_group_id
--   2. 权限:成员即可(MVP 简单版)
--   3. 锁定守卫:对应原文若 is_locked,非 maintainer 不能改(先查该组是否有锁定原文)
--   4. 找到"上一条 revision 的 id"(同一 entry_translation 下最新那条)当 prev
--   5. 插入新 revision(内容、作者成员id、prev_revision_id)
--   6. 状态机:approved/waiting_review 的条目被再次编辑 → 拉回 draft
-- ------------------------------------------------------------
create or replace function save_draft(
  p_entry_translation_id uuid,
  p_content text
)
returns uuid   -- 返回新 revision 的 id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_state text;
  v_author_member uuid;
  v_prev_revision_id uuid;
  v_new_revision_id uuid;
begin
  -- (1) 取 entry_translations 的 project_id / state 到变量;不存在就 raise
  select project_id, state
  into v_project_id, v_state
  from entry_translations
  where id = p_entry_translation_id;

  if v_project_id is null then
    raise exception 'entry_translation % 不存在', p_entry_translation_id;
  end if;
  -- (2) 权限:is_member 校验
  if not is_member(v_project_id) then
    raise exception '你不属于此项目';
  end if;
  -- (3) 取当前用户在本项目的成员行 id 到 v_author_member
  select id
  into v_author_member
  from project_members
  where project_id = v_project_id and user_id = auth.uid() and removed_at is null;
  -- (4) 找上一条 revision:同一 entry_translation_id 下 created_at 最新的那条 id
  select id into v_prev_revision_id
  from translation_revisions
  where entry_translation_id = p_entry_translation_id
  order by created_at desc
  limit 1;
  -- (5) 插入新 revision,returning id into v_new_revision_id
  insert into translation_revisions
    (entry_translation_id, project_id, author_id, prev_revision_id, content)
  values
    (p_entry_translation_id, v_project_id, v_author_member, v_prev_revision_id, p_content)
  returning id into v_new_revision_id;

  -- (6) 状态机:被再次编辑就拉回 draft(已是 draft 也无害)
  update entry_translations
  set state = 'draft'
  where id = p_entry_translation_id;

  return v_new_revision_id;
end;
$$;