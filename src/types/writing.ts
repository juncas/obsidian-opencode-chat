export type WritingStage =
    | 'discover'
    | 'outline'
    | 'draft'
    | 'evidence'
    | 'polish'
    | 'publish';

export type WritingTaskStatus = 'active' | 'paused' | 'completed';

export interface DraftVersion {
    id: string;
    stage: WritingStage;
    label: string;
    content: string;
    createdAt: Date;
    citationCoverage?: number;
    sourceCount?: number;
}

export interface WritingTask {
    id: string;
    title: string;
    objective: string;
    audience: string;
    tone: string;
    targetLength: string;
    stage: WritingStage;
    status: WritingTaskStatus;
    draftVersions: DraftVersion[];
    currentDraftVersionId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type ContextSource = 'active' | 'mention' | 'recent';

export interface ContextFileReference {
    path: string;
    source: ContextSource;
}

export interface WritingContextSnapshot {
    activeFilePath: string | null;
    activeFileTags: string[];
    selection: string;
    mentionPaths: string[];
    missingMentionPaths: string[];
    contextFiles: ContextFileReference[];
    recentFiles: string[];
}

export type AuditScope = 'full' | 'broken' | 'orphan' | 'duplicate' | 'stale';

export interface PreparedWorkflowCommand {
    displayCommand: string;
    promptToSend: string | null;
    localNotice?: string;
    meta?: WorkflowExecutionMeta;
}

export interface WorkflowExecutionMeta {
    source: 'write' | 'kb' | 'qa' | 'plain';
    stage?: WritingStage;
    requiresCitationCheck: boolean;
    shouldCaptureDraftVersion?: boolean;
}
