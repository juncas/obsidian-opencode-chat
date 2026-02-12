/**
 * OpenCode HTTP Server API Types
 *
 * These types mirror the OpenCode SDK types from:
 * @opencode-ai/sdk/dist/v2/gen/types.gen.d.ts
 *
 * We define them locally since @opencode-ai/sdk is not a plugin dependency.
 */

// =====================================================================
// Session Types
// =====================================================================

export interface OpenCodeSession {
    id: string;
    slug?: string;
    title?: string;
    parentID?: string;
    time: {
        created: number;
        updated: number;
    };
    version?: number;
    permission?: PermissionRule[];
}

export type SessionStatus =
    | { type: 'idle' }
    | { type: 'busy' }
    | { type: 'retry'; attempt: number; message: string; next: number };

export interface PermissionRule {
    permission: string;
    pattern: string;
    action: 'allow' | 'deny' | 'ask';
}

// =====================================================================
// Message Types
// =====================================================================

export type OpenCodeMessage = UserMessage | AssistantMessage;

export interface UserMessage {
    id: string;
    sessionID: string;
    role: 'user';
    parts: Part[];
    time: {
        created: number;
        updated: number;
    };
    system?: boolean;
}

export interface AssistantMessage {
    id: string;
    sessionID: string;
    role: 'assistant';
    parts: Part[];
    time: {
        created: number;
        updated: number;
    };
    tokens?: {
        input: number;
        output: number;
        reasoning: number;
        cache: { read: number; write: number };
    };
    cost?: number;
    modelID?: string;
    providerID?: string;
    system?: boolean;
}

// =====================================================================
// Part Types (message content blocks)
// =====================================================================

export type Part =
    | TextPart
    | ToolPart
    | StepStartPart
    | StepFinishPart
    | SubtaskPart
    | ReasoningPart
    | FilePart
    | SnapshotPart
    | PatchPart
    | AgentPart
    | RetryPart
    | CompactionPart;

export interface TextPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'text';
    text: string;
    time?: { start: number; end?: number };
}

export interface ToolPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'tool';
    tool: string;
    callID: string;
    state: ToolState;
}

export interface StepStartPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'step-start';
    step?: string;
}

export interface StepFinishPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'step-finish';
    reason?: string;
    cost?: number;
    tokens?: {
        input: number;
        output: number;
        reasoning: number;
        cache: { read: number; write: number };
    };
    time?: { start: number; end: number };
}

export interface SubtaskPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'subtask';
    subtaskSessionID: string;
}

export interface ReasoningPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'reasoning';
    text: string;
    redacted?: boolean;
}

export interface FilePart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'file';
    file: string;
    mediaType: string;
}

export interface SnapshotPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'snapshot';
    snapshot: string;
}

export interface PatchPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'patch';
    patch: string;
}

export interface AgentPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'agent';
    agent: string;
}

export interface RetryPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'retry';
    error?: string;
}

export interface CompactionPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'compaction';
}

// =====================================================================
// Tool State (lifecycle of a tool call)
// =====================================================================

export type ToolState =
    | ToolStatePending
    | ToolStateRunning
    | ToolStateCompleted
    | ToolStateError;

export interface ToolStatePending {
    status: 'pending';
    input: Record<string, unknown>;
    raw: string;
}

export interface ToolStateRunning {
    status: 'running';
    input: Record<string, unknown>;
    title?: string;
    metadata?: Record<string, unknown>;
    time: { start: number };
}

export interface ToolStateCompleted {
    status: 'completed';
    input: Record<string, unknown>;
    output: string;
    title: string;
    metadata: Record<string, unknown>;
    time: { start: number; end: number; compacted?: boolean };
    attachments?: FilePart[];
}

export interface ToolStateError {
    status: 'error';
    input: Record<string, unknown>;
    error: string;
    metadata?: Record<string, unknown>;
    time: { start: number; end: number };
}

// =====================================================================
// Permission Types
// =====================================================================

export interface PermissionRequest {
    id: string;
    sessionID: string;
    permission: string;
    patterns: string[];
    metadata: Record<string, unknown>;
    always: string[];
    tool?: {
        messageID: string;
        callID: string;
    };
}

export type PermissionResponse = 'once' | 'always' | 'reject';

// =====================================================================
// Question Types
// =====================================================================

export interface QuestionRequest {
    id: string;
    sessionID: string;
    questions: QuestionInfo[];
    tool?: {
        messageID: string;
        callID: string;
    };
}

