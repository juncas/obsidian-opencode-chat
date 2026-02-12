import { ChatMessage } from '../types';
import { MarkdownRenderer, Component, TFile, App, WorkspaceLeaf, Notice } from 'obsidian';
import { ToolPart, PermissionRequest, PermissionResponse, QuestionRequest, StepStartPart, StepFinishPart, FileDiff } from '../types/opencode';
import { ToolCallView } from './ToolCallView';
import { PermissionDialog } from './PermissionDialog';
import { QuestionDialog } from './QuestionDialog';
import { FileDiffView } from './FileDiffView';

export class MessageContainer {
    private containerEl: HTMLElement;
    private messagesEl: HTMLElement;
    private currentMessageTextEl: HTMLElement | null = null;
    private currentMessageBuffer: string = '';
    private currentCursorEl: HTMLElement | null = null;
    private currentMessageEl: HTMLElement | null = null;
    private currentActivitiesEl: HTMLElement | null = null;
    private scrollLocked: boolean = false;
    private scrollBottomButton: HTMLElement | null = null;
    private messages: ChatMessage[] = []; // Store all messages for export
    private messageElements: Map<HTMLElement, ChatMessage> = new Map(); // Track message elements
    private onEditMessage?: (index: number, content: string) => void;
    private toolCallViews: Map<string, ToolCallView> = new Map();
    private fileDiffViews: Map<string, FileDiffView> = new Map();
    private activeDiffHostEl: HTMLElement | null = null;
    private permissionDialogs: Map<string, PermissionDialog> = new Map();
    private questionDialogs: Map<string, QuestionDialog> = new Map();

    constructor(containerEl: HTMLElement, private app: App) {
        this.containerEl = containerEl;
        this.messagesEl = this.containerEl.createEl('div', { cls: 'claude-chat-messages' });

        // Set up event delegation for link clicks
        this.setupLinkClickHandler();

        // Set up scroll lock detection
        this.setupScrollLock();

        // Set up event delegation for edit button clicks
        this.setupEditHandler();
    }

    setOnEditMessage(callback: (index: number, content: string) => void) {
        this.onEditMessage = callback;
    }

    private setupScrollLock() {
        // Detect when user scrolls away from bottom
        this.messagesEl.addEventListener('scroll', () => {
            const isAtBottom = this.messagesEl.scrollHeight - this.messagesEl.scrollTop <= this.messagesEl.clientHeight + 50;

            if (!isAtBottom && !this.scrollLocked) {
                // User scrolled up, lock auto-scroll
                this.scrollLocked = true;
                this.showScrollBottomButton();
            } else if (isAtBottom && this.scrollLocked) {
                // User scrolled back to bottom, unlock
                this.scrollLocked = false;
                this.hideScrollBottomButton();
            }
        });
    }

