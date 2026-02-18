# 架构设计

OpenCode Chat for Obsidian 的系统架构、数据流和核心模块详解。

---

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Obsidian Plugin                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    OpenCodeChatView.ts                      │ │
│  │                     (UI Controller)                         │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │ │
│  │  │  ChatInput   │  │ MessageContainer │  │ SessionTabs   │  │ │
│  │  └──────────────┘  └───────────────┘  └─────────────────┘  │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │ │
│  │  │ WritingTask  │  │  ToolCallView │  │  FileDiffView   │  │ │
│  │  │   Panel      │  │               │  │                 │  │ │
│  │  └──────────────┘  └───────────────┘  └─────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              OpenCodeServer.ts (Singleton)                  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  • spawn('opencode serve --port 14000')              │  │ │
│  │  │  • SSE Connection to /event                          │  │ │
│  │  │  • HTTP API: /session, /prompt_async, /abort         │  │ │
│  │  │  • Event Emitter (text.delta, session.idle, ...)     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 SessionManager.ts                           │ │
│  │  • sessions: Session[]                                      │ │
│  │  • currentSessionId: string | null                          │ │
│  │  • writingTask: WritingTask | null                          │ │
│  │  • onChange: () => void (auto-persist)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              WritingWorkflowService.ts                      │ │
│  │  • Tasks: Map<sessionKey, WritingTask>                      │ │
│  │  • Stages: discover → outline → draft → evidence →         │ │
│  │             polish → publish                                │ │
│  │  • Draft Versions: snapshot on draft/polish/publish         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
               ┌───────────────────────────┐
               │     OpenCode CLI (HTTP)    │
               │     Port: 14000-14004      │
               │     cwd: vault path        │
               └───────────────────────────┘
                               │
                               ▼
               ┌───────────────────────────┐
               │     OpenCode Runtime       │
               │     (Vault Context)        │
               │     .opencode/skills/      │
               └───────────────────────────┘
```

---

## 数据流

### 1. 插件启动流程

```typescript
// main.ts: onload()

1. 加载插件数据
   └─> loadPluginData() → data.json (sessions, currentSessionId)

2. 同步 bundled skills
   └─> syncBundledSkillsToVault()
       ├── source: .obsidian/plugins/claude-chat-obsidian/opencode-skills/
       └── target: .opencode/skills/

3. 启动 OpenCode Server
   └─> OpenCodeServer.getInstance(vaultPath).start()
       ├── spawn('opencode serve --port 14000')
       ├── 端口故障转移 (14000 → 14004)
       └── connectSSE() → /event

4. 注册视图和命令
   └─> registerView(OPENCODE_CHAT_VIEW_TYPE, ...)
       └─> addCommand({ id, name, callback })
```

### 2. 发送消息流程

```typescript
// OpenCodeChatView.ts: handleCommand()

1. 解析命令
   └─> prepareWorkflowCommand(command)
       ├── /write → WritingWorkflowService.buildStagePrompt()
       ├── /kb    → KnowledgeBaseService.runAudit()
       └── /qa    → WritingWorkflowService.buildEvidencePrompt()

2. 创建/复用会话
   └─> server.createSession(permissions) 或复用现有

3. 发送消息
   └─> server.sendMessage(sessionId, prompt)
       └─> POST /session/:id/prompt_async

4. 监听 SSE 事件
   ├── text.delta     → appendToAssistantMessage()
   ├── tool.updated   → addToolCall()
   ├── diff.updated   → addFileDiffs()
   ├── permission.asked → addPermissionDialog()
   └── session.idle   → finalize + 后续处理
```

### 3. SSE 事件处理

```
SSE Stream (/event)
       │
       ▼
handleSseData(chunk: string)
       │
       ├── 解析 SSE payload → OpenCodeEvent
       │
       ▼
