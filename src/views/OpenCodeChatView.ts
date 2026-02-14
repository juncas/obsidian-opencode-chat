import { ItemView, WorkspaceLeaf } from 'obsidian';
import OpenCodeChatPlugin from '../main';
import { CitationCoverageReport, CitationQualityService } from '../services/CitationQualityService';
import { ContextResolver } from '../services/ContextResolver';
import { OpenCodeServer } from '../services/OpenCodeServer';
import { SessionManager } from '../services/SessionManager';
import { WritingWorkflowService } from '../services/WritingWorkflowService';
import { ChatInput } from '../ui/ChatInput';
import { MessageContainer } from '../ui/MessageContainer';
import { SessionTabs } from '../ui/SessionTabs';
import { WritingTaskPanel } from '../ui/WritingTaskPanel';
import { OPENCODE_CHAT_VIEW_TYPE } from '../types';
import type {
    PermissionRequest,
    PermissionRule,
    QuestionRequest,
    SessionStatus,
    StepFinishPart,
    StepStartPart,
    FileDiff,
    ToolPart,
} from '../types/opencode';
import type {
    AuditScope,
    PreparedWorkflowCommand,
    WorkflowExecutionMeta,
    WritingStage,
    WritingTask,
    WritingTaskStatus,
} from '../types/writing';

const ASK_PERMISSIONS: PermissionRule[] = [
    { permission: 'bash', pattern: '*', action: 'ask' },
    { permission: 'write', pattern: '*', action: 'ask' },
    { permission: 'edit', pattern: '*', action: 'ask' },
];

const STAGE_ALIAS: Record<string, WritingStage> = {
    start: 'discover',
    discover: 'discover',
    outline: 'outline',
    draft: 'draft',
    evidence: 'evidence',
    polish: 'polish',
    publish: 'publish',
};

const AUDIT_SCOPES: AuditScope[] = ['full', 'broken', 'orphan', 'duplicate', 'stale'];

export class OpenCodeChatView extends ItemView {
    plugin: OpenCodeChatPlugin;
    sessionManager: SessionManager;
    messageContainer: MessageContainer;
    chatInput: ChatInput;
    sessionTabs: SessionTabs;
    writingTaskPanel: WritingTaskPanel | null = null;
    isProcessing: boolean = false;
    private statusBadgeEl: HTMLElement | null = null;
    private readonly contextResolver: ContextResolver;
    private readonly writingWorkflow: WritingWorkflowService;
    private readonly citationQualityService: CitationQualityService;
    private readonly pendingMetaByServerSessionId: Map<string, WorkflowExecutionMeta> = new Map();
    private readonly citationReportBySessionId: Map<string, CitationCoverageReport> = new Map();

    private boundHandlers: {
        onTextDelta: (sessionID: string, partID: string, delta: string, fullText: string) => void;
        onSessionIdle: (sessionID: string) => void;
        onSessionStatus: (sessionID: string, status: SessionStatus) => void;
        onSessionError: (sessionID: string | undefined, error: { message: string; code?: string } | undefined) => void;
        onToolUpdated: (sessionID: string, part: ToolPart) => void;
        onDiffUpdated: (sessionID: string, diffs: FileDiff[]) => void;
        onPermissionAsked: (request: PermissionRequest) => void;
        onQuestionAsked: (request: QuestionRequest) => void;
        onStepStart: (sessionID: string, part: StepStartPart) => void;
        onStepFinish: (sessionID: string, part: StepFinishPart) => void;
        onConnected: () => void;
        onDisconnected: () => void;
        onError: (error: Error) => void;
    };

    constructor(leaf: WorkspaceLeaf, plugin: OpenCodeChatPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.sessionManager = plugin.sessionManager;
        this.contextResolver = new ContextResolver(plugin.app);
        this.writingWorkflow = new WritingWorkflowService();
        this.citationQualityService = new CitationQualityService();

        this.boundHandlers = {
            onTextDelta: this.handleTextDelta.bind(this),
            onSessionIdle: this.handleSessionIdle.bind(this),
            onSessionStatus: this.handleSessionStatus.bind(this),
            onSessionError: this.handleSessionError.bind(this),
            onToolUpdated: this.handleToolUpdated.bind(this),
            onDiffUpdated: this.handleDiffUpdated.bind(this),
            onPermissionAsked: this.handlePermissionAsked.bind(this),
            onQuestionAsked: this.handleQuestionAsked.bind(this),
            onStepStart: this.handleStepStart.bind(this),
            onStepFinish: this.handleStepFinish.bind(this),
            onConnected: this.handleConnected.bind(this),
            onDisconnected: this.handleDisconnected.bind(this),
            onError: this.handleError.bind(this),
        };
    }

