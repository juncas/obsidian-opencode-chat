import type { CitationCoverageReport } from '../services/CitationQualityService';
import type { DraftVersion, StageTransition, WritingStage, WritingTask } from '../types/writing';

const STAGE_ORDER: WritingStage[] = [
    'discover',
    'outline',
    'draft',
    'evidence',
    'polish',
    'publish',
];

const STAGE_LABELS: Record<WritingStage, string> = {
    discover: 'Discover',
    outline: 'Outline',
    draft: 'Draft',
    evidence: 'Evidence',
    polish: 'Polish',
    publish: 'Publish',
};

export class WritingTaskPanel {
    private panelEl: HTMLElement;
    private headerEl: HTMLElement;
    private titleEl: HTMLElement;
    private statusEl: HTMLElement;
    private toggleBtn: HTMLElement;
    private bodyEl: HTMLElement;
    private stagesEl: HTMLElement; // Workflow stepper (always visible)
    private detailsEl: HTMLElement; // Collapsible container
    private objectiveEl: HTMLElement;
    private metadataEl: HTMLElement;
    private versionsEl: HTMLElement;
    private metricsEl: HTMLElement;
    private emptyEl: HTMLElement;
    private isDetailsOpen: boolean = false;

    constructor(
        parentEl: HTMLElement,
        private callbacks: {
            onStartTask: () => void;
            onRunStage: (stage: WritingStage) => void;
            onPauseTask: () => void;
            onResumeTask: () => void;
            onCompleteTask: () => void;
            onRollbackDraftVersion: (versionId: string) => void;
            onCompareDraftVersion: (versionId: string) => void;
            onUpdateTaskProperty?: (key: string, value: string) => void;
        }
    ) {
        this.panelEl = parentEl.createEl('div', {
            cls: 'claude-writing-task-panel',
        });

        this.headerEl = this.panelEl.createEl('div', {
            cls: 'claude-writing-task-header',
        });

        const headerLeft = this.headerEl.createEl('div', { cls: 'claude-writing-header-left' });
        this.titleEl = headerLeft.createEl('div', {
            cls: 'claude-writing-task-title',
            text: 'Writing Agent',
        });
        this.statusEl = headerLeft.createEl('span', {
            cls: 'claude-writing-task-status',
        });

        this.toggleBtn = this.headerEl.createEl('div', {
            cls: 'claude-writing-task-toggle',
            attr: { 'aria-label': 'Toggle details' }
        });
        this.renderToggleIcon();
        this.toggleBtn.addEventListener('click', () => this.toggleDetails());

        this.bodyEl = this.panelEl.createEl('div', {
            cls: 'claude-writing-task-body',
        });

        this.stagesEl = this.bodyEl.createEl('div', {
            cls: 'claude-writing-task-stages',
        });

        this.detailsEl = this.bodyEl.createEl('div', {
            cls: 'claude-writing-task-details',
        });
        this.detailsEl.style.display = 'none';

        this.objectiveEl = this.detailsEl.createEl('div', {
            cls: 'claude-writing-task-objective',
        });

        this.metadataEl = this.detailsEl.createEl('div', {
            cls: 'claude-writing-task-metadata',
        });

        this.metricsEl = this.detailsEl.createEl('div', {
            cls: 'claude-writing-task-metrics',
        });

        this.versionsEl = this.detailsEl.createEl('div', {
            cls: 'claude-writing-task-versions',
        });

        this.emptyEl = this.panelEl.createEl('div', {
            cls: 'claude-writing-task-empty',
        });
        const emptyInner = this.emptyEl.createEl('div', { cls: 'claude-writing-empty-inner' });
        emptyInner.createEl('span', { text: 'No active writing task.' });
        const startBtn = emptyInner.createEl('button', { text: 'Start New Task' });
        startBtn.addEventListener('click', () => this.callbacks.onStartTask());
    }

    private toggleDetails() {
        this.isDetailsOpen = !this.isDetailsOpen;
        this.detailsEl.style.display = this.isDetailsOpen ? 'block' : 'none';
        this.renderToggleIcon();
    }

    private renderToggleIcon() {
        this.toggleBtn.empty();
        if (this.isDetailsOpen) {
            this.toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
        } else {
            this.toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        }
    }

