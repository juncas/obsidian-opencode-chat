import { App, MarkdownRenderer, Component, TFile, Notice } from 'obsidian';
import { MEDIUM_STYLES } from './MediumStyles';

export type MediumStyle = 'default' | 'tech' | 'editorial' | 'minimal' | 'modern';

export interface MediumExportOptions {
    title: string;
    subtitle?: string;
    tags?: string[];
    canonicalUrl?: string;
    publishStatus?: 'public' | 'draft' | 'unlisted';
}

export class MediumExporter {
    constructor(private app: App) {}

    /**
     * Clean markdown content for Medium export
     */
    private cleanMarkdown(content: string): string {
        let clean = content.replace(/<stage_completed>.*?<\/stage_completed>/g, '');

        // If content is wrapped in <final_article>, extract it
        const finalMatch = clean.match(/<final_article>([\s\S]*?)<\/final_article>/i);
        if (finalMatch && finalMatch[1].trim().length > 0) {
            return finalMatch[1].trim();
        }

        // Extract code block content if entire content is wrapped
        const codeBlockRegex = /^```(?:markdown)?\s*([\s\S]*?)\s*```$/i;
        const trimmedClean = clean.trim();
        const match = trimmedClean.match(codeBlockRegex);

        if (match) {
            const withoutCodeBlocks = trimmedClean.replace(/```[\s\S]*?```/g, '');
            const hasOutsideContent = withoutCodeBlocks.trim().length > 10;

            if (!hasOutsideContent && match[1].length > 50) {
                return match[1].trim();
            }
        }

        // Remove frontmatter if present
        if (clean.startsWith('---')) {
            const frontmatterEnd = clean.indexOf('---', 3);
            if (frontmatterEnd !== -1) {
                clean = clean.substring(frontmatterEnd + 3);
            }
        }

        return clean.trim();
    }

    /**
     * Process images for Medium export
     * Convert to base64 for portability (same as WeChat)
     */
    private async processImages(container: HTMLElement, sourcePath?: string): Promise<void> {
        const images = container.querySelectorAll('img');
        console.log('[MediumExporter] Found <img> elements:', images.length, 'sourcePath:', sourcePath);

        for (const img of Array.from(images)) {
            const src = img.getAttribute('src');
            console.log('[MediumExporter] Processing <img>:', src);

            if (src) {
                const base64Src = await this.imageToBase64(src, sourcePath);
                img.setAttribute('src', base64Src);
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '32px auto';
            }
        }

        // Handle Obsidian embedded images
        const embedSpans = container.querySelectorAll('span.internal-embed, img.internal-embed');
        console.log('[MediumExporter] Found internal-embed elements:', embedSpans.length);

        for (const embed of Array.from(embedSpans)) {
            const src = embed.getAttribute('src') || embed.getAttribute('alt');
            console.log('[MediumExporter] Processing internal-embed:', src);

            if (src) {
                const base64Src = await this.imageToBase64(src, sourcePath);

                const imgEl = document.createElement('img');
                imgEl.setAttribute('src', base64Src);
                imgEl.setAttribute('alt', embed.getAttribute('alt') || '');
                imgEl.style.maxWidth = '100%';
                imgEl.style.height = 'auto';
                imgEl.style.display = 'block';
                imgEl.style.margin = '32px auto';

                embed.replaceWith(imgEl);
                console.log('[MediumExporter] Replaced embed with <img>:', src);
            }
        }
    }

