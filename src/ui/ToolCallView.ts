import { ToolPart, ToolState } from '../types/opencode';

export class ToolCallView {
    private containerEl: HTMLElement;
    private headerEl: HTMLElement;
    private statusIconEl: HTMLElement;
    private nameEl: HTMLElement;
    private titleEl: HTMLElement;
    private timerEl: HTMLElement;
    private chevronEl: HTMLElement;
    private bodyEl: HTMLElement;
    private inputEl: HTMLElement;
    private outputEl: HTMLElement;
    
    private timerInterval: ReturnType<typeof setInterval> | null = null;
    private isCollapsed: boolean = true;
    private part: ToolPart;

    constructor(parentEl: HTMLElement, part: ToolPart) {
        this.part = part;
        
        // Main container
        this.containerEl = parentEl.createEl('div', {
            cls: 'claude-tool-call'
        });
        
        // Header
        this.headerEl = this.containerEl.createEl('div', {
            cls: 'claude-tool-call-header'
        });
        this.headerEl.addEventListener('click', () => this.toggleCollapse());

        this.statusIconEl = this.headerEl.createEl('span', { cls: 'claude-tool-call-icon' });
        this.nameEl = this.headerEl.createEl('span', { cls: 'claude-tool-call-name' });
        this.titleEl = this.headerEl.createEl('span', { cls: 'claude-tool-call-title' });
        this.timerEl = this.headerEl.createEl('span', { cls: 'claude-tool-call-timer' });
        this.chevronEl = this.headerEl.createEl('span', { cls: 'claude-tool-call-chevron' });

        // Body
        this.bodyEl = this.containerEl.createEl('div', {
            cls: 'claude-tool-call-body'
        });
        // Start collapsed
        this.bodyEl.style.display = 'none';

        // Input section
        const inputSection = this.bodyEl.createEl('div', { cls: 'claude-tool-call-input' });
        inputSection.createEl('div', { cls: 'claude-tool-call-section-label', text: 'Input' });
        this.inputEl = inputSection.createEl('pre', { cls: 'claude-tool-call-code' });

        // Output section (hidden by default)
        const outputSection = this.bodyEl.createEl('div', { cls: 'claude-tool-call-output' });
        outputSection.createEl('div', { cls: 'claude-tool-call-section-label', text: 'Output' });
        this.outputEl = outputSection.createEl('pre', { cls: 'claude-tool-call-code' });
        outputSection.style.display = 'none'; // Only show when we have output/error

        // Initial render
        this.update(part);
    }

    update(part: ToolPart): void {
        const oldStatus = this.part.state.status;
        this.part = part;
        const state = part.state;

        // Update container class for status styling
        this.containerEl.classList.remove('claude-tool-call-pending', 'claude-tool-call-running', 'claude-tool-call-completed', 'claude-tool-call-error');
        this.containerEl.classList.add(`claude-tool-call-${state.status}`);

        // Update Header Info
        this.nameEl.setText(part.tool);
        
        // Status Icons & Title
        let icon = '⏳';
        let titleText = '';

        if (state.status === 'pending') {
            icon = '⏳';
        } else if (state.status === 'running') {
            icon = '⚙️';
            titleText = state.title || '';
        } else if (state.status === 'completed') {
            icon = '✅';
            titleText = state.title || 'Completed';
        } else if (state.status === 'error') {
            icon = '❌';
            titleText = 'Error';
        }

        this.statusIconEl.setText(icon);
        this.titleEl.setText(titleText);
        
        // Update Chevron
        this.chevronEl.setText(this.isCollapsed ? '▶' : '▼');

        // Input Content
        this.inputEl.setText(JSON.stringify(state.input, null, 2));

        // Output/Error Content
        const outputContainer = this.outputEl.parentElement;
        if (state.status === 'completed') {
            if (outputContainer) outputContainer.style.display = 'block';
            this.outputEl.setText(state.output || '');
        } else if (state.status === 'error') {
            if (outputContainer) outputContainer.style.display = 'block';
            this.outputEl.setText(state.error || '');
        } else {
            if (outputContainer) outputContainer.style.display = 'none';
        }

        // Timer Logic
        this.handleTimer(state);
    }

    private handleTimer(state: ToolState) {
        if (state.status === 'running') {
            // Ensure timer is running
            if (!this.timerInterval) {
                this.timerInterval = setInterval(() => {
                    const elapsed = (Date.now() - state.time.start) / 1000;
                    this.timerEl.setText(`${elapsed.toFixed(1)}s`);
                }, 100);
            }
        } else if (state.status === 'completed' || state.status === 'error') {
            // Stop timer and show final time
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            const duration = (state.time.end - state.time.start) / 1000;
            this.timerEl.setText(`${duration.toFixed(1)}s`);
        } else {
            // Pending
            this.timerEl.setText('');
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        }
    }

    private toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.bodyEl.style.display = this.isCollapsed ? 'none' : 'block';
        this.chevronEl.setText(this.isCollapsed ? '▶' : '▼');
    }

    destroy(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.containerEl.remove();
    }
}