    update(task: WritingTask | null, report: CitationCoverageReport | null): void {
        if (!task) {
            this.panelEl.classList.add('is-empty');
            this.bodyEl.style.display = 'none';
            this.emptyEl.style.display = 'block';
            this.headerEl.style.display = 'none';
            return;
        }

        this.panelEl.classList.remove('is-empty');
        this.bodyEl.style.display = 'block';
        this.emptyEl.style.display = 'none';
        this.headerEl.style.display = 'flex';

        this.titleEl.setText(task.title);
        this.statusEl.setText(task.status);
        this.statusEl.className = 'claude-writing-task-status';
        this.statusEl.classList.toggle('is-paused', task.status === 'paused');
        this.statusEl.classList.toggle('is-completed', task.status === 'completed');

        this.renderWorkflowStepper(task.stage);

        this.objectiveEl.empty();
        this.objectiveEl.createEl('div', {
            cls: 'claude-writing-task-label',
            text: 'Objective',
        });
        this.objectiveEl.createEl('div', {
            cls: 'claude-writing-task-value',
            text: task.objective,
        });

        this.metadataEl.empty();
        this.metadataEl.addClass('claude-writing-metadata-row');
        this.renderInlineEditField(this.metadataEl, 'Audience', 'audience', task.audience);
        this.renderInlineEditField(this.metadataEl, 'Tone', 'tone', task.tone);
        this.renderInlineEditField(this.metadataEl, 'Length', 'targetLength', task.targetLength);

        this.renderMetrics(report);
        this.renderDraftVersions(task);
    }

    private renderWorkflowStepper(currentStage: WritingStage): void {
        const container = this.stagesEl; // Reuse stagesEl container for stepper
        container.empty();
        
        const stepper = container.createEl('div', {
            cls: 'claude-workflow-stepper',
        });

        const currentIndex = STAGE_ORDER.indexOf(currentStage);

        STAGE_ORDER.forEach((stage, index) => {
            const node = stepper.createEl('div', {
                cls: 'claude-workflow-node',
            });
            
            // State classes
            if (index < currentIndex) {
                node.addClass('is-completed');
            } else if (index === currentIndex) {
                node.addClass('is-active');
            } else {
                node.addClass('is-pending');
            }

            // Clickable (except maybe future ones? No, let's allow jumping)
            node.addEventListener('click', () => this.callbacks.onRunStage(stage));
            node.setAttribute('title', `Run ${STAGE_LABELS[stage]}`);

            // Icon/Dot
            const dot = node.createEl('div', { cls: 'claude-workflow-dot' });
            if (index < currentIndex) {
                dot.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            }

            // Label
            node.createEl('span', {
                cls: 'claude-workflow-label',
                text: STAGE_LABELS[stage],
            });
            
            // Connecting line (except for last item)
            if (index < STAGE_ORDER.length - 1) {
                const line = stepper.createEl('div', { cls: 'claude-workflow-line' });
                if (index < currentIndex) {
                    line.addClass('is-completed');
                }
            }
        });
    }

    destroy(): void {
        this.panelEl.remove();
    }

