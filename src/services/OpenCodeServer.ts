import { spawn } from 'child_process';
import { request as httpRequest } from 'http';
import { requestUrl } from 'obsidian';
import type {
    CreateSessionRequest,
    OpenCodeEvent,
    OpenCodeMessage,
    OpenCodeServerEvents,
    OpenCodeSession,
    Part,
    PermissionReplyRequest,
    PermissionResponse,
    PermissionRule,
    QuestionReplyRequest,
    SendMessageRequest,
} from '../types/opencode';

type EventMap<T> = { [K in keyof T]: (...args: unknown[]) => void };

class TypedEventEmitter<T extends EventMap<T>> {
    private listeners: { [K in keyof T]?: Set<T[K]> } = {};

    on<K extends keyof T>(event: K, callback: T[K]): void {
        const existing = this.listeners[event];
        if (existing) {
            existing.add(callback);
            return;
        }
        this.listeners[event] = new Set([callback]);
    }

    off<K extends keyof T>(event: K, callback: T[K]): void {
        const existing = this.listeners[event];
        if (!existing) {
            return;
        }
        existing.delete(callback);
        if (existing.size === 0) {
            delete this.listeners[event];
        }
    }

    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
        const existing = this.listeners[event];
        if (!existing) {
            return;
        }
        for (const listener of existing) {
            listener(...args);
        }
    }

    removeAllListeners(): void {
        this.listeners = {};
    }
}

export class OpenCodeServer extends TypedEventEmitter<OpenCodeServerEvents> {
    private static instance: OpenCodeServer | null = null;
    private serverProcess: ReturnType<typeof spawn> | null = null;
    private sseRequest: ReturnType<typeof httpRequest> | null = null;
    private port: number = 0;
    private baseUrl: string = '';
    private vaultPath: string;
    private isConnected: boolean = false;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number = 5;
    private sseBuffer: string = '';
    private textAccumulator: Map<string, string> = new Map();
    private messageRoles: Map<string, string> = new Map();
    private stopping: boolean = false;

    private constructor(vaultPath: string) {
        super();
        this.vaultPath = vaultPath;
    }

    static getInstance(vaultPath: string): OpenCodeServer {
        if (!OpenCodeServer.instance) {
            OpenCodeServer.instance = new OpenCodeServer(vaultPath);
        }
        return OpenCodeServer.instance;
    }

    get connected(): boolean {
        return this.isConnected;
    }

    get serverPort(): number {
        return this.port;
    }

    async start(): Promise<void> {
        if (this.serverProcess) {
            return;
        }

        this.stopping = false;
        let lastError: Error | null = null;
        const maxAttempts = 3;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const port = 14000 + attempt;
            try {
                await this.startServerOnPort(port);
                return;
            } catch (error) {
                const resolvedError = error instanceof Error ? error : new Error('Failed to start OpenCode server');
                lastError = resolvedError;
                console.error(`OpenCodeServer: Port ${port} failed:`, resolvedError.message);
                if (resolvedError.message.includes('ENOENT')) {
                    throw new Error('OpenCode CLI not found. Please install it: curl -fsSL https://opencode.ai/install | bash');
                }
            }
        }

        if (lastError) {
            throw lastError;
        }

