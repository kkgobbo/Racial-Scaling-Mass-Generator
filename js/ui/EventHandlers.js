// Event listeners and user interactions

class EventHandlers {
    constructor(app, ui, progressHandler) {
        this.app = app;
        this.ui = ui;
        this.progressHandler = progressHandler;
        this.isInitialized = false;
        this.debouncedUpdatePreview = this.debounce(() => this.updatePreview(), 300);
        this.debouncedValidateConfiguration = this.debounce(() => this.validateConfiguration(), 500);
    }

    initialize() {
        if (this.isInitialized) return;

        try {
            this.setupFileUploadHandlers();
            this.setupConfigurationHandlers();
            this.setupGenerationHandlers();
            this.setupKeyboardShortcuts();
            this.setupFormValidation();
            
            this.isInitialized = true;
            console.log('Event handlers initialized successfully');
        } catch (error) {
            console.error('Failed to initialize event handlers:', error);
        }
    }

    setupFileUploadHandlers() {
        // Meta file upload
        const metaFileInput = document.getElementById('meta-file');
        if (metaFileInput) {
            metaFileInput.addEventListener('change', (event) => {
                this.handleFileUpload(event, 'meta');
            });
        }

        // Mod file upload
        const modFileInput = document.getElementById('mod-file');
        if (modFileInput) {
            modFileInput.addEventListener('change', (event) => {
                this.handleFileUpload(event, 'mod');
            });
        }

        // Setup drag and drop support
        this.setupDragAndDrop();

        // Add file input clear functionality
        this.setupFileClearButtons();
    }

    setupDragAndDrop() {
        const fileUploadAreas = document.querySelectorAll('.file-upload');
        
        fileUploadAreas.forEach(area => {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            // Highlight drop area when item is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                area.addEventListener(eventName, () => {
                    area.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, () => {
                    area.classList.remove('drag-over');
                });
            });

