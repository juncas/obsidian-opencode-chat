---
name: evidence-qa
description: Produces grounded answers with explicit evidence and clickable sources from vault notes. Use when the user asks for evidence, citations, traceable conclusions, or source-backed answers (evidence, citation, 来源, 证据, 可追溯).
---

# Evidence QA

Use this skill to answer questions with verifiable sources from the vault.

## Required Behavior

1. Answer only from available context and retrieved notes.
2. Never present assumptions as facts.
3. Provide clickable sources for every key claim.
4. If evidence is missing, clearly say what is missing.

## Workflow

1. Identify the exact user question and scope.
2. Retrieve relevant notes and snippets.
3. Keep only evidence that directly supports claims.
4. Write the response using the output template below.
5. Check every claim has at least one source reference.

## Output Template

Use this structure exactly:

```markdown
## Conclusion
- <1-3 concise conclusions>

## Evidence
- Claim: <claim>
  - Evidence: <short evidence summary>
  - Why it supports: <one sentence>

## Sources
- [[path/to/note-a]]
- [[path/to/note-b]]

## Confidence
- Level: high | medium | low
- Gaps: <what evidence is still missing>
```

## Citation Rules

- Prefer Obsidian style links: `[[path/to/file]]`.
- If wiki links are not possible, use markdown links: `[file](path/to/file.md)`.
- Keep source list short and relevant.
- Do not cite unrelated notes.

## Failure Mode

When evidence is insufficient, use:

```markdown
## Conclusion
- Current evidence is insufficient to answer reliably.

## Evidence
- Available notes do not contain direct support for <topic>.

## Sources
- [[path/that-was-checked]]

## Confidence
- Level: low
- Gaps: Need notes about <exact missing scope>.
```

## Examples

### Example 1

User intent: "这个方案为什么要迁移到 HTTP 服务？给出依据。"

Expected shape:

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

### Example 2

User intent: "知识库里关于‘发布流程’的结论是什么？要有来源。"

Expected shape:

```markdown
## Conclusion
- The release flow relies on CI + release workflow and manual version updates.

## Evidence
- Claim: CI validates build and lint before release.
  - Evidence: Workflow file includes build and lint jobs.
  - Why it supports: It enforces checks before publishing artifacts.

## Sources
- [[.github/workflows/ci.yml]]
- [[.github/workflows/release.yml]]

## Confidence
- Level: medium
- Gaps: Missing explicit human approval policy document.
```

### Example 3

User intent: "这个插件支持哪些导航能力？"

Expected shape:

```markdown
## Conclusion
- The plugin supports link click navigation and modifier-key preview/open behavior.

## Evidence
- Claim: Internal links can open notes.
  - Evidence: Message container handles internal link click and resolves files.
  - Why it supports: Click handlers route link text to vault file resolution.

## Sources
- [[src/ui/MessageContainer.ts]]
- [[README.md]]

## Confidence
- Level: high
- Gaps: None for documented features.
```

### Example 4

User intent: "为什么说 @ 引用已经可用？"

Expected shape:

```markdown
## Conclusion
- `@` file mention autocomplete is implemented in input handling and styled in UI.

## Evidence
- Claim: Input listens for mention context and candidate navigation.
  - Evidence: Input component tracks mention state and selection keys.
  - Why it supports: Mention parsing and insertion logic are present.

## Sources
- [[src/ui/ChatInput.ts]]
- [[styles.css]]

## Confidence
- Level: high
- Gaps: Runtime UX still depends on user theme readability.
```

### Example 5

User intent: "现有资料能证明‘知识库体检功能已上线’吗？"

Expected shape:

```markdown
## Conclusion
- Current evidence is insufficient to confirm this feature is already shipped.

## Evidence
- Claim: No finalized health command implementation is found in current code.
  - Evidence: Command routing does not include a `/health` handler yet.
  - Why it supports: Missing handler indicates feature is not available at runtime.

## Sources
- [[src/views/OpenCodeChatView.ts]]

## Confidence
- Level: low
- Gaps: Need merged implementation files or release notes proving availability.
```

## Additional Resources

- Shared standards: [../SKILL-STANDARDS.md](../SKILL-STANDARDS.md)