    getViewType(): string {
        return OPENCODE_CHAT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'OpenCode Chat';
    }

    getIcon(): string {
        return 'message-square';
    }

    private get server(): OpenCodeServer | null {
        return this.plugin.server;
    }

    private get currentServerSessionId(): string | null {
        return this.sessionManager.getCurrentServerSessionId();
    }

    private isCurrentSession(sessionID: string): boolean {
        return this.currentServerSessionId === sessionID;
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('claude-chat-container');

        const mainLayout = container.createEl('div', {
            cls: 'claude-chat-main-layout',
        });

        const contentEl = mainLayout.createEl('div', {
            cls: 'claude-chat-content',
        });

        const tabsContainer = contentEl.createEl('div', {
            cls: 'claude-session-tabs-wrapper',
        });

        this.sessionTabs = new SessionTabs(tabsContainer, {
            onSessionSelect: (sessionId) => this.loadSession(sessionId),
            onNewSession: () => this.createNewSession(),
            onSessionDelete: (sessionId) => this.deleteSession(sessionId),
            onSessionRename: (sessionId, newName) => this.renameSession(sessionId, newName),
        });

        this.updateSessionList();

        this.statusBadgeEl = contentEl.createEl('div', {
            cls: 'claude-server-status claude-server-status-connecting',
        });
        this.statusBadgeEl.setText('Connecting...');

        this.writingTaskPanel = new WritingTaskPanel(contentEl, {
            onStartTask: () => this.queueCommandTemplate('/write start '),
            onRunStage: (stage) => this.queueCommandTemplate(`/write ${stage} `),
            onPauseTask: () => this.updateCurrentWritingTaskStatus('paused'),
            onResumeTask: () => this.updateCurrentWritingTaskStatus('active'),
            onCompleteTask: () => this.updateCurrentWritingTaskStatus('completed'),
            onRollbackDraftVersion: (versionId) => this.rollbackToDraftVersion(versionId),
        });

        this.syncWorkflowTaskFromSession();
        this.refreshWritingTaskPanel();

        this.messageContainer = new MessageContainer(contentEl, this.app);

        this.messageContainer.setOnEditMessage(async (index: number, content: string) => {
            await this.handleEditMessage(index, content);
        });

        this.loadCurrentSessionMessages();

        const inputActionsEl = contentEl.createEl('div', {
            cls: 'claude-chat-input-actions',
        });

        this.createActionButton(inputActionsEl, 'Export', 'Export conversation to Markdown (Ctrl+Shift+E)', () => this.exportConversation());
        this.createActionButton(inputActionsEl, 'Clear', 'Clear chat history (Ctrl+K)', () => this.clearHistory());
        this.createActionButton(inputActionsEl, 'Regenerate', 'Regenerate last response', () => this.regenerateLast());
        this.createActionButton(inputActionsEl, 'Write', 'Create a writing task template', () => this.queueCommandTemplate('/write start '));
        this.createActionButton(inputActionsEl, 'Outline', 'Generate evidence-aware outline', () => this.queueCommandTemplate('/write outline '));
        this.createActionButton(inputActionsEl, 'Draft', 'Generate first draft with citations', () => this.queueCommandTemplate('/write draft '));
        this.createActionButton(inputActionsEl, 'Evidence', 'Run evidence review workflow', () => this.queueCommandTemplate('/write evidence '));
        this.createActionButton(inputActionsEl, 'KB Audit', 'Run knowledge base health audit', () => this.queueCommandTemplate('/kb audit full '));

        this.chatInput = new ChatInput(
            contentEl,
            this.app,
            async (command: string) => {
                await this.handleCommand(command);
            },
            () => {
                this.handleStop();
            }
        );

        this.subscribeToServer();

        if (this.server?.connected) {
            this.updateStatusBadge(true);
        }
    }

    private createActionButton(container: HTMLElement, label: string, tooltip: string, onClick: () => void) {
        const button = container.createEl('button', {
            cls: 'claude-chat-action-button',
        });
        button.textContent = label;
        button.setAttribute('aria-label', tooltip);
        button.setAttribute('title', tooltip);
        button.addEventListener('click', onClick);
    }

