import type {
    AuditScope,
    DraftVersion,
    WritingContextSnapshot,
    WritingStage,
    WritingTask,
} from '../types/writing';

interface StageDescriptor {
    label: string;
    goal: string;
    outputContract: string;
}

const BASELINE_MAX_CHARS = 6000;

const STAGE_DESCRIPTORS: Record<WritingStage, StageDescriptor> = {
    discover: {
        label: 'Discovery',
        goal: 'Clarify scope, audience, constraints, and missing evidence before writing.',
        outputContract: [
            '## Task Brief',
            '- Objective:',
            '- Audience:',
            '- Key questions:',
            '',
            '## Information Gaps',
            '- Gap:',
            '- Why it matters:',
            '- Suggested retrieval action:',
            '',
            '## Execution Plan',
            '1. ...',
            '2. ...',
        ].join('\n'),
    },
    outline: {
        label: 'Outline',
        goal: 'Build a structured outline tied to evidence and intended reader flow.',
        outputContract: [
            '## Proposed Title',
            '- ...',
            '',
            '## Outline',
            '1. Section',
            '   - Key point',
            '   - Evidence link: [[path/to/note]]',
            '',
            '## Source Map',
            '- Claim -> [[path/to/note]]',
        ].join('\n'),
    },
    draft: {
        label: 'Draft',
        goal: 'Write a complete draft grounded in available notes and explicit citations.',
        outputContract: [
            '## Draft',
            '<full article or document>',
            '',
            '## Sources',
            '- [[path/to/note-a]]',
            '- [[path/to/note-b]]',
            '',
            '## Citation Coverage',
            '- Claims without direct evidence: <count and list>',
        ].join('\n'),
    },
    evidence: {
        label: 'Evidence Review',
        goal: 'Audit each key claim for source coverage and confidence level.',
        outputContract: [
            '## Claim Audit',
            '- Claim:',
            '  - Source:',
            '  - Confidence: high | medium | low',
            '  - Gap:',
            '',
            '## Risky Claims',
            '- ...',
            '',
            '## Remediation Actions',
            '1. ...',
            '2. ...',
        ].join('\n'),
    },
    polish: {
        label: 'Polish',
        goal: 'Improve readability, coherence, and style while preserving factual grounding.',
        outputContract: [
            '## Polished Version',
            '<improved content>',
            '',
            '## Major Edits',
            '- Edit:',
            '- Reason:',
            '',
            '## Source Integrity Check',
            '- Any citation removed/changed and why',
        ].join('\n'),
    },
    publish: {
        label: 'Publish',
        goal: 'Package final output for vault publishing with metadata and action checklist.',
        outputContract: [
            '## Final Title',
            '- ...',
            '',
            '## Final Content',
            '<ready-to-publish content>',
            '',
            '## Metadata',
            '- Tags:',
            '- Summary:',
            '- Suggested file path:',
            '',
            '## Publish Checklist',
            '- [ ] Citation validation',
            '- [ ] Link validation',
            '- [ ] Style review',
        ].join('\n'),
    },
};

export class WritingWorkflowService {
    private tasksBySession = new Map<string, WritingTask>();

    hydrateTask(sessionKey: string, task: WritingTask | null): void {
        if (!task) {
            this.tasksBySession.delete(sessionKey);
            return;
        }

        const draftVersions = (task.draftVersions || []).map((version) => ({
            ...version,
            createdAt: new Date(version.createdAt),
        }));

        this.tasksBySession.set(sessionKey, {
            ...task,
            draftVersions,
            currentDraftVersionId: task.currentDraftVersionId || draftVersions[draftVersions.length - 1]?.id || null,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
        });
    }

    createTask(sessionKey: string, objective: string): WritingTask {
        const now = new Date();
        const normalizedObjective = objective.trim();
        const task: WritingTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: this.toTaskTitle(normalizedObjective),
            objective: normalizedObjective,
            audience: 'General knowledge workers',
            tone: 'Clear, concise, evidence-driven',
            targetLength: '1200-1800 words',
            stage: 'discover',
            status: 'active',
            draftVersions: [],
            currentDraftVersionId: null,
            createdAt: now,
            updatedAt: now,
        };

