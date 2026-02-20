import { Plugin, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { OpenCodeChatView } from './views/OpenCodeChatView';
import { WeChatPreviewView } from './views/WeChatPreviewView';
import { OPENCODE_CHAT_VIEW_TYPE, WECHAT_EXPORT_PREVIEW_VIEW_TYPE, OpenCodePluginData, Session, OpenCodePluginSettings } from './types';
import { SessionManager } from './services/SessionManager';
import { OpenCodeServer } from './services/OpenCodeServer';
import { SettingsTab } from './ui/SettingsTab';

const DEFAULT_SETTINGS: OpenCodePluginSettings = {
    opencodeModel: '',
    ohMyOpencodeModel: '',
    enableOhMyOpencode: true,
};

export default class OpenCodeChatPlugin extends Plugin {
    data: OpenCodePluginData = {
        sessionId: null, // Deprecated: kept for backward compatibility
        version: '1.0.0',
        sessions: [],
        currentSessionId: null,
    };

    settings: OpenCodePluginSettings = DEFAULT_SETTINGS;
    sessionManager: SessionManager = new SessionManager();
    server: OpenCodeServer | null = null;

    async onload() {
        await this.loadPluginData();
        await this.loadSettings();

        this.syncBundledSkillsToVault();

        const vaultPath = this.getVaultPath();
        this.server = OpenCodeServer.getInstance(vaultPath);
        
        this.server.setModels(this.settings.opencodeModel, this.settings.ohMyOpencodeModel, this.settings.enableOhMyOpencode);

        this.server.start().then(() => {
            console.log('OpenCodeChat: Server started on port', this.server?.serverPort);
        }).catch((e) => {
            console.error('OpenCodeChat: Failed to start OpenCode server:', e);
        });

        this.addSettingTab(new SettingsTab(this.app, this));

        this.registerView(
            OPENCODE_CHAT_VIEW_TYPE,
            (leaf) => new OpenCodeChatView(leaf, this)
        );

        this.registerView(
            WECHAT_EXPORT_PREVIEW_VIEW_TYPE,
            (leaf) => new WeChatPreviewView(leaf)
        );

        // Add ribbon icon to toggle the view
        this.addRibbonIcon('message-square', 'Open OpenCode Chat', () => {
            this.activateView();
        });

        // Add ribbon icon for WeChat export preview
        this.addRibbonIcon('file-output', 'Open WeChat Export Preview', () => {
            this.activateWeChatPreview();
        });

        // Add command to open the chat
        this.addCommand({
            id: 'open-claude-chat',
            name: 'Open OpenCode Chat',
            callback: () => this.activateView(),
        });

        // Add command to clear chat history
        this.addCommand({
            id: 'claude-chat-clear-history',
            name: 'Clear chat history',
            hotkeys: [{ modifiers: ['Mod'], key: 'k' }],
            callback: () => this.clearChatHistory(),
        });

        // Add command to focus input
        this.addCommand({
            id: 'claude-chat-focus-input',
            name: 'Focus chat input',
            hotkeys: [{ modifiers: ['Mod'], key: 'l' }],
            callback: () => this.focusInput(),
        });

        // Add command to stop generation
        this.addCommand({
            id: 'claude-chat-stop',
            name: 'Stop generation',
            hotkeys: [{ modifiers: [], key: 'Escape' }],
            callback: () => this.stopGeneration(),
        });

        // Add command to start new session
        this.addCommand({
            id: 'claude-chat-new-session',
            name: 'Start new session',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'n' }],
            callback: () => this.startNewSession(),
        });

        // Add command to export conversation
        this.addCommand({
            id: 'claude-chat-export',
            name: 'Export conversation to Markdown',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'e' }],
            callback: () => this.exportConversation(),
        });

        // Add command to open WeChat export preview
        this.addCommand({
            id: 'wechat-export-preview',
            name: 'Open WeChat Export Preview',
            callback: () => this.activateWeChatPreview(),
        });

        // Add command to clear diff highlights
        this.addCommand({
            id: 'clear-diff-highlights',
            name: 'Clear all diff highlights in editor',
            callback: () => {
                const leaf = this.app.workspace.getLeavesOfType(OPENCODE_CHAT_VIEW_TYPE)[0];
                if (leaf) {
                    const view = leaf.view as any;
                    if (view.clearDiffHighlights) {
                        view.clearDiffHighlights();
                    }
                }
            },
        });

        // Add file menu action for WeChat export preview
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file: TFile) => {
                if (file.extension === 'md') {
                    menu.addItem((item) => {
                        item
                            .setTitle('WeChat Export Preview')
                            .setIcon('file-output')
                            .onClick(() => this.openWeChatPreviewForFile(file));
                    });
                }
            })
        );
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async reloadServer(): Promise<void> {
        if (!this.server) {
            return;
        }
        this.server.setModels(this.settings.opencodeModel, this.settings.ohMyOpencodeModel, this.settings.enableOhMyOpencode);
        await this.server.restart();
    }

    async activateView() {
        const { workspace } = this.app;

        // Check if view already exists
        const existingLeaf = workspace.getLeavesOfType(OPENCODE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            workspace.revealLeaf(existingLeaf);
        } else {
            // Create new leaf in right sidebar
            const leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                type: OPENCODE_CHAT_VIEW_TYPE,
                active: true,
            });
            }
        }
    }

    async activateWeChatPreview() {
        const { workspace } = this.app;
        const activeFile = workspace.getActiveFile();

        if (!activeFile) {
            new Notice('No active file to preview');
            return;
        }

        // Check if view already exists
        let existingLeaf = workspace.getLeavesOfType(WECHAT_EXPORT_PREVIEW_VIEW_TYPE)[0];

        if (existingLeaf) {
            workspace.revealLeaf(existingLeaf);
            const view = existingLeaf.view as WeChatPreviewView;
            await view.setFile(activeFile);
        } else {
            // Create new leaf in right sidebar
            const leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: WECHAT_EXPORT_PREVIEW_VIEW_TYPE,
                    active: true,
                });
                const view = leaf.view as WeChatPreviewView;
                await view.setFile(activeFile);
            }
        }
    }

    async openWeChatPreviewForFile(file: TFile) {
        const { workspace } = this.app;

        // Check if view already exists
        let existingLeaf = workspace.getLeavesOfType(WECHAT_EXPORT_PREVIEW_VIEW_TYPE)[0];

        if (existingLeaf) {
            workspace.revealLeaf(existingLeaf);
            const view = existingLeaf.view as WeChatPreviewView;
            await view.setFile(file);
        } else {
            // Create new leaf in right sidebar
            const leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: WECHAT_EXPORT_PREVIEW_VIEW_TYPE,
                    active: true,
                });
                const view = leaf.view as WeChatPreviewView;
                await view.setFile(file);
            }
        }
    }

    onunload() {
        if (this.server) {
            this.server.stop();
            this.server = null;
        }
    }

    /**
     * Load plugin data from disk
     */
    async loadPluginData() {
        const savedData = await this.loadData();
        if (savedData) {
            this.data = savedData as OpenCodePluginData;

            // Handle migration from old data format
            if (!this.data.sessions || this.data.sessions.length === 0) {
                // Migrate old sessionId to new session format
                const migratedSession: Session = {
                    id: 'session-migrated',
                    name: 'Migrated Session',
                    sessionId: this.data.sessionId,
                    serverSessionId: null,
                    writingTask: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    messages: [],
                };
                this.data.sessions = [migratedSession];
                this.data.currentSessionId = migratedSession.id;
            }

            // Load sessions into SessionManager
            this.sessionManager.loadSessions(this.data.sessions, this.data.currentSessionId);

            // Set up auto-save when sessions change
            this.sessionManager.onChange(() => {
                this.saveSessions();
            });

            console.log('OpenCodeChat: Loaded data, sessions:', this.data.sessions.length);
        } else {
            console.log('OpenCodeChat: No saved data found, starting fresh');

            // Set up auto-save when sessions change
            this.sessionManager.onChange(() => {
                this.saveSessions();
            });
        }
    }

    /**
     * Save sessions to plugin data and persist to disk
     */
    async saveSessions() {
        const exported = this.sessionManager.exportForSave();
        this.data.sessions = exported.sessions;
        this.data.currentSessionId = exported.currentSessionId;
        await this.saveData(this.data);
    }

    /**
     * Update the OpenCode CLI session ID (called from view)
     */
    async updateSessionId(sessionId: string | null) {
        this.sessionManager.updateCliSessionId(sessionId);
    }

    /**
     * Get the current OpenCode CLI session ID
     */
    getSessionId(): string | null {
        return this.sessionManager.getCurrentCliSessionId();
    }

    /**
     * Clear chat history
     */
    clearChatHistory() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(OPENCODE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.clearHistory) {
                view.clearHistory();
            }
        }
    }

    /**
     * Focus input field
     */
    focusInput() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(OPENCODE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.focusInput) {
                view.focusInput();
            }
        }
    }

    /**
     * Stop current generation
     */
    stopGeneration() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(OPENCODE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.handleStop) {
                view.handleStop();
            }
        }
    }

    /**
     * Start a new session (creates a new conversation session)
     */
    startNewSession() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(OPENCODE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.handleClearContext) {
                view.handleClearContext();
            }
        }
    }

    /**
     * Export conversation to Markdown
     */
    async exportConversation() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(OPENCODE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.exportConversation) {
                await view.exportConversation();
            }
        }
    }

    private getVaultPath(): string {
        return (this.app.vault.adapter as any).basePath || '';
    }

    private syncBundledSkillsToVault(): void {
        const vaultPath = this.getVaultPath();
        if (!vaultPath) {
            return;
        }

        const pluginRoot = join(vaultPath, '.obsidian', 'plugins', this.manifest.id);
        const sourceRoot = join(pluginRoot, 'opencode-skills');
        if (!existsSync(sourceRoot)) {
            return;
        }

        const targetRoot = join(vaultPath, '.opencode', 'skills');
        mkdirSync(targetRoot, { recursive: true });

        const entries = readdirSync(sourceRoot, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }

            const skillSourceDir = join(sourceRoot, entry.name);
            const skillMarker = join(skillSourceDir, 'SKILL.md');
            if (!existsSync(skillMarker)) {
                continue;
            }

            const skillTargetDir = join(targetRoot, entry.name);
            this.copyDirectoryRecursive(skillSourceDir, skillTargetDir);
        }
    }

    private copyDirectoryRecursive(sourceDir: string, targetDir: string): void {
        mkdirSync(targetDir, { recursive: true });
        const entries = readdirSync(sourceDir, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = join(sourceDir, entry.name);
            const targetPath = join(targetDir, entry.name);

            if (entry.isDirectory()) {
                this.copyDirectoryRecursive(sourcePath, targetPath);
                continue;
            }

            if (entry.isFile()) {
                copyFileSync(sourcePath, targetPath);
            }
        }
    }
}
