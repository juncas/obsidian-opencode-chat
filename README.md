# OpenCode Chat for Obsidian

Native OpenCode chat inside Obsidian with multi-session support, streaming output, tool/diff visibility, and inline permission/question handling.

## Agent-First Quick Reference

| Key | Value |
| --- | --- |
| Plugin name | `OpenCode Chat` |
| Plugin ID | `claude-chat-obsidian` |
| Entry source | `src/main.ts` |
| Build output | `main.js` |
| Required install artifacts | `manifest.json`, `main.js`, `styles.css`, `opencode-skills/` |
| Min Obsidian version | `0.15.0` |
| Desktop only | `true` |
| Runtime dependency | `opencode` CLI (`opencode serve`) |
| Persisted data | `<vault>/.obsidian/plugins/claude-chat-obsidian/data.json` |
| Build command | `npm run build` |
| Dev watch command | `npm run dev` |

For fully scripted build/install steps, see [`instruction.md`](./instruction.md).

## Current Capabilities

- Multi-session conversations with persisted session metadata.
- Streaming assistant text from OpenCode server events.
- Inline rendering for:
  - tool calls and tool outputs,
  - file diffs,
  - permission prompts,
  - multiple-choice questions.
- Message editing and regeneration.
- `@` file mention with vault file autocomplete.
- Markdown rendering and export-to-markdown.
- Bundled OpenCode skills auto-synced into vault-level skills directory at startup.

## Runtime Architecture (Updated)

This plugin now uses OpenCode HTTP server mode instead of direct one-shot CLI execution:

1. On plugin load, start local server:
   - `opencode serve --port 14000` (fallback tries more ports).
2. Connect to SSE stream from `GET /event`.
3. Create/reuse OpenCode sessions via HTTP APIs.
4. Send prompts with `POST /session/:id/prompt_async`.
5. Render incoming event stream (`text`, `tool`, `diff`, `permission`, `question`, `step`).

Key implementation files:

- `src/services/OpenCodeServer.ts` - server process + HTTP + SSE bridge.
- `src/views/OpenCodeChatView.ts` - main chat workflow and event wiring.
- `src/ui/ToolCallView.ts` - tool call visualization.
- `src/ui/FileDiffView.ts` - inline file diff rendering.
- `src/ui/PermissionDialog.ts` - permission approval UI.
- `src/ui/QuestionDialog.ts` - question/answer UI.

## Prerequisites

Install OpenCode CLI first:

```bash
curl -fsSL https://opencode.ai/install | bash
opencode --version
```

If Obsidian cannot find `opencode`, ensure `~/.opencode/bin` is in `PATH`:

```bash
export PATH="$HOME/.opencode/bin:$PATH"
```

## Installation

### Method A: Install from Release

1. Download latest package from [Releases](https://github.com/juncas/obsidian-opencode-chat/releases).
2. Extract into `<vault>/.obsidian/plugins/claude-chat-obsidian/`.
3. Ensure files exist:
   - `manifest.json`
   - `main.js`
   - `styles.css`
   - `opencode-skills/`
4. Restart Obsidian and enable `OpenCode Chat`.

### Method B: Build from Source (Recommended for Development/Agents)

```bash
git clone https://github.com/juncas/obsidian-opencode-chat.git
cd obsidian-opencode-chat
npm ci
npm run build
```

Copy build artifacts into your vault plugin directory:

```bash
VAULT_PATH="/absolute/path/to/your/vault"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/claude-chat-obsidian"

mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json styles.css "$PLUGIN_DIR/"
mkdir -p "$PLUGIN_DIR/opencode-skills"
cp -R opencode-skills/. "$PLUGIN_DIR/opencode-skills/"
```

Then restart Obsidian and enable the plugin.

## Skills

Bundled skills live in:

```text
opencode-skills/
  evidence-qa/
    SKILL.md
  kb-health-audit/
    SKILL.md
```

On plugin startup, these bundled skills are copied to:

```text
<vault>/.opencode/skills/<skill-name>/SKILL.md
```

This allows OpenCode to discover and use the skills without manual copying.

## Usage

Open the chat panel by either:

- command palette: `Open OpenCode Chat`
- ribbon icon
- custom hotkey

Common actions:

- `Enter` send message, `Shift+Enter` new line.
- Type `@` to insert vault files.
- `Escape` stop generation.
- `Ctrl/Cmd + Shift + N` new session.
- `Ctrl/Cmd + K` clear history.
- `Ctrl/Cmd + L` focus input.
- `Ctrl/Cmd + Shift + E` export conversation.

## Development

### Scripts

```bash
npm run dev      # esbuild watch mode
npm run build    # type-check + production bundle
npm run lint
npm run lint:fix
```

### Project Layout

```text
src/
  main.ts
  services/
    OpenCodeServer.ts
    SessionManager.ts
  types/
    index.ts
    opencode.ts
  ui/
    ChatHeader.ts
    ChatInput.ts
    FileDiffView.ts
    MessageContainer.ts
    PermissionDialog.ts
    QuestionDialog.ts
    SessionTabs.ts
    ToolCallView.ts
  views/
    OpenCodeChatView.ts
opencode-skills/
manifest.json
styles.css
main.js
```

## Troubleshooting

### "OpenCode CLI not found"

```bash
opencode --version
```

If not found, reinstall:

```bash
curl -fsSL https://opencode.ai/install | bash
```

Then fully restart Obsidian.

### Chat view opens but no response

Check:

1. OpenCode server can run in your vault path.
2. Obsidian developer console (`Ctrl/Cmd + Shift + I`) for plugin errors.
3. Plugin files are installed under the correct plugin ID directory.

### Skills not loaded

Check both paths:

- `<vault>/.obsidian/plugins/claude-chat-obsidian/opencode-skills/`
- `<vault>/.opencode/skills/`

If needed, restart Obsidian to trigger startup sync again.

## License

MIT. See [`LICENSE`](./LICENSE).
