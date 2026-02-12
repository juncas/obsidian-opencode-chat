import { QuestionRequest, QuestionInfo, QuestionOption } from '../types/opencode';

export class QuestionDialog {
    private containerEl: HTMLElement;
    private resolved: boolean = false;
    private inputs: HTMLInputElement[] = [];
    private customInputs: HTMLInputElement[] = [];

    constructor(
        parentEl: HTMLElement,
        private request: QuestionRequest,
        private onReply: (answers: string[][]) => void,
        private onReject: () => void
    ) {
        this.containerEl = parentEl.createEl('div', {
            cls: 'claude-question-dialog'
        });

        const header = this.containerEl.createEl('div', {
            cls: 'claude-question-header'
        });
        header.createEl('span', { cls: 'claude-question-icon', text: '❓' });
        header.createEl('span', { cls: 'claude-question-title', text: 'Question' });

        this.request.questions.forEach((q, qIndex) => {
            this.renderQuestion(q, qIndex);
        });

        const actions = this.containerEl.createEl('div', {
            cls: 'claude-question-actions'
        });

        const submitBtn = actions.createEl('button', {
            cls: 'claude-question-btn claude-question-btn-submit',
            text: 'Submit'
        });
        submitBtn.addEventListener('click', () => this.handleSubmit());

        const rejectBtn = actions.createEl('button', {
            cls: 'claude-question-btn claude-question-btn-reject',
            text: 'Skip'
        });
        rejectBtn.addEventListener('click', () => {
            if (this.resolved) return;
            this.resolve();
            this.onReject();
        });
    }

    private renderQuestion(q: QuestionInfo, index: number) {
        const item = this.containerEl.createEl('div', {
            cls: 'claude-question-item'
        });

        item.createEl('div', {
            cls: 'claude-question-text',
            text: `${q.header}: ${q.question}`
        });

        const optionsContainer = item.createEl('div', {
            cls: 'claude-question-options'
        });

        q.options.forEach((opt) => {
            const label = optionsContainer.createEl('label', {
                cls: 'claude-question-option'
            });

            const input = label.createEl('input', {
                type: q.multiple ? 'checkbox' : 'radio',
                attr: {
                    name: `q-${this.request.id}-${index}`,
                    value: opt.label
                }
            });
            this.inputs.push(input);

            label.createEl('span', {
                cls: 'claude-question-option-label',
                text: opt.label
            });

            if (opt.description) {
                label.createEl('span', {
                    cls: 'claude-question-option-desc',
                    text: opt.description
                });
            }
        });

        if (q.custom) {
            const customDiv = item.createEl('div', {
                cls: 'claude-question-custom'
            });
            const customInput = customDiv.createEl('input', {
                type: 'text',
                cls: 'claude-question-custom-input',
                attr: {
                    placeholder: 'Type your answer...',
                    'data-q-index': String(index)
                }
            });
            this.customInputs.push(customInput);
        }
    }

    private handleSubmit() {
        if (this.resolved) return;

        const answers: string[][] = [];
        
        for (let i = 0; i < this.request.questions.length; i++) {
            const qAnswers: string[] = [];
            
            // Find checked inputs for this question index
            const questionInputs = this.inputs.filter(input => 
                input.name === `q-${this.request.id}-${i}` && input.checked
            );
            questionInputs.forEach(input => qAnswers.push(input.value));

            // Find custom input for this question index
            const customInput = this.customInputs.find(input => 
                input.getAttribute('data-q-index') === String(i)
            );
            if (customInput && customInput.value.trim()) {
                qAnswers.push(customInput.value.trim());
            }

            answers.push(qAnswers);
        }

        this.resolve();
        this.onReply(answers);
    }

    resolve(): void {
        this.resolved = true;
        this.containerEl.classList.add('claude-question-resolved');
        
        this.inputs.forEach(input => input.disabled = true);
        this.customInputs.forEach(input => input.disabled = true);
        
        const buttons = this.containerEl.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
    }

    destroy(): void {
        this.containerEl.remove();
    }
}
