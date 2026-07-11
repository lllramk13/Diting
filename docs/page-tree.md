# DITING Page Tree

版本：0.6

部署方式：单域名、单前端应用、多个顶层 Layout。

- DITING 主站：`https://diting.dev`
- DITING Relay：`https://diting.dev/relay`
- 全站账户：`https://diting.dev/account`
- 全站认证：`https://diting.dev/auth`

## 权限标记

- `[公开]`：游客可访问
- `[登录]`：需要登录
- `[成员]`：项目成员
- `[审核]`：Reviewer 或 Maintainer
- `[管理]`：Maintainer
- `[系统]`：平台管理员
- `[后期]`：暂不属于 MVP

---

# 1. DITING 主站

```text
https://diting.dev
│
├─ /                                      [公开] 主站首页
│
├─ /works                                 [公开] 个人作品
│  ├─ /works/:slug                        [公开] 作品详情
│  ├─ /works/:slug/devlog                 [公开] 作品开发记录
│  └─ /works/tags/:tag                    [公开] 作品标签
│
├─ /blog                                  [公开] 博客首页
│  ├─ /blog/:slug                         [公开] 博客文章
│  ├─ /blog/tags/:tag                     [公开] 博客标签
│  ├─ /blog/series/:series                [公开] 系列文章
│  └─ /blog/archive                       [公开] 时间归档
│
├─ /about                                 [公开] 关于我
├─ /contact                               [公开] 联系方式
├─ /links                                 [公开] 外部链接
│
├─ /support                               [公开] 赞助 DITING
│  ├─ /support/thanks                     [公开] 赞助感谢名单
│  └─ /support/transparency               [公开][后期] 资金用途与透明度
│
├─ /privacy                               [公开] 隐私政策
├─ /terms                                 [公开] 服务条款
├─ /licenses                              [公开] 开源及第三方许可
├─ /status                                [公开] 网站和 Relay 状态
│
└─ *                                      [公开] 全站 404
```

## 主站首页内容

```text
/
├─ 个人介绍
├─ 精选作品
├─ 最新博客
├─ 当前项目
├─ DITING Relay 入口
├─ 赞助入口
├─ 登录或账户入口
└─ 观赏／实用模式切换
```

---

# 2. 全站认证

认证属于整个 DITING，不属于 Relay。

```text
/auth/login                               [公开] 登录
/auth/register                            [公开] 注册
/auth/verify                              [公开] 邮箱验证
/auth/verification-sent                   [公开] 验证邮件已发送
/auth/forgot-password                     [公开] 忘记密码
/auth/reset-password                      [公开] 重置密码
/auth/session-expired                     [公开] 会话过期
/auth/disabled                            [公开] 账户停用提示
```

## 登录返回

需要登录的页面应保存原始地址：

```text
/auth/login?returnTo=/relay/projects/example/issues/new
```

登录成功后返回原始页面并继续操作。

登录和注册可以表现为弹窗，但必须保留独立页面用于：

```text
├─ 直接访问
├─ 移动端全屏显示
├─ 邮件验证
├─ 密码重置
├─ 会话过期
└─ 弹窗不可用时降级
```

---

# 3. 全站账户

```text
/account                                  [登录] 账户总览

/account/profile                          [登录] 个人资料
/account/security                         [登录] 密码与会话
/account/privacy                          [登录] 隐私与署名
/account/appearance                       [登录] 显示模式
/account/notifications                    [登录][后期] 通知设置
/account/contributions                    [登录] 我的贡献
/account/projects                         [登录] 我的项目
/account/saved                            [登录][后期] 收藏内容
/account/support                          [登录][后期] 赞助与署名记录
```

## 显示模式

```text
/account/appearance
├─ 观赏模式
├─ 实用模式
├─ 跟随系统
├─ 减少动态
├─ CRT 强度
├─ Glitch 强度
├─ 声音设置
└─ 对比度
```

---

# 4. DITING Relay 公共区域

