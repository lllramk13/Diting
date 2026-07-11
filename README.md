# DITING（重写）

DITING 是个人网站与协作本地化平台的结合体。

网站由两个体验区域组成：

- **DITING 主站**：个人作品、博客、关于与赞助。
- **DITING Relay Localization Network**：公开汉化项目、互动教程及登录后的协作工作区。

认证、账户、显示设置和设计系统属于整个 DITING，由主站与 Relay 共同使用。

当前阶段采用单域名部署：

- 主站：`https://diting.dev`
- Relay：`https://diting.dev/relay`
- 认证：`https://diting.dev/auth`
- 账户：`https://diting.dev/account`

旧版实现在 `main` 分支，仅作为内容、业务经验和迁移参考，不约束重写后的架构与界面设计。

## 当前目标

MVP 面向一个游戏、一种目标语言和一个小型协作团队，完成以下核心流程：

```text
注册登录
→ 创建项目
→ 导入资源
→ 创建并分配任务
→ 翻译
→ 审核
→ 质量检查
→ 导出译文
```

同时建立：

- DITING 主站的基础页面
- Relay 的公开项目页面
- 项目问题报告
- 公开发布页面
- 互动式翻译教程
- Contributor ID 与贡献记录

## 页面范围

页面清单只在 [`docs/page-tree.md`](docs/page-tree.md) 维护一份：

- 完整信息架构、路由和访问权限：全文
- 第一阶段实现范围：「第一阶段实现范围」一节

README 不重复列页面清单，避免两份清单漂移。

## 目录结构

```text
docs/
  产品、业务、视觉和技术设计文档。

frontend/
  Vite + React 前端。
  同一个应用承载主站、认证、账户与 Relay。

supabase/
  数据库 Schema 的唯一真源：
  - Supabase CLI 配置
  - migrations
  - RLS Policy
  - Postgres Functions / RPC

tools/
  导入、导出及数据处理工具。
  MVP 阶段承担不适合放在浏览器或数据库中的处理任务。
```

## 前端建议结构

```text
frontend/src/
├─ app/
│  ├─ router/
│  ├─ providers/
│  └─ layouts/
│
├─ main-site/
│  ├─ pages/
│  ├─ components/
│  └─ content/
│
├─ auth/
│  ├─ pages/
│  ├─ components/
│  └─ guards/
│
├─ account/
│  ├─ pages/
│  └─ components/
│
├─ relay/
│  ├─ public/
│  ├─ tutorial/
│  ├─ workspace/
│  └─ admin/
│
├─ api/
│  ├─ auth/
│  ├─ account/
│  ├─ projects/
│  ├─ translations/
│  ├─ reviews/
│  ├─ glossary/
│  ├─ issues/
│  ├─ imports/
│  └─ exports/
│
├─ shared/
│  ├─ components/
│  ├─ design-system/
│  ├─ hooks/
│  ├─ types/
│  └─ utils/
│
└─ lib/
   └─ supabase.ts
```

## Layout 结构

DITING 使用同一个 React Router。主站、认证、账户和 Relay 分别使用独立 Layout。

```text
App
├─ MainSiteLayout
│  ├─ 首页
│  ├─ Works
│  ├─ Blog
│  ├─ About
│  └─ Support
│
├─ AuthLayout
│  ├─ 登录
│  ├─ 注册
│  ├─ 邮箱验证
│  └─ 密码重置
│
├─ AccountLayout
│  ├─ 个人资料
│  ├─ 安全设置
│  ├─ 隐私与署名
│  ├─ 显示模式
│  └─ 贡献记录
│
└─ RelayLayout
   ├─ 公开项目
   ├─ 项目问题
   ├─ 项目发布
   ├─ 互动教程
   ├─ 公开贡献者
   │
   ├─ WorkspaceLayout
   │  └─ 协作工作区
   │
   └─ AdminLayout
      └─ 平台管理
```

代码结构应保持 Relay 相对独立，但认证、账户、设计系统和通用数据访问属于全站共享能力。

未来如需迁移至 `relay.diting.dev`，只迁移 Relay 页面和工作区，不重复实现用户身份系统。

## 架构约定

1. 页面组件不得直接调用 Supabase。所有数据访问统一收拢在 `frontend/src/api/`。

2. 简单的可见性与编辑权限由 RLS Policy 负责，实现时应对照 `docs/权限矩阵.md`。

3. 审核、任务指派、禁止自审等状态转移和多步不变量由 Postgres Function / RPC 负责。

4. 前端不得直接更新受保护的状态列。

5. 文件解析和导出生成暂时由 `tools/` 完成。Phase 2 根据实际负载评估是否升级为独立后端服务。

6. 数据库结构只通过 migrations 修改，不以 Dashboard 中未记录的手动修改作为正式 Schema。

