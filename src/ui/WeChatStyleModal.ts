import { App, SuggestModal } from 'obsidian';
import { WeChatStyle } from '../services/WeChatExporter';

interface StyleOption {
    label: string;
    value: WeChatStyle;
    description: string;
}

export class WeChatStyleModal extends SuggestModal<StyleOption> {
    constructor(app: App, private onChoose: (style: WeChatStyle) => void) {
        super(app);
        this.setPlaceholder('Select a style for WeChat export...');
    }

    getSuggestions(query: string): StyleOption[] {
        const options: StyleOption[] = [
            { label: 'Default (默认)', value: 'default', description: 'Blue accent, clear structure. Good for tech/general.' },
            { label: 'Elegant (文艺)', value: 'elegant', description: 'Brown tone, serif fonts. Good for essays/reviews.' },
            { label: 'Tech (极客)', value: 'tech', description: 'Dark theme, terminal style. Good for coding tutorials.' },
            { label: 'Vibrant (活泼)', value: 'vibrant', description: 'Gradients, lively colors. Good for lifestyle/products.' },
            { label: 'Minimal (极简)', value: 'minimal', description: 'Black & white, spacious. Good for serious reading.' },
        ];
        return options.filter(opt => opt.label.toLowerCase().includes(query.toLowerCase()));
    }

    renderSuggestion(option: StyleOption, el: HTMLElement) {
        el.createEl('div', { text: option.label, cls: 'suggestion-content' });
        el.createEl('small', { text: option.description, cls: 'suggestion-note' });
    }

    onChooseSuggestion(option: StyleOption) {
        this.onChoose(option.value);
    }
}
