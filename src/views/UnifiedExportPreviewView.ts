import { ItemView, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { WeChatExporter } from '../services/WeChatExporter';
import { MediumExporter } from '../services/MediumExporter';
import { UNIFIED_EXPORT_PREVIEW_VIEW_TYPE } from '../types';

type ExportPlatform = 'wechat' | 'medium';

interface StyleOption {
    label: string;
    value: string;
    description: string;
}

const WECHAT_STYLE_OPTIONS: StyleOption[] = [
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

const MEDIUM_STYLE_OPTIONS: StyleOption[] = [
    { label: 'Medium Classic', value: 'default', description: 'Clean, readable style matching Medium default' },
    { label: 'Tech Blog', value: 'tech', description: 'Monospace fonts, technical aesthetic' },
    { label: 'Editorial', value: 'editorial', description: 'Serif fonts, magazine-style elegance' },
    { label: 'Minimal', value: 'minimal', description: 'Stripped-down, distraction-free' },
    { label: 'Modern', value: 'modern', description: 'Contemporary with gradient accents' },
];

export class UnifiedExportPreviewView extends ItemView {
    private weChatExporter: WeChatExporter;
    private mediumExporter: MediumExporter;
    private currentFile: TFile | null = null;
    private currentPlatform: ExportPlatform = 'wechat';
    private currentStyle: string = 'default';
    private previewContainer: HTMLElement | null = null;
    private platformSelector: HTMLSelectElement | null = null;
    private styleSelector: HTMLSelectElement | null = null;
    private actionButtonsContainer: HTMLElement | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.weChatExporter = new WeChatExporter(this.app);
        this.mediumExporter = new MediumExporter(this.app);
    }

    getViewType(): string {
        return UNIFIED_EXPORT_PREVIEW_VIEW_TYPE;
    }

    getDisplayText(): string {
        const platformName = this.currentPlatform === 'wechat' ? 'WeChat' : 'Medium';
        return this.currentFile ? `${platformName} Preview: ${this.currentFile.name}` : 'Export Preview';
    }

    getIcon(): string {
        return this.currentPlatform === 'wechat' ? 'file-output' : 'globe';
    }

    async onOpen() {
        this.containerEl.empty();
        this.containerEl.addClass('unified-export-preview-container');

        // Header with platform selector, style selector and action buttons
        const header = this.containerEl.createEl('div', { cls: 'unified-export-preview-header' });

        // Platform selector
        const platformContainer = header.createEl('div', { cls: 'unified-export-preview-platform-selector' });
        platformContainer.createEl('label', { text: 'Platform: ', cls: 'unified-export-preview-platform-label' });

        this.platformSelector = platformContainer.createEl('select', { cls: 'unified-export-preview-platform-dropdown' });
        this.platformSelector.createEl('option', { value: 'wechat', text: 'WeChat (微信公众号)' });
        this.platformSelector.createEl('option', { value: 'medium', text: 'Medium' });
        this.platformSelector.value = this.currentPlatform;
        this.platformSelector.addEventListener('change', () => {
            this.currentPlatform = this.platformSelector!.value as ExportPlatform;
            this.currentStyle = 'default';
            this.updateStyleSelector();
            this.updateActionButtons();
            this.updatePreview();
        });

        // Style selector container
        const styleSelectorContainer = header.createEl('div', { cls: 'unified-export-preview-style-selector' });
        styleSelectorContainer.createEl('label', { text: 'Style: ', cls: 'unified-export-preview-style-label' });

        this.styleSelector = styleSelectorContainer.createEl('select', { cls: 'unified-export-preview-style-dropdown' });
        this.updateStyleSelector();

        this.styleSelector.addEventListener('change', () => {
            this.currentStyle = this.styleSelector!.value;
            this.updatePreview();
        });

        // Action buttons container
        this.actionButtonsContainer = header.createEl('div', { cls: 'unified-export-preview-actions' });
        this.updateActionButtons();

        // Preview area
        const previewArea = this.containerEl.createEl('div', { cls: 'unified-export-preview-area' });
        this.previewContainer = previewArea.createEl('div', { cls: 'unified-export-preview-content' });

        // Listen for active file change
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf?.view instanceof UnifiedExportPreviewView) {
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

    private updateStyleSelector() {
        if (!this.styleSelector) return;

        this.styleSelector.empty();
        const options = this.currentPlatform === 'wechat'
            ? WECHAT_STYLE_OPTIONS
            : MEDIUM_STYLE_OPTIONS;

        options.forEach(opt => {
            const option = this.styleSelector!.createEl('option', { value: opt.value, text: opt.label });
            option.setAttribute('data-description', opt.description);
        });

        this.currentStyle = 'default';
    }

    private updateActionButtons() {
        if (!this.actionButtonsContainer) return;

        this.actionButtonsContainer.empty();

        const platformName = this.currentPlatform === 'wechat' ? 'WeChat' : 'Medium';

        // Copy button
        const copyBtn = this.actionButtonsContainer.createEl('button', {
            cls: 'unified-export-preview-action-btn',
            text: `Copy for ${platformName}`
        });
        copyBtn.addEventListener('click', () => this.copyForPlatform());

        // Export button
        const exportBtn = this.actionButtonsContainer.createEl('button', {
            cls: 'unified-export-preview-action-btn mod-cta',
            text: 'Export HTML'
        });
        exportBtn.addEventListener('click', () => this.exportToFile());
    }

    public async setFile(file: TFile) {
        this.currentFile = file;
        this.updateDisplayText();
        await this.updatePreview();
    }

    public setPlatform(platform: ExportPlatform) {
        this.currentPlatform = platform;
        if (this.platformSelector) {
            this.platformSelector.value = platform;
        }
        this.currentStyle = 'default';
        this.updateStyleSelector();
        this.updateActionButtons();
        this.updatePreview();
    }

    private async updatePreview() {
        if (!this.currentFile || !this.previewContainer) {
            this.previewContainer?.empty();
            this.previewContainer?.createEl('div', {
                cls: 'unified-export-preview-empty',
                text: 'No file selected'
            });
            return;
        }

        this.previewContainer.empty();
        this.previewContainer.createEl('div', {
            cls: 'unified-export-preview-loading',
            text: 'Loading preview...'
        });

        try {
            const content = await this.app.vault.cachedRead(this.currentFile);
            const style = this.currentStyle;
            const sourcePath = this.currentFile.path;

            let styledHtml: string;

            if (this.currentPlatform === 'wechat') {
                styledHtml = await this.weChatExporter.generateStyledHtml(content, style as any, sourcePath);
                this.previewContainer.empty();
                const articleDiv = this.previewContainer.createEl('div', { cls: 'wechat-article' });
                articleDiv.innerHTML = styledHtml;
            } else {
                styledHtml = await this.mediumExporter.generateStyledHtml(content, style as any, sourcePath);
                this.previewContainer.empty();
                const articleDiv = this.previewContainer.createEl('div', { cls: 'medium-article' });
                articleDiv.innerHTML = styledHtml;
            }

        } catch (error) {
            this.previewContainer.empty();
            this.previewContainer.createEl('div', {
                cls: 'unified-export-preview-error',
                text: `Failed to load preview: ${error}`
            });
            new Notice('Failed to load preview');
        }
    }

    private async copyForPlatform() {
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

            const content = await this.app.vault.read(this.currentFile);
            const sourcePath = this.currentFile.path;

            let html: string;

            if (this.currentPlatform === 'wechat') {
                html = await this.weChatExporter.generateFullHtml(
                    content,
                    this.currentStyle as any,
                    this.currentFile.basename,
                    sourcePath
                );
            } else {
                html = await this.mediumExporter.generateFullHtml(
                    content,
                    this.currentStyle as any,
                    sourcePath
                );
            }

            // Create a hidden iframe for copying
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.left = '-9999px';
            iframe.style.top = '0';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const doc = iframe.contentDocument;
            if (doc) {
                doc.open();
                doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + html + '</body></html>');
                doc.close();

                const range = doc.createRange();
                range.selectNodeContents(doc.body);
                const selection = doc.defaultView?.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);

                try {
                    const success = doc.execCommand('copy');
                    if (success) {
                        const platformName = this.currentPlatform === 'wechat' ? 'WeChat' : 'Medium';
                        new Notice(`Copied! Now paste into ${platformName} editor.`);
                    } else {
                        throw new Error('execCommand failed');
                    }
                } catch (e) {
                    await navigator.clipboard.writeText(html);
                    const platformName = this.currentPlatform === 'wechat' ? 'WeChat' : 'Medium';
                    new Notice(`Copied (HTML)! Now paste into ${platformName} editor.`);
                }
            }

            document.body.removeChild(iframe);

        } catch (error) {
            console.error('Copy failed:', error);
            new Notice('Copy failed. Check console for details.');
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
            const sourcePath = this.currentFile.path;

            let file;

            if (this.currentPlatform === 'wechat') {
                new Notice('Exporting to HTML...');
                file = await this.weChatExporter.exportToHtml(content, this.currentStyle as any, filename, sourcePath);
            } else {
                new Notice('Exporting to HTML...');
                file = await this.mediumExporter.exportToHtml(content, this.currentStyle as any, filename, sourcePath);
            }

            if (file) {
                const platformName = this.currentPlatform === 'wechat' ? 'WeChat' : 'Medium';
                new Notice(`Exported ${platformName} HTML: ${file.name}`);
                const leaf = this.app.workspace.getLeaf(false);
                await leaf.openFile(file);
            }
        } catch (error) {
            console.error('Export failed:', error);
            new Notice('Export failed. Check console for details.');
        }
    }

    private updateDisplayText() {
        const headerEl = this.containerEl.querySelector('.view-header-title') as HTMLElement;
        if (headerEl) {
            const platformName = this.currentPlatform === 'wechat' ? 'WeChat' : 'Medium';
            headerEl.textContent = this.currentFile ? `${platformName} Preview: ${this.currentFile.name}` : 'Export Preview';
        }
    }

    async onClose() {
        this.containerEl.empty();
    }
}
