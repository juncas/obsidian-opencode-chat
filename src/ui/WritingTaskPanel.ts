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
    private bodyEl: HTMLElement;
    private objectiveEl: HTMLElement;
    private metadataEl: HTMLElement;
    private stagesEl: HTMLElement;
    private stageHistoryEl: HTMLElement;
    private versionsEl: HTMLElement;
    private metricsEl: HTMLElement;
    private emptyEl: HTMLElement;

    constructor(
        parentEl: HTMLElement,
        private callbacks: {
            onStartTask: () => void;
            onRunStage: (stage: WritingStage) => void;
            onPauseTask: () => void;
            onResumeTask: () => void;
            onCompleteTask: () => void;
            onRollbackDraftVersion: (versionId: string) => void;
            onUpdateTaskProperty?: (key: string, value: string) => void;
        }
    ) {
        this.panelEl = parentEl.createEl('div', {
            cls: 'claude-writing-task-panel',
        });

        this.headerEl = this.panelEl.createEl('div', {
            cls: 'claude-writing-task-header',
        });
        this.titleEl = this.headerEl.createEl('div', {
            cls: 'claude-writing-task-title',
            text: 'Writing Agent',
        });
        this.statusEl = this.headerEl.createEl('span', {
            cls: 'claude-writing-task-status',
        });

        this.bodyEl = this.panelEl.createEl('div', {
            cls: 'claude-writing-task-body',
        });

        this.objectiveEl = this.bodyEl.createEl('div', {
            cls: 'claude-writing-task-objective',
        });

        this.metadataEl = this.bodyEl.createEl('div', {
            cls: 'claude-writing-task-metadata',
        });

        this.stagesEl = this.bodyEl.createEl('div', {
            cls: 'claude-writing-task-stages',
        });

        this.stageHistoryEl = this.bodyEl.createEl('div', {
            cls: 'claude-writing-task-stage-history',
        });

        this.metricsEl = this.bodyEl.createEl('div', {
            cls: 'claude-writing-task-metrics',
        });

        this.versionsEl = this.bodyEl.createEl('div', {
            cls: 'claude-writing-task-versions',
        });

        this.emptyEl = this.panelEl.createEl('div', {
            cls: 'claude-writing-task-empty',
        });

        const emptyTitle = this.emptyEl.createEl('div', {
            cls: 'claude-writing-task-empty-title',
            text: 'No active writing task',
        });
        emptyTitle.setAttribute('aria-hidden', 'true');

        this.emptyEl.createEl('div', {
            cls: 'claude-writing-task-empty-text',
            text: 'Start with `/write start <topic>` to create a structured writing workflow.',
        });

        const startButton = this.emptyEl.createEl('button', {
            cls: 'claude-writing-task-empty-action',
            text: 'Start Task',
        });
        startButton.addEventListener('click', () => this.callbacks.onStartTask());
    }

    update(task: WritingTask | null, report: CitationCoverageReport | null): void {
        if (!task) {
            this.panelEl.classList.add('is-empty');
            this.statusEl.setText('Idle');
            this.titleEl.setText('Writing Agent');
            this.bodyEl.style.display = 'none';
            this.emptyEl.style.display = 'block';
            return;
        }

        this.panelEl.classList.remove('is-empty');
        this.bodyEl.style.display = 'block';
        this.emptyEl.style.display = 'none';

        this.titleEl.setText(task.title);
        this.statusEl.setText(`${task.status} · ${STAGE_LABELS[task.stage]}`);
        this.statusEl.classList.toggle('is-paused', task.status === 'paused');
        this.statusEl.classList.toggle('is-completed', task.status === 'completed');

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
        this.renderInlineEditField(this.metadataEl, 'Audience', 'audience', task.audience);
        this.renderInlineEditField(this.metadataEl, 'Tone', 'tone', task.tone);
        this.renderInlineEditField(this.metadataEl, 'Length', 'targetLength', task.targetLength);

        this.renderStageButtons(task.stage);
        this.renderStageHistory(task.stageHistory || []);
        this.renderDraftVersions(task);
        this.renderMetrics(report);
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

    private renderStageHistory(history: StageTransition[]): void {
        this.stageHistoryEl.empty();

        if (history.length === 0) {
            return;
        }

        this.stageHistoryEl.createEl('div', {
            cls: 'claude-writing-task-label',
            text: 'Stage History',
        });

        const listEl = this.stageHistoryEl.createEl('div', {
            cls: 'claude-writing-stage-history-list',
        });

        const recent = history.slice(-5).reverse();
        for (const transition of recent) {
            const itemEl = listEl.createEl('div', {
                cls: 'claude-writing-stage-history-item',
            });
            itemEl.createEl('span', {
                cls: 'claude-writing-stage-history-from',
                text: STAGE_LABELS[transition.from],
            });
            itemEl.createEl('span', {
                cls: 'claude-writing-stage-history-arrow',
                text: '\u2192',
            });
            itemEl.createEl('span', {
                cls: 'claude-writing-stage-history-to',
                text: STAGE_LABELS[transition.to],
            });
            itemEl.createEl('span', {
                cls: 'claude-writing-stage-history-time',
                text: this.formatTime(transition.timestamp),
            });
        }
    }

    private renderStageButtons(activeStage: WritingStage): void {
        this.stagesEl.empty();
        const actionsEl = this.stagesEl.createEl('div', {
            cls: 'claude-writing-stage-actions',
        });

        for (const stage of STAGE_ORDER) {
            const button = actionsEl.createEl('button', {
                cls: 'claude-writing-stage-button',
                text: STAGE_LABELS[stage],
            });
            if (stage === activeStage) {
                button.addClass('is-active');
            }
            button.addEventListener('click', () => this.callbacks.onRunStage(stage));
        }

        const stateActions = this.stagesEl.createEl('div', {
            cls: 'claude-writing-state-actions',
        });

        const pauseButton = stateActions.createEl('button', {
            cls: 'claude-writing-state-button',
            text: 'Pause',
        });
        pauseButton.addEventListener('click', () => this.callbacks.onPauseTask());

        const resumeButton = stateActions.createEl('button', {
            cls: 'claude-writing-state-button',
            text: 'Resume',
        });
        resumeButton.addEventListener('click', () => this.callbacks.onResumeTask());

        const completeButton = stateActions.createEl('button', {
            cls: 'claude-writing-state-button is-primary',
            text: 'Complete',
        });
        completeButton.addEventListener('click', () => this.callbacks.onCompleteTask());
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

        const rollbackBtn = row.createEl('button', {
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
