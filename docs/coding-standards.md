# 编码规范

OpenCode Chat for Obsidian 的 TypeScript 编码规范和最佳实践。

---

## TypeScript 规范

### 类型安全

**显式类型声明**:
```typescript
// ✅ 好的做法：显式返回类型
function handleMessage(message: ChatMessage): void {
    // ...
}

// ❌ 避免：隐式 any
function handleMessage(message) { ... }  // 错误
```

**避免 any**:
```typescript
// ❌ 避免
function process(data: any) { ... }

// ✅ 使用 unknown
function process(data: unknown) {
    if (typeof data === 'string') {
        // 类型收窄后使用
    }
}

// ✅ 使用泛型
function process<T>(data: T): T {
    return data;
}
```

**类型守卫**:
```typescript
// ✅ 使用类型守卫
function isOpenCodeMessage(msg: unknown): msg is OpenCodeMessage {
    return (
        typeof msg === 'object' &&
        msg !== null &&
        'role' in msg &&
        'content' in msg
    );
}

// 使用
if (isOpenCodeMessage(message)) {
    // TypeScript 知道这里是 OpenCodeMessage
    console.log(message.role);
}
```

### 接口与类型别名

**接口用于对象形状**:
```typescript
// ✅ 接口定义对象
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}
```

**类型别名用于联合类型**:
```typescript
// ✅ 类型别名定义联合
type WritingStage =
    | 'discover'
    | 'outline'
    | 'draft'
    | 'evidence'
    | 'polish'
    | 'publish';

type AuditScope = 'full' | 'broken' | 'orphan' | 'duplicate' | 'stale';
```

**优先使用 interface 进行扩展**:
```typescript
// ✅ interface 可合并
interface ChatMessage {
    role: string;
}

interface ChatMessage {
    timestamp: Date;
}

// ✅ type 不可合并
type ChatMessage = { role: string };
type ChatMessage = { timestamp: Date };  // 错误：重复定义
```

---

## 命名约定

### 文件命名

| 类型 | 命名风格 | 示例 |
|------|---------|------|
| 服务 | `XxxService.ts` | `WritingWorkflowService.ts` |
| 视图 | `XxxView.ts` | `OpenCodeChatView.ts` |
| UI 组件 | `Xxx.ts` | `ChatInput.ts` |
| 类型 | 小写或领域名 | `opencode.ts`, `writing.ts` |

### 代码命名

```typescript
// 类 - PascalCase
class OpenCodeServer { }
class SessionManager { }

// 接口 - PascalCase
interface ChatMessage { }
interface WritingTask { }

// 类型别名 - PascalCase
type WritingStage = ...;
type AuditScope = ...;

// 变量/函数 - camelCase
const currentSessionId = '...';
function handleCommand() { }

// 常量 - UPPER_SNAKE_CASE
const MAX_RETRIES = 5;
const DEFAULT_PORT = 14000;

// 私有成员 - 可选前缀 _
private _privateField: string;
```

### 布尔变量命名

```typescript
// ✅ 使用 is/has/can 等前缀
const isConnected = true;
const hasPermission = false;
const canExecute = true;

// ❌ 避免
const connected = true;  // 不清楚是动词还是形容词
```

---

## 代码组织

### 文件结构

**服务类标准结构**:
```typescript
import { ... } from '...';

// 常量和配置
const DEFAULT_PORT = 14000;
const MAX_RETRIES = 5;

// 类型定义（如果仅在本文件使用）
interface InternalConfig {
    port: number;
}

// 主类
export class OpenCodeServer {
    // 静态属性
    private static instance: OpenCodeServer | null = null;

    // 实例属性（按访问修饰词分组）
    private port: number;
    private baseUrl: string;

    // 构造函数
    private constructor(vaultPath: string) {
        // ...
    }

    // 静态方法
    static getInstance(vaultPath: string): OpenCodeServer {
        // ...
    }

    // 公共方法（按逻辑分组）
    async start(): Promise<void> {
        // ...
    }

    async stop(): Promise<void> {
        // ...
    }

    // 私有方法
    private async startServerOnPort(port: number): Promise<void> {
        // ...
    }

    // 事件处理方法
    private handleSseData(chunk: string): void {
        // ...
    }
}
```

