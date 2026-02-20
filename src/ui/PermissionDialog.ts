import { PermissionRequest, PermissionResponse, FileDiff } from '../types/opencode';
import { FileDiffView } from './FileDiffView';

export interface PermissionDialogCallbacks {
    onReply: (response: PermissionResponse) => void;
    onShowInEditor?: (diff: FileDiff) => void;
}

export class PermissionDialog {
    private containerEl: HTMLElement;
    private buttons: HTMLButtonElement[] = [];
    private resolved: boolean = false;
    private diffViews: FileDiffView[] = [];
    private diffs: FileDiff[] = [];

    constructor(
        parentEl: HTMLElement,
        private request: PermissionRequest,
        private callbacks: PermissionDialogCallbacks
    ) {
        this.containerEl = parentEl.createEl('div', {
            cls: 'claude-permission-dialog'
        });

        const header = this.containerEl.createEl('div', {
            cls: 'claude-permission-header'
        });
        header.createEl('span', { cls: 'claude-permission-icon', text: '🔐' });
        header.createEl('span', { cls: 'claude-permission-title', text: 'Permission Required' });

        const body = this.containerEl.createEl('div', {
            cls: 'claude-permission-body'
        });

        body.createEl('div', {
            cls: 'claude-permission-type',
            text: `${this.request.permission}: ${this.request.patterns.join(', ')}`
        });

        const metadataEl = body.createEl('div', {
            cls: 'claude-permission-metadata'
        });

        for (const [key, value] of Object.entries(this.request.metadata)) {
            if (this.isDiffData(key, value)) {
                continue;
            }
            
            const item = metadataEl.createEl('div', { cls: 'claude-permission-meta-item' });
            item.createEl('strong', { text: `${key}: ` });
            
            let displayValue: string;
            if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value);
            } else {
                displayValue = String(value);
            }
            
            item.createEl('span', { text: displayValue });
        }

        this.extractDiffs();
        this.renderDiffs(body);

        const actions = this.containerEl.createEl('div', {
            cls: 'claude-permission-actions'
        });

        if (this.diffs.length > 0 && callbacks.onShowInEditor) {
            this.createButton(actions, '📝 Show in Editor', 'claude-permission-btn-editor', () => {
                for (const diff of this.diffs) {
                    callbacks.onShowInEditor?.(diff);
                }
            });
        }

        this.createButton(actions, 'Allow Once', 'claude-permission-btn-allow', () => {
            this.handleReply('once', 'Allowed ✓');
        });

        this.createButton(actions, 'Allow Always', 'claude-permission-btn-always', () => {
            this.handleReply('always', 'Allowed Always ✓');
        });

        this.createButton(actions, 'Reject', 'claude-permission-btn-reject', () => {
            this.handleReply('reject', 'Rejected ✗');
        });
    }

    private isDiffData(key: string, value: unknown): boolean {
        if (key === 'before' || key === 'after' || key === 'file' || key === 'path') {
            return true;
        }
        if (key === 'diff' && Array.isArray(value)) {
            return true;
        }
        return false;
    }

    private extractDiffs(): void {
        const { metadata } = this.request;
        
        if (metadata.diff && Array.isArray(metadata.diff)) {
            this.diffs = metadata.diff as FileDiff[];
            return;
        }

        if (metadata.file && typeof metadata.before === 'string' && typeof metadata.after === 'string') {
            const diff: FileDiff = {
                file: String(metadata.file),
                before: String(metadata.before),
                after: String(metadata.after),
                additions: 0,
                deletions: 0,
            };
            
            const beforeLines = diff.before.split('\n');
            const afterLines = diff.after.split('\n');
            
            if (metadata.before_line_count !== undefined) {
                diff.deletions = Number(metadata.before_line_count) || 0;
            } else {
                diff.deletions = beforeLines.length;
            }
            
            if (metadata.after_line_count !== undefined) {
                diff.additions = Number(metadata.after_line_count) || 0;
            } else {
                diff.additions = afterLines.length;
            }
            
            this.diffs = [diff];
        }
    }

    private renderDiffs(container: HTMLElement): void {
        for (const diff of this.diffs) {
            const view = new FileDiffView(container, diff);
            this.diffViews.push(view);
        }
    }

    private createButton(container: HTMLElement, text: string, cls: string, onClick: () => void) {
        const btn = container.createEl('button', {
            cls: `claude-permission-btn ${cls}`,
            text: text
        });
        btn.addEventListener('click', onClick);
        this.buttons.push(btn);
    }

    private handleReply(response: PermissionResponse, newText: string) {
        if (this.resolved) return;
        this.resolve();
        
        this.callbacks.onReply(response);
    }

    resolve(): void {
        this.resolved = true;
        this.containerEl.classList.add('claude-permission-resolved');
        this.buttons.forEach(btn => {
            btn.disabled = true;
        });
    }

    destroy(): void {
        this.diffViews.forEach(view => view.destroy());
        this.diffViews = [];
        this.containerEl.remove();
    }
}