```text
https://diting.dev/relay
│
├─ /relay                                 [公开] Relay 首页
│
├─ /relay/projects                        [公开] 公开项目列表
│
├─ /relay/projects/:slug                  [公开] 项目公开主页
├─ /relay/projects/:slug/overview         [公开] 项目概览
├─ /relay/projects/:slug/updates          [公开] 项目动态
├─ /relay/projects/:slug/updates/:updateId
│                                          [公开] 动态详情
├─ /relay/projects/:slug/engineering      [公开] 汉化工程信息
├─ /relay/projects/:slug/contributors     [公开] 项目贡献者
│
├─ /relay/projects/:slug/issues           [公开] 问题列表
├─ /relay/projects/:slug/issues/new       [登录] 提交问题
├─ /relay/projects/:slug/issues/:issueId  [公开] 问题详情
│
├─ /relay/projects/:slug/releases         [公开] 发布版本
├─ /relay/projects/:slug/releases/:version
│                                          [公开] 版本详情
│
├─ /relay/projects/:slug/join             [登录][后期] 申请加入
├─ /relay/projects/:slug/support          [公开] 支持该项目
│
├─ /relay/tutorial                        [公开] 互动教程介绍
├─ /relay/tutorial/mission                [公开] 模拟翻译任务
├─ /relay/tutorial/complete               [公开] 教程结果
│
├─ /relay/users/:username                 [公开] 公开贡献者身份
│
├─ /relay/support                         [公开] 支持 Relay
├─ /relay/guidelines                      [公开] 社区与贡献规范
├─ /relay/status                          [公开] Relay 状态
│
└─ /relay/*                               [公开] Relay 404
```

## Relay 首页内容

```text
/relay
├─ DITING Relay Localization Network 介绍
├─ 公开项目
├─ 最近发布
├─ 当前协作数据
├─ 互动教程
├─ 登录或账户入口
├─ 打开工作台
├─ 平台赞助
└─ 返回主站
```

---

# 5. 公开项目主页

```text
/relay/projects/:slug
├─ 项目介绍
├─ 封面与截图
├─ 平台与语言
├─ 翻译进度
├─ 审核进度
├─ 当前状态
├─ 最新版本
├─ 项目成员
├─ 最近动态
├─ 加入项目
├─ 提交问题
└─ 支持项目
```

---

# 6. 公开问题系统

```text
/relay/projects/:slug/issues               [公开] 问题列表
├─ 状态筛选
├─ 类型筛选
├─ Release 版本筛选
├─ 标签筛选
├─ 相似问题搜索
└─ 提交问题入口

/relay/projects/:slug/issues/new           [登录] 提交问题
├─ 标题
├─ 描述
├─ 问题类型
├─ 出现问题的版本
├─ 截图
├─ 存档位置
├─ 复现步骤
└─ 提交

/relay/projects/:slug/issues/:issueId      [公开] 问题详情
├─ 问题描述
├─ 类型
├─ 状态
├─ 影响版本
├─ 截图与复现信息
├─ 关联问题
├─ 修复版本
├─ 评论                                      [登录后提交]
└─ 补充信息                                  [登录后提交]
```

## 问题类型

```text
typo             错字或标点问题
mistranslation   误译或语气问题
overflow         文字溢出或换行问题
display          缺字、乱码或控制码显示异常
crash            崩溃、卡死或运行异常
other            其他问题
```

---

# 7. 公开发布页面

```text
/relay/projects/:slug/releases             [公开] 发布版本列表

/relay/projects/:slug/releases/:version    [公开] 版本详情
├─ 版本号
├─ 发布日期
├─ 支持平台
├─ 目标语言
├─ 更新说明
├─ 安装说明
├─ 兼容版本
├─ 已知问题
├─ 本次修复问题
├─ 下载附件
├─ 文件校验值
└─ Credits
```

---

# 8. Relay 互动教程

```text
/relay/tutorial                            [公开] 教程介绍

/relay/tutorial/mission                    [公开] 模拟任务
├─ 接收任务
├─ 阅读原文
├─ 查看上下文
├─ 使用术语提示
├─ 输入译文
├─ 触发控制码检查
├─ 修复控制码错误
├─ 提交审核
├─ 处理模拟审核反馈
└─ 查看模拟发布结果

/relay/tutorial/complete                   [公开] 教程完成
├─ 训练结果
├─ 创建 DITING 账户
├─ 创建 Contributor ID
├─ 浏览真实项目
└─ 进入工作台
```

