// DOM manipulation and UI state management

class UserInterface {
    constructor() {
        this.elements = {};
        this.validationContainer = null;
        this.previewContainer = null;
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;

        // Cache DOM elements
        this.elements = {
            // File inputs
            metaFileInput: document.getElementById('meta-file'),
            modFileInput: document.getElementById('mod-file'),
            metaStatus: document.getElementById('meta-status'),
            modStatus: document.getElementById('mod-status'),

            // Configuration inputs
            minMultiplier: document.getElementById('min-multiplier'),
            maxMultiplier: document.getElementById('max-multiplier'),
            stepIncrement: document.getElementById('step-increment'),
            generateMin: document.getElementById('generate-min'),
            generateMax: document.getElementById('generate-max'),
            modPrefix: document.getElementById('mod-prefix'),

            // Generation controls
            generateButton: document.getElementById('generate-btn'),
            validationMessages: document.getElementById('validation-messages'),
            progressContainer: document.getElementById('progress-container'),
            progressText: document.getElementById('progress-text'),
            progressPercentage: document.getElementById('progress-percentage'),
            progressFill: document.getElementById('progress-fill'),
            progressDetails: document.getElementById('progress-details'),

            // Preview
            generationPreview: document.getElementById('generation-preview')
        };

        this.validationContainer = this.elements.validationMessages;
        this.previewContainer = this.elements.generationPreview;

        // Remove the duplicate validation setup - EventHandlers.js handles this
        this.isInitialized = true;
    }

    validateCheckboxes() {
        const minChecked = this.elements.generateMin?.checked;
        const maxChecked = this.elements.generateMax?.checked;

        const checkboxItems = document.querySelectorAll('.checkbox-item');
        checkboxItems.forEach(item => item.classList.remove('error'));

        if (!minChecked && !maxChecked) {
            checkboxItems.forEach(item => item.classList.add('error'));
            return false;
        }

        return true;
    }

    validatePrefix() {
        const input = this.elements.modPrefix;
        if (!input) return true;

        const value = input.value;
        const isValid = /^[a-zA-Z0-9_-]*$/.test(value) && value.length <= 50;

        input.classList.remove('error', 'valid');
        
        if (value && !isValid) {
            input.classList.add('error');
            return false;
        } else if (value) {
            input.classList.add('valid');
        }

        return true;
    }