7. 数据库备份、密钥、环境变量和用户上传文件不得提交到 Git。

8. DITING 账户属于全站共享身份，不属于 Relay 子模块。

9. 公开项目页面不得泄露游客无权查看的原文、译文、内部评论或受保护素材。

10. 所有提交内容的操作均要求登录，包括：

    - 翻译
    - 审核
    - 评论
    - 修改建议
    - 加入申请
    - 问题报告
    - 赞助公开署名设置

11. 游客可以查看：

    - 项目介绍
    - 项目进度
    - 公开贡献者
    - 公开发布版本
    - 公开问题列表
    - 问题详情
    - 互动教程

12. 登录成功后应返回触发登录的原始页面并继续操作。

13. 页面权限控制不能只依赖前端路由守卫，数据库访问仍必须由 RLS 和 RPC 验证。

## 业务边界

一个完整的汉化项目包含：

```text
汉化项目
├─ 汉化工程
│  ├─ 文件格式研究
│  ├─ 文本提取与回注
│  ├─ 字库与编码
│  └─ 构建工具
│
├─ 本地化
│  ├─ 翻译
│  ├─ 审核
│  ├─ 术语
│  └─ 质量检查
│
└─ 发布
   ├─ 版本
   ├─ 安装说明
   ├─ 下载附件
   └─ Credits
```

`/works/:slug` 用于展示个人在项目中的技术贡献和开发过程。

`/relay/projects/:slug` 用于展示团队项目、协作进度、贡献者、公开问题和发布版本。

两者可以互相链接，但不重复承担同一职责。

## 问题报告

公开项目必须提供问题报告入口：

```text
/relay/projects/:slug/issues
/relay/projects/:slug/issues/new
/relay/projects/:slug/issues/:issueId
```

游客可以查看公开问题，但提交问题、评论和补充信息需要登录。

问题类型包括：

```text
typo             错字或标点问题
mistranslation   误译或语气问题
overflow         文字溢出或换行问题
display          缺字、乱码或控制码异常
crash            崩溃、卡死或运行异常
other            其他问题
```

项目成员可以在内部工作区中对问题进行确认、分流、指派、关联文本条目、修复和关闭。

## 互动教程

Relay 提供无需登录即可完成的互动教程：

```text
/relay/tutorial
/relay/tutorial/mission
/relay/tutorial/complete
```

教程流程：

```text
接收模拟任务
→ 阅读原文与上下文
→ 使用术语提示
→ 输入译文
→ 触发质量检查
→ 修复控制码问题
→ 提交模拟审核
→ 处理审核反馈
→ 查看模拟发布结果
```

用户完成整个教程后，再引导其创建 DITING 账户和 Contributor ID。

## 视觉原则

DITING 使用带有复古科幻终端特征的视觉语言，同时保持现代网页的可用性、可访问性和响应式行为。

Relay 提供两种显示模式：

- **实用模式**：减少辉光、模糊、扫描线、声音和动态效果。
- **观赏模式**：增加 CRT、辉光、信号噪点与短暂 Glitch 效果。

两种模式必须：

- 使用相同的信息结构
- 使用相同的按钮位置
- 使用相同的操作逻辑
- 保持文本可读
- 支持键盘操作
- 支持移动端
- 尊重 `prefers-reduced-motion`
- 不使用持续影响输入和阅读的 Glitch

观赏模式只能增加气氛，不能降低可用性。

## 设计文档

```text
docs/
├─ 协作翻译usecase.md
├─ 权限矩阵.md
├─ er.md
├─ page-tree.md
├─ roadmap.md
├─ frontend-architecture.md
└─ visual-design.md
```

文档职责：

- `协作翻译usecase.md`：业务行为和开发分期的真源
- `权限矩阵.md`：角色权限与 RLS 对照
- `er.md`：数据模型
- `page-tree.md`：完整信息架构、路由和页面权限
- `roadmap.md`：当前进度与下一步清单，唯一的待办真源
- `frontend-architecture.md`：路由、Layout、目录边界、认证守卫和数据访问约定（骨架已建，随规格卡与实现填充）
- `visual-design.md`：设计系统、视觉模式、交互和响应式规范（骨架已建，设计系统阶段填充）

## 开发顺序

```text
页面地图
→ 用户流程
→ 页面规格卡
→ 低保真线框
→ 设计系统
→ 静态页面原型
→ 移动端验证
→ 接入 Supabase
→ 完成核心业务流程
→ 增加观赏模式效果
```

第一条需要完成的纵向流程：

```text
Relay 首页
→ 公开项目主页
→ 登录
→ 个人工作台
→ 我的任务
→ 翻译编辑器
→ 提交审核
→ 审核通过
→ 导出译文
```

导出页面是 Maintainer 权限，验证切片时需要用 Maintainer 角色的账号走完全程。