---

# 9. Relay 个人工作台

```text
/relay/workspace                           [登录] 工作台首页

/relay/workspace/projects                  [登录] 我参与的项目
/relay/workspace/tasks                     [登录] 我的任务
/relay/workspace/drafts                    [登录] 我的草稿
/relay/workspace/reviews                   [审核] 我的待审核

/relay/workspace/invitations               [登录] 项目邀请
/relay/workspace/applications              [登录][后期] 加入申请状态

/relay/workspace/notifications             [登录][后期] 通知中心
/relay/workspace/notifications/:notificationId
                                           [登录][后期] 通知详情

/relay/workspace/search                    [登录][后期] 跨项目搜索

/relay/workspace/new-project               [登录] 创建项目
```

## 工作台首页

```text
/relay/workspace
├─ 最近访问项目
├─ 我的任务
├─ 我的草稿
├─ 待处理审核
├─ 项目邀请
├─ 通知
├─ 团队进度
└─ 推荐的下一步操作
```

---

# 10. 创建项目

```text
/relay/workspace/new-project               [登录] 创建项目
├─ 基础信息
├─ 封面
├─ 项目类型
├─ 原始语言
├─ 目标语言
├─ 平台
├─ 项目简介
├─ 仓库链接
├─ 可见性
└─ 创建确认
```

创建成功后进入：

```text
/relay/workspace/projects/:projectId/dashboard
```

---

# 11. 项目工作区

项目工作区基准路径：

```text
/relay/workspace/projects/:projectId
```

## 项目仪表盘

```text
/relay/workspace/projects/:projectId/dashboard
                                           [成员] 项目仪表盘
├─ 项目进度
├─ 翻译数量
├─ 审核数量
├─ 任务状态
├─ 最近活动
├─ 最新版本
├─ 质量警告
├─ 成员活动
└─ 推荐的下一步操作
```

## 本地化总览

```text
/relay/workspace/projects/:projectId/localization
                                           [成员] 本地化总览
```

---

# 12. 翻译任务

```text
/relay/workspace/projects/:projectId/localization/tasks
                                           [成员] 翻译任务

/relay/workspace/projects/:projectId/localization/tasks/new
                                           [审核] 创建任务或条目集

/relay/workspace/projects/:projectId/localization/tasks/:taskId
                                           [成员] 任务详情
```

任务详情：

```text
├─ 条目列表
├─ 负责人
├─ 翻译进度
├─ 审核进度
├─ 重叠警告
├─ 重新分配                                  [审核]
└─ 任务讨论                                  [后期]
```

---

# 13. 文本条目与翻译编辑器

```text
/relay/workspace/projects/:projectId/localization/entries
                                           [成员] 文本条目列表

/relay/workspace/projects/:projectId/localization/entries/:entryId
                                           [成员] 条目详情

/relay/workspace/projects/:projectId/localization/editor/:entryId
                                           [成员] 翻译编辑器
```

编辑器内容：

```text
├─ 原文
├─ 当前译文
├─ 历史版本
├─ 上下文素材
├─ 术语提示
├─ 控制码规则
├─ 长度限制
├─ 自动质量检查
├─ 保存草稿
├─ 提交译文
├─ 提交审核
├─ 修改建议                                  [后期]
└─ 评论讨论                                  [后期]
```

---

# 14. 审核

```text
/relay/workspace/projects/:projectId/localization/reviews
                                           [审核] 审核队列

/relay/workspace/projects/:projectId/localization/reviews/:entryId
                                           [审核] 审核详情
```

审核操作：

```text
├─ Approve
├─ Request changes
├─ Reject
├─ Edit and approve
├─ 审核历史
└─ 审核评论
```

---

# 15. 术语表

```text
/relay/workspace/projects/:projectId/localization/glossary
                                           [成员] 术语表

/relay/workspace/projects/:projectId/localization/glossary/new
                                           [审核] 新建术语

/relay/workspace/projects/:projectId/localization/glossary/:termId
                                           [成员] 术语详情
```

术语详情：

```text
├─ 原文
├─ 推荐译名
├─ 别名
├─ 分类
├─ 示例与说明
├─ 使用位置
├─ 受影响条目
├─ 修改历史
├─ 讨论                                      [后期]
└─ 提交术语建议                              [后期]
```