    displayValidationMessages(messages) {
        if (!this.validationContainer) return;

        // Clear existing messages
        this.validationContainer.innerHTML = '';

        if (!messages || messages.length === 0) {
            return;
        }

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `validation-message ${message.type || 'error'}`;
            messageElement.textContent = message.text || message;
            this.validationContainer.appendChild(messageElement);
        });
    }

    clearValidationMessages() {
        if (this.validationContainer) {
            this.validationContainer.innerHTML = '';
        }
    }

    updateFileStatus(type, status, message = '') {
        const statusElement = type === 'meta' ? this.elements.metaStatus : this.elements.modStatus;
        if (!statusElement) return;

        statusElement.className = `file-status ${status}`;
        statusElement.textContent = message || this.getDefaultStatusMessage(status);
    }

    getDefaultStatusMessage(status) {
        switch (status) {
            case 'success': return 'File loaded successfully';
            case 'error': return 'Failed to load file';
            case 'loading': return 'Loading file...';
            default: return 'Using default template';
        }
    }

    setGenerateButtonState(enabled, text = null) {
        const button = this.elements.generateButton;
        if (!button) return;

        button.disabled = !enabled;
        if (text) {
            button.textContent = text;
        }
    }

    updateGenerationPreview(data) {
        if (!this.previewContainer) return;

        if (!data || (!data.multipliers && !data.error)) {
            this.previewContainer.innerHTML = '<p>Configure your settings above and click "Generate Height Mods" to see a preview.</p>';
            return;
        }

        if (data.error) {
            this.previewContainer.innerHTML = `<p class="error">Error: ${data.error}</p>`;
            return;
        }

        const { multipliers, totalMods, variants, estimatedTime } = data;

        let html = `
            <div class="preview-summary">
                <h4>Generation Preview</h4>
                <p><strong>Total mods to generate:</strong> ${totalMods}</p>
                <p><strong>Multiplier range:</strong> ${multipliers[0]} - ${multipliers[multipliers.length - 1]} (${multipliers.length} values)</p>
                <p><strong>Variants:</strong> ${variants.join(', ')}</p>
                <p><strong>Estimated time:</strong> ~${estimatedTime}s</p>
            </div>
            <div class="preview-details">
        `;

        // Show first few examples
        const exampleCount = Math.min(5, totalMods);
        for (let i = 0; i < exampleCount; i++) {
            const multiplier = multipliers[i % multipliers.length];
            const variant = variants[i % variants.length];
            
            html += `
                <div class="preview-item">
                    <h4>[${String(Math.round(multiplier * 100)).padStart(4, '0')}] Height ${variant} - ${multiplier}x</h4>
                    <p>Multiplier: ${multiplier}, Type: ${variant}</p>
                </div>
            `;
        }

        if (totalMods > exampleCount) {
            html += `<p class="preview-note">... and ${totalMods - exampleCount} more mods</p>`;
        }

        html += '</div>';
        this.previewContainer.innerHTML = html;
    }

    showGenerationSummary(summary) {
        if (!this.previewContainer || !summary) return;

        const { totalMods, variants, multipliers } = summary;

        let html = `
            <div class="generation-summary">
                <h4>✅ Generation Complete!</h4>
                <p><strong>Mods generated:</strong> ${totalMods}</p>
                <p><strong>Multiplier range:</strong> ${multipliers.min} - ${multipliers.max} (${multipliers.count} values)</p>
                <div class="variant-breakdown">
                    <strong>Variants:</strong>
        `;

        Object.entries(variants).forEach(([variant, count]) => {
            html += ` <span class="variant-badge">${variant}: ${count}</span>`;
        });

        html += `
                </div>
                <p class="success-message">Your height mods have been generated and are ready for download!</p>
            </div>
        `;

        this.previewContainer.innerHTML = html;
    }

    updateConfigurationFromOptions(options) {
        if (this.elements.minMultiplier) this.elements.minMultiplier.value = options.minMultiplier || 0.5;
        if (this.elements.maxMultiplier) this.elements.maxMultiplier.value = options.maxMultiplier || 2.0;
        if (this.elements.stepIncrement) this.elements.stepIncrement.value = options.stepIncrement || 0.1;
        if (this.elements.generateMin) this.elements.generateMin.checked = options.generateMin !== false;
        if (this.elements.generateMax) this.elements.generateMax.checked = options.generateMax !== false;
        if (this.elements.modPrefix) this.elements.modPrefix.value = options.prefix || '';
    }

    getConfigurationFromForm() {
        return {
            minMultiplier: parseFloat(this.elements.minMultiplier?.value) || 0.5,
            maxMultiplier: parseFloat(this.elements.maxMultiplier?.value) || 2.0,
            stepIncrement: parseFloat(this.elements.stepIncrement?.value) || 0.1,
            generateMin: this.elements.generateMin?.checked !== false,
            generateMax: this.elements.generateMax?.checked !== false,
            prefix: this.elements.modPrefix?.value || ''
        };
    }

    showToast(message, type = 'info', duration = 3000) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--border-radius)',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });

        // Color based on type
        const colors = {
            success: 'var(--success-color)',
            error: 'var(--error-color)',
            warning: 'var(--warning-color)',
            info: 'var(--primary-color)'
        };
        toast.style.backgroundColor = colors[type] || colors.info;

        // Add to DOM
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    setLoadingState(isLoading, message = 'Processing...') {
        if (isLoading) {
            this.setGenerateButtonState(false, message);
            document.body.style.cursor = 'wait';
        } else {
            this.setGenerateButtonState(true, 'Generate Height Mods');
            document.body.style.cursor = '';
        }
    }

    resetUI() {
        this.clearValidationMessages();
        this.setGenerateButtonState(true);
        this.setLoadingState(false);
        this.updateFileStatus('meta', '', 'Using default template');
        this.updateFileStatus('mod', '', 'Using default template');
        
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '<p>Configure your settings above and click "Generate Height Mods" to see a preview.</p>';
        }
    }

    animateElement(element, animation = 'pulse') {
        if (!element) return;

        element.classList.add(animation);
        setTimeout(() => element.classList.remove(animation), 1000);
    }

    // Utility method to highlight validation errors
    highlightErrors(fieldNames) {
        // Clear existing highlights
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

        // Add highlights to error fields
        fieldNames.forEach(fieldName => {
            const element = this.elements[fieldName];
            if (element) {
                element.classList.add('error');
            }
        });
    }
}