    private queueCommandTemplate(template: string): void {
        if (!this.chatInput || this.isProcessing) {
            return;
        }
        this.chatInput.setValue(template);
        this.chatInput.focus();
    }

    private subscribeToServer(): void {
        const server = this.server;
        if (!server) return;

        server.on('text.delta', this.boundHandlers.onTextDelta);
        server.on('session.idle', this.boundHandlers.onSessionIdle);
        server.on('session.status', this.boundHandlers.onSessionStatus);
        server.on('session.error', this.boundHandlers.onSessionError);
        server.on('tool.updated', this.boundHandlers.onToolUpdated);
        server.on('diff.updated', this.boundHandlers.onDiffUpdated);
        server.on('permission.asked', this.boundHandlers.onPermissionAsked);
        server.on('question.asked', this.boundHandlers.onQuestionAsked);
        server.on('step.start', this.boundHandlers.onStepStart);
        server.on('step.finish', this.boundHandlers.onStepFinish);
        server.on('connected', this.boundHandlers.onConnected);
        server.on('disconnected', this.boundHandlers.onDisconnected);
        server.on('error', this.boundHandlers.onError);
    }

    private unsubscribeFromServer(): void {
        const server = this.server;
        if (!server) return;

        server.off('text.delta', this.boundHandlers.onTextDelta);
        server.off('session.idle', this.boundHandlers.onSessionIdle);
        server.off('session.status', this.boundHandlers.onSessionStatus);
        server.off('session.error', this.boundHandlers.onSessionError);
        server.off('tool.updated', this.boundHandlers.onToolUpdated);
        server.off('diff.updated', this.boundHandlers.onDiffUpdated);
        server.off('permission.asked', this.boundHandlers.onPermissionAsked);
        server.off('question.asked', this.boundHandlers.onQuestionAsked);
        server.off('step.start', this.boundHandlers.onStepStart);
        server.off('step.finish', this.boundHandlers.onStepFinish);
        server.off('connected', this.boundHandlers.onConnected);
        server.off('disconnected', this.boundHandlers.onDisconnected);
        server.off('error', this.boundHandlers.onError);
    }

    private handleTextDelta(sessionID: string, _partID: string, delta: string, _fullText: string): void {
        if (!this.isCurrentSession(sessionID)) return;
        this.messageContainer.appendToAssistantMessage(delta);
    }

    private handleSessionIdle(sessionID: string): void {
        const pendingMeta = this.pendingMetaByServerSessionId.get(sessionID);
        this.pendingMetaByServerSessionId.delete(sessionID);
        if (!this.isCurrentSession(sessionID)) return;

        this.messageContainer.finalizeAssistantMessage();

        const messages = this.messageContainer.getMessages();
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            this.sessionManager.addMessage(lastMessage);

            if (pendingMeta?.requiresCitationCheck) {
                const report = this.citationQualityService.evaluate(lastMessage.content);
                this.citationReportBySessionId.set(sessionID, report);
                this.addSystemNotice(this.buildCitationCoverageNotice(report));
            }
        }