---

# 16. 项目问题处理

```text
/relay/workspace/projects/:projectId/issues
                                           [成员] 问题处理队列

/relay/workspace/projects/:projectId/issues/new
                                           [成员] 创建内部问题

/relay/workspace/projects/:projectId/issues/:issueId
                                           [成员] 问题处理详情
```

支持：

```text
├─ 确认问题
├─ 请求补充信息
├─ 标记重复
├─ 标记无效
├─ 设置公开或仅成员可见
├─ 指派负责人
├─ 关联 TextEntry
├─ 关联 EntrySet
├─ 转入翻译修复流程
├─ 关联修复版本
└─ 关闭问题
```

---

# 17. 上下文素材

```text
/relay/workspace/projects/:projectId/context
                                           [成员][后期] 上下文素材

/relay/workspace/projects/:projectId/context/screenshots
                                           [成员][后期] 截图

/relay/workspace/projects/:projectId/context/videos
                                           [成员][后期] 视频

/relay/workspace/projects/:projectId/context/audio
                                           [成员][后期] 音频

/relay/workspace/projects/:projectId/context/characters
                                           [成员][后期] 角色信息

/relay/workspace/projects/:projectId/context/:assetId
                                           [成员][后期] 素材详情
```

---

# 18. 文件与文本结构

```text
/relay/workspace/projects/:projectId/files
                                           [成员] 文件与文本结构

/relay/workspace/projects/:projectId/files/:fileId
                                           [成员] 文件详情

/relay/workspace/projects/:projectId/sections/:sectionId
                                           [成员] Section 详情

/relay/workspace/projects/:projectId/batches/:batchId
                                           [成员] Batch 详情
```

支持：

```text
├─ 查看 ProjectFile / Section / Batch / TextEntry
├─ 查看各级翻译与审核进度
├─ 重新分组                                  [管理][后期]
├─ 合并或拆分 Section                        [管理][后期]
├─ 增量更新                                  [管理][后期]
├─ 处理原文变更                              [管理][后期]
└─ 归档文本                                  [管理][后期]
```

---

# 19. 汉化工程

```text
/relay/workspace/projects/:projectId/engineering
                                           [成员] 汉化工程总览

/relay/workspace/projects/:projectId/engineering/resources
                                           [成员] 工程资源

/relay/workspace/projects/:projectId/engineering/tools
                                           [成员] 工具与仓库链接

/relay/workspace/projects/:projectId/engineering/builds
                                           [成员] 构建记录

/relay/workspace/projects/:projectId/engineering/builds/:buildId
                                           [成员] 构建详情与日志

/relay/workspace/projects/:projectId/engineering/notes
                                           [成员] 技术文档
```

---

# 20. 质量检查

```text
/relay/workspace/projects/:projectId/quality
                                           [成员] 质量检查总览

/relay/workspace/projects/:projectId/quality/:qualityIssueId
                                           [成员] 质量问题详情
```

质量类型：

```text
├─ 空译文
├─ 控制码错误
├─ 长度超限
├─ 术语不一致
├─ 原文发生变化
├─ 等待复查
└─ 其他警告
```

---

# 21. 资源导入

```text
/relay/workspace/projects/:projectId/imports
                                           [管理] 导入记录

/relay/workspace/projects/:projectId/imports/new
                                           [管理] 新建导入

/relay/workspace/projects/:projectId/imports/:importId
                                           [管理] 导入详情
```

导入流程：

```text
选择文件
→ 格式识别
→ 字段映射
→ 解析
→ 导入检查
→ 冲突处理
→ 确认导入
→ 查看结果
```

---

# 22. 导出

```text
/relay/workspace/projects/:projectId/exports
                                           [管理] 导出记录

/relay/workspace/projects/:projectId/exports/new
                                           [管理] 创建导出

/relay/workspace/projects/:projectId/exports/:exportId
                                           [管理] 导出详情
```

导出内容：

```text
├─ approved_only
├─ approved_with_fallback
├─ 输出格式
├─ 导出前检查
├─ 当前状态
├─ 错误报告
├─ 生成文件
├─ 下载
└─ 快照                                      [后期]
```

