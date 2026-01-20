# Obsidian Community Plugin Submission Guide

This document provides the necessary information and steps to submit this plugin to the Obsidian community plugins repository.

## Pre-submission Checklist

Before submitting your plugin, ensure the following requirements are met:

- [x] Plugin repository is public on GitHub
- [x] Contains `main.js` (compiled plugin code)
- [x] Contains `manifest.json` with correct metadata
- [x] Contains `README.md` describing the plugin
- [x] Contains `LICENSE` file (MIT License)
- [x] Contains `styles.css` for custom styles
- [x] GitHub Issues are enabled
- [x] Release workflow is configured (`.github/workflows/release.yml`)

## Step 1: Create a GitHub Release

1. Ensure the version in `manifest.json` is correct (currently `1.0.0`)
2. Create a git tag matching the version:
   ```bash
   git tag 1.0.0
   git push origin 1.0.0
   ```
3. The GitHub Actions workflow will automatically create a release with:
   - `main.js`
   - `manifest.json`
   - `styles.css`

## Step 2: Fork the obsidian-releases Repository

1. Go to https://github.com/obsidianmd/obsidian-releases
2. Click "Fork" to create your own copy
3. Clone your fork locally or use GitHub's web editor

## Step 3: Add Plugin Entry to community-plugins.json

Add the following JSON entry at the **end** of the `community-plugins.json` array (before the closing `]`):

```json
{
  "id": "claude-chat-obsidian",
  "name": "Claude Chat",
  "author": "juncas",
  "description": "A native chat interface for Claude Code CLI in Obsidian. Supports multi-session conversations, streaming responses, message editing, and markdown export.",
  "repo": "juncas/obsidian-claude-chat"
}
```

> **Note:** Make sure to add a comma after the previous entry in the JSON array.

## Step 4: Create the Pull Request

1. Commit your changes to a new branch (e.g., `add-claude-chat-plugin`)
2. Push to your fork
3. Open a Pull Request to `obsidianmd/obsidian-releases`
4. Use the following PR title format: `Add plugin: Claude Chat`
5. Fill out the PR template with the required information

## PR Description Template

Use this template when creating the Pull Request:

```markdown
## Plugin Submission

**Plugin Name:** Claude Chat
**Plugin ID:** claude-chat-obsidian
**Repository:** https://github.com/juncas/obsidian-claude-chat

### Description

A native chat interface for Claude Code CLI in Obsidian. This plugin brings the power of Claude's AI assistant directly into your Obsidian workspace with a clean, integrated interface.

### Features

- **Multi-Session Conversations:** Create and manage multiple chat sessions simultaneously
- **Streaming Responses:** Watch Claude's responses stream in real-time
- **Message Editing:** Edit your messages and regenerate responses
- **Markdown Rendering:** Full markdown support with syntax highlighting
- **Export Conversations:** Export your chats to markdown files
- **Session Management:** Rename, delete, and switch between sessions easily

### Requirements

- Obsidian v0.15.0 or higher
- Claude Code CLI installed on the system
- Desktop only (uses Node.js child processes)

### Checklist

- [x] Repository is public
- [x] Plugin has a valid `manifest.json`
- [x] Plugin has a `README.md`
- [x] Plugin has a `LICENSE` file
- [x] Plugin has at least one release with `main.js`, `manifest.json`, and `styles.css` attached
- [x] Plugin follows the [plugin submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
```

## Plugin Manifest Details

The current `manifest.json` contains:

| Field         | Value |
|---------------|-------|
| id | `claude-chat-obsidian` |
| name | `Claude Chat` |
| version | `1.0.0` |
| minAppVersion | `0.15.0` |
| description | A native chat interface for Claude Code CLI in Obsidian. Supports multi-session conversations, streaming responses, message editing, and markdown export. |
| author | `juncas` |
| authorUrl | `https://github.com/juncas` |
| isDesktopOnly | `true` |

## Important Links

- [Obsidian Plugin Submission Guide](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Plugin Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Obsidian Releases Repository](https://github.com/obsidianmd/obsidian-releases)
- [Community Plugins JSON](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json)

## After Submission

1. Wait for the Obsidian team to review your submission
2. Address any feedback or required changes
3. Once merged, your plugin will appear in the Community Plugins browser within 24-48 hours