    private showScrollBottomButton() {
        if (this.scrollBottomButton) return;

        this.scrollBottomButton = this.containerEl.createEl('button', {
            cls: 'claude-scroll-bottom-button',
        });

        this.scrollBottomButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span>New messages</span>
        `;

        this.scrollBottomButton.addEventListener('click', () => {
            this.scrollToBottomNow();
        });
    }

    private hideScrollBottomButton() {
        if (this.scrollBottomButton) {
            this.scrollBottomButton.remove();
            this.scrollBottomButton = null;
        }
    }

    private setupLinkClickHandler() {
        this.messagesEl.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const linkEl = target.closest('a') as HTMLAnchorElement | null;
            if (linkEl) {
                e.preventDefault();
                this.handleLinkClick(linkEl, e as MouseEvent);
                return;
            }

            const internalLinkEl = target.closest('.internal-link') as HTMLElement | null;
            if (internalLinkEl) {
                e.preventDefault();
                this.handleInternalLinkClick(internalLinkEl, e as MouseEvent);
                return;
            }

            const inlineRefEl = target.closest('code.claude-inline-reference') as HTMLElement | null;
            if (inlineRefEl) {
                e.preventDefault();
                this.handleInlineReferenceClick(inlineRefEl, e as MouseEvent);
            }
        });
    }

    private handleLinkClick(linkEl: HTMLAnchorElement, event: MouseEvent) {
        const href = linkEl.getAttribute('href');
        if (!href || href.startsWith('#')) {
            return;
        }

        if (this.isExternalHref(href)) {
            window.open(href, '_blank');
            return;
        }

        if (this.isModifierClick(event)) {
            this.showFilePreview(href, event, linkEl);
            return;
        }

        this.tryOpenFile(href);
    }

    private handleInternalLinkClick(linkEl: HTMLElement, event: MouseEvent) {
        const linkText = linkEl.getAttribute('data-href') || linkEl.textContent;
        if (!linkText) {
            return;
        }

        if (this.isModifierClick(event)) {
            this.showFilePreview(linkText, event, linkEl);
            return;
        }

        this.tryOpenFile(linkText);
    }

    private isModifierClick(event: MouseEvent): boolean {
        return event.metaKey || event.ctrlKey;
    }

    private isExternalHref(href: string): boolean {
        return /^(https?:\/\/|mailto:|obsidian:\/\/)/i.test(href);
    }

    private showFilePreview(linkText: string, event: MouseEvent, targetEl: HTMLElement) {
        const targetFile = this.resolveFileLink(linkText);
        if (!targetFile) {
            const normalized = this.normalizeFileLink(linkText);
            if (normalized) {
                new Notice(`File not found: ${normalized}`);
            }
            return;
        }

        const activeFile = this.app.workspace.getActiveFile();
        this.app.workspace.trigger('hover-link', {
            event,
            source: 'opencode-chat',
            hoverParent: this.messagesEl,
            targetEl,
            linktext: targetFile.path,
            sourcePath: activeFile?.path || '',
        });
    }

    private tryOpenFile(linkText: string) {
        const targetFile = this.resolveFileLink(linkText);
        if (targetFile instanceof TFile) {
            this.openFileInMainPane(targetFile);
            return;
        }

        const normalized = this.normalizeFileLink(linkText);
        new Notice(`File not found: ${normalized || linkText}`);
    }

    private resolveFileLink(linkText: string): TFile | null {
        const fileName = this.normalizeFileLink(linkText);
        if (!fileName) {
            return null;
        }

        const metadataCache = this.app.metadataCache;
        const vault = this.app.vault;

        let targetFile = metadataCache.getFirstLinkpathDest(fileName, '');
        if (!targetFile && !fileName.endsWith('.md')) {
            targetFile = metadataCache.getFirstLinkpathDest(`${fileName}.md`, '');
        }

        if (!targetFile) {
            const allFiles = vault.getMarkdownFiles();
            targetFile = allFiles.find((file: TFile) => {
                const baseName = file.basename.toLowerCase();
                const searchName = fileName.toLowerCase();
                return baseName === searchName || baseName.includes(searchName);
            }) || null;
        }

        return targetFile instanceof TFile ? targetFile : null;
    }

    private normalizeFileLink(linkText: string): string {
        const decoded = this.safeDecodeURIComponent(linkText);
        return decoded
            .replace(/^\[\[/, '')
            .replace(/\]\]$/, '')
            .replace(/\|.*$/, '')
            .replace(/#.*/, '')
            .trim();
    }

    private safeDecodeURIComponent(input: string): string {
        try {
            return decodeURIComponent(input);
        } catch {
            return input;
        }
    }

    private handleInlineReferenceClick(codeEl: HTMLElement, event: MouseEvent): void {
        const refText = codeEl.textContent?.trim();
        if (!refText || !this.isModifierClick(event)) {
            return;
        }

        const normalized = this.safeDecodeURIComponent(refText);
        if (this.isExternalHref(normalized)) {
            window.open(normalized, '_blank');
            return;
        }

        this.showFilePreview(normalized, event, codeEl);
    }

    private enhanceInlineReferences(container: HTMLElement): void {
        const inlineCodeEls = container.querySelectorAll('code');
        inlineCodeEls.forEach((codeEl) => {
            if (codeEl.closest('pre')) {
                return;
            }

            const rawText = codeEl.textContent?.trim() || '';
            if (!rawText) {
                return;
            }

            const normalized = this.safeDecodeURIComponent(rawText);
            if (this.isExternalHref(normalized) || this.looksLikeFileReference(normalized)) {
                codeEl.classList.add('claude-inline-reference');
                codeEl.setAttribute('title', 'Cmd/Ctrl + click to preview/open');
            }
        });
    }

    private looksLikeFileReference(value: string): boolean {
        if (!value || value.includes('\n') || value.length > 240) {
            return false;
        }

        if (this.isExternalHref(value) || value.startsWith('#')) {
            return false;
        }

        if (/^[a-zA-Z0-9_-]+\(\)$/.test(value)) {
            return false;
        }

        if (value.startsWith('./') || value.startsWith('../') || value.startsWith('/')) {
            return true;
        }

        if (value.includes('/')) {
            return true;
        }

        return /\.[a-zA-Z0-9_-]{1,12}$/.test(value);
    }

    private openFileInMainPane(file: TFile) {
        const workspace = this.app.workspace;

        const leaves = workspace.getLeavesOfType('markdown');
        let targetLeaf: WorkspaceLeaf | null = leaves.length > 0 ? leaves[0] : null;

        if (targetLeaf) {
            targetLeaf.openFile(file);
        } else {
            const newLeaf = workspace.getLeaf(false);
            if (newLeaf) {
                newLeaf.openFile(file);
            }
        }
    }

    addMessage(message: ChatMessage) {
        // Store message for export (skip system messages like welcome)
        if (message.role !== 'system') {
            this.messages.push(message);
        }

        const messageEl = this.messagesEl.createEl('div', {
            cls: `claude-chat-message claude-chat-message-${message.role}`,
        });

        // Store message element reference for editing
        if (message.role !== 'system') {
            this.messageElements.set(messageEl, message);
            // Store message index as data attribute
            const index = this.messages.length - 1;
            messageEl.dataset.messageIndex = index.toString();
        }

        const contentEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-content',
        });

        const textEl = contentEl.createEl('div', {
            cls: 'claude-chat-message-text',
        });

        textEl.innerHTML = this.formatContent(message.content);

        const timestampEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-timestamp',
        });

        timestampEl.textContent = this.formatTime(message.timestamp);

        // Add copy button for this message (on messageEl to avoid overflow: hidden clip)
        this.addMessageCopyButton(messageEl, message.content);

        // Add edit button for user messages (on messageEl to avoid overflow: hidden clip)
        if (message.role === 'user') {
            this.addEditButton(messageEl);
        }

        this.scrollToBottom();

        return textEl;
    }

    private addMessageCopyButton(messageEl: HTMLElement, content: string) {
        const copyButton = messageEl.createEl('button', {
            cls: 'claude-message-copy-button',
        });

        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;

        copyButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            await navigator.clipboard.writeText(content);

            // Show copied state
            copyButton.classList.add('copied');
            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;

            setTimeout(() => {
                copyButton.classList.remove('copied');
                copyButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                `;
            }, 2000);
        });
    }

    private setupEditHandler() {
        this.messagesEl.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const editButton = target.closest('.claude-message-edit-button') as HTMLElement;

            if (editButton) {
                e.preventDefault();
                e.stopPropagation();
                const messageEl = editButton.closest('.claude-chat-message') as HTMLElement;
                if (messageEl) {
                    this.enterEditMode(messageEl);
                }
            }
        });
    }

    private addEditButton(messageEl: HTMLElement) {
        const editButton = messageEl.createEl('button', {
            cls: 'claude-message-edit-button',
        });

        editButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
    }

    private enterEditMode(messageEl: HTMLElement) {
        const textEl = messageEl.querySelector('.claude-chat-message-text') as HTMLElement;
        if (!textEl) return;

        const index = parseInt(messageEl.dataset.messageIndex || '-1');
        if (index < 0) return;

        const message = this.messages[index];
        if (!message) return;

        // Create textarea for editing
        const textarea = textEl.createEl('textarea', {
            cls: 'claude-message-edit-textarea',
        });
        textarea.value = message.content;

        // Create save and cancel buttons
        const buttonContainer = textEl.createEl('div', {
            cls: 'claude-message-edit-buttons',
        });

        const saveButton = buttonContainer.createEl('button', {
            cls: 'claude-message-edit-save',
            text: 'Save & Resend',
        });

        const cancelButton = buttonContainer.createEl('button', {
            cls: 'claude-message-edit-cancel',
            text: 'Cancel',
        });

        // Hide original content
        const originalContent = textEl.querySelectorAll(':scope > :not(textarea):not(.claude-message-edit-buttons)');
        originalContent.forEach(el => (el as HTMLElement).style.display = 'none');

        // Focus textarea
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Handle save
        const handleSave = () => {
            const newContent = textarea.value.trim();
            if (newContent && newContent !== message.content) {
                // Update message content
                message.content = newContent;
                textEl.innerHTML = this.formatContent(newContent);
                // Trigger callback to resend
                if (this.onEditMessage) {
                    this.onEditMessage(index, newContent);
                }
            } else {
                // Just exit edit mode without changes
                this.exitEditMode(messageEl, textEl);
            }
        };

        // Handle cancel
        const handleCancel = () => {
            this.exitEditMode(messageEl, textEl);
        };

        saveButton.addEventListener('click', handleSave);
        cancelButton.addEventListener('click', handleCancel);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });
    }

    private exitEditMode(messageEl: HTMLElement, textEl: HTMLElement) {
        // Remove edit controls
        const textarea = textEl.querySelector('.claude-message-edit-textarea');
        const buttonContainer = textEl.querySelector('.claude-message-edit-buttons');

        if (textarea) textarea.remove();
        if (buttonContainer) buttonContainer.remove();

        // Show original content
        const originalContent = textEl.querySelectorAll(':scope > *');
        originalContent.forEach(el => (el as HTMLElement).style.display = '');
    }

    addUserMessage(content: string): HTMLElement {
        return this.addMessage({
            role: 'user',
            content,
            timestamp: new Date(),
        });
    }

    createAssistantMessage(): HTMLElement {
        const messageEl = this.messagesEl.createEl('div', {
            cls: 'claude-chat-message claude-chat-message-assistant',
        });

        this.currentMessageEl = messageEl;
        this.fileDiffViews.clear();
        this.activeDiffHostEl = null;

        const activitiesEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-activities',
        });
        this.currentActivitiesEl = activitiesEl;

        const contentEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-content',
        });

        const textEl = contentEl.createEl('div', {
            cls: 'claude-chat-message-text',
        });

        this.addThinkingIndicator(textEl);

        const timestampEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-timestamp',
        });

        timestampEl.textContent = this.formatTime(new Date());

        this.currentMessageTextEl = textEl;
        this.currentMessageBuffer = '';
        this.scrollToBottom();

        return textEl;
    }

    appendToAssistantMessage(text: string) {
        if (this.currentMessageTextEl) {
            // Remove thinking indicator on first append
            this.removeThinkingIndicator();

            this.currentMessageBuffer += text;
            // Show raw text during streaming for performance
            this.currentMessageTextEl.textContent = this.currentMessageBuffer;

            // Add typing cursor
            this.addTypingCursor();

            this.scrollToBottom();
        }
    }

    finalizeAssistantMessage() {
        if (this.currentMessageTextEl) {
            // Remove typing cursor
            this.removeTypingCursor();

            // Render markdown on completion
            if (this.currentMessageBuffer) {
                if (!this.currentMessageBuffer.endsWith('\n')) {
                    this.currentMessageBuffer += '\n';
                }
                this.currentMessageTextEl.empty();
                const activeFile = this.app.workspace.getActiveFile();
                const sourcePath = activeFile?.path || '';
                MarkdownRenderer.renderMarkdown(
                    this.currentMessageBuffer,
                    this.currentMessageTextEl,
                    sourcePath,
                    new Component()
                );

                this.enhanceInlineReferences(this.currentMessageTextEl);

                // Add copy buttons to code blocks
                this.addCopyButtonsToCodeBlocks(this.currentMessageTextEl);

                // Store assistant message for export
                this.messages.push({
                    role: 'assistant',
                    content: this.currentMessageBuffer,
                    timestamp: new Date(),
                });
            }
        }
        // Add copy button for the entire assistant message (on messageEl to avoid overflow: hidden clip)
        if (this.currentMessageEl) {
            this.addMessageCopyButton(this.currentMessageEl, this.currentMessageBuffer);
        }
        this.currentMessageTextEl = null;
        this.currentMessageBuffer = '';
        this.currentMessageEl = null;
        this.currentActivitiesEl = null;
    }

    private addCopyButtonsToCodeBlocks(container: HTMLElement) {
        const codeBlocks = container.querySelectorAll('pre');
        codeBlocks.forEach((pre: HTMLElement) => {
            // Skip if already has a copy button
            if (pre.querySelector('.claude-code-copy-button')) return;

            // Create copy button
            const copyButton = pre.createEl('button', {
                cls: 'claude-code-copy-button',
            });

            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
            `;

            // Handle copy click
            copyButton.addEventListener('click', async () => {
                const code = pre.querySelector('code');
                if (code) {
                    const text = code.textContent || '';
                    await navigator.clipboard.writeText(text);

                    // Show copied state
                    copyButton.classList.add('copied');
                    copyButton.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Copied!</span>
                    `;

                    // Reset after 2 seconds
                    setTimeout(() => {
                        copyButton.classList.remove('copied');
                        copyButton.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        `;
                    }, 2000);
                }
            });
        });
    }

    showThinking() {
        if (this.currentMessageTextEl && !this.currentMessageBuffer) {
            this.addThinkingIndicator(this.currentMessageTextEl);
        }
    }

    hideThinking() {
        this.removeThinkingIndicator();
    }

    private addThinkingIndicator(container: HTMLElement) {
        const existingIndicator = container.querySelector('.claude-chat-message-thinking');
        if (existingIndicator) return;

        const thinkingEl = container.createEl('div', {
            cls: 'claude-chat-message-thinking',
        });

        const dotsEl = thinkingEl.createEl('div', {
            cls: 'claude-thinking-dots',
        });

        for (let i = 0; i < 3; i++) {
            dotsEl.createEl('span', {
                cls: 'claude-thinking-dot',
            });
        }

        const textEl = thinkingEl.createEl('span', {
            cls: 'claude-thinking-text',
            text: 'Thinking',
        });
    }

    private removeThinkingIndicator() {
        if (this.currentMessageTextEl) {
            const indicator = this.currentMessageTextEl.querySelector('.claude-chat-message-thinking');
            if (indicator) {
                indicator.remove();
            }
        }
    }

    private addTypingCursor() {
        if (!this.currentMessageTextEl) return;

        this.removeTypingCursor();

        this.currentCursorEl = this.currentMessageTextEl.createEl('span', {
            cls: 'claude-typing-cursor',
        });
    }

    private removeTypingCursor() {
        if (this.currentCursorEl) {
            this.currentCursorEl.remove();
            this.currentCursorEl = null;
        }
    }

    private formatContent(content: string): string {
        // Escape HTML and convert line breaks
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    private formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    private scrollToBottom() {
        // Only auto-scroll if not locked by user
        if (!this.scrollLocked) {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }
    }

    // Public method to force scroll to bottom (for scroll button)
    scrollToBottomNow() {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        this.scrollLocked = false;
        this.hideScrollBottomButton();
    }

    addToolCall(part: ToolPart): ToolCallView {
        const existing = this.toolCallViews.get(part.id);
        if (existing) {
            existing.update(part);
            return existing;
        }

        const targetEl = this.currentActivitiesEl || this.currentMessageEl || this.messagesEl;
        const view = new ToolCallView(targetEl, part);
        this.toolCallViews.set(part.id, view);
        this.scrollToBottom();
        return view;
    }

    addFileDiffs(sessionID: string, diffs: FileDiff[]): void {
        if (diffs.length === 0) {
            return;
        }

        const targetEl = this.currentActivitiesEl || this.currentMessageEl || this.messagesEl;
        const hostChanged = this.activeDiffHostEl !== targetEl;
        if (hostChanged) {
            this.fileDiffViews.clear();
            this.activeDiffHostEl = targetEl;
        }

        for (const diff of diffs) {
            const key = `${sessionID}:${diff.file}`;
            const existing = this.fileDiffViews.get(key);
            if (existing) {
                existing.update(diff);
                continue;
            }

            const view = new FileDiffView(targetEl, diff);
            this.fileDiffViews.set(key, view);
        }

        this.scrollToBottom();
    }

    addPermissionDialog(
        request: PermissionRequest,
        onReply: (response: PermissionResponse) => void
    ): PermissionDialog {
        const targetEl = this.currentActivitiesEl || this.currentMessageEl || this.messagesEl;
        const dialog = new PermissionDialog(targetEl, request, onReply);
        this.permissionDialogs.set(request.id, dialog);
        this.scrollToBottom();
        return dialog;
    }

    addQuestionDialog(
        request: QuestionRequest,
        onReply: (answers: string[][]) => void,
        onReject: () => void
    ): QuestionDialog {
        const targetEl = this.currentActivitiesEl || this.currentMessageEl || this.messagesEl;
        const dialog = new QuestionDialog(targetEl, request, onReply, onReject);
        this.questionDialogs.set(request.id, dialog);
        this.scrollToBottom();
        return dialog;
    }

    addStepIndicator(part: StepStartPart | StepFinishPart): void {
        const targetEl = this.currentActivitiesEl || this.currentMessageEl || this.messagesEl;

        if (part.type === 'step-start') {
            const el = targetEl.createEl('div', { cls: 'claude-step-indicator claude-step-start' });
            el.createEl('span', { cls: 'claude-step-icon', text: '▶' });
            el.createEl('span', { cls: 'claude-step-label', text: part.step || 'Step started' });
        } else {
            const el = targetEl.createEl('div', { cls: 'claude-step-indicator claude-step-finish' });
            el.createEl('span', { cls: 'claude-step-icon', text: '■' });

            let label = part.reason || 'Step finished';
            if (part.tokens) {
                const total = part.tokens.input + part.tokens.output;
                label += ` (${total} tokens)`;
            }
            if (part.cost !== undefined) {
                label += ` · $${part.cost.toFixed(4)}`;
            }
            el.createEl('span', { cls: 'claude-step-label', text: label });
        }

        this.scrollToBottom();
    }

    clear() {
        for (const view of this.toolCallViews.values()) {
            view.destroy();
        }
        this.toolCallViews.clear();

        for (const view of this.fileDiffViews.values()) {
            view.destroy();
        }
        this.fileDiffViews.clear();
        this.activeDiffHostEl = null;

        for (const dialog of this.permissionDialogs.values()) {
            dialog.destroy();
        }
        this.permissionDialogs.clear();

        for (const dialog of this.questionDialogs.values()) {
            dialog.destroy();
        }
        this.questionDialogs.clear();

        this.messagesEl.empty();
        this.messages = [];
        this.currentMessageTextEl = null;
        this.currentMessageBuffer = '';
        this.currentActivitiesEl = null;
        this.scrollLocked = false;
        this.hideScrollBottomButton();
    }

    /**
     * Get all stored messages for export
     */
    getMessages(): ChatMessage[] {
        return [...this.messages];
    }

    /**
     * Remove all messages after a given index (for edit/resend)
     */
    removeMessagesAfter(index: number) {
        // Remove from stored messages
        this.messages = this.messages.slice(0, index + 1);

        // Remove from DOM
        const messageEls = this.messagesEl.querySelectorAll('.claude-chat-message');
        messageEls.forEach((el, i) => {
            if (i > index) {
                el.remove();
            }
        });

        // Update message element references
        this.messageElements.clear();
        const remainingEls = this.messagesEl.querySelectorAll('.claude-chat-message');
        remainingEls.forEach((el, i) => {
            if (i < this.messages.length) {
                this.messageElements.set(el as HTMLElement, this.messages[i]);
                (el as HTMLElement).dataset.messageIndex = i.toString();
            }
        });
    }
}
