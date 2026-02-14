interface DiffHunk {
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    lines: string[];
}

function lcsTable(a: string[], b: string[]): number[][] {
    const m = a.length;
    const n = b.length;
    const table: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                table[i][j] = table[i - 1][j - 1] + 1;
            } else {
                table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
            }
        }
    }

    return table;
}

function backtrack(
    table: number[][],
    a: string[],
    b: string[],
    i: number,
    j: number,
    ops: Array<{ type: 'equal' | 'delete' | 'insert'; line: string; oldIdx: number; newIdx: number }>
): void {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        backtrack(table, a, b, i - 1, j - 1, ops);
        ops.push({ type: 'equal', line: a[i - 1], oldIdx: i, newIdx: j });
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
        backtrack(table, a, b, i, j - 1, ops);
        ops.push({ type: 'insert', line: b[j - 1], oldIdx: i, newIdx: j });
    } else if (i > 0) {
        backtrack(table, a, b, i - 1, j, ops);
        ops.push({ type: 'delete', line: a[i - 1], oldIdx: i, newIdx: j });
    }
}

function buildHunks(
    ops: Array<{ type: 'equal' | 'delete' | 'insert'; line: string; oldIdx: number; newIdx: number }>,
    contextLines: number
): DiffHunk[] {
    const changes: number[] = [];
    for (let i = 0; i < ops.length; i++) {
        if (ops[i].type !== 'equal') {
            changes.push(i);
        }
    }

    if (changes.length === 0) {
        return [];
    }

    const hunks: DiffHunk[] = [];
    let hunkStart = Math.max(0, changes[0] - contextLines);
    let hunkEnd = Math.min(ops.length - 1, changes[0] + contextLines);

    for (let ci = 1; ci < changes.length; ci++) {
        const nextStart = Math.max(0, changes[ci] - contextLines);
        if (nextStart <= hunkEnd + 1) {
            hunkEnd = Math.min(ops.length - 1, changes[ci] + contextLines);
        } else {
            hunks.push(extractHunk(ops, hunkStart, hunkEnd));
            hunkStart = nextStart;
            hunkEnd = Math.min(ops.length - 1, changes[ci] + contextLines);
        }
    }

    hunks.push(extractHunk(ops, hunkStart, hunkEnd));
    return hunks;
}

function extractHunk(
    ops: Array<{ type: 'equal' | 'delete' | 'insert'; line: string; oldIdx: number; newIdx: number }>,
    start: number,
    end: number
): DiffHunk {
    const lines: string[] = [];
    let oldStart = 0;
    let oldCount = 0;
    let newStart = 0;
    let newCount = 0;
    let firstOld = true;
    let firstNew = true;

    for (let i = start; i <= end; i++) {
        const op = ops[i];
        switch (op.type) {
            case 'equal':
                lines.push(` ${op.line}`);
                if (firstOld) { oldStart = op.oldIdx; firstOld = false; }
                if (firstNew) { newStart = op.newIdx; firstNew = false; }
                oldCount++;
                newCount++;
                break;
            case 'delete':
                lines.push(`-${op.line}`);
                if (firstOld) { oldStart = op.oldIdx; firstOld = false; }
                oldCount++;
                break;
            case 'insert':
                lines.push(`+${op.line}`);
                if (firstNew) { newStart = op.newIdx; firstNew = false; }
                newCount++;
                break;
        }
    }

    return { oldStart, oldCount, newStart, newCount, lines };
}

/**
 * Produce a unified diff string comparing two text blocks.
 *
 * @param oldText  - The "before" text (e.g., earlier draft version)
 * @param newText  - The "after" text (e.g., current draft version)
 * @param oldLabel - Header label for the old version
 * @param newLabel - Header label for the new version
 * @param context  - Number of context lines around changes (default 3)
 * @returns A unified diff string, or null if the texts are identical
 */
export function unifiedDiff(
    oldText: string,
    newText: string,
    oldLabel: string,
    newLabel: string,
    context = 3
): string | null {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    const table = lcsTable(oldLines, newLines);
    const ops: Array<{ type: 'equal' | 'delete' | 'insert'; line: string; oldIdx: number; newIdx: number }> = [];
    backtrack(table, oldLines, newLines, oldLines.length, newLines.length, ops);

    const hunks = buildHunks(ops, context);
    if (hunks.length === 0) {
        return null;
    }

    const output: string[] = [
        `--- ${oldLabel}`,
        `+++ ${newLabel}`,
    ];

    for (const hunk of hunks) {
        output.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
        output.push(...hunk.lines);
    }

    return output.join('\n');
}
