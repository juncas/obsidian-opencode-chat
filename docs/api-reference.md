# API 参考

OpenCode HTTP API、TypeScript 类型定义和事件系统参考。

---

## OpenCode HTTP API

插件通过 HTTP 与 OpenCode Server 通信。

### 基础 URL

```
Base URL: http://127.0.0.1:<port>
默认端口：14000 (故障转移范围：14000-14004)
```

### 端点列表

| 端点 | 方法 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| `/session` | GET | 列出所有会话 | - | `OpenCodeSession[]` |
| `/session` | POST | 创建新会话 | `CreateSessionRequest` | `OpenCodeSession` |
| `/session/:id` | GET | 获取会话详情 | - | `OpenCodeSession` |
| `/session/:id/prompt_async` | POST | 异步发送消息 | `SendMessageRequest` | `204 No Content` |
| `/session/:id/message` | GET | 获取消息历史 | - | `OpenCodeMessage[]` |
| `/session/:id/abort` | POST | 中止会话 | - | `204 No Content` |
| `/event` | GET | SSE 事件流 | - | `text/event-stream` |

### API 使用示例

**创建会话**:
```typescript
const session = await server.createSession([
    { permission: 'bash', pattern: '*', action: 'ask' },
    { permission: 'write', pattern: '*', action: 'ask' },
    { permission: 'edit', pattern: '*', action: 'ask' }
]);
```

**发送消息**:
```typescript
await server.sendMessage(sessionId, '解释一下这个项目');
```

**中止会话**:
```typescript
await server.abortSession(sessionId);
```

---

## TypeScript 类型定义

### 核心类型 (src/types/opencode.ts)

#### OpenCodeSession

```typescript
interface OpenCodeSession {
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
```

#### PermissionRule

```typescript
interface PermissionRule {
    permission: string;   // 'bash', 'write', 'edit'
    pattern: string;      // 文件匹配模式，如 '*'
    action: 'allow' | 'deny' | 'ask';
}
```

#### OpenCodeMessage

```typescript
type OpenCodeMessage = UserMessage | AssistantMessage;

interface UserMessage {
    id: string;
    sessionID: string;
    role: 'user';
    parts: Part[];
    time: { created: number; updated: number };
    system?: boolean;
}

interface AssistantMessage {
    id: string;
    sessionID: string;
    role: 'assistant';
    parts: Part[];
    time: { created: number; updated: number };
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
```

#### Part Types (消息内容块)

```typescript
type Part =
    | TextPart       // 文本内容
    | ToolPart       // Tool 调用
    | StepStartPart  // 步骤开始
    | StepFinishPart // 步骤完成
    | SubtaskPart    // 子任务
    | ReasoningPart  // 推理内容
    | FilePart       // 文件附件
    | SnapshotPart   // 快照
    | PatchPart      // 补丁
    | AgentPart      // Agent 信息
    | RetryPart      // 重试信息
    | CompactionPart; // 压缩信息

// 文本部分
interface TextPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'text';
    text: string;
    time?: { start: number; end?: number };
}

// Tool 调用
interface ToolPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'tool';
    tool: string;
    callID: string;
    state: ToolState;
}

// 步骤开始
interface StepStartPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'step-start';
    step?: string;
}

// 步骤完成
interface StepFinishPart {
    id: string;
    sessionID: string;
    messageID: string;
    type: 'step-finish';
    reason?: string;
    cost?: number;
    tokens?: { input: number; output: number; reasoning: number };
    time?: { start: number; end: number };
}
```

#### ToolState

```typescript
type ToolState =
    | ToolStatePending
    | ToolStateRunning
    | ToolStateCompleted
    | ToolStateError;

interface ToolStatePending {
    status: 'pending';
    input: Record<string, unknown>;
    raw: string;
}

interface ToolStateRunning {
    status: 'running';
    input: Record<string, unknown>;
    title?: string;
    metadata?: Record<string, unknown>;
    time: { start: number };
}

interface ToolStateCompleted {
    status: 'completed';
    input: Record<string, unknown>;
    output: string;
    title: string;
    metadata: Record<string, unknown>;
    time: { start: number; end: number };
    attachments?: FilePart[];
}

interface ToolStateError {
    status: 'error';
    input: Record<string, unknown>;
    error: string;
    metadata?: Record<string, unknown>;
    time: { start: number; end: number };
}
```

#### PermissionRequest

```typescript
interface PermissionRequest {
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

type PermissionResponse = 'once' | 'always' | 'reject';
```

#### QuestionRequest

```typescript
interface QuestionRequest {
    id: string;
    sessionID: string;
    questions: QuestionInfo[];
    tool?: {
        messageID: string;
        callID: string;
    };
}

interface QuestionInfo {
    question: string;
    header: string;
    options: QuestionOption[];
    multiple?: boolean;
    custom?: boolean;
}

interface QuestionOption {
    label: string;
    description: string;
}
```

#### FileDiff

```typescript
interface FileDiff {
    file: string;
    before: string;
    after: string;
    additions: number;
    deletions: number;
    status?: string;
}
```

---

### SSE 事件类型

#### OpenCodeEvent ( union type)