### 导入顺序

```typescript
// 1. Node.js/内置模块
import * as fs from 'fs';
import * as path from 'path';

// 2. 第三方库
import { Plugin, WorkspaceLeaf } from 'obsidian';

// 3. 项目内部模块（按路径深度排序）
import { OpenCodeChatView } from './views/OpenCodeChatView';
import { SessionManager } from './services/SessionManager';
import { ChatMessage } from './types';

// 4. 类型导入
import type { OpenCodeSession } from './types/opencode';
```

---

## 错误处理

### 统一错误包装

```typescript
// ✅ 包装错误并添加上下文
async sendMessage(sessionId: string, text: string): Promise<void> {
    try {
        await this.httpRequest('POST', `/session/${sessionId}/prompt`, { text });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('OpenCodeServer: Failed to send message:', message);
        throw new Error(`Failed to send message: ${message}`);
    }
}
```

### 自定义错误类

```typescript
// ✅ 定义领域特定错误
class OpenCodeServerError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly statusCode?: number
    ) {
        super(message);
        this.name = 'OpenCodeServerError';
    }
}

// 使用
throw new OpenCodeServerError('Server not ready', 'NOT_READY', 503);
```

### 错误日志

```typescript
// ✅ 结构化日志
console.error('OpenCodeServer: Failed to start', {
    port,
    error: error.message,
    stack: error.stack
});

// ❌ 避免
console.error(error);  // 缺少上下文
```

---

## 注释规范

### JSDoc 风格

```typescript
/**
 * 创建新的写作任务
 * @param sessionKey - 会话唯一标识
 * @param objective - 写作目标描述
 * @returns 新创建的 WritingTask 实例
 */
createTask(sessionKey: string, objective: string): WritingTask {
    // ...
}
```

### 行内注释

**解释「为什么」而非「是什么」**:
```typescript
// ✅ 好的注释
// 使用 SIGTERM 先尝试优雅退出，3 秒后强制 SIGKILL
setTimeout(() => processHandle.kill('SIGKILL'), 3000);

// ❌ 冗余注释
i += 1;  // i 加 1
return true;  // 返回 true
```

**标记待办事项**:
```typescript
// TODO: 添加单元测试
// FIXME: 处理端口占用边缘情况
// NOTE: 这个值不能改成 10，会影响向后兼容
```

---

## 异步编程

### Promise 处理

```typescript
// ✅ 使用 async/await
async function fetchSession(id: string): Promise<OpenCodeSession> {
    const response = await this.httpRequest('GET', `/session/${id}`);
    return response;
}

// ✅ 错误处理
try {
    const session = await fetchSession(id);
} catch (error) {
    // 处理错误
}
```

### Promise.all 并行

```typescript
// ✅ 并行执行独立任务
const [sessions, messages] = await Promise.all([
    this.listSessions(),
    this.getMessages(sessionId)
]);
```

### 避免竞态条件

```typescript
// ✅ 使用信号量或标志
private processing = false;

async handleCommand(command: string) {
    if (this.processing) return;  // 防止重复触发

    this.processing = true;
    try {
        await this.process(command);
    } finally {
        this.processing = false;
    }
}
```

---

## 类设计

### 单一职责

```typescript
// ✅ 好的设计：每个类一个职责
class OpenCodeServer { /* OpenCode 进程管理 */ }
class SessionManager { /* 会话状态管理 */ }
class WritingWorkflowService { /* 写作工作流逻辑 */ }

// ❌ 避免：上帝类
class PluginManager {
    // 1000 行代码，做所有事情
}
```

### 依赖注入

```typescript
// ✅ 通过构造函数注入
export class OpenCodeChatView extends ItemView {
    constructor(
        leaf: WorkspaceLeaf,
        private plugin: OpenCodeChatPlugin
    ) {
        super(leaf);
        // 通过 plugin 访问服务
    }
}
```

