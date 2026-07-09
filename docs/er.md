# ER 图(MVP)

> 状态:草稿,Mark 绘制中。范围:只画 MVP 的 11 个 UC 用到的表。

## 实体清单

profiles / projects / project_members / text_entries / dup_groups / entry_translations /
translation_revisions / entry_sets / entry_set_items / tasks / glossary_terms / review_decisions
(共 12 张)

## 图

```mermaid
erDiagram
    projects ||--o{ text_entries : "1 个项目有 N 条原文"
    projects ||--|{ project_members : "1 个项目有 1-N 个成员"
    projects ||--o{ tasks : "1 个项目有 0-N 个任务"
    projects ||--o{ glossary_terms : "1 个项目有 0-N 个术语"

    profiles ||--o{ project_members : "1 个用户可以是 0-N 个组员"

    project_members ||--o{ tasks : "负责人(assignee)"
    project_members ||--o{ tasks : "指派人(assigned_by)"

    entry_sets ||--o{ entry_set_items : "1 个集有 0-N 个对象"
    text_entries ||--o{ entry_set_items : "1 条原文可以属于多个集"
    entry_sets ||--o{ tasks : "一个集可被多个任务引用"

    entry_translations ||--o{ translation_revisions : "每个翻译有 0-N 个revisions"
    project_members ||--o{ translation_revisions : "作者"
    project_members ||--o{ review_decisions : "审核人"
    translation_revisions ||--o{ review_decisions : "revisions 审核人"

    projects ||--o{ dup_groups : "1 个项目有 N 个去重组"
    dup_groups ||--|{ text_entries : "1 组有 1-N 条原文"
    dup_groups ||--o{ entry_translations : "1 组 × 每目标语言"

    projects ||--o{ entry_sets : "1 个项目有 0-N 个条目集"
```

## 画图时必须回答的五个问题

- [x] 1. 审核决定存哪:revision 上加列,还是独立 review_decisions 表?
      (先想清楚:打回后重交,产生的是新 revision 还是复用旧的?) 新的
- [x] 2. entry_translations.current_revision_id 与 revisions.translation_id
      的循环外键怎么处理? 保留 current_revision_id,设为可空,只由审核通过的那个 RPC 更新。
- [x] 3. file/section 独立成表还是先用 text_entries 上的列? 同意,MVP 不做文件级操作,用列足够
- [x] 4. dup(重复句)机制:彻底砍掉,还是留 dup_key 列预留?
      (结论要回写进 use case 文档的决策一节) 保留且落地为 dup_groups 表,entry_translations 挂在组上而非单条原文上
- [x] 5. 每张表都冗余 project_id 吗?(RLS policy 的实用主义 vs 范式)实用主义