---

# 23. 发布管理

```text
/relay/workspace/projects/:projectId/releases
                                           [管理][后期] 发布管理

/relay/workspace/projects/:projectId/releases/new
                                           [管理][后期] 创建版本

/relay/workspace/projects/:projectId/releases/:releaseId
                                           [管理][后期] 发布管理详情
```

支持：

```text
├─ 版本号
├─ 目标语言
├─ 关联导出
├─ 发布附件
├─ 更新说明
├─ 修复问题
├─ Credits
├─ 发布
├─ 撤回
└─ 归档
```

---

# 24. 项目成员与申请

```text
/relay/workspace/projects/:projectId/members
                                           [成员] 项目成员

/relay/workspace/projects/:projectId/members/invite
                                           [管理] 邀请成员

/relay/workspace/projects/:projectId/members/:userId
                                           [成员] 成员详情

/relay/workspace/projects/:projectId/applications
                                           [管理][后期] 加入申请

/relay/workspace/projects/:projectId/applications/:applicationId
                                           [管理][后期] 申请详情
```

成员角色：

```text
Maintainer
Reviewer
Translator
```

---

# 25. 项目贡献统计

```text
/relay/workspace/projects/:projectId/contributors
                                           [成员] 内部贡献统计
├─ 翻译贡献
├─ 审核贡献
├─ 工程贡献
└─ Credits 预览
```

---

# 26. 项目活动与审计

```text
/relay/workspace/projects/:projectId/activity
                                           [成员] 项目活动

/relay/workspace/projects/:projectId/activity/audit
                                           [管理][后期] 审计日志
```

---

# 27. 项目搜索

```text
/relay/workspace/projects/:projectId/search
                                           [成员][后期] 项目搜索
```

搜索范围：

```text
├─ 原文
├─ 译文
├─ 说话人
├─ TextEntry ID
├─ 术语
└─ 评论
```

---

# 28. 项目设置

```text
/relay/workspace/projects/:projectId/settings
                                           [管理] 项目设置

/relay/workspace/projects/:projectId/settings/general
                                           [管理] 基础信息

/relay/workspace/projects/:projectId/settings/visibility
                                           [管理] 可见性

/relay/workspace/projects/:projectId/settings/languages
                                           [管理] 语言

/relay/workspace/projects/:projectId/settings/collaboration
                                           [管理] 协作模式

/relay/workspace/projects/:projectId/settings/translation-rules
                                           [管理] 翻译规则

/relay/workspace/projects/:projectId/settings/control-codes
                                           [管理] 控制码

/relay/workspace/projects/:projectId/settings/length-limits
                                           [管理] 长度限制

/relay/workspace/projects/:projectId/settings/integrations
                                           [管理][后期] 外部集成

/relay/workspace/projects/:projectId/settings/danger
                                           [管理] 危险操作
```

---

# 29. Relay 平台管理

```text
/relay/admin                              [系统] 平台管理首页

/relay/admin/users                        [系统] 用户管理
/relay/admin/users/:userId                [系统] 用户详情

/relay/admin/projects                     [系统] 项目管理
/relay/admin/projects/:projectId          [系统] 项目详情

/relay/admin/issues                       [系统] 全平台问题与滥用报告
/relay/admin/moderation                   [系统] 内容管理
/relay/admin/audit                        [系统] 平台审计日志
/relay/admin/storage                      [系统] 存储状态
/relay/admin/jobs                         [系统] 后台任务
/relay/admin/system                       [系统] 系统状态
/relay/admin/settings                     [系统] 平台设置
```

---

# 30. 全局 Overlay

```text
Global Overlays
├─ 登录弹窗
├─ 注册弹窗
├─ 全局搜索
├─ 通知抽屉
├─ 观赏／实用模式切换
├─ 命令面板
├─ 确认操作弹窗
├─ 权限不足提示
├─ 会话过期提示
├─ 保存状态提示
├─ 网络断开提示
├─ 冲突处理弹窗
├─ 上下文素材查看器
├─ 图片查看器
├─ 快捷键帮助
├─ 上传进度
└─ 移动端导航抽屉
```

---

# 31. 顶层 Layout