        this.tasksBySession.set(sessionKey, task);
        return task;
    }

    ensureTask(sessionKey: string, fallbackObjective: string): WritingTask {
        const existing = this.tasksBySession.get(sessionKey);
        if (existing) {
            return existing;
        }
        return this.createTask(sessionKey, fallbackObjective);
    }

    getTask(sessionKey: string): WritingTask | null {
        return this.tasksBySession.get(sessionKey) || null;
    }

    getCurrentDraftVersion(sessionKey: string): DraftVersion | null {
        const task = this.tasksBySession.get(sessionKey);
        if (!task || !task.currentDraftVersionId) {
            return null;
        }

        return task.draftVersions.find((version) => version.id === task.currentDraftVersionId) || null;
    }

    updateStage(sessionKey: string, stage: WritingStage): WritingTask | null {
        const task = this.tasksBySession.get(sessionKey);
        if (!task) {
            return null;
        }
        task.stage = stage;
        task.updatedAt = new Date();
        return task;
    }

    addDraftVersion(
        sessionKey: string,
        stage: WritingStage,
        content: string,
        metrics?: { citationCoverage?: number; sourceCount?: number }
    ): { task: WritingTask; version: DraftVersion; created: boolean } | null {
        const task = this.tasksBySession.get(sessionKey);
        if (!task) {
            return null;
        }

        const normalizedContent = content.trim();
        if (!normalizedContent) {
            return null;
        }

        const currentVersion = this.getCurrentDraftVersion(sessionKey);
        if (currentVersion && currentVersion.content.trim() === normalizedContent) {
            return {
                task,
                version: currentVersion,
                created: false,
            };
        }

        const now = new Date();
        const versionIndex = task.draftVersions.length + 1;
        const version: DraftVersion = {
            id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            stage,
            label: `${this.stageLabel(stage)} v${versionIndex}`,
            content: normalizedContent,
            createdAt: now,
            citationCoverage: metrics?.citationCoverage,
            sourceCount: metrics?.sourceCount,
        };

        task.draftVersions.push(version);
        task.currentDraftVersionId = version.id;
        task.updatedAt = now;

        return { task, version, created: true };
    }

    rollbackToDraftVersion(sessionKey: string, versionId: string): { task: WritingTask; version: DraftVersion } | null {
        const task = this.tasksBySession.get(sessionKey);
        if (!task) {
            return null;
        }

        const version = task.draftVersions.find((item) => item.id === versionId);
        if (!version) {
            return null;
        }

        task.currentDraftVersionId = version.id;
        task.stage = version.stage;
        task.status = 'active';
        task.updatedAt = new Date();

        return { task, version };
    }

    buildStagePrompt(
        stage: WritingStage,
        userRequest: string,
        context: WritingContextSnapshot,
        task: WritingTask,
        contextBlock: string
    ): string {
        const descriptor = STAGE_DESCRIPTORS[stage];
        const safeRequest = userRequest.trim() || '(no additional request)';
        const baselineDraft = this.getTaskBaseline(task);

        const lines = [
            'You are a writing and knowledge-base management agent for an Obsidian vault.',
            'Work in a rigorous, source-grounded way. Do not invent facts.',
            '',
            '## Core Constraints',
            '1. Every key claim must have a source link in `[[path/to/note]]` form.',
            '2. If evidence is missing, explicitly mark as `[MISSING-EVIDENCE]`.',
            '3. Keep conclusions traceable, concise, and actionable.',
            '',
            '## Current Writing Task',
            `- Task ID: ${task.id}`,
            `- Title: ${task.title}`,
            `- Objective: ${task.objective}`,
            `- Audience: ${task.audience}`,
            `- Tone: ${task.tone}`,
            `- Target Length: ${task.targetLength}`,
            `- Current Stage: ${descriptor.label}`,
            '',
            '## Stage Goal',
            `- ${descriptor.goal}`,
            '',
            '## User Request',
            safeRequest,
            '',
            contextBlock,
            '',
            '## Output Contract',
            descriptor.outputContract,
            '',
            '## Missing Evidence Policy',
            '- If evidence is insufficient, provide the safest partial answer and list what to retrieve next.',
            `- Mention unresolved @ references if any: ${context.missingMentionPaths.join(', ') || '(none)'}`,
        ];

        if (baselineDraft) {
            lines.push('');
            lines.push('## Current Draft Baseline');
            lines.push(`- Active version: ${baselineDraft.label}`);
            lines.push('```markdown');
            lines.push(this.trimBaselineContent(baselineDraft.content));
            lines.push('```');
        }

        return lines.join('\n');
    }

    buildEvidencePrompt(question: string, contextBlock: string): string {
        const safeQuestion = question.trim() || 'Please run a full evidence audit for the current draft.';
        return [
            'Use the `evidence-qa` behavior with strict citations.',
            '',
            '## User Question',
            safeQuestion,
            '',
            contextBlock,
            '',
            '## Required Output',
            '```markdown',
            '## Conclusion',
            '- ...',
            '',
            '## Evidence',
            '- Claim:',
            '  - Evidence:',
            '  - Why it supports:',
            '',
            '## Sources',
            '- [[path/to/note]]',
            '',
            '## Confidence',
            '- Level: high | medium | low',
            '- Gaps:',
            '```',
        ].join('\n');
    }

    buildKbAuditPrompt(scope: AuditScope, userRequest: string, contextBlock: string): string {
        const safeRequest = userRequest.trim() || '(no additional constraints)';
        return [
            'Use the `kb-health-audit` behavior and return concise actionable findings.',
            '',
            '## Audit Scope',
            `- ${scope}`,
            '',
            '## User Constraints',
            safeRequest,
            '',
            contextBlock,
            '',
            '## Required Output',
            '```markdown',
            '## Summary',
            '- Scope:',
            '- Total findings:',
            '- High priority:',
            '',
            '## Findings',
            '### Broken Links',
            '- ...',
            '### Orphan Notes',
            '- ...',
            '### Potential Duplicates',
            '- ...',
            '### Stale Notes',
            '- ...',
            '',
            '## Priority Actions',
            '1. [high] ...',
            '2. [medium] ...',
            '3. [low] ...',
            '```',
        ].join('\n');
    }

    buildWorkflowHelp(): string {
        return [
            '## Writing + KB Workflow Commands',
            '- `/write start <topic>`: create/reset a writing task and run discovery.',
            '- `/write outline [extra requirements]`: generate evidence-aware outline.',
            '- `/write draft [extra requirements]`: generate full draft with sources.',
            '- `/write evidence [question]`: run evidence QA for current draft/question.',
            '- `/write polish [style hints]`: improve writing quality while preserving claims.',
            '- `/write publish [release notes]`: package publish-ready version and checklist.',
            '- `/kb audit [full|broken|orphan|duplicate|stale] [constraints]`: run knowledge health audit.',
            '- `/qa <question>`: ask an evidence-backed QA question.',
            '',
            'Use `@file` mentions to pin specific notes into the context bundle.',
        ].join('\n');
    }

    private toTaskTitle(objective: string): string {
        if (!objective) {
            return 'Untitled Writing Task';
        }

        if (objective.length <= 48) {
            return objective;
        }

        return `${objective.slice(0, 45)}...`;
    }

    private stageLabel(stage: WritingStage): string {
        return STAGE_DESCRIPTORS[stage].label;
    }

    private getTaskBaseline(task: WritingTask): DraftVersion | null {
        if (!task.currentDraftVersionId) {
            return null;
        }
        return task.draftVersions.find((version) => version.id === task.currentDraftVersionId) || null;
    }

    private trimBaselineContent(content: string): string {
        if (content.length <= BASELINE_MAX_CHARS) {
            return content;
        }
        return `${content.slice(0, BASELINE_MAX_CHARS)}\n...[baseline truncated]`;
    }
}
