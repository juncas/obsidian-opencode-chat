# OpenCode Skills 标准

本项目技能遵循 [Agent Skills](https://agentskills.io/) 开放标准格式。

## Agent Skills 标准

Agent Skills 是一个开放的技能格式标准，由 Anthropic 发布并被多个 AI 开发工具采用。

### 标准格式

```markdown
---
name: skill-name
description: 技能描述，包含什么情况下使用
---

# 技能名称

技能详细说明...
```

### 命名规范

**有效的名称**:
```yaml
name: pdf-processing      # ✅ 小写 + 连字符
name: data-analysis       # ✅
name: code-review         # ✅
```

**无效的名称**:
```yaml
name: PDF-Processing      # ❌ 不允许大写
name: -pdf                # ❌ 不能以连字符开头
name: pdf--processing     # ❌ 不能有连续连字符
```

### 描述规范

描述必须使用**第三人称**，并包含技能功能和使用时机：

**好的示例**:
```yaml
description: 从 PDF 文件提取文本和表格，合并文档。当用户处理 PDF 文件或提到 PDF、表单、文档提取时使用此技能。
```

**坏的示例**:
```yaml
description: 帮助处理 PDF  # 太模糊
description: 我可以帮你处理 PDF  # 错误 - 第一人称
description: 你可以用这个处理 PDF  # 错误 - 第二人称
```

## 本项目技能

### 技能列表

| 技能 | 文件位置 | 说明 |
|------|---------|------|
| evidence-qa | `opencode-skills/evidence-qa/SKILL.md` | 证据问答，生成带引用的回答 |
| kb-health-audit | `opencode-skills/kb-health-audit/SKILL.md` | 知识库健康审计 |

### 触发词

使用这些术语来识别何时应用哪个技能。

#### evidence-qa

- 英文：`evidence`, `citation`, `source`, `grounded answer`
- 中文：`来源`, `证据`, `可追溯`, `有依据`

#### kb-health-audit

- 英文：`health`, `audit`, `broken links`, `orphan notes`, `stale notes`
- 中文：`体检`, `巡检`, `断链`, `孤儿笔记`, `陈旧文档`

## 输出规范

所有技能应输出简洁的 Markdown，包含稳定的章节结构。

### evidence-qa 章节规范

必需按以下顺序：
1. `## Conclusion`
2. `## Evidence`
3. `## Sources`
4. `## Confidence`

`## Sources` 必须包含可点击的链接：
- 优先使用 `[[path/to/file]]`
- 或使用 `[file](path/to/file.md)`

### kb-health-audit 章节规范

必需按以下顺序：
1. `## Summary`
2. `## Findings`
3. `## Priority Actions`

`## Findings` 应使用以下分类：
- `Broken Links`
- `Orphan Notes`
- `Potential Duplicates`
- `Stale Notes`

## 失败和 fallback 规则

- 当证据不足时：
  - 明确说明不确定性
  - 永远不要将假设呈现为事实
  - 询问所需的最少额外上下文
- 当没有 vault 上下文时：
  - 返回明确的限制说明
  - 提供简短的检查清单以获取所需上下文

## 术语

- 使用 `note` 表示 Markdown 文档
- 使用 `source` 表示引用的笔记
- 使用 `finding` 表示检测到的问题
- 使用 `priority` 仅限：`high`, `medium`, `low`

## 安全和编辑边界

- 技能应默认用于分析和建议
- 任何破坏性或批量编辑建议必须是明确的且可逆的
- 对于重构建议，优先使用"预览后应用"的语言

## 参考资源

- [Agent Skills 官方网站](https://agentskills.io/)
- [Agent Skills 规范](https://agentskills.io/specification)
- [参考技能库](https://github.com/agentskills/agentskills/tree/main/skills-ref)
- [Anthropic 示例技能](https://github.com/anthropics/skills)
