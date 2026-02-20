import { App, TFile, WorkspaceLeaf, Notice } from 'obsidian';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, Compartment } from '@codemirror/state';
import type { FileDiff } from '../types/opencode';

interface DiffRange {
    from: number;
    to: number;
    type: 'added' | 'removed' | 'modified';
    beforeText?: string;
    afterText?: string;
}

interface ActiveDiff {
    file: string;
    ranges: DiffRange[];
    cleanup: () => void;
}

export class DiffHighlighter {
    private app: App;
    private activeDiffs: Map<string, ActiveDiff> = new Map();

    constructor(app: App) {
        this.app = app;
    }

    async showDiffInEditor(diff: FileDiff): Promise<boolean> {
        const file = this.app.vault.getAbstractFileByPath(diff.file);
        if (!(file instanceof TFile)) {
            new Notice(`File not found: ${diff.file}`);
            return false;
        }

        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);

        const editor = this.getEditorFromLeaf(leaf);
        if (!editor) {
            new Notice('Could not access editor');
            return false;
        }

        this.clearDiff(diff.file);

        const ranges = this.computeDiffRanges(diff);
        if (ranges.length === 0) {
            new Notice('No changes to highlight');
            return true;
        }

        const cleanup = this.applyDecorations(editor, ranges);
        
        this.activeDiffs.set(diff.file, {
            file: diff.file,
            ranges,
            cleanup,
        });

        this.scrollToFirstChange(editor, ranges);

