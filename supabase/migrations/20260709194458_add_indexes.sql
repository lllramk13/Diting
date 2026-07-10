-- 1. 只给高频查询的 WHERE / JOIN 列建索引
-- 2. 已被 PK / UNIQUE 的"打头列"覆盖的不重复建
-- 每条索引都注明它服务的查询;写不出用途的索引不该存在。

-- ============ tasks ============
-- "我的任务列表"(译者视角)
create index idx_tasks_assignee on tasks (assignee_id);
-- "谁指派的"(管理视角,低频但成员页会用)
create index idx_tasks_assigned_by on tasks (assigned_by_id);
-- RLS 按项目过滤 + 项目任务列表
create index idx_tasks_project on tasks (project_id);
-- 任务 → 条目集 那一跳 join
create index idx_tasks_set on tasks (set_id);

-- ============ entry_set_items ============
-- 反向查询"这条原文在哪些集里";主键 (set_id, entry_id) 只覆盖按 set_id 查
create index idx_entry_set_items_entry on entry_set_items (entry_id);
-- RLS 按项目过滤
create index idx_entry_set_items_project on entry_set_items (project_id);

-- ============ text_entries ============
-- 原文 → 去重组 那一跳 join(编辑器加载链路)
create index idx_text_entries_dup_group on text_entries (dup_group_id);
-- 编辑器按文件浏览 + 前后文查询:同项目同文件按出场顺序取一段
-- project_id 放第一位,同时兼作 RLS 的项目过滤索引
create index idx_text_entries_file on text_entries (project_id, file_path, sort_order);
-- 注:单独的 project_id 已被 UNIQUE (project_id, string_id) 的打头列覆盖,不重复建

-- ============ entry_translations ============
-- 审核队列("这个项目待审的中文条目")+ 进度统计(按 state 聚合)
create index idx_entry_translations_state on entry_translations (project_id, lang, state);
-- 注:dup_group_id 已被 UNIQUE (dup_group_id, lang) 的打头列覆盖,不重复建

-- ============ translation_revisions ============
-- "这条翻译的历史版本"(编辑器历史面板)+ "最新一版"(取草稿内容)
-- created_at 放第二位,让"按时间倒序取最新"直接走索引
create index idx_revisions_entry_translation on translation_revisions (entry_translation_id, created_at desc);
-- 贡献统计:某成员写过的所有 revision
create index idx_revisions_author on translation_revisions (author_id);
-- RLS 按项目过滤
create index idx_revisions_project on translation_revisions (project_id);

-- ============ review_decisions ============
-- "这条 revision 的审核记录"
create index idx_review_decisions_revision on review_decisions (revision_id);
-- 贡献统计:某成员审过多少条
create index idx_review_decisions_reviewer on review_decisions (reviewer_id);
-- RLS 按项目过滤
create index idx_review_decisions_project on review_decisions (project_id);

-- ============ project_members ============
-- "我加入了哪些项目"(登录后首页);UNIQUE (project_id, user_id) 打头列是
-- project_id,只按 user_id 查用不上它,必须单独建
create index idx_project_members_user on project_members (user_id);

-- ============ dup_groups ============
-- RLS 按项目过滤
create index idx_dup_groups_project on dup_groups (project_id);

-- ============ entry_sets ============
-- 项目的条目集列表 + RLS
create index idx_entry_sets_project on entry_sets (project_id);

-- ============ 故意不建的 ============
-- glossary_terms: UNIQUE (project_id, term, lang) 打头列是 project_id,
--   "取项目全部术语"走它的前缀就够;每项目术语只有几百条,不值得更多索引
-- translation_revisions.prev_revision_id: 链式回溯是低频操作,先不建
-- entry_translations.current_revision_id: 只做正向解引用(拿着 id 查主键),不需要反查
-- profiles / project_target_langs: PK 和 UNIQUE 已覆盖全部查询