handleEvent(event: OpenCodeEvent)
       │
       ├── 'text.delta'        → emit('text.delta', partID, delta)
       ├── 'session.idle'      → emit('session.idle', sessionID)
       ├── 'tool.updated'      → emit('tool.updated', part)
       ├── 'diff.updated'      → emit('diff.updated', diffs)
       ├── 'permission.asked'  → emit('permission.asked', request)
       └── 'question.asked'    → emit('question.asked', request)
```

---

## 核心模块详解

### OpenCodeServer.ts

**职责**: OpenCode CLI 进程管理、SSE 连接、HTTP API 桥接

**设计模式**:
- **单例模式**: `getInstance(vaultPath)` 全局唯一
- **事件发射器**: `TypedEventEmitter<OpenCodeServerEvents>`
- **自动重连**: SSE 断开后最多重试 5 次

**关键方法**:
```typescript
// 启动（端口故障转移）
async start(): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const port = 14000 + attempt;
        try {
            await this.startServerOnPort(port);
            return;  // 成功则返回
        } catch (error) {
            console.error(`Port ${port} failed:`, error);
        }
    }
}

// 重启（设置变更时）
async restart(): Promise<void> {
    await this.stop();
    await this.start();
}

// HTTP 请求封装
private async httpRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const response = await requestUrl({
        url: `${this.baseUrl}${path}`,
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    return response.json;
}
```

### SessionManager.ts

**职责**: 多会话状态管理、持久化、切换

**数据结构**:
```typescript
interface Session {
    id: string;                    // 内部 ID: session-timestamp-random
    name: string;                  // 用户可见名称
    serverSessionId: string | null; // OpenCode Server 会话 ID
    writingTask: WritingTask | null; // 写作任务
    messages: ChatMessage[];       // 消息历史
    createdAt: Date;
    updatedAt: Date;
}
```

**关键方法**:
```typescript
createSession(name: string): Session
switchSession(sessionId: string): boolean
deleteSession(sessionId: string): boolean
addMessage(message: ChatMessage): void
onChange(callback: () => void): void  // 状态变更回调（自动持久化）
```

### WritingWorkflowService.ts

**职责**: 写作工作流状态管理、草稿版本捕获、阶段提示构建

**阶段序列**:
```typescript
const STAGE_SEQUENCE: WritingStage[] = [
    'discover',  // 调研：明确范围、受众、证据缺口
    'outline',   // 大纲：结构化框架
    'draft',     // 草稿：完整内容 + 引用
    'evidence',  // 论证：来源覆盖率审计
    'polish',    // 润色：提升可读性
    'publish'    // 发布：frontmatter + 标签建议
];
```

**草稿版本捕获时机**:
- `/write draft` → 捕获
- `/write polish` → 捕获
- `/write publish` → 捕获

**版本对比**:
```typescript
// 仅在内容变化时创建新版本
if (currentVersion.content.trim() === normalizedContent) {
    return { task, version: currentVersion, created: false };
}
// 否则创建新版本
const version: DraftVersion = {
    id: generateId(),
    stage,
    label: `${stage} v${index}`,
    content: normalizedContent,
    createdAt: new Date(),
    citationCoverage: metrics?.coverage
};
```

### ContextResolver.ts

**职责**: 解析和捆绑上下文（@提及、活跃文件、最近文件、搜索结果）

**上下文来源**:
```typescript
interface WritingContextSnapshot {
    activeFilePath: string | null;    // 当前打开文件
    activeFileTags: string[];         // frontmatter 标签
    selection: string;                // 编辑器选区
    mentionPaths: string[];           // @提及文件
    missingMentionPaths: string[];    // 不存在的提及
    contextFiles: ContextFileReference[]; // active + mention
    recentFiles: string[];            // 最近修改 (max 5)
    relatedFiles: ContextFileReference[]; // 搜索相关 (max 5)
}
```

**@提及语法**:
```
@filename           # 简单提及
@"path/with space"  # 带空格路径
@folder/note        # 嵌套路径
```

### OpenCodeChatView.ts

**职责**: 主视图控制器、命令路由、事件处理

**命令路由表**:
```typescript
async prepareWorkflowCommand(command: string): Promise<PreparedWorkflowCommand> {
    if (/^\/help\b/i.test(command)) {
        return { displayCommand: command, promptToSend: null, localNotice: helpText };
    }
    if (/^\/write\b/i.test(command)) {
        return this.prepareWriteWorkflowCommand(command);
    }
    if (/^\/kb\s+audit\b/i.test(command)) {
        return await this.prepareKbAuditCommand(command);
    }
    if (/^\/qa\b/i.test(command)) {
        return this.prepareEvidenceQaCommand(command);
    }
    // 默认：直接发送
    return { displayCommand: command, promptToSend: command, meta: { source: 'plain' } };
}
```

---

## 设计模式

### 单例模式

```typescript
// OpenCodeServer
private static instance: OpenCodeServer | null = null;

static getInstance(vaultPath: string): OpenCodeServer {
    if (!OpenCodeServer.instance) {
        OpenCodeServer.instance = new OpenCodeServer(vaultPath);
    }
    return OpenCodeServer.instance;
}
```

### 事件发射器模式

```typescript
class TypedEventEmitter<T extends EventMap<T>> {
    private listeners: { [K in keyof T]?: Set<T[K]> } = {};

    on<K extends keyof T>(event: K, callback: T[K]): void {
        // 订阅
    }

    off<K extends keyof T>(event: K, callback: T[K]): void {
        // 取消订阅
    }

    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
        // 触发
    }
}
```

### 服务层架构

```
UI Layer (views/, ui/)
      │
      ▼
