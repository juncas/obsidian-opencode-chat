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
        goal: 'Package final output for vault publishing with complete YAML frontmatter, metadata, and action checklist. Use the vault metadata section (if present) to suggest tags from existing taxonomy and a file path matching the vault folder structure.',
        outputContract: [
            '## Final Title',
            '- ...',
            '',
            '## YAML Frontmatter',
            '```yaml',
            '---',
            'title: <final title>',
            'date: <YYYY-MM-DD>',
            'tags:',
            '  - <prefer existing tags from vault taxonomy>',
            '  - <only add new tags when no existing tag fits>',
            'summary: <1-2 sentence summary>',
            'author: <author or leave blank>',
            '---',
            '```',
            '',
            '## Final Content',
            '<ready-to-publish markdown content>',
            '',
            '## Metadata',
            '- Tags: <list, preferring existing vault tags>',
            '- Summary: <1-2 sentences>',
            '- Suggested file path: <match vault folder structure>',
            '',
            '## Publish Checklist',
            '- [ ] Citation validation',
            '- [ ] Link validation',
            '- [ ] Style review',
            '- [ ] Frontmatter completeness',
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

        const stageHistory = (task.stageHistory || []).map((transition) => ({
            ...transition,
            timestamp: new Date(transition.timestamp),
        }));

        this.tasksBySession.set(sessionKey, {
            ...task,
            draftVersions,
            stageHistory,
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
            stageHistory: [],
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

        const previousStage = task.stage;
        if (previousStage !== stage) {
            task.stageHistory.push({
                from: previousStage,
                to: stage,
                timestamp: new Date(),
            });
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

        const previousStage = task.stage;
        task.currentDraftVersionId = version.id;
        task.stage = version.stage;
        task.status = 'active';
        task.updatedAt = new Date();

        if (previousStage !== version.stage) {
            task.stageHistory.push({
                from: previousStage,
                to: version.stage,
                timestamp: new Date(),
            });
        }

        return { task, version };
    }

    buildStagePrompt(
        stage: WritingStage,
        userRequest: string,
        context: WritingContextSnapshot,
        task: WritingTask,
        contextBlock: string,
        publishContextBlock?: string
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

        if (publishContextBlock) {
            lines.push('');
            lines.push(publishContextBlock);
        }

        return lines.join('\n');
    }

    buildEvidencePrompt(question: string, contextBlock: string): string {
        const safeQuestion = question.trim() || 'Please run a full evidence audit for the current draft.';
        return [
            'Use the `evidence-qa` behavior with strict citations.',
            'If the provided context is insufficient, explicitly state "Low Confidence" and explain why.',
            'Do not hallucinate sources or facts not present in the context.',
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

    buildKbAuditPrompt(scope: AuditScope, userRequest: string, contextBlock: string, auditReport?: string): string {
        const safeRequest = userRequest.trim() || '(no additional constraints)';
        
        const lines = [
            'Use the `kb-health-audit` behavior and return concise actionable findings.',
            '',
            '## Audit Scope',
            `- ${scope}`,
            '',
            '## User Constraints',
            safeRequest,
            '',
            contextBlock,
        ];

        if (auditReport) {
            lines.push('');
            lines.push('## Automated Audit Report (System Generated)');
            lines.push('The following report was generated by scanning the vault metadata. Use this as your primary source of truth.');
            lines.push(auditReport);
            lines.push('');
            lines.push('## Task');
            lines.push('Analyze the above report and provide a prioritized action plan. Do not halllucinate new issues.');
        }

        lines.push('');
        lines.push('## Required Output');
        lines.push('```markdown');
        lines.push('## Summary');
        lines.push('- Scope:');
        lines.push('- Total findings:');
        lines.push('- High priority:');
        lines.push('');
        lines.push('## Findings');
        lines.push('### Broken Links');
        lines.push('- ...');
        lines.push('### Orphan Notes');
        lines.push('- ...');
        lines.push('### Potential Duplicates');
        lines.push('- ...');
        lines.push('### Stale Notes');
        lines.push('- ...');
        lines.push('');
        lines.push('## Priority Actions');
        lines.push('1. [high] ...');
        lines.push('2. [medium] ...');
        lines.push('3. [low] ...');
        lines.push('```');

        return lines.join('\n');
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