export interface QuestionInfo {
    question: string;
    header: string;
    options: QuestionOption[];
    multiple?: boolean;
    custom?: boolean;
}

export interface QuestionOption {
    label: string;
    description: string;
}

// =====================================================================
// File Diff Types
// =====================================================================

export interface FileDiff {
    file: string;
    before: string;
    after: string;
    additions: number;
    deletions: number;
    status?: string;
}

// =====================================================================
// Todo Types
// =====================================================================

export interface OpenCodeTodo {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'high' | 'medium' | 'low';
}

// =====================================================================
// SSE Event Types
// =====================================================================

/**
 * Global SSE event wrapper — all events from GET /event are wrapped in this
 */
export interface GlobalEvent {
    directory: string;
    payload: OpenCodeEvent;
}

/**
 * Union of all possible SSE event types
 */
export type OpenCodeEvent =
    // Session lifecycle
    | { type: 'session.created'; properties: { info: OpenCodeSession } }
    | { type: 'session.updated'; properties: { info: OpenCodeSession } }
    | { type: 'session.deleted'; properties: { info: OpenCodeSession } }
    | { type: 'session.status'; properties: { sessionID: string; status: SessionStatus } }
    | { type: 'session.idle'; properties: { sessionID: string } }
    | { type: 'session.error'; properties: { sessionID?: string; error?: { message: string; code?: string } } }
    | { type: 'session.diff'; properties: { sessionID: string; diff: FileDiff[] } }
    | { type: 'session.compacted'; properties: { sessionID: string } }
    // Messages
    | { type: 'message.updated'; properties: { info: OpenCodeMessage } }
    | { type: 'message.removed'; properties: { sessionID: string; messageID: string } }
    | { type: 'message.part.updated'; properties: { part: Part; delta?: string } }
    | { type: 'message.part.removed'; properties: { sessionID: string; messageID: string; partID: string } }
    // Permissions
    | { type: 'permission.asked'; properties: PermissionRequest }
    | { type: 'permission.replied'; properties: { sessionID: string; requestID: string; reply: PermissionResponse } }
    // Questions
    | { type: 'question.asked'; properties: QuestionRequest }
    | { type: 'question.replied'; properties: { sessionID: string; requestID: string; answers: string[][] } }
    | { type: 'question.rejected'; properties: { sessionID: string; requestID: string } }
    // Other
    | { type: 'server.connected'; properties: Record<string, never> }
    | { type: 'todo.updated'; properties: { sessionID: string; todos: OpenCodeTodo[] } }
    | { type: 'file.edited'; properties: { file: string } }
    | { type: 'file.watcher.updated'; properties: { file: string; event: 'add' | 'change' | 'unlink' } }
    | { type: 'installation.updated'; properties: { version: string } }
    | { type: 'vcs.branch.updated'; properties: { branch?: string } };

// =====================================================================
// API Request/Response Types
// =====================================================================

export interface CreateSessionRequest {
    permission?: PermissionRule[];
}

export interface SendMessageRequest {
    parts: Array<{ type: 'text'; text: string }>;
}

export interface PermissionReplyRequest {
    response: PermissionResponse;
}

export interface QuestionReplyRequest {
    answers: string[][];
}

// =====================================================================
// Internal Plugin Event Types (for OpenCodeServer EventEmitter)
// =====================================================================

export interface OpenCodeServerEvents {
    'connected': () => void;
    'disconnected': () => void;
    'error': (error: Error) => void;
    'session.status': (sessionID: string, status: SessionStatus) => void;
    'text.delta': (sessionID: string, partID: string, delta: string, fullText: string) => void;
    'text.done': (sessionID: string, partID: string, text: string) => void;
    'tool.updated': (sessionID: string, part: ToolPart) => void;
    'step.start': (sessionID: string, part: StepStartPart) => void;
    'step.finish': (sessionID: string, part: StepFinishPart) => void;
    'permission.asked': (request: PermissionRequest) => void;
    'question.asked': (request: QuestionRequest) => void;
    'message.updated': (message: OpenCodeMessage) => void;
    'session.idle': (sessionID: string) => void;
    'session.error': (sessionID: string | undefined, error: { message: string; code?: string } | undefined) => void;
    'todo.updated': (sessionID: string, todos: OpenCodeTodo[]) => void;
    'diff.updated': (sessionID: string, diffs: FileDiff[]) => void;
}