        this.updateSessionList();
        this.isProcessing = false;
        this.chatInput.setProcessing(false);
        this.chatInput.focus();
    }

    private handleSessionStatus(sessionID: string, status: SessionStatus): void {
        if (!this.isCurrentSession(sessionID)) return;

        if (status.type === 'busy') {
            this.isProcessing = true;
            this.chatInput.setProcessing(true);
        }
    }

    private handleSessionError(sessionID: string | undefined, error: { message: string; code?: string } | undefined): void {
        if (sessionID) {
            this.pendingMetaByServerSessionId.delete(sessionID);
        }
        if (sessionID && !this.isCurrentSession(sessionID)) return;

        const errorMsg = error?.message || 'Unknown error';
        console.error('OpenCodeChatView: Session error:', errorMsg);

        this.messageContainer.hideThinking();
        this.messageContainer.appendToAssistantMessage(`\n\n**Error:** ${errorMsg}`);
        this.messageContainer.finalizeAssistantMessage();

        const messages = this.messageContainer.getMessages();
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            this.sessionManager.addMessage(lastMessage);
        }

        this.isProcessing = false;
        this.chatInput.setProcessing(false);
    }

    private handleToolUpdated(sessionID: string, part: ToolPart): void {
        if (!this.isCurrentSession(sessionID)) return;
        this.messageContainer.addToolCall(part);
    }

    private handleDiffUpdated(sessionID: string, diffs: FileDiff[]): void {
        if (!this.isCurrentSession(sessionID)) return;
        this.messageContainer.addFileDiffs(sessionID, diffs);
    }

    private handlePermissionAsked(request: PermissionRequest): void {
        if (!this.isCurrentSession(request.sessionID)) return;

        const server = this.server;
        if (!server) return;

        this.messageContainer.addPermissionDialog(request, (response) => {
            server.approvePermission(request.sessionID, request.id, response).catch((err) => {
                console.error('OpenCodeChatView: Failed to reply to permission:', err);
            });
        });
    }

    private handleQuestionAsked(request: QuestionRequest): void {
        if (!this.isCurrentSession(request.sessionID)) return;

        const server = this.server;
        if (!server) return;

        this.messageContainer.addQuestionDialog(
            request,
            (answers) => {
                server.replyToQuestion(request.sessionID, request.id, answers).catch((err) => {
                    console.error('OpenCodeChatView: Failed to reply to question:', err);
                });
            },
            () => {
                server.rejectQuestion(request.id).catch((err) => {
                    console.error('OpenCodeChatView: Failed to reject question:', err);
                });
            }
        );
    }

    private handleStepStart(sessionID: string, part: StepStartPart): void {
        if (!this.isCurrentSession(sessionID)) return;
        this.messageContainer.addStepIndicator(part);
    }

    private handleStepFinish(sessionID: string, part: StepFinishPart): void {
        if (!this.isCurrentSession(sessionID)) return;
        this.messageContainer.addStepIndicator(part);
    }

    private handleConnected(): void {
        this.updateStatusBadge(true);
    }

    private handleDisconnected(): void {
        this.updateStatusBadge(false);
    }

    private handleError(error: Error): void {
        console.error('OpenCodeChatView: Server error:', error);
    }

    private updateStatusBadge(connected: boolean): void {
        if (!this.statusBadgeEl) return;

        this.statusBadgeEl.classList.remove(
            'claude-server-status-connected',
            'claude-server-status-disconnected',
            'claude-server-status-connecting'
        );

        if (connected) {
            this.statusBadgeEl.classList.add('claude-server-status-connected');
            this.statusBadgeEl.setText('Connected');
        } else {
            this.statusBadgeEl.classList.add('claude-server-status-disconnected');
            this.statusBadgeEl.setText('Disconnected');
        }
    }

    private loadCurrentSessionMessages() {
        const messages = this.sessionManager.getCurrentMessages();

        if (messages.length === 0) {
            const welcomeContent = `OpenCode Chat - Enter commands to interact with OpenCode

**Keyboard Shortcuts:**
• \`Ctrl+Shift+N\` - New session
• \`Ctrl+Shift+E\` - Export conversation
• \`Ctrl+K\` - Clear history
• \`Ctrl+L\` - Focus input
• \`↑/↓\` - Browse command history
• \`Shift+Enter\` - New line
• \`Escape\` - Stop generation

**Workflow Commands:**
• \`/write start <topic>\` - Start a writing task discovery
• \`/write outline [requirements]\` - Create source-aware outline
• \`/write draft [requirements]\` - Produce full draft with citations
• \`/write evidence [question]\` - Run evidence QA audit
• \`/kb audit [full|broken|orphan|duplicate|stale]\` - Run KB health audit
• \`/qa <question>\` - Ask source-backed QA in current context

**Tips:**
• Click on user messages to edit and resend
• Hover over messages to copy content
• Type \`@\` in input to reference vault files
• Use the toolbar buttons for quick actions
• Tool calls and permissions will appear inline`;

            this.messageContainer.addMessage({
                role: 'system',
                content: welcomeContent,
                timestamp: new Date(),
            });
        } else {
            for (const message of messages) {
                this.messageContainer.addMessage(message);
            }
        }
    }

    private updateSessionList() {
        this.sessionTabs.updateSessions(
            this.sessionManager.getSessions(),
            this.sessionManager.getCurrentSession()?.id || null
        );
        this.refreshWritingTaskPanel();
    }

    private addSystemNotice(content: string): void {
        this.messageContainer.addMessage({
            role: 'system',
            content,
            timestamp: new Date(),
        });
    }

    private getCurrentSessionKey(): string {
        return this.sessionManager.getCurrentSession()?.id || 'default-session';
    }

    private getCurrentWritingTask(): WritingTask | null {
        return this.sessionManager.getCurrentWritingTask();
    }

    private syncWorkflowTaskFromSession(): void {
        const sessionKey = this.getCurrentSessionKey();
        this.writingWorkflow.hydrateTask(sessionKey, this.getCurrentWritingTask());
    }

    private refreshWritingTaskPanel(): void {
        if (!this.writingTaskPanel) {
            return;
        }

        const sessionId = this.currentServerSessionId || '';
        const report = sessionId ? this.citationReportBySessionId.get(sessionId) || null : null;
        this.writingTaskPanel.update(this.getCurrentWritingTask(), report);
    }

    private updateCurrentWritingTaskStatus(status: WritingTaskStatus): void {
        const task = this.getCurrentWritingTask();
        if (!task) {
            this.addSystemNotice('No active writing task. Use `/write start <topic>` first.');
            this.queueCommandTemplate('/write start ');
            return;
        }

        const nextTask: WritingTask = {
            ...task,
            status,
            updatedAt: new Date(),
        };
        const sessionKey = this.getCurrentSessionKey();
        this.writingWorkflow.hydrateTask(sessionKey, nextTask);
        this.sessionManager.setCurrentWritingTask(nextTask);
        this.refreshWritingTaskPanel();
        this.addSystemNotice(`Writing task status updated to **${status}**.`);
    }

    private rollbackToDraftVersion(versionId: string): void {
        const sessionKey = this.getCurrentSessionKey();
        this.syncWorkflowTaskFromSession();
        const rolledBack = this.writingWorkflow.rollbackToDraftVersion(sessionKey, versionId);
        if (!rolledBack) {
            this.addSystemNotice('Rollback failed: draft version not found.');
            return;
        }

        this.sessionManager.setCurrentWritingTask(rolledBack.task);
        this.refreshWritingTaskPanel();
        this.addSystemNotice(
            `Rolled back to **${rolledBack.version.label}**. Use \`/write ${rolledBack.version.stage}\` to continue from this baseline.`
        );
    }

    private captureDraftVersionFromAssistant(
        stage: WritingStage,
        assistantText: string,
        report: CitationCoverageReport | null
    ): void {
        const sessionKey = this.getCurrentSessionKey();
        this.syncWorkflowTaskFromSession();
        const result = this.writingWorkflow.addDraftVersion(sessionKey, stage, assistantText, {
            citationCoverage: report?.coverage,
            sourceCount: report?.sourceCount,
        });
        if (!result) {
            return;
        }

        this.sessionManager.setCurrentWritingTask(result.task);
        this.refreshWritingTaskPanel();
        if (result.created) {
            this.addSystemNotice(`Saved draft version: **${result.version.label}**`);
        }
    }

    private buildCitationCoverageNotice(report: CitationCoverageReport): string {
        const lines: string[] = [
            '## Citation Coverage Report',
            `- Coverage: ${Math.round(report.coverage * 100)}% (${report.citedClaims}/${report.totalClaims})`,
            `- Sources listed: ${report.sourceCount}`,
        ];

        if (report.totalClaims === 0) {
            lines.push('- No claim lines detected for citation scoring.');
            return lines.join('\n');
        }

        if (report.uncitedClaims.length === 0) {
            lines.push('- Uncited claims: none');
            return lines.join('\n');
        }

        lines.push('### Uncited Claims');
        for (const claim of report.uncitedClaims.slice(0, 3)) {
            lines.push(`- ${claim}`);
        }
        lines.push('- Action: add `[[source-note]]` links for uncited claims.');

        return lines.join('\n');
    }

    private prepareWorkflowCommand(rawCommand: string): PreparedWorkflowCommand {
        const command = rawCommand.trim();

        if (/^\/help(?:\s+workflow)?$/i.test(command)) {
            return {
                displayCommand: command,
                promptToSend: null,
                localNotice: this.writingWorkflow.buildWorkflowHelp(),
                meta: {
                    source: 'plain',
                    requiresCitationCheck: false,
                },
            };
        }

        if (/^\/write\b/i.test(command)) {
            return this.prepareWriteWorkflowCommand(command);
        }

        if (/^\/kb\s+audit\b/i.test(command)) {
            return this.prepareKbAuditCommand(command);
        }

        if (/^\/qa\b/i.test(command)) {
            return this.prepareEvidenceQaCommand(command);
        }

        return {
            displayCommand: command,
            promptToSend: command,
            meta: {
                source: 'plain',
                requiresCitationCheck: false,
            },
        };
    }

    private prepareWriteWorkflowCommand(command: string): PreparedWorkflowCommand {
        const match = command.match(/^\/write\s+([^\s]+)(?:\s+([\s\S]+))?$/i);
        if (!match) {
            return {
                displayCommand: command,
                promptToSend: null,
                localNotice: 'Usage: `/write start <topic>` or `/write outline|draft|evidence|polish|publish [requirements]`',
                meta: {
                    source: 'write',
                    requiresCitationCheck: false,
                },
            };
        }

        const action = match[1].toLowerCase();
        const payload = (match[2] || '').trim();
        const stage = STAGE_ALIAS[action];
        if (!stage) {
            return {
                displayCommand: command,
                promptToSend: null,
                localNotice: `Unknown /write action: ${action}. Use \`/help workflow\` for available commands.`,
                meta: {
                    source: 'write',
                    requiresCitationCheck: false,
                },
            };
        }

        const sessionKey = this.getCurrentSessionKey();
        this.writingWorkflow.hydrateTask(sessionKey, this.getCurrentWritingTask());
        const contextSnapshot = this.contextResolver.resolveSnapshot(command);
        const contextBlock = this.contextResolver.buildContextBlock(contextSnapshot);
        const existingTask = this.writingWorkflow.getTask(sessionKey);

        if (stage === 'discover') {
            if (!payload && !existingTask) {
                return {
                    displayCommand: command,
                    promptToSend: null,
                    localNotice: 'Usage: `/write start <topic>` (or create one task first, then use `/write discover`)',
                    meta: {
                        source: 'write',
                        stage,
                        requiresCitationCheck: false,
                    },
                };
            }

            const taskBase = payload
                ? this.writingWorkflow.createTask(sessionKey, payload)
                : this.writingWorkflow.ensureTask(sessionKey, existingTask?.objective || 'Untitled writing objective');
            const task: WritingTask = {
                ...taskBase,
                stage: 'discover',
                status: 'active',
                updatedAt: new Date(),
            };
            this.writingWorkflow.hydrateTask(sessionKey, task);
            this.sessionManager.setCurrentWritingTask(task);

            if (payload && this.currentServerSessionId) {
                this.citationReportBySessionId.delete(this.currentServerSessionId);
            }

            const stageRequest = payload || `Re-run discovery for writing task "${task.title}".`;
            const promptToSend = this.writingWorkflow.buildStagePrompt(
                'discover',
                stageRequest,
                contextSnapshot,
                task,
                contextBlock
            );

            return {
                displayCommand: command,
                promptToSend,
                localNotice: payload
                    ? `Writing task created: **${task.title}**`
                    : `Workflow stage: **discover** · Task: **${task.title}**`,
                meta: {
                    source: 'write',
                    stage,
                    requiresCitationCheck: false,
                },
            };
        }

        const taskBase = this.writingWorkflow.ensureTask(sessionKey, payload || 'Untitled writing objective');
        this.writingWorkflow.updateStage(sessionKey, stage);
        const task: WritingTask = {
            ...taskBase,
            stage,
            status: 'active',
            updatedAt: new Date(),
        };
        this.writingWorkflow.hydrateTask(sessionKey, task);
        this.sessionManager.setCurrentWritingTask(task);

        if (stage === 'evidence') {
            const question = payload || `Audit factual grounding for writing task "${task.title}".`;
            return {
                displayCommand: command,
                promptToSend: this.writingWorkflow.buildEvidencePrompt(question, contextBlock),
                localNotice: `Workflow stage: **evidence** · Task: **${task.title}**`,
                meta: {
                    source: 'write',
                    stage,
                    requiresCitationCheck: true,
                },
            };
        }

        const stageRequest = payload || `Continue task "${task.title}" in ${stage} stage.`;
        const promptToSend = this.writingWorkflow.buildStagePrompt(
            stage,
            stageRequest,
            contextSnapshot,
            task,
            contextBlock
        );

        return {
            displayCommand: command,
            promptToSend,
            localNotice: `Workflow stage: **${stage}** · Task: **${task.title}**`,
            meta: {
                source: 'write',
                stage,
                requiresCitationCheck: true,
            },
        };
    }

    private prepareKbAuditCommand(command: string): PreparedWorkflowCommand {
        const match = command.match(/^\/kb\s+audit(?:\s+([^\s]+))?(?:\s+([\s\S]+))?$/i);
        if (!match) {
            return {
                displayCommand: command,
                promptToSend: null,
                localNotice: 'Usage: `/kb audit [full|broken|orphan|duplicate|stale] [extra requirements]`',
                meta: {
                    source: 'kb',
                    requiresCitationCheck: false,
                },
            };
        }

        const firstToken = (match[1] || '').toLowerCase();
        const remaining = (match[2] || '').trim();

        let scope: AuditScope = 'full';
        let userRequest = '';

        if (AUDIT_SCOPES.includes(firstToken as AuditScope)) {
            scope = firstToken as AuditScope;
            userRequest = remaining;
        } else {
            userRequest = [firstToken, remaining].filter((part) => part.length > 0).join(' ').trim();
        }

        const contextSnapshot = this.contextResolver.resolveSnapshot(command);
        const contextBlock = this.contextResolver.buildContextBlock(contextSnapshot);
        const promptToSend = this.writingWorkflow.buildKbAuditPrompt(scope, userRequest, contextBlock);

        return {
            displayCommand: command,
            promptToSend,
            localNotice: `Knowledge base audit scope: **${scope}**`,
            meta: {
                source: 'kb',
                requiresCitationCheck: false,
            },
        };
    }

    private prepareEvidenceQaCommand(command: string): PreparedWorkflowCommand {
        const match = command.match(/^\/qa(?:\s+([\s\S]+))?$/i);
        const question = (match?.[1] || '').trim();
        if (!question) {
            return {
                displayCommand: command,
                promptToSend: null,
                localNotice: 'Usage: `/qa <question>`',
                meta: {
                    source: 'qa',
                    requiresCitationCheck: false,
                },
            };
        }

        const contextSnapshot = this.contextResolver.resolveSnapshot(command);
        const contextBlock = this.contextResolver.buildContextBlock(contextSnapshot);
        const promptToSend = this.writingWorkflow.buildEvidencePrompt(question, contextBlock);

        return {
            displayCommand: command,
            promptToSend,
            localNotice: 'Running evidence QA workflow with strict citation checks.',
            meta: {
                source: 'qa',
                requiresCitationCheck: true,
            },
        };
    }

    async handleCommand(command: string) {
        if (this.isProcessing) return;

        const preparedCommand = this.prepareWorkflowCommand(command);
        if (!preparedCommand.promptToSend) {
            if (preparedCommand.localNotice) {
                this.addSystemNotice(preparedCommand.localNotice);
            }
            this.refreshWritingTaskPanel();
            return;
        }

        this.refreshWritingTaskPanel();

        if (!this.server) {
            console.error('OpenCodeChatView: Server not available');
            return;
        }

        this.isProcessing = true;
        this.chatInput.setProcessing(true);

        this.messageContainer.addUserMessage(preparedCommand.displayCommand);

        this.sessionManager.addMessage({
            role: 'user',
            content: preparedCommand.displayCommand,
            timestamp: new Date(),
        });

        if (preparedCommand.localNotice) {
            this.addSystemNotice(preparedCommand.localNotice);
        }

        this.messageContainer.createAssistantMessage();

        try {
            let serverSessionId = this.currentServerSessionId;

            if (!serverSessionId) {
                const session = await this.server.createSession(ASK_PERMISSIONS);
                serverSessionId = session.id;
                this.sessionManager.updateServerSessionId(serverSessionId);
            }

            await this.server.sendMessage(serverSessionId, preparedCommand.promptToSend);
            this.pendingMetaByServerSessionId.set(serverSessionId, preparedCommand.meta || {
                source: 'plain',
                requiresCitationCheck: false,
            });
        } catch (error: any) {
            console.error('OpenCodeChatView: Command error:', error);
            this.messageContainer.hideThinking();
            this.messageContainer.appendToAssistantMessage(`\n\n**Error:** ${error.message}`);
            this.messageContainer.finalizeAssistantMessage();

            const messages = this.messageContainer.getMessages();
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                this.sessionManager.addMessage(lastMessage);
            }

            this.isProcessing = false;
            this.chatInput.setProcessing(false);
            this.chatInput.focus();
        }
    }

    handleStop() {
        if (!this.isProcessing) return;

        const serverSessionId = this.currentServerSessionId;
        if (serverSessionId) {
            this.pendingMetaByServerSessionId.delete(serverSessionId);
        }
        if (serverSessionId && this.server) {
            this.server.abortSession(serverSessionId).catch((err) => {
                console.error('OpenCodeChatView: Failed to abort session:', err);
            });
        }

        this.messageContainer.hideThinking();
        this.messageContainer.appendToAssistantMessage('\n\n_Stopped by user_');
        this.messageContainer.finalizeAssistantMessage();

        this.isProcessing = false;
        this.chatInput.setProcessing(false);
    }

    clearHistory() {
        const sessionKey = this.getCurrentSessionKey();
        this.sessionManager.clearCurrentSession();
        this.sessionManager.setCurrentWritingTask(null);
        this.writingWorkflow.hydrateTask(sessionKey, null);
        const serverSessionId = this.currentServerSessionId;
        if (serverSessionId) {
            this.citationReportBySessionId.delete(serverSessionId);
            this.pendingMetaByServerSessionId.delete(serverSessionId);
        }
        this.messageContainer.clear();

        this.messageContainer.addMessage({
            role: 'system',
            content: 'OpenCode Chat - History cleared',
            timestamp: new Date(),
        });

        this.updateSessionList();
    }

    focusInput() {
        this.chatInput.focus();
    }

    loadSession(sessionId: string) {
        const switched = this.sessionManager.switchSession(sessionId);
        if (!switched) {
            console.error('OpenCodeChatView: Failed to switch to session:', sessionId);
            return;
        }

        this.syncWorkflowTaskFromSession();
        this.messageContainer.clear();
        this.loadCurrentSessionMessages();
        this.updateSessionList();
        this.chatInput.focus();
    }

    createNewSession() {
        const session = this.sessionManager.createSession(`Session ${this.sessionManager.getSessions().length}`);
        this.loadSession(session.id);
    }

    deleteSession(sessionId: string) {
        this.writingWorkflow.hydrateTask(sessionId, null);
        const deleted = this.sessionManager.deleteSession(sessionId);
        if (!deleted) {
            console.error('OpenCodeChatView: Failed to delete session:', sessionId);
            return;
        }

        const currentSession = this.sessionManager.getCurrentSession();
        if (currentSession) {
            this.loadSession(currentSession.id);
        } else {
            this.createNewSession();
        }
    }

    renameSession(sessionId: string, newName: string) {
        const renamed = this.sessionManager.updateSessionName(sessionId, newName);
        if (renamed) {
            this.updateSessionList();
        }
    }

    async exportConversation() {
        const messages = this.sessionManager.getCurrentMessages();

        if (messages.length === 0) return;

        const currentSession = this.sessionManager.getCurrentSession();
        const sessionName = currentSession?.name || 'Conversation';

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const safeName = sessionName.replace(/[^a-zA-Z0-9]/g, '-');
        const filename = `opencode-chat-${safeName}-${timestamp}.md`;

        let content = `# OpenCode Chat Conversation\n\n`;
        content += `**Session:** ${sessionName}\n\n`;
        content += `*Exported: ${new Date().toLocaleString()}*\n\n`;
        content += `*Server Session ID: ${currentSession?.serverSessionId || 'N/A'}*\n\n`;
        content += `---\n\n`;

        for (const message of messages) {
            if (message.role === 'system') continue;

            const roleLabel = message.role === 'user' ? '👤 User' : '🤖 Assistant';
            const timeLabel = message.timestamp.toLocaleTimeString();

            content += `## ${roleLabel}\n\n`;
            content += `*${timeLabel}*\n\n`;
            content += `${message.content}\n\n`;
            content += `---\n\n`;
        }

        const vault = this.app.vault;
        await vault.create(filename, content);

        const file = vault.getAbstractFileByPath(filename);
        if (file) {
            await this.app.workspace.openLinkText(filename, '', true);
        }
    }

    async handleEditMessage(index: number, content: string) {
        this.messageContainer.removeMessagesAfter(index);
        await this.handleCommand(content);
    }

    async regenerateLast() {
        const messages = this.messageContainer.getMessages();

        let lastUserIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserIndex = i;
                break;
            }
        }

        if (lastUserIndex >= 0) {
            this.messageContainer.removeMessagesAfter(lastUserIndex - 1);
            await this.handleCommand(messages[lastUserIndex].content);
        }
    }

    async onClose() {
        if (this.writingTaskPanel) {
            this.writingTaskPanel.destroy();
            this.writingTaskPanel = null;
        }
        this.unsubscribeFromServer();
    }
}
