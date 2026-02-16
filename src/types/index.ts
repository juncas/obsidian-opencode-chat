import type { WritingTask } from './writing';

export const OPENCODE_CHAT_VIEW_TYPE = 'claude-chat-view';
export const WECHAT_EXPORT_PREVIEW_VIEW_TYPE = 'wechat-export-preview-view';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export interface OpenCodePluginSettings {
    opencodeModel: string;
    ohMyOpencodeModel: string;
    enableOhMyOpencode: boolean;
}

/**
 * Represents a single conversation session
 */
export interface Session {
    id: string;
    name: string;
    sessionId: string | null; // Deprecated: old CLI session ID
    serverSessionId: string | null; // OpenCode HTTP Server session ID
    writingTask: WritingTask | null;
    createdAt: Date;
    updatedAt: Date;
    messages: ChatMessage[];
}

/**
 * Plugin data persisted to disk
 * Stored in .obsidian/plugins/claude-chat-obsidian/data.json
 */
export interface OpenCodePluginData {
    sessionId: string | null; // Deprecated: kept for backward compatibility
    version: string;
    sessions: Session[];
    currentSessionId: string | null;
}