            // Handle dropped files
            area.addEventListener('drop', (event) => {
                const files = event.dataTransfer.files;
                if (files.length > 0) {
                    const input = area.querySelector('input[type="file"]');
                    if (input) {
                        // Create a new FileList to assign to the input
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(files[0]);
                        input.files = dataTransfer.files;
                        
                        // Trigger change event
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
        });
    }

    setupFileClearButtons() {
        // Add clear buttons for file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            // Create clear button
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'file-clear-btn';
            clearButton.textContent = '×';
            clearButton.title = 'Clear file';
            clearButton.style.display = 'none';

            // Insert after input
            input.parentNode.insertBefore(clearButton, input.nextSibling);

            // Show/hide clear button based on file selection
            input.addEventListener('change', () => {
                clearButton.style.display = input.files.length > 0 ? 'inline-block' : 'none';
            });

            // Clear functionality
            clearButton.addEventListener('click', () => {
                input.value = '';
                input.dispatchEvent(new Event('change', { bubbles: true }));
                clearButton.style.display = 'none';
            });
        });
    }

    async handleFileUpload(event, type) {
        const file = event.target.files[0];
        
        if (!file) {
            this.ui.updateFileStatus(type, '', 'Using default template');
            
            // Load default template
            try {
                if (type === 'meta') {
                    await this.app.generator.fileProcessor.loadMetaTemplate(null);
                } else {
                    await this.app.generator.fileProcessor.loadModTemplate(null);
                }
            } catch (error) {
                console.error(`Error loading default ${type} template:`, error);
            }
            
            this.updatePreview();
            return;
        }

        // Validate file
        const validation = validateFileUpload(file);
        if (!validation.isValid) {
            this.ui.updateFileStatus(type, 'error', validation.errors.join(', '));
            this.ui.showToast(`File validation failed: ${validation.errors[0]}`, 'error');
            
            // Clear the invalid file
            event.target.value = '';
            return;
        }

        try {
            this.ui.updateFileStatus(type, 'loading', 'Loading file...');
            
            // Load template
            if (type === 'meta') {
                await this.app.generator.fileProcessor.loadMetaTemplate(file);
            } else {
                await this.app.generator.fileProcessor.loadModTemplate(file);
            }
            
            this.ui.updateFileStatus(type, 'success', `Loaded: ${file.name} (${formatFileSize(file.size)})`);
            this.ui.showToast(`${type === 'meta' ? 'Meta' : 'Mod'} template loaded successfully`, 'success');
            
            // Update preview
            this.updatePreview();
            
        } catch (error) {
            console.error(`Error loading ${type} template:`, error);
            this.ui.updateFileStatus(type, 'error', `Error: ${error.message}`);
            this.ui.showToast(`Failed to load ${type} template: ${error.message}`, 'error');
            
            // Clear the invalid file
            event.target.value = '';
        }
    }

    setupConfigurationHandlers() {
        // Configuration inputs that should trigger preview updates
        const configInputs = [
            { id: 'min-multiplier', events: ['input', 'change'] },
            { id: 'max-multiplier', events: ['input', 'change'] },
            { id: 'step-increment', events: ['input', 'change'] },
            { id: 'generate-min', events: ['change'] },
            { id: 'generate-max', events: ['change'] },
            { id: 'mod-prefix', events: ['input', 'change'] }
        ];

        configInputs.forEach(({ id, events }) => {
            const element = document.getElementById(id);
            if (element) {
                events.forEach(eventType => {
                    element.addEventListener(eventType, () => {
                        this.debouncedUpdatePreview();
                        this.debouncedValidateConfiguration();
                    });
                });
            }
        });

        // Special handling for numeric inputs
        this.setupNumericInputHandlers();
        
        // Range validation for multipliers
        this.setupRangeValidation();
        
        // Checkbox interdependency
        this.setupCheckboxDependencies();
    }

    setupNumericInputHandlers() {
        const numericInputs = ['min-multiplier', 'max-multiplier', 'step-increment'];
        
        numericInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Prevent non-numeric input
                element.addEventListener('keypress', (event) => {
                    const char = String.fromCharCode(event.which);
                    if (!/[0-9.]/.test(char) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
                        event.preventDefault();
                    }
                });

                // Auto-correct out-of-range values
                element.addEventListener('blur', () => {
                    const value = parseFloat(element.value);
                    const min = parseFloat(element.min);
                    const max = parseFloat(element.max);

                    if (!isNaN(value)) {
                        if (value < min) {
                            element.value = min;
                        } else if (value > max) {
                            element.value = max;
                        }
                        this.updatePreview();
                    }
                });

                // Real-time validation feedback
                element.addEventListener('input', () => {
                    const value = parseFloat(element.value);
                    const min = parseFloat(element.min);
                    const max = parseFloat(element.max);

                    element.classList.remove('error', 'valid', 'warning');

                    if (element.value === '') {
                        // Empty is neutral
                    } else if (isNaN(value)) {
                        element.classList.add('error');
                    } else if (value < min || value > max) {
                        element.classList.add('warning');
                    } else {
                        element.classList.add('valid');
                    }
                });
            }
        });
    }

    setupRangeValidation() {
        const minInput = document.getElementById('min-multiplier');
        const maxInput = document.getElementById('max-multiplier');
        const stepInput = document.getElementById('step-increment');

        if (minInput && maxInput) {
            const validateRange = () => {
                const min = parseFloat(minInput.value);
                const max = parseFloat(maxInput.value);
                const step = parseFloat(stepInput?.value);

                // Clear previous validation states
                [minInput, maxInput, stepInput].forEach(input => {
                    if (input) {
                        input.setCustomValidity('');
                        input.classList.remove('range-error');
                    }
                });

                let hasError = false;

                if (!isNaN(min) && !isNaN(max)) {
                    if (min >= max) {
                        minInput.setCustomValidity('Minimum must be less than maximum');
                        maxInput.setCustomValidity('Maximum must be greater than minimum');
                        minInput.classList.add('range-error');
                        maxInput.classList.add('range-error');
                        hasError = true;
                    }

                    if (!isNaN(step) && step > (max - min)) {
                        stepInput?.setCustomValidity('Step is larger than the range');
                        stepInput?.classList.add('range-error');
                        hasError = true;
                    }
                }

                return !hasError;
            };

            [minInput, maxInput, stepInput].forEach(input => {
                if (input) {
                    input.addEventListener('input', validateRange);
                    input.addEventListener('change', validateRange);
                }
            });
        }
    }

    setupCheckboxDependencies() {
        const minCheckbox = document.getElementById('generate-min');
        const maxCheckbox = document.getElementById('generate-max');

        if (minCheckbox && maxCheckbox) {
            const validateCheckboxes = () => {
                const bothUnchecked = !minCheckbox.checked && !maxCheckbox.checked;
                
                // Visual feedback
                [minCheckbox, maxCheckbox].forEach(checkbox => {
                    const item = checkbox.closest('.checkbox-item');
                    if (item) {
                        item.classList.toggle('error', bothUnchecked);
                    }
                });

                return !bothUnchecked;
            };

            minCheckbox.addEventListener('change', validateCheckboxes);
            maxCheckbox.addEventListener('change', validateCheckboxes);
        }
    }

    setupFormValidation() {
        // Prevent form submission if invalid
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                if (this.validateConfiguration()) {
                    this.handleGeneration();
                }
            });
        }

        // Real-time validation for prefix
        const prefixInput = document.getElementById('mod-prefix');
        if (prefixInput) {
            prefixInput.addEventListener('input', () => {
                const validation = validatePrefix(prefixInput.value);
                
                prefixInput.classList.remove('error', 'valid');
                
                if (prefixInput.value && !validation.isValid) {
                    prefixInput.classList.add('error');
                    prefixInput.setCustomValidity(validation.errors[0]);
                } else {
                    if (prefixInput.value) prefixInput.classList.add('valid');
                    prefixInput.setCustomValidity('');
                }
            });
        }
    }

    setupGenerationHandlers() {
        const generateButton = document.getElementById('generate-btn');
        if (generateButton) {
            generateButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleGeneration();
            });

            // Add loading state management
            generateButton.addEventListener('mouseenter', () => {
                if (!this.app.generator.isGenerating) {
                    generateButton.classList.add('hover');
                }
            });

            generateButton.addEventListener('mouseleave', () => {
                generateButton.classList.remove('hover');
            });
        }

        // Add reset button functionality if present
        const resetButton = document.getElementById('reset-btn');
        if (resetButton) {
            resetButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.resetForm();
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Skip if user is typing in an input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + Enter to generate
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                if (!this.app.generator.isGenerating && this.validateConfiguration()) {
                    this.handleGeneration();
                }
            }

            // Ctrl/Cmd + R to reset
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                this.resetForm();
            }

            // Escape to hide progress/modals
            if (event.key === 'Escape') {
                if (this.progressHandler.isVisible && !this.app.generator.isGenerating) {
                    this.progressHandler.hide();
                }
            }
        });
    }

    async handleGeneration() {
        if (this.app.generator.isGenerating) {
            this.ui.showToast('Generation already in progress', 'warning');
            return;
        }

        try {
            // Validate configuration first
            if (!this.validateConfiguration()) {
                this.ui.showToast('Please fix the configuration errors', 'warning');
                this.highlightFirstError();
                return;
            }

            // Get configuration from form
            const options = this.ui.getConfigurationFromForm();
            
            // Set options in generator
            this.app.generator.setGenerationOptions(options);

            // Calculate generation info for user confirmation
            const info = this.app.generator.calculateGenerationInfo();
            
            if (info.totalMods > 100) {
                const proceed = confirm(`This will generate ${info.totalMods} mod files. This may take a while. Continue?`);
                if (!proceed) return;
            }

            // Show progress
            this.progressHandler.show();
            this.progressHandler.reset();
            this.ui.setLoadingState(true, 'Generating...');

            // Clear previous validation messages
            this.ui.clearValidationMessages();

            // Load default templates if needed
            await this.app.generator.loadTemplates();

            // Generate mods with progress tracking
            const result = await this.app.generator.generateMods((progress) => {
                this.progressHandler.updateProgress(progress);
            });

            // Show success
            this.progressHandler.setSuccess(
                'Generation complete!',
                `Generated ${result.modCount} height mod variants`
            );

            // Update UI
            const summary = this.app.generator.getGenerationSummary();
            this.ui.showGenerationSummary(summary);
            this.ui.showToast('Height mods generated successfully!', 'success');

            // Notify collection manager
            if (this.app.collectionManager) {
                this.app.collectionManager.onGenerationComplete();
            }

            // Notify sort order manager
            if (this.app.sortOrderManager) {
                this.app.sortOrderManager.onGenerationComplete();
            }

            // Auto-download after a short delay
            setTimeout(async () => {
                try {
                    await this.app.generator.downloadMods();
                    this.ui.showToast('Download started!', 'info');
                } catch (error) {
                    console.error('Download error:', error);
                    this.ui.showToast('Download failed: ' + error.message, 'error');
                }
            }, 1500);

        } catch (error) {
            console.error('Generation error:', error);
            
            this.progressHandler.setError(
                'Generation failed',
                error.message
            );
            
            this.ui.showToast('Generation failed: ' + error.message, 'error');
            
            // Show detailed error messages
            this.ui.displayValidationMessages([{
                type: 'error',
                text: error.message
            }]);
        } finally {
            this.ui.setLoadingState(false);
            
            // Hide progress after a delay
            setTimeout(() => {
                if (!this.app.generator.isGenerating) {
                    this.progressHandler.hide();
                }
            }, 5000);
        }
    }

    validateConfiguration() {
        let isValid = true;
        const errors = [];

        try {
            // Get current configuration
            const config = this.ui.getConfigurationFromForm();

            // Validate multiplier range
            const min = config.minMultiplier;
            const max = config.maxMultiplier;
            const step = config.stepIncrement;

            if (isNaN(min) || min < 0.001 || min > 1000.0) {
                errors.push({ field: 'min-multiplier', message: 'Minimum multiplier must be between 0.001 and 1000.0' });
                isValid = false;
            }

            if (isNaN(max) || max < 0.1 || max > 1000.0) {
                errors.push({ field: 'max-multiplier', message: 'Maximum multiplier must be between 0.1 and 1000.0' });
                isValid = false;
            }

            if (!isNaN(min) && !isNaN(max) && min >= max) {
                errors.push({ field: ['min-multiplier', 'max-multiplier'], message: 'Minimum multiplier must be less than maximum' });
                isValid = false;
            }

            if (isNaN(step) || step < 0.01 || step > 1000.0) {
                errors.push({ field: 'step-increment', message: 'Step increment must be between 0.01 and 1000.0' });
                isValid = false;
            }

            if (!isNaN(step) && !isNaN(max) && !isNaN(min) && step > (max - min)) {
                errors.push({ field: 'step-increment', message: 'Step increment is larger than the multiplier range' });
                isValid = false;
            }

            // Validate variant selection
            if (!config.generateMin && !config.generateMax) {
                errors.push({ field: ['generate-min', 'generate-max'], message: 'Please select at least one variant type (MIN or MAX)' });
                isValid = false;
            }

            // Validate prefix
            if (config.prefix) {
                const prefixValidation = validatePrefix(config.prefix);
                if (!prefixValidation.isValid) {
                    errors.push({ field: 'mod-prefix', message: prefixValidation.errors[0] });
                    isValid = false;
                }
            }

            // Calculate if the generation would be reasonable
            if (isValid) {
                try {
                    const info = this.app.generator.calculateGenerationInfo();
                    if (info.totalMods > 1000) {
                        errors.push({ field: 'step-increment', message: `This configuration would generate ${info.totalMods} files. Consider using a larger step increment.`, type: 'warning' });
                    }
                } catch (calcError) {
                    // Ignore calculation errors during validation
                }
            }

            // Display validation messages
            if (errors.length > 0) {
                this.ui.displayValidationMessages(errors.map(error => ({
                    type: error.type || 'error',
                    text: error.message
                })));

                // Highlight error fields
                errors.forEach(error => {
                    if (error.field) {
                        const fields = Array.isArray(error.field) ? error.field : [error.field];
                        fields.forEach(fieldId => {
                            const element = document.getElementById(fieldId);
                            if (element) {
                                element.classList.add('validation-error');
                            }
                        });
                    }
                });
            } else {
                this.ui.clearValidationMessages();
                // Clear error highlights
                document.querySelectorAll('.validation-error').forEach(el => {
                    el.classList.remove('validation-error');
                });
            }

            return isValid;
        } catch (error) {
            console.error('Validation error:', error);
            return false;
        }
    }

    updatePreview() {
        try {
            const config = this.ui.getConfigurationFromForm();
            this.app.generator.setGenerationOptions(config);
            
            const info = this.app.generator.calculateGenerationInfo();
            this.ui.updateGenerationPreview(info);
        } catch (error) {
            console.warn('Preview update failed:', error);
            // Show a basic preview with error message
            this.ui.updateGenerationPreview({
                error: error.message
            });
        }
    }

    highlightFirstError() {
        const firstError = document.querySelector('.validation-error, .error, .range-error');
        if (firstError) {
            firstError.focus();
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.addTemporaryClass(firstError, 'flash-error', 2000);
        }
    }

    // Utility method to debounce rapid function calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Add CSS class temporarily for animation effects
    addTemporaryClass(element, className, duration = 1000) {
        if (!element) return;
        
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }

    // Handle form reset
    resetForm() {
        if (this.app.generator.isGenerating) {
            this.ui.showToast('Cannot reset while generation is in progress', 'warning');
            return;
        }

        const confirmed = confirm('This will reset all settings to defaults. Continue?');
        if (!confirmed) return;

        // Reset file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.value = '';
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Reset form values to defaults
        this.ui.updateConfigurationFromOptions({
            minMultiplier: 0.5,
            maxMultiplier: 2.0,
            stepIncrement: 0.1,
            generateMin: true,
            generateMax: true,
            prefix: ''
        });

        // Reset UI state
        this.ui.resetUI();
        this.progressHandler.hide();
        this.progressHandler.reset();

        // Reset generator
        this.app.generator.reset();

        // Clear validation classes
        document.querySelectorAll('.error, .valid, .warning, .validation-error, .range-error').forEach(el => {
            el.classList.remove('error', 'valid', 'warning', 'validation-error', 'range-error');
            el.setCustomValidity('');
        });

        // Update preview
        this.updatePreview();

        this.ui.showToast('Settings reset to defaults', 'info');
    }

    // Clean up event listeners (for when the component is destroyed)
    destroy() {
        // This would remove all event listeners if needed
        // Useful for SPAs where components are created/destroyed dynamically
        this.isInitialized = false;
    }
}