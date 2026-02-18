# Contributing to OpenCode Chat for Obsidian

首先，感谢你愿意为这个项目做出贡献！

本项目是一个 Obsidian 插件，旨在将 OpenCode AI 编程助手集成到 Obsidian 知识库中。我们欢迎各种形式的贡献，包括代码、文档、问题报告和功能建议。

## 📖 快速导航

- [报告问题](#报告问题)
- [开发流程](#开发流程)
- [代码审查标准](#代码审查标准)
- [分支策略](#分支策略)
- [文档更新要求](#文档更新要求)
- [提交规范](#提交规范)

---

## 报告问题

### Bug 报告

在报告 Bug 之前，请检查：
- [ ] 是否已存在于 [Issues](https://github.com/your-repo/obsidian-claude-chat/issues) 中
- [ ] 是否已在 [MEMORY.md](./MEMORY.md) 的"遇到的问题"章节中记录
- [ ] 是否已在 [troubleshooting.md](./docs/troubleshooting.md) 中描述

**Bug 报告模板**:
```markdown
### Bug 描述
[清晰简洁地描述 Bug 是什么]

### 复现步骤
1. 执行 '...'
2. 点击 '...'
3. 观察到 '...'

### 预期行为
[描述应该发生什么]

### 截图
[如适用，添加截图]

### 环境信息
- Obsidian 版本：
- 插件版本：
- 操作系统：

### 日志
[相关的错误日志，从开发者控制台获取]

### 其他上下文
[任何有助于理解问题的其他信息]
```

### 功能请求

**功能请求模板**:
```markdown
### 功能描述
[清晰简洁地描述你想要的功能]

### 使用场景
[描述这个功能能解决什么问题]

### 实现建议
[如有想法，描述可能的实现方式]

### 替代方案
[考虑过其他解决方案吗]

### 其他上下文
[任何额外的截图、mockup 或讨论链接]
```

---

## 开发流程

### 1. 前置准备

```bash
# Fork 项目
git clone https://github.com/YOUR_USERNAME/obsidian-claude-chat.git

# 安装依赖
npm install

# 创建分支
git checkout -b feature/your-feature-name
```

### 2. 开发设置

```bash
# 开发模式构建（监听变化）
npm run dev

# 生产构建
npm run build

# 类型检查
npx tsc -noEmit

# Lint 检查
npm run lint
```

### 3. 在 Obsidian 中测试

```bash
# 构建后复制到插件目录
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/claude-chat-obsidian/
```

然后在 Obsidian 中：
1. 设置 → 第三方插件 → 刷新
2. 禁用 → 启用 OpenCode Chat
3. 打开聊天面板测试

### 4. 提交变更

```bash
# 添加变更
git add <files>

# 提交（遵循提交规范）
git commit -m "type: description"

# 推送
git push origin feature/your-feature-name
```

### 5. 创建 Pull Request

在 GitHub 上创建 PR，包含：
- 清晰的标题和描述
- 关联的 Issue（如适用）
- 测试截图（如适用）
- 文档更新确认

---

## 代码审查标准

### 代码质量

| 检查项 | 要求 |
|--------|------|
| TypeScript 类型 | 无 `any` 类型，显式类型定义 |
| 类型检查 | `npx tsc -noEmit` 通过 |
| ESLint | `npm run lint` 无错误 |
| 构建 | `npm run build` 成功 |
| 调试代码 | 无 `console.log`（保留 `console.error`） |

### 代码风格

**命名约定**:
```typescript
class OpenCodeServer { }           // PascalCase - 类
interface ChatMessage { }          // PascalCase - 接口
type WritingStage = ...;           // PascalCase - 类型别名
function handleCommand() { }       // camelCase - 函数
const MAX_RETRIES = 5;             // UPPER_SNAKE_CASE - 常量
```

**错误处理**:
```typescript
// ✅ 包装错误并添加上下文
try {
    await this.server.sendMessage(id, text);
} catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('OpenCodeChatView: Command error:', msg);
    throw error;
}
```

### 安全考虑

审查时会特别检查：
- [ ] 无命令注入风险
- [ ] 无 XSS 漏洞
- [ ] 无敏感信息硬编码
- [ ] 文件路径正确处理（防止目录遍历）

---

## 分支策略

### 分支命名

| 分支类型 | 命名格式 | 说明 |
|---------|---------|------|
| 主分支 | `main` | 稳定版本，受保护 |
| 功能分支 | `feature/xxx` | 新功能开发 |
| 修复分支 | `fix/xxx` | Bug 修复 |
| 文档分支 | `docs/xxx` | 文档更新 |
| 重构分支 | `refactor/xxx` | 代码重构 |

### 工作流

```
main (受保护)
  │
  ├── feature/new-feature
  │     └── PR → main
  │
  ├── fix/bug-123
  │     └── PR → main
  │
  └── docs/update-guide
        └── PR → main
```

### Git 工作流

```bash
# 从 main 创建新分支
git checkout main
git pull origin main
git checkout -b feature/your-feature

# 开发完成后
git push origin feature/your-feature
# 在 GitHub 上创建 PR
```

---

## 文档更新要求

### 强制更新

**代码变更后必须更新以下文档**:

| 变更类型 | 必须更新的文档 |
|---------|---------------|
| 新功能 | `MEMORY.md` + `FEATURES.md` |
| Bug 修复 | `MEMORY.md` |
| API 变更 | `docs/api-reference.md` |
| 架构变更 | `docs/architecture.md` |
| 规范变更 | `docs/coding-standards.md` |

### 文档更新检查清单

在提交代码前，确认：

- [ ] **MEMORY.md** - 添加开发记录（日期、完成内容、遇到的问题、经验教训）
- [ ] **FEATURES.md** - 更新功能状态（功能矩阵、技术债务、版本历史）
- [ ] **相关技术文档** - 如涉及 API/架构/规范变更
- [ ] **文档一致性验证** - 检查文档中的代码示例、文件路径、类型定义是否与实际一致

### 文档更新模板

**MEMORY.md 更新模板**:
```markdown
## YYYY-MM-DD - [任务名称]

### 目标
[简述任务目标]

### 完成内容
**代码变更**:
- `文件路径` - 变更说明

**新增功能**:
- 功能描述

### 遇到的问题
**问题 1**: 问题描述
- **原因**: ...
- **解决**: ...
```

**FEATURES.md 更新模板**:
```markdown
### v1.x.x - YYYY-MM-DD

#### [Sprint 名称]

| 功能 | 状态 | 说明 |
|------|------|------|
| 新功能 | ✅ | 功能描述 |
```

### 文档位置

| 文档 | 位置 |
|------|------|
| 开发历程 | `MEMORY.md` |
| 功能矩阵 | `FEATURES.md` |
| AI Agent 指南 | `AGENTS.md` |
| 架构设计 | `docs/architecture.md` |
| API 参考 | `docs/api-reference.md` |
| 编码规范 | `docs/coding-standards.md` |
| 故障排查 | `docs/troubleshooting.md` |
| 技能系统 | `docs/skills-system.md` |
| 用户指南 | `docs/user-guide.md` |

详细文档更新指南请参考 [CONTRIBUTING.md](./CONTRIBUTING.md) 本文档的"文档更新要求"章节。

---

## 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响代码运行的变动） |
| `refactor` | 重构（既不是新功能也不是 Bug 修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具/配置相关 |

### 示例

```bash
feat(writer): add draft version snapshot feature

- Capture draft content when entering draft stage
- Store version history in task state
- Display version list in task panel

Closes #42
```

```bash
fix(sse): handle reconnection after network failure

- Add retry logic with max 5 attempts
- Log reconnection attempts
- Handle timeout errors gracefully

Fixes #28
```

---

## 发布流程

### 版本发布检查清单

在发布新版本前，确认：

- [ ] CHANGELOG.md 已更新
- [ ] manifest.json 版本号已更新
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] Git tag 已创建

### 发布命令

```bash
# 更新版本号（manifest.json）
# 更新 CHANGELOG.md

git add .
git commit -m "chore: release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

---

## 开发环境要求

- Node.js >= 18
- npm >= 9
- Obsidian >= 1.4
- OpenCode CLI 已安装

## 许可证

本项目采用 MIT 许可证。提交代码即表示你同意将贡献以 MIT 许可证发布。

---

*最后更新：2026-02-19*
