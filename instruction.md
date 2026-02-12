# Build and Install Instructions for AI Agents

This document is a deterministic runbook for compiling and installing this plugin into an Obsidian vault.

## Scope

- Build plugin from repository source.
- Install plugin files into a target vault.
- Verify installation artifacts.
- Avoid touching user conversation data unless explicitly requested.

## Required Inputs

- `REPO_PATH`: absolute path to this repository.
- `VAULT_PATH`: absolute path to target Obsidian vault root.

The vault root must contain `.obsidian/`.

## Constants

- `PLUGIN_ID=claude-chat-obsidian`
- Required build/install artifacts:
  - `main.js`
  - `manifest.json`
  - `styles.css`
  - `opencode-skills/`

## Preflight Checks

1. Ensure OpenCode CLI exists:
   - `opencode --version`
2. Ensure vault path is valid:
   - `<VAULT_PATH>/.obsidian` exists.
3. Ensure repository path is valid:
   - `<REPO_PATH>/package.json` exists.

## One-Shot Build + Install Script

Run from any shell (macOS/Linux):

```bash
set -euo pipefail

REPO_PATH="/absolute/path/to/obsidian-claude-chat"
VAULT_PATH="/absolute/path/to/your/vault"
PLUGIN_ID="claude-chat-obsidian"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"

test -f "$REPO_PATH/package.json"
test -d "$VAULT_PATH/.obsidian"
opencode --version >/dev/null

cd "$REPO_PATH"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build

test -f "$REPO_PATH/main.js"
test -f "$REPO_PATH/manifest.json"
test -f "$REPO_PATH/styles.css"
test -d "$REPO_PATH/opencode-skills"

mkdir -p "$PLUGIN_DIR"
cp "$REPO_PATH/main.js" "$PLUGIN_DIR/main.js"
cp "$REPO_PATH/manifest.json" "$PLUGIN_DIR/manifest.json"
cp "$REPO_PATH/styles.css" "$PLUGIN_DIR/styles.css"
mkdir -p "$PLUGIN_DIR/opencode-skills"
cp -R "$REPO_PATH/opencode-skills/." "$PLUGIN_DIR/opencode-skills/"

echo "Installed to: $PLUGIN_DIR"
ls -la "$PLUGIN_DIR"
```

## Post-Install Verification

After script finishes, verify:

1. `<VAULT_PATH>/.obsidian/plugins/claude-chat-obsidian/main.js` exists.
2. `<VAULT_PATH>/.obsidian/plugins/claude-chat-obsidian/manifest.json` exists.
3. `<VAULT_PATH>/.obsidian/plugins/claude-chat-obsidian/styles.css` exists.
4. `<VAULT_PATH>/.obsidian/plugins/claude-chat-obsidian/opencode-skills/` exists.

Then in Obsidian:

1. Reload/restart Obsidian.
2. Enable community plugin `OpenCode Chat`.
3. Open command palette and run `Open OpenCode Chat`.

## Notes on Skills

This plugin syncs bundled skills on startup:

- Source: `<vault>/.obsidian/plugins/claude-chat-obsidian/opencode-skills/*`
- Target: `<vault>/.opencode/skills/*`

If skills are missing in target directory, restart Obsidian once to trigger sync.

## Safe Operation Rules

- Do not modify plugin ID directory name.
- Do not delete `<vault>/.obsidian/plugins/claude-chat-obsidian/data.json` unless explicitly requested.
- Do not run destructive git commands in repository during install operations.