```typescript
type OpenCodeEvent =
    // 会话生命周期
    | { type: 'session.created'; properties: { info: OpenCodeSession } }
    | { type: 'session.updated'; properties: { info: OpenCodeSession } }
    | { type: 'session.deleted'; properties: { info: OpenCodeSession } }
    | { type: 'session.status'; properties: { sessionID: string; status: SessionStatus } }
    | { type: 'session.idle'; properties: { sessionID: string } }
    | { type: 'session.error'; properties: { sessionID?: string; error?: { message: string } } }
    | { type: 'session.diff'; properties: { sessionID: string; diff: FileDiff[] } }
    // 消息
    | { type: 'message.updated'; properties: { info: OpenCodeMessage } }
    | { type: 'message.part.updated'; properties: { part: Part; delta?: string } }
    // 权限
    | { type: 'permission.asked'; properties: PermissionRequest }
    | { type: 'permission.replied'; properties: { sessionID: string; requestID: string } }
    // 问题
    | { type: 'question.asked'; properties: QuestionRequest }
    | { type: 'question.replied'; properties: { sessionID: string; requestID: string } }
    // 其他
    | { type: 'server.connected'; properties: Record<string, never> }
    | { type: 'todo.updated'; properties: { sessionID: string; todos: OpenCodeTodo[] } }
    | { type: 'file.edited'; properties: { file: string } };
```

#### SessionStatus

```typescript
type SessionStatus =
    | { type: 'idle' }
    | { type: 'busy' }
    | { type: 'retry'; attempt: number; message: string; next: number };
```

---

### 插件内部事件 (OpenCodeServerEvents)

```typescript
interface OpenCodeServerEvents {
    'connected': () => void;
    'disconnected': () => void;
    'error': (error: Error) => void;
    'session.status': (sessionID: string, status: SessionStatus) => void;
    'text.delta': (sessionID, partID, delta, fullText) => void;
    'text.done': (sessionID, partID, text) => void;
    'tool.updated': (sessionID, part: ToolPart) => void;
    'step.start': (sessionID, part: StepStartPart) => void;
    'step.finish': (sessionID, part: StepFinishPart) => void;
    'permission.asked': (request: PermissionRequest) => void;
    'question.asked': (request: QuestionRequest) => void;
    'message.updated': (message: OpenCodeMessage) => void;
    'session.idle': (sessionID: string) => void;
    'session.error': (sessionID, error) => void;
    'todo.updated': (sessionID, todos) => void;
    'diff.updated': (sessionID, diffs) => void;
}
```

---

## 写作工作流类型 (src/types/writing.ts)

### WritingStage

```typescript
type WritingStage =
    | 'discover'   // 调研
    | 'outline'    // 大纲
    | 'draft'      // 草稿
    | 'evidence'   // 论证
    | 'polish'     // 润色
    | 'publish';   // 发布
```

### WritingTask

```typescript
interface WritingTask {
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
    stageHistory: StageTransition[];
    createdAt: Date;
    updatedAt: Date;
}
```

### DraftVersion

```typescript
interface DraftVersion {
    id: string;
    stage: WritingStage;
    label: string;
    content: string;
    createdAt: Date;
    citationCoverage?: number;  // 0-1
    sourceCount?: number;
}
```

### StageTransition

```typescript
interface StageTransition {
    from: WritingStage;
    to: WritingStage;
    timestamp: Date;
}
```

### WritingContextSnapshot

```typescript
interface WritingContextSnapshot {
    activeFilePath: string | null;
    activeFileTags: string[];
    selection: string;
    mentionPaths: string[];
    missingMentionPaths: string[];
    contextFiles: ContextFileReference[];
    recentFiles: string[];
    relatedFiles: ContextFileReference[];
}

type ContextSource = 'active' | 'mention' | 'recent' | 'search';

interface ContextFileReference {
    path: string;
    source: ContextSource;
}
```

---

## 插件插件类型 (src/types/index.ts)

### Session

```typescript
interface Session {
    id: string;
    name: string;
    sessionId: string | null;       // 已废弃
    serverSessionId: string | null;
    writingTask: WritingTask | null;
    createdAt: Date;
    updatedAt: Date;
    messages: ChatMessage[];
}
```

### ChatMessage

```typescript
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}
```

### OpenCodePluginData

```typescript
interface OpenCodePluginData {
    sessionId: string | null;  // 已废弃
    version: string;
    sessions: Session[];
    currentSessionId: string | null;
}
```

### OpenCodePluginSettings

```typescript
interface OpenCodePluginSettings {
    opencodeModel: string;
    ohMyOpencodeModel: string;
    enableOhMyOpencode: boolean;
}
```

---

## 请求/响应类型

### CreateSessionRequest

```typescript
interface CreateSessionRequest {
    permission?: PermissionRule[];
}
```

### SendMessageRequest

```typescript
interface SendMessageRequest {
    parts: Array<{ type: 'text'; text: string }>;
}
```

### PermissionReplyRequest

```typescript
interface PermissionReplyRequest {
    response: PermissionResponse;
}
```

### QuestionReplyRequest

```typescript
interface QuestionReplyRequest {
    answers: string[][];
}
```

---

## 常量定义

### 默认权限 (OpenCodeChatView.ts)

```typescript
const ASK_PERMISSIONS: PermissionRule[] = [
    { permission: 'bash', pattern: '*', action: 'ask' },
    { permission: 'write', pattern: '*', action: 'ask' },
    { permission: 'edit', pattern: '*', action: 'ask' },
];
```

### 阶段别名 (OpenCodeChatView.ts)

```typescript
const STAGE_ALIAS: Record<string, WritingStage> = {
    start: 'discover',
    discover: 'discover',
    outline: 'outline',
    draft: 'draft',
    evidence: 'evidence',
    polish: 'polish',
    publish: 'publish',
};
```

### 审计范围 (OpenCodeChatView.ts)

```typescript
const AUDIT_SCOPES: AuditScope[] = ['full', 'broken', 'orphan', 'duplicate', 'stale'];
```

---

*最后更新：2026-02-19*
