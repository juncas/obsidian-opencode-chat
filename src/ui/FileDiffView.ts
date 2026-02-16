import type { FileDiff } from '../types/opencode';

type DiffRowType = 'unchanged' | 'added' | 'removed' | 'modified' | 'context';
type DiffOperationType = 'unchanged' | 'added' | 'removed';

interface DiffRow {
    type: DiffRowType;
    beforeLineNumber: number | null;
    afterLineNumber: number | null;
    beforeText: string;
    afterText: string;
    hiddenCount?: number;
}

interface DiffOperation {
    type: DiffOperationType;
    text: string;
}

const CONTEXT_LINES = 3;
const MIN_COLLAPSE_SIZE = 8;
const MAX_RENDER_ROWS = 800;
const MAX_LCS_CELLS = 250_000;

export class FileDiffView {
    private containerEl: HTMLElement;
    private headerEl: HTMLElement;
    private iconEl: HTMLElement;
    private pathEl: HTMLElement;
    private statsEl: HTMLElement;
    private chevronEl: HTMLElement;
    private bodyEl: HTMLElement;
    private tableEl: HTMLElement;
    private isCollapsed = true;

    constructor(parentEl: HTMLElement, diff: FileDiff) {
        this.containerEl = parentEl.createEl('div', {
            cls: 'claude-file-diff',
        });

        this.headerEl = this.containerEl.createEl('div', {
            cls: 'claude-file-diff-header',
        });
        this.headerEl.addEventListener('click', () => this.toggleCollapse());

        this.iconEl = this.headerEl.createEl('span', {
            cls: 'claude-file-diff-icon',
            text: 'Δ',
        });
        this.pathEl = this.headerEl.createEl('span', {
            cls: 'claude-file-diff-path',
        });
        this.statsEl = this.headerEl.createEl('span', {
            cls: 'claude-file-diff-stats',
        });
        this.chevronEl = this.headerEl.createEl('span', {
            cls: 'claude-file-diff-chevron',
        });

        this.bodyEl = this.containerEl.createEl('div', {
            cls: 'claude-file-diff-body',
        });
        this.bodyEl.style.display = 'none';

        const tableHeaderEl = this.bodyEl.createEl('div', {
            cls: 'claude-file-diff-table-header',
        });
        tableHeaderEl.createEl('span', {
            cls: 'claude-file-diff-table-title',
            text: 'Before',
        });
        tableHeaderEl.createEl('span', {
            cls: 'claude-file-diff-table-title',
            text: 'After',
        });

        this.tableEl = this.bodyEl.createEl('div', {
            cls: 'claude-file-diff-table',
        });

        this.update(diff);
    }

    update(diff: FileDiff): void {
        this.pathEl.setText(diff.file);
        this.renderStats(diff);
        this.renderRows(diff);
        this.chevronEl.setText(this.isCollapsed ? '▶' : '▼');
    }

    destroy(): void {
        this.containerEl.remove();
    }

    private toggleCollapse(): void {
        this.isCollapsed = !this.isCollapsed;
        this.bodyEl.style.display = this.isCollapsed ? 'none' : 'block';
        this.chevronEl.setText(this.isCollapsed ? '▶' : '▼');
    }

    private renderStats(diff: FileDiff): void {
        this.statsEl.empty();
        this.statsEl.createEl('span', {
            cls: 'claude-file-diff-stat-additions',
            text: `+${diff.additions}`,
        });
        this.statsEl.createEl('span', {
            cls: 'claude-file-diff-stat-deletions',
            text: `-${diff.deletions}`,
        });
    }

    private renderRows(diff: FileDiff): void {
        this.tableEl.empty();

        const rows = this.buildDisplayRows(diff.before, diff.after);
        const renderRows = rows.slice(0, MAX_RENDER_ROWS);

        for (const row of renderRows) {
            this.renderRow(row);
        }

        if (rows.length > MAX_RENDER_ROWS) {
            const omitted = rows.length - MAX_RENDER_ROWS;
            const rowEl = this.tableEl.createEl('div', {
                cls: 'claude-file-diff-row claude-file-diff-row-context',
            });
            rowEl.createEl('div', {
                cls: 'claude-file-diff-context',
                text: `... omitted ${omitted} additional rows ...`,
            });
        }

        if (rows.length === 0) {
            const rowEl = this.tableEl.createEl('div', {
                cls: 'claude-file-diff-row claude-file-diff-row-context',
            });
            rowEl.createEl('div', {
                cls: 'claude-file-diff-context',
                text: 'No textual changes.',
            });
        }
    }

