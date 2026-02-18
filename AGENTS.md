# OpenCode Chat for Obsidian - Project Rules

本项目是针对 Obsidian 的 OpenCode Chat 插件。

## 项目结构

```
src/
├── main.ts                          # 插件入口
├── services/                        # 业务逻辑层
│   ├── OpenCodeServer.ts            # OpenCode HTTP 桥接
│   ├── SessionManager.ts            # 会话管理
│   ├── WritingWorkflowService.ts    # 写作工作流
│   ├── ContextResolver.ts           # 上下文解析
│   ├── CitationQualityService.ts    # 引用评估
│   ├── KnowledgeBaseService.ts      # KB 审计
│   ├── PublishAssistantService.ts   # 发布助手
│   └── WeChatExporter.ts            # 微信导出
├── views/                           # 视图层
│   ├── OpenCodeChatView.ts          # 主视图
│   └── WeChatPreviewView.ts         # 微信预览
├── ui/                              # UI 组件
└── types/                           # 类型定义
```

## 开发规范

### TypeScript 严格模式

- 所有函数必须有显式返回类型
- 避免使用 `any`，使用 `unknown` 代替
- 接口和类型使用 PascalCase
- 函数和变量使用 camelCase
- 常量使用 UPPER_SNAKE_CASE

### 错误处理

```typescript
try {
    await this.server.sendMessage(id, text);
} catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('OpenCodeChatView: Command error:', msg);
    throw error;
}
```

### 日志规范

- 使用 `console.log('OpenCodeChat: ...)` 前缀
- 错误使用 `console.error`
- 生产环境移除调试日志

## 文档更新要求

**代码变更后必须更新**:

| 变更类型 | 需要更新的文档 |
|---------|---------------|
| 修改 src/ 文件 | MEMORY.md + FEATURES.md |
| 添加新功能 | MEMORY.md + FEATURES.md + 相关技术文档 |
| 修复 Bug | MEMORY.md + FEATURES.md（技术债务） |
| API 变更 | docs/api-reference.md |
| 架构变更 | docs/architecture.md |

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 技能 (Skills)

本项目使用符合 [Agent Skills](https://agentskills.io/) 标准的技能：

| 技能 | 位置 | 说明 |
|------|------|------|
| `session-end-reflection` | `.claude/skills/session-end-reflection/` | 会话结束反思 |

OpenCode 技能位置：
- 项目：`.opencode/skills/<name>/SKILL.md` 或 `.claude/skills/<name>/SKILL.md`
- 全局：`~/.config/opencode/skills/` 或 `~/.claude/skills/`

详见 [docs/skills-system.md](./docs/skills-system.md)。

## 写作工作流

六阶段结构化写作流程：

```
调研 (Discover) → 大纲 (Outline) → 草稿 (Draft) → 论证 (Evidence) → 润色 (Polish) → 发布 (Publish)
```

使用 `/write <阶段>` 命令推进工作流。

写作工作流各阶段的详细说明请参考 [FEATURES.md](./FEATURES.md) 和 [MEMORY.md](./MEMORY.md)。

## 常用命令

```bash
# 开发
npm run dev          # 监听构建
npm run build        # 生产构建
npm run lint         # ESLint 检查
npx tsc -noEmit      # 类型检查

# OpenCode 技能相关
/session-end-reflection  # 手动触发会话结束反思
```

## 相关文档

- [MEMORY.md](./MEMORY.md) - 开发历程
- [FEATURES.md](./FEATURES.md) - 功能迭代记录
- [AGENTS.md](./AGENTS.md) - AI Agent 开发指南
- [CHANGELOG.md](./CHANGELOG.md) - 版本变更日志
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南

---

*最后更新：2026-02-19*
