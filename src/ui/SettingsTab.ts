import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import OpenCodeChatPlugin from '../main';
import type { OpenCodePluginSettings } from '../types';

export class SettingsTab extends PluginSettingTab {
    plugin: OpenCodeChatPlugin;
    private ohMyOpencodeModelSetting: Setting | null = null;
    private tempSettings: OpenCodePluginSettings | null = null;
    private opencodeModelDropdown: any = null;
    private ohMyOpencodeToggle: any = null;
    private ohMyOpencodeModelDropdown: any = null;
    private applyBtn: any = null;
    private cancelBtn: any = null;
    private isApplying: boolean = false;

    constructor(app: App, plugin: OpenCodeChatPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'OpenCode Chat Settings' });

        this.tempSettings = { ...this.plugin.settings };

        const loadingEl = containerEl.createEl('div', { text: 'Loading available models...', cls: 'setting-item-description' });

        if (this.plugin.server) {
            this.plugin.server.listModels()
                .then((models) => {
                    loadingEl.remove();
                    this.renderModelSettings(containerEl, models);
                    this.renderButtons(containerEl);
                })
                .catch((err) => {
                    loadingEl.setText(`Error loading models: ${err.message}`);
                });
        } else {
            loadingEl.setText('OpenCode server not initialized.');
        }
    }

    private renderModelSettings(containerEl: HTMLElement, models: string[]) {
        new Setting(containerEl)
            .setName('OpenCode Model')
            .setDesc('The model ID to use for the OpenCode server (e.g. opencode/gpt-4o).')
            .addDropdown((dropdown) => {
                dropdown.addOption('', 'Default (System)');
                models.forEach((m) => dropdown.addOption(m, m));
                
                const current = this.tempSettings!.opencodeModel;
                if (current && !models.includes(current)) {
                    dropdown.addOption(current, current);
                }

                dropdown
                    .setValue(current)
                    .onChange((value) => {
                        this.tempSettings!.opencodeModel = value;
                    });
                this.opencodeModelDropdown = dropdown;
            });

        new Setting(containerEl)
            .setName('Enable Oh-My-OpenCode')
            .setDesc('Enable or disable the Oh-My-OpenCode plugin integration.')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.tempSettings!.enableOhMyOpencode)
                    .onChange((value) => {
                        this.tempSettings!.enableOhMyOpencode = value;
                        this.updateOhMyOpencodeModelState();
                    });
                this.ohMyOpencodeToggle = toggle;
            });

        this.ohMyOpencodeModelSetting = new Setting(containerEl)
            .setName('Oh-My-OpenCode Model')
            .setDesc('The model ID to use for Oh-My-OpenCode agents.')
            .addDropdown((dropdown) => {
                dropdown.addOption('', 'Default (System)');
                models.forEach((m) => dropdown.addOption(m, m));
                
                const current = this.tempSettings!.ohMyOpencodeModel;
                if (current && !models.includes(current)) {
                    dropdown.addOption(current, current);
                }

                dropdown
                    .setValue(current)
                    .onChange((value) => {
                        this.tempSettings!.ohMyOpencodeModel = value;
                    });
                this.ohMyOpencodeModelDropdown = dropdown;
            });

        this.updateOhMyOpencodeModelState();
    }

    private renderButtons(containerEl: HTMLElement) {
        new Setting(containerEl)
            .addButton((btn) => {
                this.applyBtn = btn;
                btn
                    .setButtonText('Apply')
                    .setCta()
                    .onClick(() => {
                        this.handleApply();
                    });
            })
            .addButton((btn) => {
                this.cancelBtn = btn;
                btn
                    .setButtonText('Cancel')
                    .onClick(() => {
                        this.handleCancel();
                    });
            });
    }

    private async handleApply(): Promise<void> {
        if (this.isApplying) return;
        
        this.isApplying = true;
        this.applyBtn.setDisabled(true).setButtonText('Applying...');
        this.cancelBtn.setDisabled(true);

        this.plugin.settings = { ...this.tempSettings! };
        await this.plugin.saveSettings();
        
        try {
            await this.plugin.reloadServer();
            new Notice('Settings applied successfully.');
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            new Notice(`Restart failed: ${msg}. Please restart Obsidian manually.`);
        } finally {
            this.isApplying = false;
            this.applyBtn.setDisabled(false).setButtonText('Apply');
            this.cancelBtn.setDisabled(false);
        }
    }

    private handleCancel(): void {
        if (this.isApplying) return;
        
        this.tempSettings = { ...this.plugin.settings };
        this.resetControlsToTemp();
    }

    private updateOhMyOpencodeModelState(): void {
        if (this.ohMyOpencodeModelSetting) {
            const enabled = this.tempSettings!.enableOhMyOpencode;
            this.ohMyOpencodeModelSetting.setDisabled(!enabled);
            if (!enabled) {
                this.ohMyOpencodeModelSetting.settingEl.style.opacity = '0.5';
            } else {
                this.ohMyOpencodeModelSetting.settingEl.style.opacity = '1';
            }
        }
    }

    private resetControlsToTemp(): void {
        if (this.opencodeModelDropdown) {
            this.opencodeModelDropdown.setValue(this.tempSettings!.opencodeModel);
        }
        if (this.ohMyOpencodeToggle) {
            this.ohMyOpencodeToggle.setValue(this.tempSettings!.enableOhMyOpencode);
        }
        if (this.ohMyOpencodeModelDropdown) {
            this.ohMyOpencodeModelDropdown.setValue(this.tempSettings!.ohMyOpencodeModel);
        }
        this.updateOhMyOpencodeModelState();
    }
}
