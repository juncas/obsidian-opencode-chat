import { ItemView, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { WeChatExporter } from '../services/WeChatExporter';
import { WeChatStyle } from '../services/WeChatExporter';
import { WECHAT_EXPORT_PREVIEW_VIEW_TYPE } from '../types';

interface StyleOption {
    label: string;
    value: WeChatStyle;
    description: string;
}

const STYLE_OPTIONS: StyleOption[] = [
    { label: 'Default (默认)', value: 'default', description: 'Blue accent, clear structure. Good for tech/general.' },
    { label: 'Elegant (文艺)', value: 'elegant', description: 'Brown tone, serif fonts. Good for essays/reviews.' },
    { label: 'Tech (极客)', value: 'tech', description: 'Dark theme, terminal style. Good for coding tutorials.' },
    { label: 'Vibrant (活泼)', value: 'vibrant', description: 'Gradients, lively colors. Good for lifestyle/products.' },
    { label: 'Minimal (极简)', value: 'minimal', description: 'Black & white, spacious. Good for serious reading.' },
    { label: 'AI Blue (AI 蓝)', value: 'aiBlue', description: 'Deep sea tech feel. Perfect for AI/deep learning topics.' },
    { label: 'Matrix Green (黑客绿)', value: 'matrixGreen', description: 'Hacker style. Great for programming/security.' },
    { label: 'Cyber Purple (赛博紫)', value: 'cyberPurple', description: 'Cyberpunk style. For cutting-edge tech/AI.' },
    { label: 'Ocean Teal (海洋青)', value: 'oceanTeal', description: 'Fresh & professional. Clean tech style.' },
];

export class WeChatPreviewView extends ItemView {
    private weChatExporter: WeChatExporter;
    private currentFile: TFile | null = null;
    private currentStyle: WeChatStyle = 'default';
    private previewContainer: HTMLElement | null = null;
    private styleSelector: HTMLSelectElement | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.weChatExporter = new WeChatExporter(this.app);
    }

    getViewType(): string {
        return WECHAT_EXPORT_PREVIEW_VIEW_TYPE;
    }

    getDisplayText(): string {
        return this.currentFile ? `Export Preview: ${this.currentFile.name}` : 'Export Preview';
    }

    getIcon(): string {
        return 'file-output';
    }

    async onOpen() {
        this.containerEl.empty();
        this.containerEl.addClass('wechat-preview-container');

        // Header with style selector and action buttons
        const header = this.containerEl.createEl('div', { cls: 'wechat-preview-header' });

        const titleEl = header.createEl('h3', { cls: 'wechat-preview-title', text: 'WeChat Export Preview' });

        // Style selector
        const selectorContainer = header.createEl('div', { cls: 'wechat-preview-style-selector' });
        selectorContainer.createEl('label', { text: 'Style: ', cls: 'wechat-preview-style-label' });

        this.styleSelector = selectorContainer.createEl('select', { cls: 'wechat-preview-style-dropdown' });
        STYLE_OPTIONS.forEach(opt => {
            const option = this.styleSelector!.createEl('option', { value: opt.value, text: opt.label });
            option.setAttribute('data-description', opt.description);
        });

        this.styleSelector.value = this.currentStyle;
        this.styleSelector.addEventListener('change', () => {
            this.currentStyle = this.styleSelector!.value as WeChatStyle;
            this.updatePreview();
        });

        // Action buttons
        const actionsContainer = header.createEl('div', { cls: 'wechat-preview-actions' });

        // Copy button
        const copyBtn = actionsContainer.createEl('button', {
            cls: 'wechat-preview-action-btn',
            text: 'Copy for WeChat'
        });
        copyBtn.addEventListener('click', () => this.copyForWeChat());

        // Export button
        const exportBtn = actionsContainer.createEl('button', {
            cls: 'wechat-preview-action-btn mod-cta',
            text: 'Export HTML'
        });
        exportBtn.addEventListener('click', () => this.exportToFile());

        // Preview area
        const previewArea = this.containerEl.createEl('div', { cls: 'wechat-preview-area' });
        this.previewContainer = previewArea.createEl('div', { cls: 'wechat-preview-content' });

        // Listen for active file change
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf?.view instanceof WeChatPreviewView) {
                    return;
                }
                const viewFile = (leaf?.view as any)?.file;
                if (viewFile && viewFile instanceof TFile) {
                    this.setFile(viewFile);
                }
            })
        );

        // Try to get the currently active file
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            this.setFile(activeFile);
        }
    }

    public async setFile(file: TFile) {
        this.currentFile = file;
        this.updateDisplayText();
        await this.updatePreview();
    }

    private async updatePreview() {
        if (!this.currentFile || !this.previewContainer) {
            this.previewContainer?.empty();
            this.previewContainer?.createEl('div', {
                cls: 'wechat-preview-empty',
                text: 'No file selected'
            });
            return;
        }

        this.previewContainer.empty();
        this.previewContainer.createEl('div', {
            cls: 'wechat-preview-loading',
            text: 'Loading preview...'
        });

        try {
            const content = await this.app.vault.cachedRead(this.currentFile);
            const style = this.currentStyle;

            // Use WeChatExporter to generate styled HTML
            const styledHtml = await this.weChatExporter.generateStyledHtml(content, style, this.currentFile.path);

            // Render the styled HTML in the preview - wrap with wechat-article div
            this.previewContainer.empty();
            const articleDiv = this.previewContainer.createEl('div', { cls: 'wechat-article' });
            articleDiv.innerHTML = styledHtml;

        } catch (error) {
            this.previewContainer.empty();
            this.previewContainer.createEl('div', {
                cls: 'wechat-preview-error',
                text: `Failed to load preview: ${error}`
            });
            new Notice('Failed to load preview');
        }
    }

    private async exportToFile() {
        if (!this.currentFile) {
            new Notice('No file to export');
            return;
        }

        try {
            const content = await this.app.vault.read(this.currentFile);
            const filename = this.currentFile.basename;

            const exporter = new WeChatExporter(this.app);

            new Notice('Exporting to HTML...');
            const file = await exporter.exportToHtml(content, this.currentStyle, filename, this.currentFile.path);

            if (file) {
                new Notice(`Exported: ${file.name}`);
                // Open the exported file
                const leaf = this.app.workspace.getLeaf(false);
                await leaf.openFile(file);
            }
        } catch (error) {
            console.error('Export failed:', error);
            new Notice('Export failed. Check console for details.');
        }
    }

    private async copyForWeChat() {
        if (!this.currentFile) {
            new Notice('No file to copy');
            return;
        }

        if (!this.previewContainer) {
            new Notice('Preview not ready');
            return;
        }

        try {
            new Notice('Preparing content for copy...');

            // Use WeChatExporter to generate full HTML with images embedded
            const content = await this.app.vault.read(this.currentFile);
            const html = await this.weChatExporter.generateFullHtml(
                content,
                this.currentStyle,
                this.currentFile.basename,
                this.currentFile.path
            );

            // Create a hidden iframe for copying (more reliable than div)
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.left = '-9999px';
            iframe.style.top = '0';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            // Write to iframe
            const doc = iframe.contentDocument;
            if (doc) {
                doc.open();
                doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + html + '</body></html>');
                doc.close();

                // Select all content in iframe
                const range = doc.createRange();
                range.selectNodeContents(doc.body);
                const selection = doc.defaultView?.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);

                try {
                    const success = doc.execCommand('copy');
                    if (success) {
                        new Notice('Copied! Now paste into WeChat Official Account editor.');
                    } else {
                        throw new Error('execCommand failed');
                    }
                } catch (e) {
                    // Fallback
                    await navigator.clipboard.writeText(html);
                    new Notice('Copied (HTML)! Now paste into WeChat Official Account editor.');
                }
            }

            document.body.removeChild(iframe);

        } catch (error) {
            console.error('Copy failed:', error);
            new Notice('Copy failed. Check console for details.');
        }
    }

    private updateDisplayText() {
        const headerEl = this.containerEl.querySelector('.view-header-title') as HTMLElement;
        if (headerEl) {
            headerEl.textContent = this.currentFile ? `Export: ${this.currentFile.name}` : 'Export Preview';
        }
    }
}
