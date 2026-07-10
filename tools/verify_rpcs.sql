-- ============================================================
-- 手动串跑四个 RPC,验证后端逻辑(不是 pen test,只是"确认能跑")
-- 用法:本地 Studio → SQL Editor,整段贴进去执行,看最后的 select 输出。
-- 跑完数据留在库里,想重来就先 supabase db reset。
--
-- 关键技巧:RPC 里的 auth.uid() 读的是会话变量 request.jwt.claims。
-- SQL Editor 默认没有登录用户,所以我们手动伪造两个用户的身份来回切换。
-- ============================================================

-- ---- 造两个假用户(auth.users 是 Supabase 的表,平时由注册流程写) ----
-- 译者 alice 和审核 bob
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com')
on conflict (id) do nothing;

insert into profiles (id, username)
values
  ('11111111-1111-1111-1111-111111111111', 'alice'),
  ('22222222-2222-2222-2222-222222222222', 'bob')
on conflict (id) do nothing;

-- ---- 辅助:切换当前登录身份 ----
-- 之后每次调 RPC 前,先 set 一下"我现在是谁"
-- (这行就是在伪造 auth.uid() 的返回值)

-- ========== 以 alice 身份:建项目 ==========
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select create_project('test-game', '测试游戏', 'ja') as new_project_id \gset

-- create_project 返回的 id 存进了 :new_project_id,后面要用它造测试数据


-- ========== 造一条可翻译的数据(平时由导入脚本干) ==========
-- 一个去重组 + 一条原文 + 一条待翻译记录
insert into dup_groups (id, project_id)
values ('33333333-3333-3333-3333-333333333333', :'new_project_id');

insert into text_entries (project_id, dup_group_id, string_id, original_text, file_path)
values (:'new_project_id', '33333333-3333-3333-3333-333333333333', 'TEST#1', 'こんにちは', 'test.txt');

insert into entry_translations (id, dup_group_id, project_id, lang, state)
values ('44444444-4444-4444-4444-444444444444',
        '33333333-3333-3333-3333-333333333333', :'new_project_id', 'zh', 'untranslated');

-- ========== 把 bob 拉进项目当 reviewer(alice 是 maintainer,有权邀请) ==========
insert into project_members (project_id, user_id, role)
values (:'new_project_id', '22222222-2222-2222-2222-222222222222', 'reviewer');

-- ========== alice 保存译文 → 提交审核 ==========
select save_draft('44444444-4444-4444-4444-444444444444', '你好') as rev_id \gset
select submit_for_review('44444444-4444-4444-4444-444444444444');

-- 此刻状态应为 waiting_review,current_revision_id 仍为空
select '提交后' as 阶段, state, current_revision_id from entry_translations
where id = '44444444-4444-4444-4444-444444444444';

-- ========== 关键校验:alice 不能审自己的译文(应当报错) ==========
-- 想看到禁自审生效,把下面这行取消注释单独跑,应报"不能审核自己提交的译文":
-- select review_revision(:'rev_id', 'approved');

-- ========== 切成 bob:审核通过 ==========
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select review_revision(:'rev_id', 'approved', '很好');

-- ========== 最终检查:应为 approved,且 current_revision_id = rev_id ==========
select '审核后' as 阶段, state, current_revision_id from entry_translations
where id = '44444444-4444-4444-4444-444444444444';

select '审核记录' as 阶段, decision, note from review_decisions
where revision_id = :'rev_id';