    private renderRow(row: DiffRow): void {
        const rowEl = this.tableEl.createEl('div', {
            cls: `claude-file-diff-row claude-file-diff-row-${row.type}`,
        });

        if (row.type === 'context') {
            rowEl.createEl('div', {
                cls: 'claude-file-diff-context',
                text: `... ${row.hiddenCount ?? 0} unchanged lines ...`,
            });
            return;
        }

        rowEl.createEl('div', {
            cls: 'claude-file-diff-line-number',
            text: row.beforeLineNumber !== null ? String(row.beforeLineNumber) : '',
        });
        rowEl.createEl('div', {
            cls: 'claude-file-diff-line-content',
            text: row.beforeText,
        });
        rowEl.createEl('div', {
            cls: 'claude-file-diff-line-number',
            text: row.afterLineNumber !== null ? String(row.afterLineNumber) : '',
        });
        rowEl.createEl('div', {
            cls: 'claude-file-diff-line-content',
            text: row.afterText,
        });
    }

    private buildDisplayRows(before: string, after: string): DiffRow[] {
        const beforeLines = this.toLines(before);
        const afterLines = this.toLines(after);

        const aligned = this.alignLines(beforeLines, afterLines);
        return this.collapseUnchanged(aligned);
    }

    private toLines(text: string): string[] {
        if (!text) {
            return [];
        }

        const normalized = text.replace(/\r\n/g, '\n');
        const lines = normalized.split('\n');

        // Ignore trailing newline-only row for readability.
        if (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }

        return lines;
    }

    private alignLines(beforeLines: string[], afterLines: string[]): DiffRow[] {
        const cellCount = beforeLines.length * afterLines.length;
        const operations =
            cellCount <= MAX_LCS_CELLS
                ? this.computeLcsOperations(beforeLines, afterLines)
                : this.computeHeuristicOperations(beforeLines, afterLines);

        return this.operationsToRows(operations);
    }

    private computeLcsOperations(beforeLines: string[], afterLines: string[]): DiffOperation[] {
        const beforeCount = beforeLines.length;
        const afterCount = afterLines.length;
        const width = afterCount + 1;
        const dp = new Uint32Array((beforeCount + 1) * (afterCount + 1));

        for (let beforeIdx = 1; beforeIdx <= beforeCount; beforeIdx += 1) {
            for (let afterIdx = 1; afterIdx <= afterCount; afterIdx += 1) {
                const current = beforeIdx * width + afterIdx;
                if (beforeLines[beforeIdx - 1] === afterLines[afterIdx - 1]) {
                    dp[current] = dp[(beforeIdx - 1) * width + (afterIdx - 1)] + 1;
                    continue;
                }

                const fromTop = dp[(beforeIdx - 1) * width + afterIdx];
                const fromLeft = dp[beforeIdx * width + (afterIdx - 1)];
                dp[current] = fromTop >= fromLeft ? fromTop : fromLeft;
            }
        }

        const operations: DiffOperation[] = [];
        let beforeIdx = beforeCount;
        let afterIdx = afterCount;

        while (beforeIdx > 0 && afterIdx > 0) {
            const beforeLine = beforeLines[beforeIdx - 1];
            const afterLine = afterLines[afterIdx - 1];

            if (beforeLine === afterLine) {
                operations.push({
                    type: 'unchanged',
                    text: beforeLine,
                });
                beforeIdx -= 1;
                afterIdx -= 1;
                continue;
            }

            const fromTop = dp[(beforeIdx - 1) * width + afterIdx];
            const fromLeft = dp[beforeIdx * width + (afterIdx - 1)];
            if (fromLeft > fromTop) {
                operations.push({
                    type: 'added',
                    text: afterLine,
                });
                afterIdx -= 1;
            } else {
                operations.push({
                    type: 'removed',
                    text: beforeLine,
                });
                beforeIdx -= 1;
            }
        }

        while (beforeIdx > 0) {
            operations.push({
                type: 'removed',
                text: beforeLines[beforeIdx - 1],
            });
            beforeIdx -= 1;
        }

        while (afterIdx > 0) {
            operations.push({
                type: 'added',
                text: afterLines[afterIdx - 1],
            });
            afterIdx -= 1;
        }

        operations.reverse();
        return operations;
    }