        throw new Error('Failed to start OpenCode server');
    }

    async stop(): Promise<void> {
        this.stopping = true;
        this.disconnectSSE();
        this.textAccumulator.clear();
        this.messageRoles.clear();
        this.isConnected = false;
        await this.killServerProcess();
        this.port = 0;
        this.baseUrl = '';
        this.reconnectAttempts = 0;
        this.stopping = false;
    }

    private async startServerOnPort(port: number): Promise<void> {
        this.port = port;
        this.baseUrl = `http://127.0.0.1:${port}`;

        console.log(`OpenCodeServer: Starting on port ${port}, cwd: ${this.vaultPath}`);

        const processHandle = spawn('opencode', ['serve', '--port', String(port)], {
            cwd: this.vaultPath,
            env: {
                ...process.env,
                PATH: this.buildAugmentedPath(),
            },
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });

        this.serverProcess = processHandle;

        processHandle.stdout?.setEncoding('utf8');
        processHandle.stderr?.setEncoding('utf8');

        processHandle.stdout?.on('data', () => undefined);

        processHandle.stderr?.on('data', (data: string | Buffer) => {
            const message = data.toString().trim();
            if (message) {
                console.error('OpenCodeServer: stderr:', message);
            }
        });

        processHandle.on('exit', (code, signal) => {
            console.error(`OpenCodeServer: Process exited (code: ${code}, signal: ${signal})`);
        });

        try {
            await this.waitForServerReady(processHandle);
        } catch (error) {
            await this.stop();
            throw error;
        }

        console.log(`OpenCodeServer: Server ready on port ${port}`);
        await this.connectSSE();
    }

    private buildAugmentedPath(): string {
        const homedir = process.env.HOME || process.env.USERPROFILE || '';
        const opencodeBinDir = homedir ? `${homedir}/.opencode/bin` : '';
        const envPath = process.env.PATH || '';
        if (opencodeBinDir && !envPath.includes(opencodeBinDir)) {
            return `${opencodeBinDir}:${envPath}`;
        }
        return envPath;
    }

    private async waitForServerReady(processHandle: ReturnType<typeof spawn>): Promise<void> {
        const startTime = Date.now();
        const timeoutMs = 10_000;
        let exitError: Error | null = null;

        const handleExit = (code: number | null, signal: string | null) => {
            exitError = new Error(`OpenCode server exited before ready (code: ${code ?? 'unknown'}, signal: ${signal ?? 'none'})`);
        };

        const handleError = (error: Error) => {
            exitError = error;
        };

        processHandle.once('exit', handleExit);
        processHandle.once('error', handleError);

        try {
            while (Date.now() - startTime < timeoutMs) {
                if (exitError) {
                    throw exitError;
                }
                try {
                    await this.httpRequest<unknown>('GET', '/session');
                    return;
                } catch {
                    await this.delay(500);
                }
            }
        } finally {
            processHandle.off('exit', handleExit);
            processHandle.off('error', handleError);
        }

        if (exitError) {
            throw exitError;
        }

        throw new Error('OpenCode server did not become ready in time');
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async connectSSE(): Promise<void> {
        this.disconnectSSE();
        this.sseBuffer = '';

        await new Promise<void>((resolve, reject) => {
            const request = httpRequest(
                `${this.baseUrl}/event`,
                {
                    method: 'GET',
                    headers: {
                        Accept: 'text/event-stream',
                    },
                },
                (response) => {
                    const statusCode = response.statusCode ?? 0;
                    if (statusCode >= 400) {
                        const error = new Error(`SSE connection failed with status ${statusCode}`);
                        this.handleSseDisconnect(error);
                        reject(error);
                        return;
                    }

                    let disconnected = false;
                    const handleDisconnect = (error: Error) => {
                        if (disconnected) {
                            return;
                        }
                        disconnected = true;
                        this.handleSseDisconnect(error);
                    };

                    console.log('OpenCodeServer: SSE connected');
                    this.reconnectAttempts = 0;
                    this.markConnected();
                    response.setEncoding('utf8');

                    response.on('data', (chunk: string | Buffer) => {
                        this.handleSseData(chunk.toString());
                    });

                    response.once('end', () => {
                        handleDisconnect(new Error('SSE connection ended'));
                    });

                    response.once('close', () => {
                        handleDisconnect(new Error('SSE connection closed'));
                    });

                    response.once('error', (err: Error) => {
                        handleDisconnect(err);
                    });

                    resolve();
                }
            );

            this.sseRequest = request;

            request.on('error', (err: Error) => {
                this.handleSseDisconnect(err);
                reject(err);
            });

            request.end();
        });
    }

    private disconnectSSE(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.sseRequest) {
            this.sseRequest.destroy();
            this.sseRequest = null;
        }

        this.sseBuffer = '';
        if (this.isConnected) {
            this.isConnected = false;
            this.emit('disconnected');
        }
    }

    private markConnected(): void {
        if (!this.isConnected) {
            this.isConnected = true;
            this.emit('connected');
        }
    }

    private handleSseDisconnect(error?: Error): void {
        this.disconnectSSE();

        if (this.stopping) {
            return;
        }

        if (error) {
            console.error('OpenCodeServer: SSE disconnected', error);
            this.emit('error', error);
        } else {
            console.log('OpenCodeServer: SSE disconnected');
        }

        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        if (this.stopping || !this.serverProcess) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        if (this.reconnectTimer) {
            return;
        }

        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectSSE().catch((error) => {
                const resolvedError = error instanceof Error ? error : new Error('Failed to reconnect SSE');
                this.handleSseDisconnect(resolvedError);
            });
        }, 2000);
    }

    private handleSseData(chunk: string): void {
        this.sseBuffer += chunk;
        const events = this.sseBuffer.split(/\r?\n\r?\n/);
        this.sseBuffer = events.pop() ?? '';

        for (const rawEvent of events) {
            const dataLines = rawEvent
                .split(/\r?\n/)
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.replace(/^data:\s?/, ''));

            if (dataLines.length === 0) {
                continue;
            }

            const payload = dataLines.join('\n');
            this.handleSsePayload(payload);
        }
    }

    private handleSsePayload(payload: string): void {
        try {
            const event = JSON.parse(payload) as OpenCodeEvent;
            this.handleEvent(event);
        } catch (error) {
            const parsedError = error instanceof Error ? error : new Error('Failed to parse SSE payload');
            this.emit('error', parsedError);
        }
    }

    private handleEvent(event: OpenCodeEvent): void {
        switch (event.type) {
            case 'session.status': {
                const { sessionID, status } = event.properties;
                this.emit('session.status', sessionID, status);
                break;
            }
            case 'session.idle': {
                this.emit('session.idle', event.properties.sessionID);
                break;
            }
            case 'session.error': {
                this.emit('session.error', event.properties.sessionID, event.properties.error);
                break;
            }
            case 'session.diff': {
                const { sessionID, diff } = event.properties;
                this.emit('diff.updated', sessionID, diff);
                break;
            }
            case 'message.updated': {
                const messageInfo = event.properties.info;
                if (messageInfo.role) {
                    this.messageRoles.set(messageInfo.id, messageInfo.role);
                }
                this.emit('message.updated', messageInfo);
                break;
            }
            case 'message.part.updated': {
                this.handlePartUpdated(event.properties.part, event.properties.delta);
                break;
            }
            case 'permission.asked': {
                this.emit('permission.asked', event.properties);
                break;
            }
            case 'question.asked': {
                this.emit('question.asked', event.properties);
                break;
            }
            case 'todo.updated': {
                const { sessionID, todos } = event.properties;
                this.emit('todo.updated', sessionID, todos);
                break;
            }
            case 'server.connected': {
                this.markConnected();
                break;
            }
            default: {
                break;
            }
        }
    }

    private handlePartUpdated(part: Part, delta?: string): void {
        if (part.type === 'text') {
            // Skip user message parts — they echo the user's input and should not
            // be rendered as part of the assistant response.
            const messageRole = this.messageRoles.get(part.messageID);
            if (messageRole === 'user') {
                return;
            }

            const partID = part.id;
            const previousText = this.textAccumulator.get(partID) ?? '';
            let fullText = previousText;
            let deltaText = '';

            if (typeof delta === 'string') {
                deltaText = delta;
                fullText = previousText + delta;
            } else if (typeof part.text === 'string') {
                fullText = part.text;
                if (part.text.startsWith(previousText)) {
                    deltaText = part.text.slice(previousText.length);
                } else {
                    deltaText = part.text;
                }
            }

            this.textAccumulator.set(partID, fullText);
            this.emit('text.delta', part.sessionID, partID, deltaText, fullText);

            if (part.time?.end !== undefined) {
                this.emit('text.done', part.sessionID, partID, fullText);
            }
            return;
        }

        if (part.type === 'tool') {
            this.emit('tool.updated', part.sessionID, part);
            return;
        }

        if (part.type === 'step-start') {
            this.emit('step.start', part.sessionID, part);
            return;
        }

        if (part.type === 'step-finish') {
            this.emit('step.finish', part.sessionID, part);
        }
    }

    private async httpRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
        if (!this.baseUrl) {
            throw new Error('OpenCode server is not started');
        }

        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const payload = body !== undefined ? JSON.stringify(body) : undefined;

        const response = await requestUrl({
            url,
            method,
            headers,
            body: payload,
            throw: false,
        });

        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}: ${response.text || 'Request failed'}`);
        }

        if (response.status === 204 || response.text.trim() === '') {
            return undefined as T;
        }

        try {
            return JSON.parse(response.text) as T;
        } catch (error) {
            const parsedError = error instanceof Error ? error : new Error('Failed to parse JSON response');
            throw parsedError;
        }
    }

    async createSession(permissions?: PermissionRule[]): Promise<OpenCodeSession> {
        const body: CreateSessionRequest = permissions ? { permission: permissions } : {};
        return this.httpRequest<OpenCodeSession>('POST', '/session', body);
    }

    async listSessions(): Promise<OpenCodeSession[]> {
        return this.httpRequest<OpenCodeSession[]>('GET', '/session');
    }

    async sendMessage(sessionId: string, text: string): Promise<void> {
        const body: SendMessageRequest = {
            parts: [{ type: 'text', text }],
        };
        await this.httpRequest<void>('POST', `/session/${encodeURIComponent(sessionId)}/prompt_async`, body);
    }

    async getMessages(sessionId: string): Promise<OpenCodeMessage[]> {
        return this.httpRequest<OpenCodeMessage[]>('GET', `/session/${encodeURIComponent(sessionId)}/message`);
    }

    async abortSession(sessionId: string): Promise<void> {
        await this.httpRequest<void>('POST', `/session/${encodeURIComponent(sessionId)}/abort`);
    }

    async approvePermission(sessionId: string, permissionId: string, response: PermissionResponse): Promise<void> {
        const body: PermissionReplyRequest = { response };
        await this.httpRequest<void>(
            'POST',
            `/session/${encodeURIComponent(sessionId)}/permissions/${encodeURIComponent(permissionId)}`,
            body
        );
    }

    async replyToQuestion(requestId: string, answers: string[][]): Promise<void>;
    async replyToQuestion(sessionId: string, requestId: string, answers: string[][]): Promise<void>;
    async replyToQuestion(arg1: string, arg2: string[][] | string, arg3?: string[][]): Promise<void> {
        const { requestId, answers } = this.normalizeQuestionReplyArgs(arg1, arg2, arg3);
        const body: QuestionReplyRequest = { answers };
        await this.httpRequest<void>('POST', `/question/${encodeURIComponent(requestId)}/reply`, body);
    }

    async rejectQuestion(requestId: string): Promise<void> {
        await this.httpRequest<void>('POST', `/question/${encodeURIComponent(requestId)}/reject`);
    }

    private normalizeQuestionReplyArgs(
        arg1: string,
        arg2: string[][] | string,
        arg3?: string[][]
    ): { requestId: string; answers: string[][] } {
        if (Array.isArray(arg2)) {
            return { requestId: arg1, answers: arg2 };
        }
        if (!arg3) {
            throw new Error('Question reply requires answers');
        }
        return { requestId: arg2, answers: arg3 };
    }

    private async killServerProcess(): Promise<void> {
        const processHandle = this.serverProcess;
        if (!processHandle) {
            return;
        }

        this.serverProcess = null;

        await new Promise<void>((resolve) => {
            let finished = false;

            const finish = () => {
                if (finished) {
                    return;
                }
                finished = true;
                clearTimeout(killTimer);
                resolve();
            };

            const killTimer = setTimeout(() => {
                if (finished) {
                    return;
                }
                try {
                    processHandle.kill('SIGKILL');
                } catch (error) {
                    finish();
                }
            }, 3000);

            processHandle.once('exit', finish);
            processHandle.once('close', finish);

            try {
                processHandle.kill('SIGTERM');
            } catch (error) {
                finish();
            }
        });
    }
}