    /**
     * Convert image src to base64 for embedding
     */
    private async imageToBase64(src: string, sourcePath?: string): Promise<string> {
        try {
            let imagePath = src;

            // Remove query parameters and hash
            const cleanSrc = src.split('?')[0].split('#')[0];

            // Handle file:// URLs
            if (cleanSrc.startsWith('file://')) {
                imagePath = decodeURIComponent(cleanSrc.replace('file://', ''));
                if (imagePath.startsWith('/') && !imagePath.match(/^\/[A-Z]:/)) {
                    imagePath = imagePath.substring(1);
                }
            }
            // Handle Obsidian internal URLs
            else if (cleanSrc.startsWith('app://local/')) {
                imagePath = decodeURIComponent(cleanSrc.replace('app://local/', ''));
            }
            // Handle obsidian:// URLs
            else if (cleanSrc.startsWith('obsidian://')) {
                try {
                    const url = new URL(cleanSrc);
                    imagePath = url.pathname || url.searchParams.get('file') || url.href;
                } catch {
                    imagePath = cleanSrc;
                }
            }
            // Handle encoded URLs
            else if (cleanSrc.includes('obsidian.md')) {
                const match = cleanSrc.match(/obsidian\.md\/(.+)/);
                if (match) {
                    imagePath = decodeURIComponent(match[1]);
                }
            }
            else {
                imagePath = cleanSrc;
            }

            // Remove leading slash
            if (imagePath.startsWith('/')) {
                imagePath = imagePath.substring(1);
            }

            // Handle relative paths
            if (sourcePath && !imagePath.startsWith('/') && !imagePath.match(/^[a-zA-Z]+:/) && !imagePath.match(/^[?#]/)) {
                const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
                if (sourceDir) {
                    imagePath = sourceDir ? `${sourceDir}/${imagePath}` : imagePath;
                }
            }

            // Normalize path
            imagePath = this.normalizePath(imagePath);

            console.log('[MediumExporter] Image path resolution:', { src, sourcePath, resolved: imagePath });

            // Try to get the file from vault
            const file = this.app.vault.getAbstractFileByPath(imagePath);
            console.log('[MediumExporter] Vault file lookup:', { imagePath, found: file instanceof TFile });

            if (file instanceof TFile) {
                const content = await this.app.vault.readBinary(file);
                const base64 = this.arrayBufferToBase64(content);
                const ext = file.extension.toLowerCase();
                const mimeTypes: Record<string, string> = {
                    'png': 'image/png',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'gif': 'image/gif',
                    'webp': 'image/webp',
                    'svg': 'image/svg+xml',
                    'avif': 'image/avif',
                    'heic': 'image/heic',
                    'heif': 'image/heif'
                };
                const mimeType = mimeTypes[ext] || 'image/png';
                const result = `data:${mimeType};base64,${base64}`;
                console.log('[MediumExporter] Successfully converted image to base64:', { imagePath, mimeType, length: result.length });
                return result;
            }

            // If file not found, try to fetch from URL
            if (src.startsWith('http://') || src.startsWith('https://')) {
                try {
                    const response = await fetch(src, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        const base64 = this.arrayBufferToBase64(arrayBuffer);
                        const contentType = blob.type || 'image/png';
                        const result = `data:${contentType};base64,${base64}`;
                        console.log('[MediumExporter] Successfully fetched external image:', { src, contentType });
                        return result;
                    }
                } catch (corsError) {
                    console.warn('CORS fetch failed for image:', src, corsError);
                }
            }

        } catch (error) {
            console.error('Failed to convert image to base64:', error);
        }

        return src;
    }

    private normalizePath(path: string): string {
        const segments = path.split('/');
        const result: string[] = [];

        for (const segment of segments) {
            if (segment === '' || segment === '.') {
                continue;
            }
            if (segment === '..') {
                result.pop();
            } else {
                result.push(segment);
            }
        }

        return result.join('/');
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Generate styled HTML from markdown for preview
     */
    public async generateStyledHtml(
        rawMarkdown: string,
        style: MediumStyle = 'default',
        sourcePath: string = ''
    ): Promise<string> {
        const markdown = this.cleanMarkdown(rawMarkdown);
        const container = document.createElement('div');
        container.addClass('medium-article');

        const component = new Component();
        await MarkdownRenderer.render(
            this.app,
            markdown,
            container,
            sourcePath,
            component
        );
        component.unload();

        // Process images
        await this.processImages(container, sourcePath);

        const css = MEDIUM_STYLES[style] || MEDIUM_STYLES['default'];

        this.inlineStyles(container, css);

        return container.innerHTML;
    }

    /**
     * Generate full HTML for copying to Medium clipboard
     */
    public async generateFullHtml(
        rawMarkdown: string,
        style: MediumStyle = 'default',
        sourcePath?: string
    ): Promise<string> {
        const markdown = this.cleanMarkdown(rawMarkdown);
        const container = document.createElement('div');
        container.addClass('medium-article');

        const component = new Component();
        await MarkdownRenderer.render(
            this.app,
            markdown,
            container,
            sourcePath || '',
            component
        );
        component.unload();

        // Process images
        await this.processImages(container, sourcePath);

        const css = MEDIUM_STYLES[style] || MEDIUM_STYLES['default'];

        this.inlineStyles(container, css);

        return container.innerHTML;
    }

    /**
     * Export to HTML file with selected style
     */
    public async exportToHtml(
        rawMarkdown: string,
        style: MediumStyle = 'default',
        filename: string,
        sourcePath?: string
    ): Promise<TFile | null> {
        try {
            const markdown = this.cleanMarkdown(rawMarkdown);
            const container = document.createElement('div');
            container.addClass('medium-article');

            const component = new Component();
            await MarkdownRenderer.render(
                this.app,
                markdown,
                container,
                sourcePath || '',
                component
            );
            component.unload();

            // Process images
            await this.processImages(container, sourcePath);

            const css = MEDIUM_STYLES[style] || MEDIUM_STYLES['default'];

            this.inlineStyles(container, css);

            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        ${css}
        body { margin: 0; padding: 20px; background-color: #f5f5f5; }
        .medium-article-container {
            max-width: 720px;
            margin: 0 auto;
            background-color: #fff;
            padding: 40px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="medium-article-container">
        ${container.outerHTML}
    </div>
</body>
</html>`;

            const vault = this.app.vault;
            const targetPath = `${filename}.html`;

            let file = vault.getAbstractFileByPath(targetPath);
            if (file instanceof TFile) {
                await vault.modify(file, fullHtml);
                new Notice(`Updated existing file: ${targetPath}`);
            } else {
                file = await vault.create(targetPath, fullHtml);
                new Notice(`Exported Medium HTML: ${targetPath}`);
            }

            return file instanceof TFile ? file : null;

        } catch (error) {
            console.error('Failed to export Medium HTML:', error);
            new Notice('Export failed. Check console for details.');
            return null;
        }
    }

    /**
     * Export to Markdown file
     */
    public async exportToMarkdown(
        rawMarkdown: string,
        options: MediumExportOptions,
        filename: string
    ): Promise<TFile | null> {
        try {
            const markdown = this.cleanMarkdown(rawMarkdown);

            let content = '';

            // Add title
            if (options.title) {
                content += `# ${options.title}\n\n`;
            }

            // Add subtitle
            if (options.subtitle) {
                content += `> ${options.subtitle}\n\n`;
            }

            // Add tags
            if (options.tags && options.tags.length > 0) {
                content += `*Tags: ${options.tags.join(', ')}*\n\n`;
            }

            // Add main content
            content += markdown;

            // Add canonical URL
            if (options.canonicalUrl) {
                content += `\n\n---\n\n*Originally published at: ${options.canonicalUrl}*`;
            }

            const vault = this.app.vault;
            const targetPath = `${filename}.md`;

            let file = vault.getAbstractFileByPath(targetPath);
            if (file instanceof TFile) {
                await vault.modify(file, content);
                new Notice(`Updated existing file: ${targetPath}`);
            } else {
                file = await vault.create(targetPath, content);
                new Notice(`Exported Medium Markdown: ${targetPath}`);
            }

            return file instanceof TFile ? file : null;

        } catch (error) {
            console.error('Failed to export Medium Markdown:', error);
            new Notice('Export failed. Check console for details.');
            return null;
        }
    }

    /**
     * Inline CSS styles to HTML elements
     */
    private inlineStyles(container: HTMLElement, css: string): void {
        const variables: Record<string, string> = {};
        const rootMatch = css.match(/:root\s*{([^}]+)}/);
        if (rootMatch) {
            const varsBlock = rootMatch[1];
            varsBlock.split(';').forEach(prop => {
                const [key, val] = prop.split(':').map(s => s.trim());
                if (key && val && key.startsWith('--')) {
                    variables[key] = val;
                }
            });
        }

        const ruleRegex = /\.medium-article\s+([^{]+)\s*{([^}]+)}/g;
        let match;

        while ((match = ruleRegex.exec(css)) !== null) {
            const selectorPart = match[1].trim();
            const rulesText = match[2].trim();

            const rules = rulesText.split(';').map(rule => {
                let [prop, val] = rule.split(':').map(s => s.trim());
                if (!prop || !val) return null;

                val = val.replace(/var\((--[^)]+)\)/g, (_, varName) => {
                    return variables[varName] || varName;
                });

                return `${prop}: ${val}`;
            }).filter(Boolean).join('; ');

            const selectors = selectorPart.split(',').map(s => s.trim());

            selectors.forEach(sel => {
                if (sel.includes('::')) return;

                const cleanSel = sel.split(':')[0].trim();
                if (!cleanSel) return;

                try {
                    const elements = container.querySelectorAll(sel);
                    elements.forEach(el => {
                        const existing = el.getAttribute('style') || '';
                        el.setAttribute('style', `${existing}${existing ? '; ' : ''}${rules}`);
                    });
                } catch (e) {
                }
            });
        }
    }

    /**
     * Get available Medium styles
     */
    public static getAvailableStyles(): { value: MediumStyle; label: string; description: string }[] {
        return [
            { value: 'default', label: 'Medium Classic', description: 'Clean, readable style matching Medium default' },
            { value: 'tech', label: 'Tech Blog', description: 'Monospace fonts, technical aesthetic' },
            { value: 'editorial', label: 'Editorial', description: 'Serif fonts, magazine-style elegance' },
            { value: 'minimal', label: 'Minimal', description: 'Stripped-down, distraction-free' },
            { value: 'modern', label: 'Modern', description: 'Contemporary with gradient accents' },
        ];
    }

    /**
     * Get Medium publishing guidelines
     */
    public static getPublishingGuidelines(): string {
        return `## Medium Publishing Guidelines

### Content Format
- **Title**: Required, max 120 characters recommended
- **Subtitle**: Optional, appears under title
- **Tags**: Up to 5 tags for discoverability
- **Images**: Upload directly to Medium for best quality

### Publishing Steps
1. Go to medium.com and click "Write"
2. Copy and paste the exported content
3. Add title and subtitle
4. Upload images (if any)
5. Add tags (up to 5)
6. Click "Preview" to review
7. Choose publish settings (public, unlisted, or draft)
8. Click "Publish"

### Note on API
Medium no longer supports new API integrations.
Content must be published manually through the Medium editor.

### Formatting Tips
- Use # for main title, ## for section headers
- Use > for quotes and highlights
- Use --- for section breaks
- Images work best when uploaded directly to Medium
- Code blocks are supported with triple backticks
`;
    }
}