Service Layer (services/)
      │
      ▼
External (OpenCode HTTP API)
```

**服务层特点**:
- 无 UI 依赖
- 可测试
- 单例模式
- 事件驱动

---

## 文件组织原则

### 目录职责

| 目录 | 内容 | 依赖 |
|------|------|------|
| `src/main.ts` | 插件入口、生命周期 | 所有服务 |
| `src/services/` | 业务逻辑、数据管理 | Obsidian App API |
| `src/views/` | ItemView 实现 | services、ui |
| `src/ui/` | 可复用 UI 组件 | Obsidian DOM API |
| `src/types/` | TypeScript 类型 | 无 |

### 文件命名

- **服务**: `XxxService.ts` (如 `WritingWorkflowService.ts`)
- **视图**: `XxxView.ts` (如 `OpenCodeChatView.ts`)
- **UI 组件**: `Xxx.ts` (如 `ChatInput.ts`)
- **类型**: 按领域划分 (`opencode.ts`, `writing.ts`)

---

## 扩展点

### 添加新命令

1. 在 `OpenCodeChatView.prepareWorkflowCommand()` 添加路由
2. 创建对应的处理方法
3. 定义命令语法和参数

```typescript
async prepareWorkflowCommand(command: string) {
    if (/^\/newcmd\b/i.test(command)) {
        return this.prepareNewCommand(command);
    }
}
```

### 添加新服务

1. 在 `src/services/` 创建新服务文件
2. 在 `OpenCodeChatPlugin` 中初始化
3. 在需要的视图中注入

```typescript
// main.ts
export default class OpenCodeChatPlugin extends Plugin {
    newService: NewService;

    async onload() {
        this.newService = new NewService();
    }
}
```

### 添加新 UI 组件

1. 在 `src/ui/` 创建组件
2. 遵循 Obsidian DOM API
3. 提供清晰的 props 接口

```typescript
export class NewComponent {
    constructor(
        container: HTMLElement,
        props: NewComponentProps
    ) {
        this.render();
    }

    private render() {
        // 渲染逻辑
    }
}
```

---

## 性能考虑

### 优化策略

1. **上下文限制**:
   - 最近文件: 最多 5 个
   - 相关文件: 最多 5 个
   - 选区内容: 最多 1200 字符

2. **缓存策略**:
   - 会话状态内存缓存
   - 写作任务状态内存缓存

3. **懒加载**:
   - UI 组件按需创建
   - 写作任务面板仅在有任务时显示

---

*最后更新：2026-02-19*
