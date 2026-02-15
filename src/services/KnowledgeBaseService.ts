import { App, TFile, TFolder } from 'obsidian';

export interface AuditIssue {
    type: 'broken-link' | 'orphan' | 'duplicate-title' | 'stale';
    file: TFile;
    detail: string;
    severity: 'high' | 'medium' | 'low';
}

export interface AuditReport {
    timestamp: number;
    totalFiles: number;
    issues: AuditIssue[];
    summary: {
        brokenLinks: number;
        orphans: number;
        duplicates: number;
        stale: number;
    };
}

export class KnowledgeBaseService {
    constructor(private app: App) {}

    /**
     * Run a full audit of the vault using metadata cache.
     * This is non-blocking and relatively fast.
     */
    public async runAudit(): Promise<AuditReport> {
        const files = this.app.vault.getMarkdownFiles();
        const issues: AuditIssue[] = [];
        
        const incomingLinks: Record<string, number> = {};
        const allPaths = new Set(files.map(f => f.path));
        const fileByBasename: Record<string, TFile[]> = {};

        for (const file of files) {
            if (!fileByBasename[file.basename]) {
                fileByBasename[file.basename] = [];
            }
            fileByBasename[file.basename].push(file);

            if (incomingLinks[file.path] === undefined) {
                incomingLinks[file.path] = 0;
            }

            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.links) {
                for (const link of cache.links) {
                    const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
                    if (dest) {
                        incomingLinks[dest.path] = (incomingLinks[dest.path] || 0) + 1;
                    } else {
                        issues.push({
                            type: 'broken-link',
                            file: file,
                            detail: `Link to "${link.link}" not found`,
                            severity: 'high'
                        });
                    }
                }
            }
            
            if (cache?.embeds) {
                 for (const embed of cache.embeds) {
                    const dest = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path);
                    if (dest) {
                        incomingLinks[dest.path] = (incomingLinks[dest.path] || 0) + 1;
                    } else {
                        issues.push({
                            type: 'broken-link',
                            file: file,
                            detail: `Embed "${embed.link}" not found`,
                            severity: 'high'
                        });
                    }
                }
            }
        }

        for (const file of files) {
            if (!incomingLinks[file.path] && file.stat.size > 0) {
                issues.push({
                    type: 'orphan',
                    file: file,
                    detail: 'No incoming links from other notes',
                    severity: 'low'
                });
            }
        }

        for (const basename in fileByBasename) {
            if (fileByBasename[basename].length > 1) {
                for (const file of fileByBasename[basename]) {
                    issues.push({
                        type: 'duplicate-title',
                        file: file,
                        detail: `Title clash with ${fileByBasename[basename].length - 1} other file(s)`,
                        severity: 'medium'
                    });
                }
            }
        }

        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        for (const file of files) {
            if (now - file.stat.mtime > ONE_YEAR_MS) {
                issues.push({
                    type: 'stale',
                    file: file,
                    detail: `Last modified ${new Date(file.stat.mtime).toLocaleDateString()}`,
                    severity: 'low'
                });
            }
        }

        return {
            timestamp: Date.now(),
            totalFiles: files.length,
            issues,
            summary: {
                brokenLinks: issues.filter(i => i.type === 'broken-link').length,
                orphans: issues.filter(i => i.type === 'orphan').length,
                duplicates: issues.filter(i => i.type === 'duplicate-title').length,
                stale: issues.filter(i => i.type === 'stale').length
            }
        };
    }

    /**
     * Generate a readable markdown report from the audit result.
     */
    public formatReport(report: AuditReport): string {
        let md = `# Knowledge Base Health Report\n`;
        md += `**Date:** ${new Date(report.timestamp).toLocaleString()}\n`;
        md += `**Total Files:** ${report.totalFiles}\n\n`;

        md += `## Summary\n`;
        md += `- 🔴 Broken Links: **${report.summary.brokenLinks}**\n`;
        md += `- 🟠 Duplicate Titles: **${report.summary.duplicates}**\n`;
        md += `- 🟡 Orphan Notes: **${report.summary.orphans}**\n`;
        md += `- ⚪ Stale Notes (>1yr): **${report.summary.stale}**\n\n`;

        if (report.issues.length === 0) {
            md += `🎉 **Excellent! No issues found.**\n`;
            return md;
        }

        md += `## Issues Detail\n`;

        const broken = report.issues.filter(i => i.type === 'broken-link');
        if (broken.length > 0) {
            md += `### 🔴 Broken Links (${broken.length})\n`;
            md += `> Links pointing to non-existent files.\n\n`;
            for (const issue of broken.slice(0, 50)) {
                md += `- [[${issue.file.path}]] : ${issue.detail}\n`;
            }
            if (broken.length > 50) md += `- ... and ${broken.length - 50} more\n`;
            md += `\n`;
        }

        const duplicates = report.issues.filter(i => i.type === 'duplicate-title');
        if (duplicates.length > 0) {
            md += `### 🟠 Duplicate Titles (${duplicates.length})\n`;
            md += `> Files with same basename but different folders.\n\n`;
             for (const issue of duplicates.slice(0, 20)) {
                md += `- [[${issue.file.path}]]\n`;
            }
            if (duplicates.length > 20) md += `- ... and ${duplicates.length - 20} more\n`;
            md += `\n`;
        }

        const orphans = report.issues.filter(i => i.type === 'orphan');
        if (orphans.length > 0) {
            md += `### 🟡 Orphan Notes (${orphans.length})\n`;
            md += `> Notes not linked from anywhere else.\n\n`;
             for (const issue of orphans.slice(0, 20)) {
                md += `- [[${issue.file.path}]]\n`;
            }
            if (orphans.length > 20) md += `- ... and ${orphans.length - 20} more\n`;
            md += `\n`;
        }
        
        return md;
    }
}