    private renderInlineEditField(container: HTMLElement, label: string, key: string, value: string): void {
        const wrapper = container.createEl('div', { cls: 'claude-writing-inline-edit' });
        wrapper.createEl('span', {
            cls: 'claude-writing-inline-edit-label',
            text: `${label}: `,
        });
        const valueEl = wrapper.createEl('span', {
            cls: 'claude-writing-inline-edit-value',
            text: value,
        });
        valueEl.setAttribute('tabindex', '0');
        valueEl.setAttribute('role', 'button');
        valueEl.setAttribute('aria-label', `Edit ${label}`);

        const startEdit = () => {
            const input = wrapper.createEl('input', {
                cls: 'claude-writing-inline-edit-input',
                type: 'text',
                value: value,
            });
            valueEl.style.display = 'none';
            input.focus();
            input.select();

            const commit = () => {
                const newValue = input.value.trim();
                if (newValue && newValue !== value) {
                    this.callbacks.onUpdateTaskProperty?.(key, newValue);
                }
                input.remove();
                valueEl.style.display = '';
            };

            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    input.removeEventListener('blur', commit);
                    input.remove();
                    valueEl.style.display = '';
                }
            });
        };

        valueEl.addEventListener('click', startEdit);
        valueEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startEdit();
            }
        });
    }



    private renderMetrics(report: CitationCoverageReport | null): void {
        this.metricsEl.empty();

        this.metricsEl.createEl('div', {
            cls: 'claude-writing-task-label',
            text: 'Citation Coverage',
        });

        if (!report || report.totalClaims === 0) {
            this.metricsEl.createEl('div', {
                cls: 'claude-writing-task-value',
                text: 'No citation report yet. Run `/write draft` or `/write evidence`.',
            });
            return;
        }

        const pct = Math.round(report.coverage * 100);
        const coverageText = `${pct}% (${report.citedClaims}/${report.totalClaims})`;
        this.metricsEl.createEl('div', {
            cls: 'claude-writing-task-value',
            text: `${coverageText} \u00B7 Sources: ${report.sourceCount}`,
        });

        const barContainer = this.metricsEl.createEl('div', {
            cls: 'claude-writing-metrics-bar-container',
        });
        const bar = barContainer.createEl('div', {
            cls: 'claude-writing-metrics-bar',
        });
        const severityCls = pct >= 80 ? 'claude-writing-metrics-severity-low'
            : pct >= 50 ? 'claude-writing-metrics-severity-medium'
            : 'claude-writing-metrics-severity-high';
        bar.addClass(severityCls);
        bar.style.width = `${pct}%`;

        if (report.uncitedClaims.length > 0) {
            const uncitedLabel = this.metricsEl.createEl('div', {
                cls: 'claude-writing-task-label claude-writing-metrics-uncited-label',
                text: `Uncited Claims (${report.uncitedClaims.length})`,
            });
            uncitedLabel.addClass(severityCls);

            const list = this.metricsEl.createEl('ul', {
                cls: 'claude-writing-task-uncited-list',
            });
            for (const claim of report.uncitedClaims.slice(0, 3)) {
                list.createEl('li', { text: claim });
            }
        }
    }

    private renderDraftVersions(task: WritingTask): void {
        this.versionsEl.empty();
        this.versionsEl.createEl('div', {
            cls: 'claude-writing-task-label',
            text: 'Draft Versions',
        });

        if (task.draftVersions.length === 0) {
            this.versionsEl.createEl('div', {
                cls: 'claude-writing-task-value',
                text: 'No versions yet. Run `/write draft` to capture first snapshot.',
            });
            return;
        }

        const listEl = this.versionsEl.createEl('div', {
            cls: 'claude-writing-version-list',
        });

        const recent = task.draftVersions.slice(-5).reverse();
        for (const version of recent) {
            this.renderVersionRow(listEl, version, task.currentDraftVersionId === version.id);
        }
    }

    private renderVersionRow(container: HTMLElement, version: DraftVersion, isCurrent: boolean): void {
        const row = container.createEl('div', {
            cls: 'claude-writing-version-row',
        });
        if (isCurrent) {
            row.addClass('is-current');
        }

        const meta = row.createEl('div', {
            cls: 'claude-writing-version-meta',
        });
        const label = meta.createEl('div', {
            cls: 'claude-writing-version-label',
            text: version.label,
        });
        if (isCurrent) {
            label.createEl('span', {
                cls: 'claude-writing-version-current',
                text: 'Current',
            });
        }

        const detailParts: string[] = [
            version.stage,
            this.formatTime(version.createdAt),
        ];
        if (typeof version.citationCoverage === 'number') {
            detailParts.push(`cite ${Math.round(version.citationCoverage * 100)}%`);
        }
        meta.createEl('div', {
            cls: 'claude-writing-version-detail',
            text: detailParts.join(' · '),
        });

        const actions = row.createEl('div', {
            cls: 'claude-writing-version-actions',
        });

        const compareBtn = actions.createEl('button', {
            cls: 'claude-writing-version-compare',
            text: 'Compare',
        });
        compareBtn.disabled = isCurrent;
        compareBtn.addEventListener('click', () => this.callbacks.onCompareDraftVersion(version.id));

        const rollbackBtn = actions.createEl('button', {
            cls: 'claude-writing-version-rollback',
            text: 'Rollback',
        });
        rollbackBtn.disabled = isCurrent;
        rollbackBtn.addEventListener('click', () => this.callbacks.onRollbackDraftVersion(version.id));
    }

    private formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}
