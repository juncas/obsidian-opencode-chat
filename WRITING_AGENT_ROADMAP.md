# Writing Agent Roadmap

This roadmap upgrades OpenCode Chat from a chat panel into a writing and knowledge-base management center.

## Sprint 1 (Completed in this iteration)

- Add workflow command router inside chat view:
  - `/write start|outline|draft|evidence|polish|publish`
  - `/kb audit [full|broken|orphan|duplicate|stale]`
  - `/qa <question>`
- Add context bundling service:
  - active file
  - editor selection
  - `@` mentioned files
  - recently updated notes
- Add writing workflow service:
  - task lifecycle in memory
  - stage-specific prompt contracts
  - evidence and audit prompt templates
- Add quick workflow action buttons to the chat UI.

## Sprint 2 (Next)

- Add persistent task state per session:
  - task metadata in session data
  - resume and history of stage transitions
- Add writing workspace panel:
  - current objective, stage, target length, audience
  - one-click stage switch
- Add citation quality checks:
  - uncited-claim detector
  - source coverage summary

## Sprint 3

- Add draft version management:
  - save snapshots of generated drafts
  - diff between versions
  - rollback to a selected draft
- Add publish assistant:
  - frontmatter suggestions
  - title, summary, tag generation
  - output path suggestions

## Sprint 4

- Add knowledge base maintenance automation:
  - scheduled health checks
  - report note generation
  - quick-fix recommendations for broken links/orphans/duplicates
- Add optional semantic retrieval plugin point:
  - relevance ranking for context files
  - confidence-aware retrieval fallback

## Engineering Rules

- Every writing stage output must include explicit source references.
- Missing evidence must be marked, never fabricated.
- All workflow commands should remain composable with normal chat input.
