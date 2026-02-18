# 技能系统

OpenCode Chat for Obsidian 的技能（Skills）系统文档，介绍技能的结构、编写规范和同步机制。

**注意**: 本项目技能遵循 [Agent Skills](https://agentskills.io/) 和 [OpenCode Skills](https://opencode.ai/docs/skills) 开放标准格式。

---

## 什么是技能

技能（Skills）是 AI 的自定义指令文件，用于指导 AI 在特定场景下的行为。

### 两类技能

本项目涉及两种技能系统：

| 技能系统 | 位置 | 用途 |
|---------|------|------|
| **Claude Code Skills** | `.claude/skills/<name>/SKILL.md` | Claude Code 会话中使用 |
| **OpenCode Skills** | `.opencode/skills/<name>/SKILL.md` 或 `opencode-skills/` | OpenCode 会话中使用 |

### 内置技能

**Claude Code Skills**:
| 技能 | 位置 | 说明 |
|------|------|------|
| `session-end-reflection` | `.claude/skills/session-end-reflection/` | 会话结束反思 |

**OpenCode Skills**:
| 技能 | 位置 | 说明 |
|------|------|------|
| `evidence-qa` | `opencode-skills/evidence-qa/` | 基于证据的问答，带引用 |
| `kb-health-audit` | `opencode-skills/kb-health-audit/` | 知识库健康审计 |

---

## 技能结构

### 文件组织

**Claude Code Skills**:
```
.claude/skills/
├── session-end-reflection/
│   └── SKILL.md            # 会话结束反思
```

**OpenCode Skills**:
```
opencode-skills/
├── SKILL-STANDARDS.md      # 技能编写标准
├── evidence-qa/
│   └── SKILL.md            # 证据 QA 技能定义
└── kb-health-audit/
    └── SKILL.md            # KB 审计技能定义
```

### OpenCode 技能发现位置

OpenCode 会搜索以下位置：

| 类型 | 路径 |
|------|------|
| 项目配置 | `.opencode/skills/<name>/SKILL.md` |
| 全局配置 | `~/.config/opencode/skills/<name>/SKILL.md` |
| Claude 兼容（项目） | `.claude/skills/<name>/SKILL.md` |
| Claude 兼容（全局） | `~/.claude/skills/<name>/SKILL.md` |
| 代理兼容（项目） | `.agents/skills/<name>/SKILL.md` |
| 代理兼容（全局） | `~/.agents/skills/<name>/SKILL.md` |

详见 [OpenCode Skills 文档](https://opencode.ai/docs/skills)。

### SKILL.md 格式（Agent Skills 标准）

每个技能文件包含 YAML frontmatter 和 Markdown 内容:

```markdown
---
name: skill-name
description: 简短描述，包含触发词和使用场景
---

# Skill Name

## Required Behavior
1. ...

## Workflow
1. ...

## Output Template
...

## Examples
### Example 1
...
```

**命名规范**:
- 使用小写字母和连字符（`skill-name`）
- 不能以连字符开头或结尾
- 不能有连续连字符

**描述规范**:
- 使用第三人称（不是"我可以帮你"）
- 包含技能功能和使用场景

详见 [SKILL-STANDARDS.md](../opencode-skills/SKILL-STANDARDS.md)、[OpenCode Skills](https://opencode.ai/docs/skills) 和 [Claude Code Skills](https://code.claude.com/docs/zh-CN/skills)。

---

## 内置技能详解

### evidence-qa

**位置**: `opencode-skills/evidence-qa/SKILL.md`

**用途**: 回答需要引用来源的问题，确保每个关键论断都有笔记支撑

**触发词**:
- 英文：`evidence`, `citation`, `source`, `grounded answer`
- 中文：`来源`, `证据`, `可追溯`, `有依据`

**输出模板**:
```markdown
## Conclusion
- <1-3 简洁结论>

## Evidence
- Claim: <论断>
  - Evidence: <证据摘要>
  - Why it supports: <支持原因>

## Sources
- [[path/to/note-a]]
- [[path/to/note-b]]

## Confidence
- Level: high | medium | low
- Gaps: <缺失的证据>
```

**使用示例**:
```
/qa 这个方案为什么要迁移到 HTTP 服务？给出依据。
```

**预期输出**:
```markdown
## Conclusion
- Migrating to HTTP service improves session lifecycle control and event streaming stability.

## Evidence
- Claim: Session lifecycle is explicit.
  - Evidence: Service layer exposes `createSession`, `abortSession`, and status events.
  - Why it supports: Explicit API calls reduce hidden state transitions.

## Sources
- [[src/services/OpenCodeServer.ts]]
- [[src/types/opencode.ts]]

## Confidence
- Level: high
- Gaps: None in current scope.
```

---

### kb-health-audit

**位置**: `opencode-skills/kb-health-audit/SKILL.md`

**用途**: 审计知识库健康状况，发现断链、孤儿笔记、重复内容、陈旧文档

**触发词**:
- 英文：`health`, `audit`, `broken links`, `orphan notes`, `stale notes`
- 中文：`体检`, `巡检`, `断链`, `孤儿笔记`, `陈旧文档`

**审计维度**:

| 维度 | 检查内容 |
|------|---------|
| Broken Links | `[[引用]]` 指向不存在的笔记 |
| Orphan Notes | 没有被其他笔记链接的文件 |
| Potential Duplicates | 重复或近似重复的内容 |
| Stale Notes | 长时间未更新的笔记 |

**输出模板**:
```markdown
## Summary
- Scope: full | orphan | broken | duplicate | stale
- Total findings: <数量>
- High priority: <数量>

## Findings
### Broken Links
- <发现>

### Orphan Notes
- <发现>

### Potential Duplicates
- <发现>

### Stale Notes
- <发现>

## Priority Actions
1. [high] <行动>
2. [medium] <行动>
3. [low] <行动>
```

**使用示例**:
```
/kb audit full
/kb audit broken 在 projects/ 目录下
/kb audit stale 超过 6 个月未更新的笔记
```

---

## 技能同步机制

### 同步流程

插件启动时自动同步 bundled skills 到 vault:

```typescript
// main.ts: onload()
async onload() {
    // ...
    await this.syncBundledSkillsToVault();
}

// 同步逻辑
async syncBundledSkillsToVault(): Promise<void> {
    const sourceRoot = join(
        this.getVaultPath(),
        '.obsidian',
        'plugins',
        this.manifest.id,
        'opencode-skills'
    );
    const targetRoot = join(this.getVaultPath(), '.opencode', 'skills');

    // 遍历源目录
    const skillDirs = this.getSkillDirectories(sourceRoot);

    for (const dir of skillDirs) {
        const source = join(sourceRoot, dir);
        const target = join(targetRoot, dir);

        // 复制 SKILL.md 文件
        await this.copySkillFile(source, target);
    }
}
```

### 目录映射

```
源目录                                目标目录
.opencode-skills/
├── evidence-qa/           →   .opencode/skills/
│   └── SKILL.md                ├── evidence-qa/
└── kb-health-audit/            │   └── SKILL.md
    └── SKILL.md                └── kb-health-audit/
                                    └── SKILL.md
```

---

## 编写新技能

### 步骤 1: 创建技能目录

```bash
cd opencode-skills/
mkdir new-skill
```

### 步骤 2: 编写 SKILL.md

```markdown
---
name: code-review
description: Code review assistant. Use when user asks for code review, refactoring suggestions, or best practices.
---

# Code Review

## Required Behavior
1. Review code for type safety, error handling, and edge cases.
2. Never claim exact behavior without reading the code.
3. Provide concrete examples for suggested changes.

## Checklist
- [ ] Type safety (no implicit any)
- [ ] Error handling (try/catch or Result)
- [ ] Edge cases (null, undefined, empty)
- [ ] Performance (unnecessary loops, caching)
- [ ] Readability (naming, comments)

## Output Template
```markdown
## Summary
- <overall assessment>

## Findings
### Type Safety
- <finding>

### Error Handling
- <finding>

### Suggestions
1. <suggestion>
2. <suggestion>

## Example Fix
```typescript
// Before
function process(data) { ... }

// After
function process(data: unknown): void { ... }
```
```

## Examples

### Example 1
User: "Review this function"
...
```
```

### 步骤 3: 遵循 SKILL-STANDARDS.md

参考 `opencode-skills/SKILL-STANDARDS.md` 确保符合标准:

- 输出格式稳定
- 章节顺序一致
- 使用标准术语
- 提供示例

### 步骤 4: 测试技能

1. 构建并安装插件
2. 在 Obsidian 中重启插件
3. 使用触发词测试技能是否生效

---

## 技能触发机制

### 自动触发

当用户输入包含触发词时，OpenCode 会自动应用对应技能:

```typescript
// OpenCode 内部逻辑
if (userInput.includes('evidence') || userInput.includes('citation')) {
    applySkill('evidence-qa');
}

if (userInput.includes('audit') || userInput.includes('health')) {
    applySkill('kb-health-audit');
}
```

### 手动触发

通过命令显式调用:

```
/evidence-qa 这个问题有来源支撑吗？
/kb-health-audit 检查 projects/ 目录的健康度
```

---

## 技能标准 (SKILL-STANDARDS.md)

### 输出格式要求

所有技能应输出稳定的 Markdown 结构:

**必需章节**:
- `## Scope` - 技能适用范围
- `## Findings` - 发现/分析结果
- `## Next Actions` - 下一步行动

### 术语规范

| 术语 | 说明 |
|------|------|
| `note` | Markdown 文档 |
| `source` | 引用的笔记 |
| `finding` | 检测到的问题 |
| `priority` | 优先级：`high`, `medium`, `low` |

### 失败处理

**证据不足时**:
```markdown
## Conclusion
- Current evidence is insufficient to answer reliably.

## Evidence
- Available notes do not contain direct support for <topic>.

## Sources
- [[path/that/was/checked]]

## Confidence
- Level: low
- Gaps: Need notes about <exact missing scope>.
```

**无 Vault 上下文时**:
```markdown
## Limitation
- No vault context available.

## Required Context
- Please provide relevant notes or files.
```

---

## 技能调试

### 验证技能加载

```bash
# 检查目标目录
ls -la ~/.opencode/skills/
# 应该包含技能目录
```

### 查看技能内容

```bash
cat ~/.opencode/skills/evidence-qa/SKILL.md
```

### 测试技能触发

```
在聊天中输入触发词，观察 AI 响应是否符合技能定义
```

### 技能未生效的可能原因

1. **技能未同步**:
   ```bash
   # 手动复制
   cp -R opencode-skills/. ~/.opencode/skills/
   ```

2. **触发词不匹配**:
   - 检查 SKILL.md frontmatter 中的 description
   - 确保输入包含触发词

3. **OpenCode 未读取技能**:
   - 重启 OpenCode Server
   - 重新加载插件

---

## 技能最佳实践

### 设计原则

1. **单一职责**: 每个技能专注一个场景
2. **稳定输出**: 使用固定模板便于解析
3. **可操作**: 提供具体的下一步行动
4. **可验证**: 明确说明置信度和缺口

### 避免的问题

- ❌ 捏造事实（missing evidence 时明确说明）
- ❌ 模糊建议（提供具体代码或步骤）
- ❌ 冗长输出（保持简洁，使用列表）

### 示例对比

**不好的技能定义**:
```markdown
## Do Stuff
Just help the user with whatever they need.
```

**好的技能定义**:
```markdown
## Required Behavior
1. Answer only from available context.
2. Cite sources for every key claim.
3. Mark missing evidence explicitly.
```

---

## 技能版本管理

### 版本历史

在 SKILL.md 底部添加版本信息:

```markdown
---
History
- 2026-02-19: Initial version
- 2026-02-15: Added confidence levels
---
```

### 兼容性

修改技能时注意:
- 保持输出模板向后兼容
- 新增章节而非删除
- 在 FEATURES.md 中记录变更

---

## 参考资源

### 官方文档

| 文档 | 链接 |
|------|------|
| Agent Skills 标准 | https://agentskills.io/ |
| OpenCode Skills | https://opencode.ai/docs/skills |
| Claude Code Skills | https://code.claude.com/docs/zh-CN/skills |
| OpenCode Rules | https://opencode.ai/docs/zh-cn/rules/ |

### 项目文档

- [SKILL-STANDARDS.md](../opencode-skills/SKILL-STANDARDS.md) - 技能编写标准
- [evidence-qa/SKILL.md](../opencode-skills/evidence-qa/SKILL.md) - 证据 QA 技能
- [kb-health-audit/SKILL.md](../opencode-skills/kb-health-audit/SKILL.md) - KB 审计技能
- [session-end-reflection/SKILL.md](../.claude/skills/session-end-reflection/SKILL.md) - 会话结束反思

---

*最后更新：2026-02-19*