    private computeHeuristicOperations(beforeLines: string[], afterLines: string[]): DiffOperation[] {
        const operations: DiffOperation[] = [];
        let beforeIdx = 0;
        let afterIdx = 0;

        while (beforeIdx < beforeLines.length && afterIdx < afterLines.length) {
            const beforeLine = beforeLines[beforeIdx];
            const afterLine = afterLines[afterIdx];

            if (beforeLine === afterLine) {
                operations.push({
                    type: 'unchanged',
                    text: beforeLine,
                });
                beforeIdx += 1;
                afterIdx += 1;
                continue;
            }

            if (beforeIdx + 1 < beforeLines.length && beforeLines[beforeIdx + 1] === afterLine) {
                operations.push({
                    type: 'removed',
                    text: beforeLine,
                });
                beforeIdx += 1;
                continue;
            }

            if (afterIdx + 1 < afterLines.length && beforeLine === afterLines[afterIdx + 1]) {
                operations.push({
                    type: 'added',
                    text: afterLine,
                });
                afterIdx += 1;
                continue;
            }

            operations.push({
                type: 'removed',
                text: beforeLine,
            });
            operations.push({
                type: 'added',
                text: afterLine,
            });
            beforeIdx += 1;
            afterIdx += 1;
        }

        while (beforeIdx < beforeLines.length) {
            operations.push({
                type: 'removed',
                text: beforeLines[beforeIdx],
            });
            beforeIdx += 1;
        }

        while (afterIdx < afterLines.length) {
            operations.push({
                type: 'added',
                text: afterLines[afterIdx],
            });
            afterIdx += 1;
        }

        return operations;
    }

    private operationsToRows(operations: DiffOperation[]): DiffRow[] {
        const rows: DiffRow[] = [];
        let beforeLineNo = 1;
        let afterLineNo = 1;

        let pendingRemoved: string[] = [];
        let pendingAdded: string[] = [];

        const flushPendingChanges = () => {
            if (pendingRemoved.length === 0 && pendingAdded.length === 0) {
                return;
            }

            const pairedCount = Math.min(pendingRemoved.length, pendingAdded.length);
            for (let idx = 0; idx < pairedCount; idx += 1) {
                rows.push({
                    type: 'modified',
                    beforeLineNumber: beforeLineNo,
                    afterLineNumber: afterLineNo,
                    beforeText: pendingRemoved[idx],
                    afterText: pendingAdded[idx],
                });
                beforeLineNo += 1;
                afterLineNo += 1;
            }

            for (let idx = pairedCount; idx < pendingRemoved.length; idx += 1) {
                rows.push({
                    type: 'removed',
                    beforeLineNumber: beforeLineNo,
                    afterLineNumber: null,
                    beforeText: pendingRemoved[idx],
                    afterText: '',
                });
                beforeLineNo += 1;
            }

            for (let idx = pairedCount; idx < pendingAdded.length; idx += 1) {
                rows.push({
                    type: 'added',
                    beforeLineNumber: null,
                    afterLineNumber: afterLineNo,
                    beforeText: '',
                    afterText: pendingAdded[idx],
                });
                afterLineNo += 1;
            }

            pendingRemoved = [];
            pendingAdded = [];
        };

        for (const operation of operations) {
            if (operation.type === 'unchanged') {
                flushPendingChanges();
                rows.push({
                    type: 'unchanged',
                    beforeLineNumber: beforeLineNo,
                    afterLineNumber: afterLineNo,
                    beforeText: operation.text,
                    afterText: operation.text,
                });
                beforeLineNo += 1;
                afterLineNo += 1;
                continue;
            }

            if (operation.type === 'removed') {
                pendingRemoved.push(operation.text);
            } else {
                pendingAdded.push(operation.text);
            }
        }

        flushPendingChanges();
        return rows;
    }

    private collapseUnchanged(rows: DiffRow[]): DiffRow[] {
        const output: DiffRow[] = [];
        let unchangedStart = -1;

        const flushUnchanged = (endIdxExclusive: number) => {
            if (unchangedStart < 0) {
                return;
            }

            const run = rows.slice(unchangedStart, endIdxExclusive);
            if (run.length < MIN_COLLAPSE_SIZE) {
                output.push(...run);
            } else {
                output.push(...run.slice(0, CONTEXT_LINES));
                const hidden = run.length - CONTEXT_LINES * 2;
                if (hidden > 0) {
                    output.push({
                        type: 'context',
                        beforeLineNumber: null,
                        afterLineNumber: null,
                        beforeText: '',
                        afterText: '',
                        hiddenCount: hidden,
                    });
                }
                output.push(...run.slice(-CONTEXT_LINES));
            }

            unchangedStart = -1;
        };

        rows.forEach((row, idx) => {
            if (row.type === 'unchanged') {
                if (unchangedStart < 0) {
                    unchangedStart = idx;
                }
                return;
            }

            flushUnchanged(idx);
            output.push(row);
        });

        flushUnchanged(rows.length);
        return output;
    }
}
