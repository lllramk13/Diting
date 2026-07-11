# Roadmap

更新：2026-07-11

这是唯一的进度与待办清单。做完一项勾掉一项，新想法先记到「以后再说」，不要直接插队。

## 已完成

- [x] 协作翻译 usecase
- [x] 权限矩阵
- [x] ER 数据模型
- [x] page-tree v0.6（含第一阶段实现范围）
- [x] README 与 page-tree 对齐，页面清单收拢到 page-tree 单一真源

## 当前阶段：纵向切片准备（按顺序做，不要并行）

目标：先让一条流程完整跑通——登录 → 我的任务 → 翻译 → 审核 → 导出。

### 1. 页面规格卡（8 张）

每张卡回答六件事：给谁看 / 从哪进从哪出 / 核心数据 / 主要操作 / 空态 / 无权限态。

- [ ] `/relay` — Relay 首页
- [ ] `/relay/projects/:slug` — 公开项目主页
- [ ] `/auth/login` — 登录（含 returnTo 行为）
- [ ] `/relay/workspace` — 个人工作台
- [ ] `/relay/workspace/tasks` — 我的任务
- [ ] `…/localization/editor/:entryId` — 翻译编辑器 ★核心，建议 Mark 起草
- [ ] `…/localization/reviews` 与 `…/reviews/:entryId` — 审核队列与详情 ★核心，建议 Mark 起草
- [ ] `…/exports` — 导出（Maintainer）

### 2. 之后的步骤

- [ ] 低保真线框（只做上面 8 个页面）
- [ ] `visual-design.md` 设计系统初版（tokens、基础组件、实用/观赏模式边界）
- [ ] 静态页面原型 + 移动端验证
- [ ] `frontend-architecture.md` 定稿（路由骨架、守卫、api 层约定）
- [ ] 接入 Supabase，跑通纵向切片

## 切片跑通之后（第一阶段剩余）

- [ ] 主站基础页面：`/`、`/works`、`/blog`、`/about`、`/support`
- [ ] 注册、邮箱验证、密码重置
- [ ] 账户页：profile / appearance / contributions
- [ ] 创建项目、导入
- [ ] 术语表、质量检查、成员、项目设置
- [ ] 公开问题（issues）、公开发布（releases）
- [ ] 互动教程、`/relay/users/:username`

## 代码待办

- [x] `frontend/src` 重组为 README「前端建议结构」；迁移 `pages/LoginPage.tsx`、`api/auth.ts` 到 `auth/` 模块

## 以后再说

（新想法先放这里，切片跑通前不动）
