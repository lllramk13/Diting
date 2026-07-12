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

模板见 `spec-cards/_template.md`，每张卡回答六件事：给谁看 / 从哪进从哪出 / 核心数据 / 主要操作 / 空态 / 无权限态。

- [x] `/relay` — Relay 首页（`spec-cards/relay.md`）
- [ ] `/relay/projects/:slug` — 公开项目主页
- [ ] `/auth/login` — 登录（含 returnTo 行为）
- [ ] `/relay/workspace` — 个人工作台
- [ ] `/relay/workspace/tasks` — 我的任务
- [ ] `…/localization/editor/:entryId` — 翻译编辑器 ★核心，建议 Mark 起草
- [ ] `…/localization/reviews` 与 `…/reviews/:entryId` — 审核队列与详情 ★核心，建议 Mark 起草
- [ ] `…/exports` — 导出（Maintainer）

### 2. 简易框架（路由骨架，先于视觉设计）

2026-07-11 决定：设计头绪未成形，先把无样式的路由骨架搭起来，能点着走完整条切片流程后再进设计阶段。骨架不依赖规格卡和设计稿。

- [ ] 引入 react-router，按 page-tree §31 落顶层 Layout 结构（Layout 只是壳 + 导航链接）
- [ ] 纵向切片路由 + 占位页（登录 → 工作台 → 任务 → 编辑器 → 审核 → 导出），静态段先于动态段
- [ ] 认证状态接入（supabase session → context）
- [ ] 认证守卫 + returnTo
- [ ] LoginPage 挂到 `/auth/login`，全站 404
- [ ] 随做随填 frontend-architecture.md 第 1–4 节

### 3. 设计与实现（批次制）

规则：每批走「规格卡 → Figma 设计稿 → 代码」，「没有设计稿不开工」只约束视觉层——骨架占位页不受此限；改动只波及当前批次。

- [ ] **第 0 批**：tokens + 核心组件（按钮/输入/表格/卡片/状态标签）+ 公开页、工作台两个页面骨架。素材从 LoginPage 的 HUD 风格提炼，参考见 visual-design.md。
- [ ] **第 1 批（公开侧）**：登录页重画（returnTo、注册分离）+ `/relay` 首页 + 项目公开主页 → 写成静态页
- [ ] **第 2 批（协作侧）**：工作台 + 我的任务 + 翻译编辑器 + 审核 + 导出 → 写成静态页
- [ ] 移动端验证
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
