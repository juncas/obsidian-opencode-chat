# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Custom workflow templates
- Multi-vault configuration sync
- Plugin settings UI enhancements
- Custom model configuration support
- Writing statistics panel
- Knowledge graph visualization
- Batch operations support

---

## [1.0.0] - 2026-02-19

### Added

#### Core Features
- OpenCode HTTP Server integration with SSE event streaming
- Multi-session management with SessionManager
- Real-time streaming response rendering (text.delta events)
- Message history persistence to data.json
- Basic UI components: ChatInput, MessageContainer, SessionTabs

#### Writing Workflow (Six Stages)
- Discover stage - Research and context gathering
- Outline stage - Evidence-linked outline creation
- Draft stage - Writing with citation tracking
- Evidence stage - Citation coverage evaluation
- Polish stage - Style and tone refinement
- Publish stage - Frontmatter and tag suggestions
- Draft version snapshot system with automatic capture

#### Knowledge Base Tools
- KB Health Audit (`/kb audit`) - Broken links and orphan detection
- Citation Quality Service - Citation coverage metrics
- Evidence QA (`/qa`) - Answer with reference citations
- Evidence-qa skill for OpenCode
- KB health audit skill for OpenCode

#### Export Functionality
- Markdown export (Ctrl+Shift+E)
- WeChat HTML export with 5 style templates
- WeChat preview view
- Style selection modal

#### Publish Assistant
- Tag taxonomy analysis
- Folder structure scanning (2 levels)
- YAML frontmatter auto-generation
- Repository metadata collection

### Changed
- Port auto-fallback mechanism (14000 → 14004) for conflict handling
- SSE reconnection logic with max 5 retries
- Context resolution with priority: active file > mentions > selection > recent > search

### Fixed
- OpenCode CLI path detection (augmented PATH with ~/.opencode/bin)
- Image path handling in WeChat export (absolute path / base64 embedding)
- Tag deduplication logic (unify # prefix removal)
- Orphan note false positives (use Obsidian API for link parsing)
- Draft version duplicate capture (content comparison before snapshot)

---

## [0.2.0] - 2026-02-15

### Added
- Citation Quality Service with coverage metrics
- Knowledge Base audit functionality
- Evidence QA skill
- KB Health Audit skill

### Changed
- Improved claim detection confidence scoring
- Switched to Obsidian API for link parsing

---

## [0.1.0] - 2026-02-13

### Added
- Multi-session management
- Six-stage Writing Workflow
- Context resolution with @mention syntax
- Draft version management
- Writing task panel UI

### Changed
- Stage navigation allows skipping with full history tracking

---

## [0.0.1] - 2026-02-10

### Added
- Initial release
- OpenCode HTTP Server bridge
- Basic chat interface
- Stream response rendering
- Message persistence
- Session management (single session)

### Technical Foundation
- TypeScript strict mode
- ESLint configuration
- esbuild build system
- Obsidian plugin scaffold

---

## Version History Summary

| Version | Date | Sprint | Key Features |
|---------|------|--------|--------------|
| 1.0.0 | 2026-02-19 | Sprint 1-5 | Full feature release |
| 0.2.0 | 2026-02-15 | Sprint 3 | KB audit + Citation quality |
| 0.1.0 | 2026-02-13 | Sprint 2 | Multi-session + Writing workflow |
| 0.0.1 | 2026-02-10 | Sprint 1 | Initial release |

---

## Sprint Mapping

### Sprint 1 - Basic Chat (2026-02-08 ~ 2026-02-10)
- OpenCode Server integration
- Basic session management
- Streaming response rendering
- Message history persistence

### Sprint 2 - Multi-Session & Writing Workflow (2026-02-10 ~ 2026-02-13)
- Multi-session management
- Six-stage writing workflow
- Context bundling with @mentions
- Draft version snapshots

### Sprint 3 - KB Audit & Citation Quality (2026-02-13 ~ 2026-02-15)
- Knowledge Base health audit
- Citation coverage evaluation
- Evidence QA skill

### Sprint 4 - WeChat Export & Publish Assistant (2026-02-15 ~ 2026-02-17)
- WeChat HTML export with 5 style templates
- Publish assistant with tag analysis
- YAML frontmatter generation

### Sprint 5 - Documentation & Developer Experience (2026-02-17 ~ 2026-02-19)
- Complete documentation suite
- AI Agent development guide
- Developer experience improvements

---

*Last updated: 2026-02-19*
