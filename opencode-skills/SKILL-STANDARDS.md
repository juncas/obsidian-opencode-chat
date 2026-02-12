# OpenCode Knowledge Copilot Skill Standards

This document defines the shared standards for skills shipped with this plugin.

## Scope

- Skills covered:
  - `evidence-qa`
  - `kb-health-audit`
- Skill files are shipped from `opencode-skills/` and synced to vault path:
  - `.opencode/skills/<skill-name>/SKILL.md`

## Trigger Terms

Use these terms to decide when to apply each skill.

### evidence-qa

- English: `evidence`, `citation`, `source`, `grounded answer`
- Chinese: `来源`, `证据`, `可追溯`, `有依据`

### kb-health-audit

- English: `health`, `audit`, `broken links`, `orphan notes`, `stale notes`
- Chinese: `体检`, `巡检`, `断链`, `孤儿笔记`, `陈旧文档`

## Output Contract

All skills should output concise markdown with stable sections.

### Shared header

- Always include:
  - `## Scope`
  - `## Findings`
  - `## Next Actions`

### evidence-qa section contract

- Required section order:
  1. `## Conclusion`
  2. `## Evidence`
  3. `## Sources`
  4. `## Confidence`
- `## Sources` must include clickable links:
  - Prefer `[[path/to/file]]`
  - Or markdown links like `[file](path/to/file.md)`

### kb-health-audit section contract

- Required section order:
  1. `## Summary`
  2. `## Findings`
  3. `## Priority Actions`
- `## Findings` should use categories:
  - `Broken Links`
  - `Orphan Notes`
  - `Potential Duplicates`
  - `Stale Notes`

## Failure and Fallback Rules

- If evidence is insufficient:
  - State uncertainty explicitly.
  - Never present assumptions as facts.
  - Ask for minimal additional context needed.
- If vault context is unavailable:
  - Return a clear limitation note.
  - Provide a short checklist to gather required context.

## Terminology

- Use `note` for markdown documents.
- Use `source` for cited notes.
- Use `finding` for detected issue.
- Use `priority` with only: `high`, `medium`, `low`.

## Safety and Edit Boundaries

- Skills should default to analysis and recommendations.
- Any destructive or bulk edit suggestion must be explicit and reversible.
- Prefer "preview before apply" language for refactor proposals.
