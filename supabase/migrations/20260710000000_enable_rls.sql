-- ============================================================
-- RLS:把 docs/权限矩阵.md 翻译成代码
--
-- 结构:① 全表开启 RLS(默认拒绝一切)
--       ② helper 函数(security definer,绕过 RLS 查身份)
--       ③ SELECT policy(矩阵"浏览"一节)
--       ④ 直接写入的 policy(不涉及状态机的简单写入)
--
-- 没有写入 policy 的表不是漏了:凡是涉及状态机/多步不变量的写入
-- (保存译文、提交审核、审核决定),一律只能走 security definer 的
-- RPC 函数,前端直接 INSERT/UPDATE 会被默认拒绝——这是有意设计。
-- ============================================================

-- ① 开墙:12 张表全部默认拒绝
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_target_langs enable row level security;
alter table project_members enable row level security;
alter table dup_groups enable row level security;
alter table text_entries enable row level security;
alter table entry_translations enable row level security;
alter table translation_revisions enable row level security;
alter table entry_sets enable row level security;
alter table entry_set_items enable row level security;
alter table tasks enable row level security;
alter table glossary_terms enable row level security;
alter table review_decisions enable row level security;

-- ② helper:所有 policy 共用的身份判断
-- security definer = 以函数创建者权限运行(绕过 RLS 查表),
-- 必须配 set search_path 防止同名表劫持;
-- 只返回"关于调用者自己"的最小信息,洞才够小。

-- 当前用户在该项目的角色;非成员/已被移除/未登录 → null
create or replace function member_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from project_members
  where project_id = p_project_id
    and user_id = auth.uid()
    and removed_at is null   -- 软删除的成员不算成员(闭环:贡献保留,权限消失)
$$;

create or replace function is_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select member_role(p_project_id) is not null
$$;

create or replace function project_is_public(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_public from projects where id = p_project_id
$$;

-- ③ SELECT policy
-- 只有两种形态:"公开 or 成员"(矩阵里游客 ✓ 的行)/ "仅成员"。
-- 私有项目对非成员 = 查无此行(自然表现为 404,防探测)。

-- profiles 是平台级公开身份(用户名/头像);安全前提:表里没有敏感列
create policy "个人资料人人可见"
on profiles for select
using (true);

create policy "公开项目人人可见,私有项目仅成员"
on projects for select
using (is_public or is_member(id));   -- projects 自己身上,项目 id 就是主键 id

create policy "目标语言跟随项目公开性"
on project_target_langs for select
using (project_is_public(project_id) or is_member(project_id));

create policy "术语表跟随项目公开性"
on glossary_terms for select
using (project_is_public(project_id) or is_member(project_id));

-- 以下全部"仅成员":游客基线不允许看原文/译文/协作内部

create policy "成员列表仅成员可见"
on project_members for select
using (is_member(project_id));

create policy "去重组仅成员可见"
on dup_groups for select
using (is_member(project_id));

create policy "原文仅成员可见"
on text_entries for select
using (is_member(project_id));

create policy "翻译状态仅成员可见"
on entry_translations for select
using (is_member(project_id));

create policy "修订历史仅成员可见"
on translation_revisions for select
using (is_member(project_id));

create policy "条目集仅成员可见"
on entry_sets for select
using (is_member(project_id));

create policy "条目集成员仅成员可见"
on entry_set_items for select
using (is_member(project_id));

create policy "任务仅成员可见"
on tasks for select
using (is_member(project_id));

create policy "审核记录仅成员可见"
on review_decisions for select
using (is_member(project_id));

-- ④ 直接写入 policy(只覆盖不涉及状态机的简单写入)
-- 记忆点:INSERT 用 with check(允许写入什么样的行),
--         UPDATE 两者都要(using = 能改哪些行,with check = 改完必须仍满足什么)

-- profiles:只能建/改自己的资料
create policy "注册时创建自己的资料"
on profiles for insert
with check (id = auth.uid());

create policy "只能编辑自己的资料"
on profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- projects:设置修改仅 maintainer;
-- 创建项目不开直接 INSERT——必须走 RPC(项目 + 创建者成员行要在
-- 同一事务里出生,不然会出现"零成员项目",违反 ER 图的 ||--|{)
create policy "项目设置仅 maintainer 可改"
on projects for update
using (member_role(id) = 'maintainer')
with check (member_role(id) = 'maintainer');

-- project_target_langs:目标语言配置仅 maintainer
create policy "目标语言仅 maintainer 可管理"
on project_target_langs for all
using (member_role(project_id) = 'maintainer')
with check (member_role(project_id) = 'maintainer');

-- project_members:邀请/改角色/软删除(UPDATE removed_at)仅 maintainer。
-- 注意没有 DELETE policy:成员只软删,物理删除任何人都不行(保贡献链)
create policy "邀请成员仅 maintainer"
on project_members for insert
with check (member_role(project_id) = 'maintainer');

create policy "改角色与移除仅 maintainer"
on project_members for update
using (member_role(project_id) = 'maintainer')
with check (member_role(project_id) = 'maintainer');

-- glossary_terms:矩阵"增删改术语:Reviewer ✓"
create policy "术语管理需 reviewer 以上"
on glossary_terms for all
using (member_role(project_id) in ('maintainer', 'reviewer'))
with check (member_role(project_id) in ('maintainer', 'reviewer'));

-- entry_sets / entry_set_items / tasks:矩阵"创建条目集/指派任务:Reviewer ✓"
-- (entry_set_items 的 project_id 由触发器派生后,with check 依然会
--  在最终行上生效——BEFORE 触发器先跑,policy 检查的是触发器改完的行)
create policy "条目集管理需 reviewer 以上"
on entry_sets for all
using (member_role(project_id) in ('maintainer', 'reviewer'))
with check (member_role(project_id) in ('maintainer', 'reviewer'));

create policy "条目集内容管理需 reviewer 以上"
on entry_set_items for all
using (member_role(project_id) in ('maintainer', 'reviewer'))
with check (member_role(project_id) in ('maintainer', 'reviewer'));

create policy "任务管理需 reviewer 以上"
on tasks for all
using (member_role(project_id) in ('maintainer', 'reviewer'))
with check (member_role(project_id) in ('maintainer', 'reviewer'));

-- ============================================================
-- 有意不开任何写入 policy 的表(走 RPC,前端直写一律被拒):
--   text_entries / dup_groups   —— 只由导入脚本写(service role 天然绕过 RLS)
--   entry_translations          —— 状态机,只能被 RPC 按转移规则改
--   translation_revisions       —— 不可变历史,只能由"保存译文"RPC 追加
--   review_decisions            —— 只能由"审核"RPC 写(含禁自审校验)
-- ============================================================
