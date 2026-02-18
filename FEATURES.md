# 功能迭代记录

> [!IMPORTANT] AI Agent 必读文档
> **这是 AI Agent 接手开发任务前必须阅读的三份文档之一：**
>
> 1. [MEMORY.md](./MEMORY.md) - 了解开发历史和关键决策
> 2. **FEATURES.md (本文档)** - 了解功能状态和待办事项
> 3. [AGENTS.md](./AGENTS.md) - AI Agent 任务执行指南
>
> **阅读完这三份文档后，再开始执行任务。**

记录 OpenCode Chat for Obsidian 插件的功能开发和迭代历史。

---

## 📖 本文档阅读指南

**作为 AI Agent，阅读本文档时请重点关注：**

| 章节 | 关注点 | 避免的问题 |
|------|--------|-----------|
| 版本历史 | 各 Sprint 完成的功能 | 重复开发已有功能 |
| 功能矩阵 | 当前系统能力全貌 | 错误假设系统能力 |
| 技术债务 | 需要优化的地方 | 忽略已知问题 |
| 未来规划 | 开发方向和优先级 | 优先级错误 |

**开始任务前检查**:
- [ ] 确认要开发的功能是否已在功能矩阵中标记为完成
- [ ] 查看技术债务列表，避免引入类似问题
- [ ] 对照未来规划，确认任务优先级

### v1.0.0 - 2026-02-19

#### Sprint 1 - 基础聊天功能 (2026-02-08 ~ 2026-02-10)

**目标**: 建立基础聊天界面和 OpenCode 集成

| 功能 | 状态 | 说明 |
|------|------|------|
| OpenCode Server 集成 | ✅ | HTTP 模式 + SSE 事件流 |
| 基础会话管理 | ✅ | 单会话聊天 |
| 流式响应渲染 | ✅ | text.delta 事件处理 |
| 消息历史持久化 | ✅ | data.json 存储 |
| 基础 UI 组件 | ✅ | ChatInput, MessageContainer |

**核心文件**:
- `src/main.ts` - 插件入口
- `src/services/OpenCodeServer.ts` - OpenCode 桥接
- `src/views/OpenCodeChatView.ts` - 主视图

---

#### Sprint 2 - 多会话与写作工作流 (2026-02-10 ~ 2026-02-13)

**目标**: 支持多会话和结构化写作流程

| 功能 | 状态 | 说明 |
|------|------|------|
| 多会话管理 | ✅ | SessionManager 实现 |
| 会话标签页 | ✅ | SessionTabs 组件 |
| 写作工作流框架 | ✅ | WritingWorkflowService |
| 六阶段工作流 | ✅ | discover → publish |
| 上下文捆绑 | ✅ | ContextResolver 实现 |
| @文件提及 | ✅ | 文件 autocomplete |
| 草稿版本管理 | ✅ | DraftVersion 快照 |

**核心文件**:
- `src/services/SessionManager.ts` - 会话状态管理
- `src/services/WritingWorkflowService.ts` - 工作流逻辑
- `src/services/ContextResolver.ts` - 上下文解析
- `src/ui/SessionTabs.ts` - 会话标签 UI
- `src/ui/WritingTaskPanel.ts` - 写作任务面板

**命令新增**:
```
/write start <主题>
/write outline [要求]
/write draft [要求]
/write evidence [问题]
/write polish [风格提示]
/write publish [备注]
```

---

#### Sprint 3 - 知识库审计与引用质量 (2026-02-13 ~ 2026-02-15)

**目标**: 知识库健康检查和引用质量评估

| 功能 | 状态 | 说明 |
|------|------|------|
| KB 健康审计 | ✅ | KnowledgeBaseService |
| 断链检测 | ✅ | broken links 扫描 |
| 孤儿笔记检测 | ✅ | orphan notes 扫描 |
| 引用质量评估 | ✅ | CitationQualityService |
| 引用覆盖率指标 | ✅ | 覆盖率进度条 |
| 证据 QA 技能 | ✅ | evidence-qa SKILL.md |
| KB 审计技能 | ✅ | kb-health-audit SKILL.md |

**核心文件**:
- `src/services/KnowledgeBaseService.ts` - KB 审计
- `src/services/CitationQualityService.ts` - 引用评估
- `src/ui/MessageContainer.ts` - 引用覆盖率渲染
- `opencode-skills/evidence-qa/SKILL.md` - 证据 QA 技能
- `opencode-skills/kb-health-audit/SKILL.md` - KB 审计技能

**命令新增**:
```
/kb audit [范围] [约束]
/qa <问题>
```

---

#### Sprint 4 - 微信导出与发布助手 (2026-02-15 ~ 2026-02-17)

