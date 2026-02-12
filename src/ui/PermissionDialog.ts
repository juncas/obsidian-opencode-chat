import { PermissionRequest, PermissionResponse } from '../types/opencode';

export class PermissionDialog {
    private containerEl: HTMLElement;
    private buttons: HTMLButtonElement[] = [];
    private resolved: boolean = false;

    constructor(
        parentEl: HTMLElement,
        private request: PermissionRequest,
        private onReply: (response: PermissionResponse) => void
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

        const actions = this.containerEl.createEl('div', {
            cls: 'claude-permission-actions'
        });

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
        
        // Find the button that was clicked and update its text
        // (Visual feedback is handled by resolve() disabling everything, 
        // but we can also update text for clarity if we knew which one was clicked.
        // For simplicity, we just resolve and call the callback.)
        
        this.onReply(response);
    }

    resolve(): void {
        this.resolved = true;
        this.containerEl.classList.add('claude-permission-resolved');
        this.buttons.forEach(btn => {
            btn.disabled = true;
        });
    }

    destroy(): void {
        this.containerEl.remove();
    }
}