### 封装原则

```typescript
// ✅ 私有实现细节
export class SessionManager {
    private sessions: Session[] = [];
    private currentSessionId: string | null = null;

    // 公共 API
    getSession(id: string): Session | null {
        return this.sessions.find(s => s.id === id) || null;
    }

    // 内部实现
    private generateId(): string {
        return `session-${Date.now()}-${Math.random()}`;
    }
}
```

---

## 函数设计

### 纯函数优先

```typescript
// ✅ 纯函数：相同输入 = 相同输出
function calculateCoverage(cited: number, total: number): number {
    return total === 0 ? 0 : cited / total;
}

// ❌ 避免副作用
let cached = 0;
function calculateCoverage(cited: number, total: number): number {
    cached = cited / total;  // 副作用
    return cached;
}
```

### 函数参数

**限制参数数量**:
```typescript
// ✅ 使用对象解构
interface Options {
    timeout: number;
    retries: number;
    log: boolean;
}

function fetchData(url: string, options: Options) {
    // ...
}

// 调用
fetchData('/api', { timeout: 5000, retries: 3, log: true });
```

### 默认参数

```typescript
// ✅ 使用默认参数
function createSession(
    name: string = 'Default Session',
    autoSave: boolean = true
): Session {
    // ...
}
```

---

## 测试规范

### 单元测试结构

```typescript
describe('SessionManager', () => {
    let manager: SessionManager;

    beforeEach(() => {
        manager = new SessionManager();
    });

    describe('createSession', () => {
        it('should create a new session with given name', () => {
            const session = manager.createSession('Test');
            expect(session.name).toBe('Test');
        });

        it('should set current session to newly created one', () => {
            const session = manager.createSession('Test');
            expect(manager.getCurrentSession()).toBe(session);
        });
    });
});
```

### 测试命名

```typescript
// ✅ 清晰的测试名
it('should create a new session with given name');
it('should switch to new session after creation');
it('should not create duplicate session with same id');

// ❌ 模糊的测试名
it('test session creation');
it('should work');
```

---

## Git 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型列表

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（不是新功能或修复） |
| `test` | 添加或修改测试 |
| `chore` | 构建过程或辅助工具变动 |

### 提交示例

```
feat(writing-workflow): add draft version rollback

- Add rollback button to WritingTaskPanel
- Implement rollbackToDraftVersion in WritingWorkflowService
- Update stage history on rollback

Fixes #42
```

---

## 性能考虑

### 避免不必要的计算

```typescript
// ✅ 缓存计算结果
private cachedCoverage: number | null = null;

getCoverage(): number {
    if (this.cachedCoverage !== null) {
        return this.cachedCoverage;
    }
    this.cachedCoverage = this.calculateCoverage();
    return this.cachedCoverage;
}

// ❌ 重复计算
getCoverage(): number {
    return this.calculateCoverage();  // 每次都重新计算
}
```

### 限制集合大小

```typescript
// ✅ 限制数组长度
const MAX_RECENT_FILES = 5;

function getRecentFiles(files: string[]): string[] {
    return files.slice(0, MAX_RECENT_FILES);
}
```

### 懒加载

```typescript
// ✅ 按需初始化
private _taskPanel: WritingTaskPanel | null = null;

get taskPanel(): WritingTaskPanel {
    if (!this._taskPanel) {
        this._taskPanel = new WritingTaskPanel(...);
    }
    return this._taskPanel;
}
```

---

## 安全检查清单

在提交代码前，确认:

- [ ] TypeScript 类型检查通过 (`npx tsc -noEmit`)
- [ ] ESLint 无错误 (`npm run lint`)
- [ ] 无 `console.log` 调试代码（保留 `console.error` 用于错误日志）
- [ ] 无 `any` 类型
- [ ] 错误有适当处理（try/catch 或返回 Result）
- [ ] 函数有清晰的输入输出
- [ ] 关键逻辑有注释说明
- [ ] 提交信息符合规范

---

*最后更新：2026-02-19*
