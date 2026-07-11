# Frontend Architecture

状态：骨架。随规格卡与实现逐节填充，规格卡阶段结束后定稿。

职责：路由、Layout、目录边界、认证守卫和数据访问约定的真源。

## 待写章节

1. **路由与 Layout 映射**：对照 page-tree「顶层 Layout」一节，落成 React Router 配置结构。
2. **目录结构**：对照 README「前端建议结构」，明确每个目录允许 import 什么、禁止 import 什么。
3. **路由注册顺序**：静态段必须先于动态段注册，例如 `/works/tags/:tag` 在 `/works/:slug` 之前（`/blog` 同理）。
4. **认证守卫与 returnTo**：守卫放在哪一层、`returnTo` 如何编码与校验、登录成功后如何恢复原操作。
5. **数据访问层**：页面 → `api/` → `lib/supabase.ts` 的单向依赖；页面组件不得直接调用 Supabase。
6. **受保护状态列与 RPC 清单**：哪些列前端只读、哪些状态转移必须走 RPC，与权限矩阵对照。

## 当前落地情况

已按建议结构迁移：`auth/pages/LoginPage`、`shared/components/DotField`、`api/auth/`、`app/App.tsx`。其余目录（`main-site/`、`account/`、`relay/` 等）随对应页面创建时再建，不预建空目录。
