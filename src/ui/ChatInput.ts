import { App } from 'obsidian';

export class ChatInput {
    private containerEl: HTMLElement;
    private inputWrapperEl: HTMLElement;
    private inputEl: HTMLTextAreaElement;
    private sendButtonEl: HTMLButtonElement;
    private stopButtonEl: HTMLButtonElement | null = null;
    private onSubmit: (command: string) => Promise<void>;
    private onStop: () => void;
    private commandHistory: string[] = [];
    private historyIndex: number = -1;
    private tempInput: string = ''; // Store current input when navigating history
    private mentionMenuEl: HTMLElement;
    private mentionCandidates: string[] = [];
    private mentionSelectedIndex: number = 0;
    private mentionStartIndex: number = -1;
    private mentionEndIndex: number = -1;
    private readonly maxMentionResults = 8;

    constructor(
        containerEl: HTMLElement,
        private app: App,
        onSubmit: (command: string) => Promise<void>,
        onStop: () => void
    ) {
        this.containerEl = containerEl;
        this.onSubmit = onSubmit;
        this.onStop = onStop;
        this.render();
    }

    private render() {
        const inputContainer = this.containerEl.createEl('div', {
            cls: 'claude-chat-input-container',
        });

        // Create wrapper for flex layout
        this.inputWrapperEl = inputContainer.createEl('div', {
            cls: 'claude-chat-input-wrapper',
        });

        this.inputEl = this.inputWrapperEl.createEl('textarea', {
            cls: 'claude-chat-input',
            attr: {
                placeholder: 'Ask OpenCode, or use /write /kb /qa workflows... (type @ to reference files)',
                rows: '1',
            },
        });

        // Auto-resize textarea as user types
        this.inputEl.addEventListener('input', () => {
            this.autoResize();
            this.updateMentionSuggestions();
        });

        this.inputEl.addEventListener('click', () => {
            this.updateMentionSuggestions();
        });

        this.inputEl.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                this.updateMentionSuggestions();
            }
        });

        this.inputEl.addEventListener('blur', () => {
            window.setTimeout(() => {
                if (document.activeElement !== this.inputEl) {
                    this.closeMentionMenu();
                }
            }, 100);
        });

        // Send button
        this.sendButtonEl = this.inputWrapperEl.createEl('button', {
            cls: 'claude-chat-send-button',
        });

        // Add SVG send icon
        this.sendButtonEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>Send</span>
        `;

        // Handle send button click
        this.sendButtonEl.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Handle Enter key (Shift+Enter for new line) and arrow keys for history
        this.inputEl.addEventListener('keydown', (e) => {
            if (this.handleMentionKeydown(e)) {
                return;
            }

            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                this.handleSubmit();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });

        this.mentionMenuEl = inputContainer.createEl('div', {
            cls: 'claude-chat-mention-menu',
        });
        this.mentionMenuEl.style.display = 'none';

        // Focus input on container click
        inputContainer.addEventListener('click', (e) => {
            if (e.target === inputContainer || e.target === this.inputWrapperEl) {
                this.inputEl.focus();
            }
        });
    }

    private createStopButton() {
        if (this.stopButtonEl) return;

        this.stopButtonEl = this.inputWrapperEl.createEl('button', {
            cls: 'claude-chat-stop-button',
        });

        // Add SVG stop icon
        this.stopButtonEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
            <span>Stop</span>
        `;

        // Handle stop button click
        this.stopButtonEl.addEventListener('click', () => {
            this.onStop();
        });
    }

    private removeStopButton() {
        if (this.stopButtonEl) {
            this.stopButtonEl.remove();
            this.stopButtonEl = null;
        }
    }

    private async handleSubmit() {
        const command = this.inputEl.value.trim();
        if (command && !this.sendButtonEl.disabled) {
            // Add to history (avoid duplicates)
            if (this.commandHistory[this.commandHistory.length - 1] !== command) {
                this.commandHistory.push(command);
                // Limit history to 100 commands
                if (this.commandHistory.length > 100) {
                    this.commandHistory.shift();
                }
            }

            this.inputEl.value = '';
            this.autoResize();
            this.historyIndex = -1; // Reset history index
            this.tempInput = '';
            this.closeMentionMenu();
            await this.onSubmit(command);
        }
    }

    private navigateHistory(direction: number) {
        if (this.commandHistory.length === 0) return;

        // Save current input on first navigation
        if (this.historyIndex === -1) {
            this.tempInput = this.inputEl.value;
        }

        // Calculate new index
        this.historyIndex += direction;

        // Clamp index to valid range
        if (this.historyIndex < 0) {
            this.historyIndex = 0;
        } else if (this.historyIndex >= this.commandHistory.length) {
            // Restore original input when going past the end
            this.historyIndex = -1;
            this.setValue(this.tempInput);
            return;
        }

        // Set input to history item
        const historyItem = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
        this.setValue(historyItem);

        // Select all text so user can easily type to replace
        this.inputEl.setSelectionRange(0, historyItem.length);
    }

    private autoResize() {
        this.inputEl.style.height = 'auto';
        const newHeight = Math.min(
            Math.max(this.inputEl.scrollHeight, 44),
            140
        );
        this.inputEl.style.height = `${newHeight}px`;
    }

    focus() {
        this.inputEl.focus();
    }

    setDisabled(disabled: boolean) {
        this.inputEl.disabled = disabled;
        this.sendButtonEl.disabled = disabled;
        if (disabled) {
            this.closeMentionMenu();
        }
    }

    setProcessing(isProcessing: boolean) {
        if (isProcessing) {
            // Hide send button, show stop button
            this.sendButtonEl.classList.add('claude-hidden');
            this.createStopButton();
            this.inputEl.disabled = true;
            this.closeMentionMenu();
        } else {
            // Show send button, hide stop button
            this.sendButtonEl.classList.remove('claude-hidden');
            this.removeStopButton();
            this.inputEl.disabled = false;
        }
    }

    getValue(): string {
        return this.inputEl.value;
    }

    setValue(value: string) {
        this.inputEl.value = value;
        this.autoResize();
        this.updateMentionSuggestions();
    }

    private handleMentionKeydown(e: KeyboardEvent): boolean {
        const mentionOpen = this.isMentionMenuOpen();
        if (!mentionOpen) {
            return false;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moveMentionSelection(1);
            return true;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moveMentionSelection(-1);
            return true;
        }

        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            this.selectMention(this.mentionSelectedIndex);
            return true;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            this.closeMentionMenu();
            return true;
        }

        return false;
    }

    private updateMentionSuggestions(): void {
        const context = this.getMentionContext();
        if (!context) {
            this.closeMentionMenu();
            return;
        }

        const candidates = this.getMentionCandidates(context.query);
        if (candidates.length === 0) {
            this.closeMentionMenu();
            return;
        }

        this.mentionStartIndex = context.start;
        this.mentionEndIndex = context.end;
        this.mentionCandidates = candidates;
        this.mentionSelectedIndex = 0;
        this.renderMentionMenu();
    }

    private getMentionContext(): { start: number; end: number; query: string } | null {
        if (this.inputEl.selectionStart !== this.inputEl.selectionEnd) {
            return null;
        }

        const cursor = this.inputEl.selectionStart ?? this.inputEl.value.length;
        const prefix = this.inputEl.value.slice(0, cursor);
        const match = prefix.match(/(^|\s)@([^\s@]*)$/);
        if (!match) {
            return null;
        }

        const query = match[2] || '';
        const start = cursor - query.length - 1;
        if (start < 0) {
            return null;
        }

        return {
            start,
            end: cursor,
            query,
        };
    }

    private getMentionCandidates(query: string): string[] {
        const normalizedQuery = query.replace(/^"+/, '').replace(/"/g, '').toLowerCase();
        const files = this.app.vault.getFiles();

        if (normalizedQuery.length === 0) {
            return files
                .slice()
                .sort((a, b) => b.stat.mtime - a.stat.mtime)
                .slice(0, this.maxMentionResults)
                .map((file) => file.path);
        }

        const scored = files
            .map((file) => {
                const path = file.path;
                const pathLower = path.toLowerCase();
                const basenameLower = file.basename.toLowerCase();

                let score = -1;
                if (basenameLower === normalizedQuery) {
                    score = 0;
                } else if (basenameLower.startsWith(normalizedQuery)) {
                    score = 1;
                } else if (pathLower.startsWith(normalizedQuery)) {
                    score = 2;
                } else if (basenameLower.includes(normalizedQuery)) {
                    score = 3;
                } else if (pathLower.includes(normalizedQuery)) {
                    score = 4;
                }

                return { path, score };
            })
            .filter((item) => item.score >= 0)
            .sort((a, b) => {
                if (a.score !== b.score) return a.score - b.score;
                if (a.path.length !== b.path.length) return a.path.length - b.path.length;
                return a.path.localeCompare(b.path);
            })
            .slice(0, this.maxMentionResults)
            .map((item) => item.path);

        return scored;
    }

    private renderMentionMenu(): void {
        this.mentionMenuEl.empty();

        this.mentionCandidates.forEach((path, index) => {
            const safePath = (path || '').trim() || '(unknown file)';
            const fileName = safePath.split('/').pop()?.trim() || safePath;

            const itemEl = this.mentionMenuEl.createEl('div', {
                cls: 'claude-chat-mention-item',
            });
            itemEl.setAttribute('role', 'option');
            itemEl.setAttribute('tabindex', '-1');
            itemEl.setAttribute('aria-label', safePath);
            itemEl.setAttribute('title', safePath);
            itemEl.setAttribute('data-name', fileName);
            itemEl.setAttribute('data-path', safePath);

            if (index === this.mentionSelectedIndex) {
                itemEl.addClass('is-selected');
            }

            itemEl.addEventListener('mouseenter', () => {
                this.mentionSelectedIndex = index;
                this.updateMentionSelectionClasses();
            });

            itemEl.addEventListener('mousedown', (event) => {
                event.preventDefault();
                this.selectMention(index);
            });
        });

        this.mentionMenuEl.style.display = 'block';
    }

    private updateMentionSelectionClasses(): void {
        const itemEls = this.mentionMenuEl.querySelectorAll('.claude-chat-mention-item');
        itemEls.forEach((itemEl, index) => {
            itemEl.classList.toggle('is-selected', index === this.mentionSelectedIndex);
        });

        const activeEl = itemEls[this.mentionSelectedIndex] as HTMLElement | undefined;
        activeEl?.scrollIntoView({ block: 'nearest' });
    }

    private moveMentionSelection(delta: number): void {
        if (this.mentionCandidates.length === 0) {
            return;
        }

        const total = this.mentionCandidates.length;
        this.mentionSelectedIndex = (this.mentionSelectedIndex + delta + total) % total;
        this.updateMentionSelectionClasses();
    }

    private selectMention(index: number): void {
        const selectedPath = this.mentionCandidates[index];
        if (!selectedPath || this.mentionStartIndex < 0 || this.mentionEndIndex < 0) {
            return;
        }

        const before = this.inputEl.value.slice(0, this.mentionStartIndex);
        const after = this.inputEl.value.slice(this.mentionEndIndex);
        const mentionText = this.formatMentionText(selectedPath);
        const appendSpace = after.length > 0 && !/^\s/.test(after) ? ' ' : '';
        const nextValue = `${before}${mentionText}${appendSpace}${after}`;
        const nextCursor = before.length + mentionText.length + appendSpace.length;

        this.inputEl.value = nextValue;
        this.autoResize();
        this.inputEl.focus();
        this.inputEl.setSelectionRange(nextCursor, nextCursor);
        this.closeMentionMenu();
    }

    private formatMentionText(path: string): string {
        if (/\s/.test(path)) {
            return `@"${path}"`;
        }
        return `@${path}`;
    }

    private closeMentionMenu(): void {
        this.mentionCandidates = [];
        this.mentionSelectedIndex = 0;
        this.mentionStartIndex = -1;
        this.mentionEndIndex = -1;
        this.mentionMenuEl.empty();
        this.mentionMenuEl.style.display = 'none';
    }

    private isMentionMenuOpen(): boolean {
        return this.mentionMenuEl.style.display !== 'none' && this.mentionCandidates.length > 0;
    }
}
