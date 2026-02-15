import { App, MarkdownView, TFile } from 'obsidian';
import type { ContextFileReference, ContextSource, WritingContextSnapshot } from '../types/writing';

const MAX_RECENT_FILES = 5;
const MAX_SELECTION_CHARS = 1200;

interface MentionResolution {
    existing: string[];
    missing: string[];
}

export class ContextResolver {
    constructor(private app: App) {}

    resolveSnapshot(rawInput: string, searchQuery?: string): WritingContextSnapshot {
        const activeFile = this.app.workspace.getActiveFile();
        const mentionPaths = this.parseMentionPaths(rawInput);
        const mentionResolution = this.resolveMentionPaths(mentionPaths);
        const contextFiles = this.collectContextFiles(activeFile, mentionResolution.existing);
        const recentFiles = this.getRecentMarkdownFiles(contextFiles.map((item) => item.path));
        const relatedFiles = searchQuery ? this.retrieveRelatedFiles(searchQuery) : [];
        const selection = this.getEditorSelection();
        const activeFileTags = this.extractFrontmatterTags(activeFile);

        return {
            activeFilePath: activeFile?.path || null,
            activeFileTags,
            selection,
            mentionPaths,
            missingMentionPaths: mentionResolution.missing,
            contextFiles,
            recentFiles,
            relatedFiles,
        };
    }

    buildContextBlock(snapshot: WritingContextSnapshot): string {
        const lines: string[] = ['## Workspace Context'];

        if (snapshot.activeFilePath) {
            lines.push(`- Active note: [[${snapshot.activeFilePath}]]`);
        } else {
            lines.push('- Active note: (none)');
        }

        if (snapshot.activeFileTags.length > 0) {
            lines.push(`- Active note tags: ${snapshot.activeFileTags.map((tag) => `#${tag}`).join(', ')}`);
        }

        if (snapshot.selection) {
            lines.push('- Selected excerpt:');
            lines.push('```text');
            lines.push(snapshot.selection);
            lines.push('```');
        }

        if (snapshot.contextFiles.length > 0) {
            lines.push('- Priority context files:');
            for (const file of snapshot.contextFiles) {
                lines.push(`  - [[${file.path}]] (${file.source})`);
            }
        }

        if (snapshot.relatedFiles.length > 0) {
            lines.push('- Related notes (search results):');
            for (const file of snapshot.relatedFiles) {
                lines.push(`  - [[${file.path}]]`);
            }
        }

        if (snapshot.recentFiles.length > 0) {
            lines.push('- Recently updated notes:');
            for (const filePath of snapshot.recentFiles) {
                lines.push(`  - [[${filePath}]]`);
            }
        }

        if (snapshot.missingMentionPaths.length > 0) {
            lines.push('- Missing @ references (not found in vault):');
            for (const missingPath of snapshot.missingMentionPaths) {
                lines.push(`  - ${missingPath}`);
            }
        }

        lines.push('- Citation policy: use `[[path/to/note]]` for every key claim.');
        return lines.join('\n');
    }

    private retrieveRelatedFiles(query: string): ContextFileReference[] {
        const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
        if (terms.length === 0) return [];

        const candidates = this.app.vault
            .getMarkdownFiles()
            .map((file) => {
                let score = 0;
                const name = file.basename.toLowerCase();
                terms.forEach((term) => {
                    if (name === term) score += 10;
                    else if (name.includes(term)) score += 3;
                });
                return { file, score };
            })
            .filter((c) => c.score > 0)
            .sort((a, b) => b.score - a.score || b.file.stat.mtime - a.file.stat.mtime)
            .slice(0, 5)
            .map((c) => ({
                path: c.file.path,
                source: 'search' as ContextSource,
            }));

        return candidates;
    }

    parseMentionPaths(input: string): string[] {
        const mentionPaths: string[] = [];
        const mentionRegex = /@(?:"([^"]+)"|([^\s@]+))/g;

        let match: RegExpExecArray | null = mentionRegex.exec(input);
        while (match) {
            const matchedPath = (match[1] || match[2] || '').trim();
            if (matchedPath.length > 0) {
                mentionPaths.push(matchedPath);
            }
            match = mentionRegex.exec(input);
        }

        return [...new Set(mentionPaths)];
    }

    private resolveMentionPaths(paths: string[]): MentionResolution {
        const existing: string[] = [];
        const missing: string[] = [];

        for (const path of paths) {
            const normalized = path.replace(/^"+|"+$/g, '');
            const abstractFile = this.app.vault.getAbstractFileByPath(normalized);
            if (abstractFile instanceof TFile) {
                existing.push(abstractFile.path);
            } else {
                missing.push(normalized);
            }
        }

        return { existing, missing };
    }

    private collectContextFiles(activeFile: TFile | null, mentionFiles: string[]): ContextFileReference[] {
        const contextFiles: ContextFileReference[] = [];
        const seen = new Set<string>();

        if (activeFile) {
            contextFiles.push({
                path: activeFile.path,
                source: 'active',
            });
            seen.add(activeFile.path);
        }

        for (const path of mentionFiles) {
            if (seen.has(path)) {
                continue;
            }
            contextFiles.push({
                path,
                source: 'mention',
            });
            seen.add(path);
        }

        return contextFiles;
    }

    private getRecentMarkdownFiles(excludedPaths: string[]): string[] {
        const excluded = new Set(excludedPaths);
        return this.app.vault
            .getMarkdownFiles()
            .filter((file) => !excluded.has(file.path))
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, MAX_RECENT_FILES)
            .map((file) => file.path);
    }

    private getEditorSelection(): string {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const selectedText = markdownView?.editor?.getSelection() || '';
        return this.truncateText(selectedText.trim(), MAX_SELECTION_CHARS);
    }

    private extractFrontmatterTags(file: TFile | null): string[] {
        if (!file) {
            return [];
        }

        const fileCache = this.app.metadataCache.getFileCache(file);
        const rawTags = fileCache?.frontmatter?.tags;
        if (!rawTags) {
            return [];
        }

        const tags = Array.isArray(rawTags) ? rawTags : [rawTags];
        return tags
            .map((tag) => String(tag).trim())
            .filter((tag) => tag.length > 0)
            .map((tag) => (tag.startsWith('#') ? tag.slice(1) : tag));
    }

    private truncateText(value: string, maxChars: number): string {
        if (value.length <= maxChars) {
            return value;
        }
        return `${value.slice(0, maxChars)}\n...[truncated]`;
    }
}