        new Notice(`Showing ${ranges.length} changes in ${diff.file}`);
        return true;
    }

    private getEditorFromLeaf(leaf: WorkspaceLeaf): EditorView | null {
        const view = (leaf.view as any);
        if (view.editor?.cm) {
            return view.editor.cm as EditorView;
        }
        return null;
    }

    private computeDiffRanges(diff: FileDiff): DiffRange[] {
        const ranges: DiffRange[] = [];
        const beforeLines = this.toLines(diff.before);
        const afterLines = this.toLines(diff.after);

        const operations = this.computeDiffOperations(beforeLines, afterLines);
        
        let lineIndex = 0;
        let pendingRemoved: { text: string; originalIndex: number }[] = [];
        let pendingAdded: { text: string; newIndex: number }[] = [];

        const flushPending = () => {
            const paired = Math.min(pendingRemoved.length, pendingAdded.length);
            
            for (let i = 0; i < paired; i++) {
                const removed = pendingRemoved[i];
                const added = pendingAdded[i];
                ranges.push({
                    from: added.newIndex,
                    to: added.newIndex + 1,
                    type: 'modified',
                    beforeText: removed.text,
                    afterText: added.text,
                });
            }

            for (let i = paired; i < pendingRemoved.length; i++) {
                // Removed lines - can't highlight in the new file
                // We could add a widget but that's more complex
            }

            for (let i = paired; i < pendingAdded.length; i++) {
                const added = pendingAdded[i];
                ranges.push({
                    from: added.newIndex,
                    to: added.newIndex + 1,
                    type: 'added',
                    afterText: added.text,
                });
            }

            pendingRemoved = [];
            pendingAdded = [];
        };

        for (const op of operations) {
            if (op.type === 'unchanged') {
                flushPending();
                lineIndex++;
            } else if (op.type === 'removed') {
                pendingRemoved.push({ text: op.text, originalIndex: lineIndex });
            } else if (op.type === 'added') {
                pendingAdded.push({ text: op.text, newIndex: lineIndex });
                lineIndex++;
            }
        }

        flushPending();
        return ranges;
    }

    private toLines(text: string): string[] {
        if (!text) return [];
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        if (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }
        return lines;
    }

    private computeDiffOperations(
        before: string[],
        after: string[]
    ): Array<{ type: 'unchanged' | 'removed' | 'added'; text: string }> {
        const result: Array<{ type: 'unchanged' | 'removed' | 'added'; text: string }> = [];
        
        const dp: number[][] = [];
        for (let i = 0; i <= before.length; i++) {
            dp[i] = [];
            for (let j = 0; j <= after.length; j++) {
                if (i === 0 && j === 0) {
                    dp[i][j] = 0;
                } else if (i === 0) {
                    dp[i][j] = j;
                } else if (j === 0) {
                    dp[i][j] = i;
                } else if (before[i - 1] === after[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
                }
            }
        }

        let i = before.length;
        let j = after.length;
        
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
                result.unshift({ type: 'unchanged', text: before[i - 1] });
                i--;
                j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
                result.unshift({ type: 'added', text: after[j - 1] });
                j--;
            } else if (i > 0) {
                result.unshift({ type: 'removed', text: before[i - 1] });
                i--;
            }
        }

        return result;
    }

    private applyDecorations(editor: EditorView, ranges: DiffRange[]): () => void {
        const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

        const state = editor.state;
        
        for (const range of ranges) {
            const lineInfo = state.doc.line(range.from);
            if (!lineInfo) continue;

            const lineStart = lineInfo.from;
            const lineEnd = lineInfo.to;

            let className: string;
            if (range.type === 'added') {
                className = 'cm-diff-highlight-added';
            } else if (range.type === 'removed') {
                className = 'cm-diff-highlight-removed';
            } else {
                className = 'cm-diff-highlight-modified';
            }

            const decoration = Decoration.line({
                class: className,
                attributes: range.beforeText ? {
                    'data-diff-before': range.beforeText,
                } : undefined,
            });

            decorations.push({
                from: lineStart,
                to: lineStart,
                decoration,
            });

            if (range.type === 'modified' && range.beforeText) {
                const widgetDec = Decoration.widget({
                    widget: new DiffTooltipWidget(range.beforeText, range.afterText || ''),
                    side: -1,
                });
                decorations.push({
                    from: lineStart,
                    to: lineStart,
                    decoration: widgetDec,
                });
            }
        }

        const extension = ViewPlugin.fromClass(class {
            decorations: DecorationSet;

            constructor() {
                const builder = new RangeSetBuilder<Decoration>();
                const sorted = [...decorations].sort((a, b) => a.from - b.from);
                for (const d of sorted) {
                    builder.add(d.from, d.to, d.decoration);
                }
                this.decorations = builder.finish();
            }

            update(_update: ViewUpdate) {}
        }, {
            decorations: (v: any) => v.decorations,
        });

        const compartment = this.createCompartment();
        editor.dispatch({
            effects: compartment.reconfigure(extension),
        });

        return () => {
            try {
                editor.dispatch({
                    effects: compartment.reconfigure([]),
                });
            } catch (e) {
                // Editor may have been closed
            }
        };
    }

    private createCompartment(): Compartment {
        return new Compartment();
    }

    private scrollToFirstChange(editor: EditorView, ranges: DiffRange[]): void {
        if (ranges.length === 0) return;

        const firstRange = ranges[0];
        const lineInfo = editor.state.doc.line(firstRange.from);
        if (lineInfo) {
            editor.dispatch({
                effects: EditorView.scrollIntoView(lineInfo.from, {
                    y: 'center',
                }),
            });
        }
    }

    clearDiff(filePath: string): void {
        const active = this.activeDiffs.get(filePath);
        if (active) {
            active.cleanup();
            this.activeDiffs.delete(filePath);
        }
    }

    clearAllDiffs(): void {
        for (const [_, active] of this.activeDiffs) {
            active.cleanup();
        }
        this.activeDiffs.clear();
        new Notice('All diff highlights cleared');
    }

    hasActiveDiff(filePath: string): boolean {
        return this.activeDiffs.has(filePath);
    }

    getActiveDiffFiles(): string[] {
        return Array.from(this.activeDiffs.keys());
    }
}

class DiffTooltipWidget extends WidgetType {
    constructor(
        private beforeText: string,
        private afterText: string
    ) {
        super();
    }

    toDOM(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'cm-diff-tooltip';
        
        const before = container.createEl('div', { cls: 'cm-diff-tooltip-before' });
        before.createEl('span', { cls: 'cm-diff-tooltip-label', text: 'Before:' });
        before.createEl('code', { text: this.beforeText });
        
        const arrow = container.createEl('div', { cls: 'cm-diff-tooltip-arrow', text: '→' });
        
        const after = container.createEl('div', { cls: 'cm-diff-tooltip-after' });
        after.createEl('span', { cls: 'cm-diff-tooltip-label', text: 'After:' });
        after.createEl('code', { text: this.afterText });

        return container;
    }

    eq(other: DiffTooltipWidget): boolean {
        return this.beforeText === other.beforeText && this.afterText === other.afterText;
    }

    get estimatedHeight(): number {
        return 60;
    }
}