```text
App
├─ MainSiteLayout
│  ├─ /
│  ├─ /works/*
│  ├─ /blog/*
│  ├─ /about
│  └─ /support/*
│
├─ AuthLayout
│  └─ /auth/*
│
├─ AccountLayout
│  └─ /account/*
│
└─ RelayLayout
   ├─ /relay
   ├─ /relay/projects/*
   ├─ /relay/tutorial/*
   ├─ /relay/users/*
   │
   ├─ WorkspaceLayout
   │  └─ /relay/workspace/*
   │
   └─ AdminLayout
      └─ /relay/admin/*
```

---

# 32. 第一阶段实现范围

```text
DITING 主站
├─ /
├─ /works
├─ /works/:slug
├─ /blog
├─ /blog/:slug
├─ /about
└─ /support

认证与账户
├─ /auth/login
├─ /auth/register
├─ /auth/verify
├─ /auth/forgot-password
├─ /auth/reset-password
├─ /account
├─ /account/profile
├─ /account/appearance
└─ /account/contributions

Relay 公共区域
├─ /relay
├─ /relay/projects
├─ /relay/projects/:slug
├─ /relay/projects/:slug/issues
├─ /relay/projects/:slug/issues/new
├─ /relay/projects/:slug/issues/:issueId
├─ /relay/projects/:slug/releases
├─ /relay/projects/:slug/releases/:version
├─ /relay/users/:username
├─ /relay/tutorial
├─ /relay/tutorial/mission
└─ /relay/tutorial/complete

Relay 工作台
├─ /relay/workspace
├─ /relay/workspace/projects
├─ /relay/workspace/tasks
├─ /relay/workspace/new-project
└─ /relay/workspace/projects/:projectId/dashboard

核心协作
├─ /relay/workspace/projects/:projectId/localization/tasks
├─ /relay/workspace/projects/:projectId/localization/tasks/:taskId
├─ /relay/workspace/projects/:projectId/localization/editor/:entryId
├─ /relay/workspace/projects/:projectId/localization/reviews
├─ /relay/workspace/projects/:projectId/localization/reviews/:entryId
├─ /relay/workspace/projects/:projectId/localization/glossary
├─ /relay/workspace/projects/:projectId/issues
├─ /relay/workspace/projects/:projectId/quality
├─ /relay/workspace/projects/:projectId/imports
├─ /relay/workspace/projects/:projectId/exports
├─ /relay/workspace/projects/:projectId/members
└─ /relay/workspace/projects/:projectId/settings
```

---

# 33. Use Case 对照

```text
UC-01  创建项目
/relay/workspace/new-project

UC-02  导入项目资源
/relay/workspace/projects/:projectId/imports

UC-03  翻译任务
/relay/workspace/projects/:projectId/localization/tasks

UC-04  成员与权限
/relay/workspace/projects/:projectId/members

UC-05  提交译文与修改建议
/relay/workspace/projects/:projectId/localization/editor/:entryId

UC-06  审核译文
/relay/workspace/projects/:projectId/localization/reviews

UC-07  自动质量检查
翻译编辑器及 /quality

UC-08  上下文素材
/relay/workspace/projects/:projectId/context

UC-09  评论讨论
条目、任务、术语及问题详情中的内嵌模块

UC-10  导出
/relay/workspace/projects/:projectId/exports

UC-11  导出事务
/relay/workspace/projects/:projectId/exports/:exportId

UC-12  发布版本
内部 /releases
公开 /relay/projects/:slug/releases

UC-13  项目贡献统计
/relay/workspace/projects/:projectId/contributors

UC-13B Contributor ID
/account/contributions
/relay/users/:username

UC-14  通知
/relay/workspace/notifications

UC-15  项目仪表盘
/relay/workspace/projects/:projectId/dashboard

UC-16  文件与文本结构
/relay/workspace/projects/:projectId/files

UC-17  审计日志
/relay/workspace/projects/:projectId/activity/audit

UC-18  注册与登录
/auth/*

UC-19  站内搜索
/relay/workspace/projects/:projectId/search

UC-20  术语表
/relay/workspace/projects/:projectId/localization/glossary

UC-21  问题报告
公开 /relay/projects/:slug/issues
内部 /relay/workspace/projects/:projectId/issues
```