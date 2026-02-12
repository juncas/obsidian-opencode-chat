---
name: kb-health-audit
description: Audits vault knowledge quality and outputs actionable health reports. Use when the user asks for health checks, audits, broken links, orphan notes, duplicates, stale notes, or 体检/巡检.
---

# Knowledge Base Health Audit

Use this skill to generate structured, actionable health reports for the vault.

## Audit Dimensions

Evaluate these categories:

1. Broken Links
2. Orphan Notes
3. Potential Duplicates
4. Stale Notes

## Subtask Modes

If user asks for a single dimension, run only that subset:

- `orphan` -> Orphan Notes only
- `broken` -> Broken Links only
- `duplicate` -> Potential Duplicates only
- `stale` -> Stale Notes only

If no mode is specified, run full audit.

## Severity Rules

Use only these priorities:

- `high`: likely to break navigation or critical workflows
- `medium`: causes confusion or maintenance cost
- `low`: quality issue with limited immediate impact

## Workflow

1. Determine audit scope (full or subtask mode).
2. Collect findings by category.
3. Prioritize findings with high/medium/low.
4. Propose concrete next actions.
5. Keep output concise and directly actionable.

## Output Template

Use this structure exactly:

```markdown
## Summary
- Scope: full | orphan | broken | duplicate | stale
- Total findings: <number>
- High priority: <number>

## Findings
### Broken Links
- <finding>

### Orphan Notes
- <finding>

### Potential Duplicates
- <finding>

### Stale Notes
- <finding>

## Priority Actions
1. [high] <action>
2. [medium] <action>
3. [low] <action>
```

## Finding Format

For each finding, prefer:

- `Issue`: what is wrong
- `Impact`: why it matters
- `Fix`: the shortest safe remediation

Example line:

- `Issue`: `[[Projects/roadmap]]` has 6 unresolved links | `Impact`: users cannot navigate dependent notes | `Fix`: create missing notes or update link targets.

## Guardrails

- Do not claim exact counts when data is unavailable.
- If unable to scan a category, state limitation explicitly.
- Prioritize "quick wins" first in `Priority Actions`.

## Example: Full Audit

```markdown
## Summary
- Scope: full
- Total findings: 18
- High priority: 4

## Findings
### Broken Links
- Issue: `[[Architecture/API-Gateway]]` unresolved in 3 notes | Impact: core architecture docs are fragmented | Fix: create target note or update link aliases.

### Orphan Notes
- Issue: `Notes/meeting-2024-11-02.md` has no in-links | Impact: knowledge is hard to discover | Fix: add links from weekly summary and project index.

### Potential Duplicates
- Issue: `Release-Checklist.md` and `Release Checklist.md` overlap strongly | Impact: maintenance divergence risk | Fix: merge into one canonical note.

### Stale Notes
- Issue: `Runbook/legacy-deploy.md` not updated for 420 days | Impact: operational guidance may be outdated | Fix: review and archive or refresh.

## Priority Actions
1. [high] Resolve broken links under architecture and runbook sections first.
2. [medium] Merge duplicate checklists and keep one canonical page.
3. [low] Triage stale personal notes older than 180 days.
```

## Example: Broken-Only Audit

```markdown
## Summary
- Scope: broken
- Total findings: 7
- High priority: 2

## Findings
### Broken Links
- Issue: `[[Guides/Onboarding]]` unresolved in `[[README]]` | Impact: new users lose entry path | Fix: restore target file or update path.

## Priority Actions
1. [high] Fix broken links in landing pages first.
2. [medium] Resolve remaining unresolved links in project folders.
3. [low] Add a periodic link check routine.
```

## Additional Resources

- Shared standards: [../SKILL-STANDARDS.md](../SKILL-STANDARDS.md)
