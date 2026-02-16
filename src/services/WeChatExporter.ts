import { App, MarkdownRenderer, Component, TFile, Notice, Platform } from 'obsidian';
import { WECHAT_STYLES } from './WeChatStyles';

export type WeChatStyle = 'default' | 'elegant' | 'minimal' | 'tech' | 'vibrant' | 'aiBlue' | 'matrixGreen' | 'cyberPurple' | 'oceanTeal';

export class WeChatExporter {
    constructor(private app: App) {}

    /**
     * Convert image src to base64 for embedding
     */
    private async imageToBase64(src: string, sourcePath?: string): Promise<string> {
        try {
            let imagePath = src;

            // Remove query parameters and hash (e.g., ?width=500, #header)
            const cleanSrc = src.split('?')[0].split('#')[0];

            // Handle file:// URLs (local file system paths)
            if (cleanSrc.startsWith('file://')) {
                imagePath = decodeURIComponent(cleanSrc.replace('file://', ''));
                // On macOS, paths start with /, on Windows they start with /C:/ etc.
                // Remove leading slash for macOS paths if needed
                if (imagePath.startsWith('/') && !imagePath.match(/^\/[A-Z]:/)) {
                    imagePath = imagePath.substring(1);
                }
            }
            // Handle Obsidian internal URLs: app://local/...
            else if (cleanSrc.startsWith('app://local/')) {
                imagePath = decodeURIComponent(cleanSrc.replace('app://local/', ''));
            }
            // Handle obsidian:// URLs
            else if (cleanSrc.startsWith('obsidian://')) {
                try {
                    const url = new URL(cleanSrc);
                    // Try to get path from URL
                    imagePath = url.pathname || url.searchParams.get('file') || url.href;
                } catch {
                    imagePath = cleanSrc;
                }
            }
            // Handle encoded URLs (obsidian.md format)
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

            // Handle relative paths - resolve against source file path
            if (sourcePath && !imagePath.startsWith('/') && !imagePath.match(/^[a-zA-Z]+:/) && !imagePath.match(/^[?#]/)) {
                const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
                if (sourceDir) {
                    imagePath = sourceDir ? `${sourceDir}/${imagePath}` : imagePath;
                }
            }

            // Normalize path - resolve ../ and ./
            imagePath = this.normalizePath(imagePath);

            console.log('[WeChatExporter] Image path resolution:', { src, sourcePath, resolved: imagePath });

            // Try to get the file from vault
            const file = this.app.vault.getAbstractFileByPath(imagePath);
            console.log('[WeChatExporter] Vault file lookup:', { imagePath, found: file instanceof TFile });

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
                console.log('[WeChatExporter] Successfully converted image to base64:', { imagePath, mimeType, length: result.length });
                return result;
            }

            // If file not found in vault, try to fetch from URL (only for http/https)
            if (src.startsWith('http://') || src.startsWith('https://')) {
                try {
                    const response = await fetch(src, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        const base64 = this.arrayBufferToBase64(arrayBuffer);
                        const contentType = blob.type || 'image/png';
                        const result = `data:${contentType};base64,${base64}`;
                        console.log('[WeChatExporter] Successfully fetched external image:', { src, contentType });
                        return result;
                    }
                } catch (corsError) {
                    console.warn('CORS fetch failed for image:', src, corsError);
                }
            }

        } catch (error) {
            console.error('Failed to convert image to base64:', error);
        }

        // Return original src if conversion fails
        console.log('[WeChatExporter] Failed to convert image, returning original src:', src);
        return src;
    }

    /**
     * Normalize path by resolving . and .. segments
     */
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
     * Process images in container - convert to base64 for portability
     */
    private async processImages(container: HTMLElement, sourcePath?: string): Promise<void> {
        // Handle regular <img> elements
        const images = container.querySelectorAll('img');
        console.log('[WeChatExporter] Found <img> elements:', images.length, 'sourcePath:', sourcePath);

        for (const img of Array.from(images)) {
            const src = img.getAttribute('src');
            console.log('[WeChatExporter] Processing <img>:', src);

            if (src) {
                const base64Src = await this.imageToBase64(src, sourcePath);
                img.setAttribute('src', base64Src);
                // Ensure max-width for WeChat compatibility
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '16px auto';
            }
        }

        // Handle Obsidian embedded images: <span class="internal-embed" src="...">
        // These are created from ![[image.png]] syntax
        const embedSpans = container.querySelectorAll('span.internal-embed, img.internal-embed');
        console.log('[WeChatExporter] Found internal-embed elements:', embedSpans.length);

        for (const embed of Array.from(embedSpans)) {
            const src = embed.getAttribute('src') || embed.getAttribute('alt');
            console.log('[WeChatExporter] Processing internal-embed:', src);

            if (src) {
                const base64Src = await this.imageToBase64(src, sourcePath);

                // Replace span with actual <img> element
                const imgEl = document.createElement('img');
                imgEl.setAttribute('src', base64Src);
                imgEl.setAttribute('alt', embed.getAttribute('alt') || '');
                imgEl.style.maxWidth = '100%';
                imgEl.style.height = 'auto';
                imgEl.style.display = 'block';
                imgEl.style.margin = '16px auto';

                embed.replaceWith(imgEl);
                console.log('[WeChatExporter] Replaced embed with <img>:', src);
            }
        }
    }

    /**
     * Generate styled HTML from markdown for preview
     */
    public async generateStyledHtml(
        rawMarkdown: string,
        style: WeChatStyle = 'default',
        sourcePath: string = ''
    ): Promise<string> {
        const markdown = this.cleanMarkdown(rawMarkdown);
        const container = document.createElement('div');
        container.addClass('wechat-article');

        const component = new Component();
        await MarkdownRenderer.renderMarkdown(
            markdown,
            container,
            sourcePath,
            component
        );
        component.unload();

        // Process images - convert to base64
        await this.processImages(container, sourcePath);

        const css = WECHAT_STYLES[style] || WECHAT_STYLES['default'];

        this.inlineStyles(container, css);

        // Return just the article content, not wrapped
        return container.innerHTML;
    }

    /**
     * Generate full HTML for copying to WeChat clipboard
     * Returns inline-styled HTML that can be pasted directly
     */
    public async generateFullHtml(
        rawMarkdown: string,
        style: WeChatStyle = 'default',
        title: string = '',
        sourcePath?: string
    ): Promise<string> {
        const markdown = this.cleanMarkdown(rawMarkdown);
        const container = document.createElement('div');
        container.addClass('wechat-article');

        const component = new Component();
        await MarkdownRenderer.renderMarkdown(
            markdown,
            container,
            sourcePath || '',
            component
        );
        component.unload();

        // Process images - convert to base64
        await this.processImages(container, sourcePath);

        const css = WECHAT_STYLES[style] || WECHAT_STYLES['default'];

        this.inlineStyles(container, css);

        // Return just the article container with inline styles
        // This is what gets copied and pasted into WeChat editor
        return container.innerHTML;
    }

    public async exportToHtml(
        rawMarkdown: string,
        style: WeChatStyle = 'default',
        filename: string,
        sourcePath?: string
    ): Promise<TFile | null> {
        try {
            const markdown = this.cleanMarkdown(rawMarkdown);
            const container = document.createElement('div');
            container.addClass('wechat-article');

            const component = new Component();
            await MarkdownRenderer.renderMarkdown(
                markdown,
                container,
                sourcePath || '',
                component
            );
            component.unload();

            // Process images - convert to base64
            await this.processImages(container, sourcePath);

            const css = WECHAT_STYLES[style] || WECHAT_STYLES['default'];

            this.inlineStyles(container, css);

            const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        ${css}
        body { margin: 0; padding: 20px; background-color: #f5f5f5; }
        .wechat-article-container { 
            max-width: 677px; 
            margin: 0 auto; 
            background-color: #fff;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="wechat-article-container">
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
                new Notice(`Exported WeChat HTML: ${targetPath}`);
            }

            return file instanceof TFile ? file : null;

        } catch (error) {
            console.error('Failed to export WeChat HTML:', error);
            new Notice('Export failed. Check console for details.');
            return null;
        }
    }

    private cleanMarkdown(content: string): string {
        let clean = content.replace(/<stage_completed>.*?<\/stage_completed>/g, '');

        // If content is wrapped in <final_article>, extract it
        const finalMatch = clean.match(/<final_article>([\s\S]*?)<\/final_article>/i);
        if (finalMatch && finalMatch[1].trim().length > 0) {
            return finalMatch[1].trim();
        }

        // For AI-generated content that may contain multiple code blocks,
        // only extract if the ENTIRE content is wrapped in a single code block
        // and there's no regular markdown outside of it
        const codeBlockRegex = /^```(?:markdown)?\s*([\s\S]*?)\s*```$/i;
        const trimmedClean = clean.trim();
        const match = trimmedClean.match(codeBlockRegex);

        if (match) {
            // Check if there's any meaningful content outside code blocks
            const withoutCodeBlocks = trimmedClean.replace(/```[\s\S]*?```/g, '');
            const hasOutsideContent = withoutCodeBlocks.trim().length > 10;

            // Only use code block content if there's nothing else outside
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

        const ruleRegex = /\.wechat-article\s+([^{]+)\s*{([^}]+)}/g;
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
}