**目标**: 微信公众号文章导出和发布辅助功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 微信样式模板 | ✅ | WeChatStyles.ts |
| HTML 导出 | ✅ | WeChatExporter |
| 预览视图 | ✅ | WeChatPreviewView |
| 样式选择对话框 | ✅ | WeChatStyleModal |
| 发布助手 | ✅ | PublishAssistantService |
| 标签体系分析 | ✅ | 自动分析 vault 标签 |
| 文件夹结构建议 | ✅ | 前两层目录扫描 |
| YAML frontmatter | ✅ | 自动生成 |

**核心文件**:
- `src/services/WeChatExporter.ts` - 微信导出
- `src/services/WeChatStyles.ts` - 样式模板
- `src/services/PublishAssistantService.ts` - 发布助手
- `src/views/WeChatPreviewView.ts` - 预览视图
- `src/ui/WeChatStyleModal.ts` - 样式选择

**UI 组件新增**:
- 微信导出按钮（Writing Workflows 菜单）
- 预览视图 ribbon 图标
- 文件菜单 action（右键 markdown 文件）

---

#### Sprint 5 - 文档整理与开发者体验 (2026-02-17 ~ 2026-02-19)

**目标**: 完善文档和 AI Agent 支持

| 功能 | 状态 | 说明 |
|------|------|------|
| FEATURES.md | ✅ | 功能迭代记录 |
| AGENTS.md | ✅ | AI Agent 指南 |
| MEMORY.md | ✅ | 开发历程 |
| docs/architecture.md | ✅ | 架构设计 |
| docs/api-reference.md | ✅ | API 参考 |
| docs/development-setup.md | ✅ | 开发设置 |
| docs/coding-standards.md | ✅ | 编码规范 |
| docs/troubleshooting.md | ✅ | 故障排查 |
| docs/skills-system.md | ✅ | 技能系统 |

---

#### Sprint 6 - 文档规划与补充 (2026-02-19)

**目标**: 补充开源项目标准文档，完善用户指南

| 功能 | 状态 | 说明 |
|------|------|------|
| CHANGELOG.md | ✅ | 版本变更日志（Keep a Changelog 格式） |
| CONTRIBUTING.md | ✅ | 贡献指南（含文档更新要求） |
| docs/user-guide.md | ✅ | 详细用户指南（图文并茂） |
| README.md 更新 | ✅ | 添加新文档链接 |

---

## 功能矩阵

### 核心功能

| 功能模块 | 状态 | 入口 | 文档 |
|---------|------|------|------|
| 聊天会话 | ✅ | 聊天面板 | - |
| 多会话切换 | ✅ | 会话标签 | - |
| 流式响应 | ✅ | 自动 | - |
| 消息编辑 | ✅ | 点击消息 | - |
| 导出对话 | ✅ | Ctrl+Shift+E | - |

### 写作工作流

| 阶段 | 状态 | 命令 | 自动功能 |
|------|------|------|---------|
| 调研 (Discover) | ✅ | `/write start` | 任务创建、上下文捆绑 |
| 大纲 (Outline) | ✅ | `/write outline` | 证据关联大纲 |
| 草稿 (Draft) | ✅ | `/write draft` | 引用标注、版本捕获 |
| 论证 (Evidence) | ✅ | `/write evidence` | 引用覆盖率评估 |
| 润色 (Polish) | ✅ | `/write polish` | 版本捕获 |
| 发布 (Publish) | ✅ | `/write publish` | frontmatter、标签建议 |

### 知识库工具

| 工具 | 状态 | 命令 | 输出 |
|------|------|------|------|
| KB 健康审计 | ✅ | `/kb audit` | 问题列表 + 优先级 |
| 证据 QA | ✅ | `/qa` | 带引用的回答 |
| 引用覆盖率 | ✅ | 自动 | 进度条 + 未引用列表 |

### 导出功能

| 格式 | 状态 | 入口 | 样式 |
|------|------|------|------|
| Markdown | ✅ | Ctrl+Shift+E | 标准格式 |
| 微信 HTML | ✅ | Writing Workflows 菜单 | 5 种样式可选 |

---

## 技术债务

### 待优化

| 项目 | 优先级 | 说明 |
|------|--------|------|
| 单元测试 | 🟡 中 | 核心服务层测试覆盖 |
| 性能优化 | 🟡 中 | 大文件上下文加载优化 |
| 错误边界 | 🟢 高 | 更友好的错误提示 |
| 移动端适配 | 🔴 低 | 当前仅支持桌面端 |

### 已知问题

| 问题 | 影响 | 临时方案 |
|------|------|---------|
| 端口冲突 | 偶尔 | 自动故障转移到 14001-14004 |
| SSE 重连 | 偶尔 | 最多重试 5 次 |

---

## 未来规划

### v1.1.0 (计划)

- [ ] 自定义工作流模板
- [ ] 多 vault 配置同步
- [ ] 插件设置 UI 增强
- [ ] 支持自定义模型配置

### v1.2.0 (计划)

- [ ] 写作统计面板
- [ ] 知识图谱可视化
- [ ] 批量操作支持

---

*最后更新：2026-02-19*
