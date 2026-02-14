import { App, TFile, TFolder } from 'obsidian';

export interface VaultPublishContext {
    /** Top-level and second-level folder paths in the vault */
    folderTree: string[];
    /** Existing tags across the vault (deduplicated, sorted by frequency desc) */
    tagTaxonomy: string[];
    /** Recently published notes (last 10 by mtime) for naming/path pattern reference */
    recentNotePaths: string[];
}

const MAX_FOLDERS = 40;
const MAX_TAGS = 50;
const MAX_RECENT_NOTES = 10;

export class PublishAssistantService {
    constructor(private app: App) {}

    gatherVaultContext(): VaultPublishContext {
        return {
            folderTree: this.collectFolderTree(),
            tagTaxonomy: this.collectTagTaxonomy(),
            recentNotePaths: this.collectRecentNotePaths(),
        };
    }

    buildPublishContextBlock(ctx: VaultPublishContext): string {
        const lines: string[] = ['## Vault Metadata (for publish suggestions)'];

        if (ctx.folderTree.length > 0) {
            lines.push('### Folder Structure');
            lines.push('Use these existing folders when suggesting an output path:');
            for (const folder of ctx.folderTree) {
                lines.push(`- ${folder}/`);
            }
        } else {
            lines.push('### Folder Structure');
            lines.push('- (root only — no subdirectories)');
        }

        if (ctx.tagTaxonomy.length > 0) {
            lines.push('### Existing Tag Taxonomy');
            lines.push('Prefer reusing existing tags. Only suggest new tags when no existing tag fits:');
            lines.push(ctx.tagTaxonomy.map((tag) => `#${tag}`).join(', '));
        }

        if (ctx.recentNotePaths.length > 0) {
            lines.push('### Recent Note Paths (naming pattern reference)');
            for (const notePath of ctx.recentNotePaths) {
                lines.push(`- ${notePath}`);
            }
        }

        return lines.join('\n');
    }

    private collectFolderTree(): string[] {
        const root = this.app.vault.getRoot();
        const folders: string[] = [];
        this.walkFolders(root, 0, folders);
        return folders.slice(0, MAX_FOLDERS);
    }

    private walkFolders(folder: TFolder, depth: number, result: string[]): void {
        // Only collect top-level and second-level folders; skip hidden and plugin dirs
        if (depth > 2) return;

        for (const child of folder.children) {
            if (child instanceof TFolder) {
                const name = child.name;
                // Skip hidden dirs (., .obsidian, .git, etc.) and node_modules
                if (name.startsWith('.') || name === 'node_modules') {
                    continue;
                }
                result.push(child.path);
                this.walkFolders(child, depth + 1, result);
            }
        }
    }

    private collectTagTaxonomy(): string[] {
        const tagCounts = new Map<string, number>();

        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) continue;

            // Frontmatter tags
            const fmTags = cache.frontmatter?.tags;
            if (fmTags) {
                const tagList = Array.isArray(fmTags) ? fmTags : [fmTags];
                for (const rawTag of tagList) {
                    const tag = this.normalizeTag(String(rawTag));
                    if (tag) {
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                    }
                }
            }

            // Inline tags from metadataCache
            if (cache.tags) {
                for (const tagRef of cache.tags) {
                    const tag = this.normalizeTag(tagRef.tag);
                    if (tag) {
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                    }
                }
            }
        }

        // Sort by frequency descending, take top N
        return Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_TAGS)
            .map(([tag]) => tag);
    }

    private normalizeTag(raw: string): string {
        const trimmed = raw.trim();
        if (!trimmed) return '';
        return trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    }

    private collectRecentNotePaths(): string[] {
        return this.app.vault
            .getMarkdownFiles()
            .sort((a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime)
            .slice(0, MAX_RECENT_NOTES)
            .map((file: TFile) => file.path);
    }
}
