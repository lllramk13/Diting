# DITING(重写)

协作翻译平台。设计文档见 `docs/`,旧实现在 `main` 分支,仅作参考。

## 目录结构

```
docs/          设计文档:use case、权限矩阵、ER 图
supabase/      schema 唯一真源:supabase CLI 配置 + migrations/
frontend/      前端(Vite + React)。规矩:页面组件不直接调 supabase,
               所有查询收拢在 src/api/ 数据访问层
tools/         导入/导出脚本(MVP 阶段的"后端")
```

## 架构约定

1. 权限规则:简单可见性/编辑权 → RLS policy(对照 docs/权限矩阵.md)。
2. 状态转移与多步不变量(审核、指派、禁自审)→ Postgres 函数(RPC),
   前端不允许直接 UPDATE 状态列。
3. 文件解析、导出生成 → tools/ 脚本;Phase 2 视需要升级为独立后端服务。
4. 数据库备份不进 git。
