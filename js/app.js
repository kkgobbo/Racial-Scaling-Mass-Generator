// Application initialization and coordination

class Application {
    constructor() {
        this.generator = null;
        this.ui = null;
        this.progressHandler = null;
        this.eventHandlers = null;
        this.collectionManager = null;
        this.sortOrderManager = null;
        this.isInitialized = false;
        this.lastErrorTime = null;
    }

    async initialize() {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            console.log('Initializing Racial Scaling Mass Generator...');

            // Check for required dependencies
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip library not loaded. Please include jszip.min.js in the lib/ folder');
            }

            if (typeof saveAs === 'undefined') {
                console.warn('FileSaver.js not loaded - using fallback download method');
            }

            // Initialize core components
            this.generator = new HeightModGenerator();

            // Initialize UI components
            this.ui = new UserInterface();
            this.ui.initialize();

            // Initialize progress handler
            this.progressHandler = new ProgressHandler(
                document.getElementById('progress-container'),
                document.getElementById('progress-text'),
                document.getElementById('progress-percentage'),
                document.getElementById('progress-fill'),
                document.getElementById('progress-details')
            );

            // Initialize event handlers
            this.eventHandlers = new EventHandlers(this, this.ui, this.progressHandler);
            this.eventHandlers.initialize();

            // Initialize collection manager
            this.collectionManager = new CollectionManager(this, this.ui);
            this.collectionManager.initialize();

            // Initialize sort order manager
            this.sortOrderManager = new SortOrderManager(this, this.ui);
            this.sortOrderManager.initialize();

            // Load default templates
            await this.generator.loadTemplates();

            // Set up global error handling
            this.setupGlobalErrorHandling();

            // Set up performance monitoring
            this.setupPerformanceMonitoring();

            // Initialize with default preview
            this.updateInitialPreview();

            // Initialize default configuration
            this.initializeDefaultConfiguration();

            this.isInitialized = true;
            console.log('Application initialized successfully');

            // Show welcome message
            this.ui.showToast('Racial Scaling Mass Generator ready!', 'success');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    initializeDefaultConfiguration() {
        // Set up default values
        const defaultOptions = {
            minMultiplier: 0.5,
            maxMultiplier: 2.0,
            stepIncrement: 0.1,
            generateMin: true,
            generateMax: true,
            prefix: ''
        };

        // Apply default configuration to UI
        this.ui.updateConfigurationFromOptions(defaultOptions);
        
        // Set in generator
        this.generator.setGenerationOptions(defaultOptions);
    }

    updateInitialPreview() {
        try {
            // Calculate and show initial preview
            const info = this.generator.calculateGenerationInfo();
            this.ui.updateGenerationPreview(info);
        } catch (error) {
            console.warn('Failed to update initial preview:', error);
            // Show default message if preview fails
            if (this.ui.previewContainer) {
                this.ui.previewContainer.innerHTML = '<p>Configure your settings above and click "Generate Height Mods" to see a preview.</p>';
            }
        }
    }

    setupGlobalErrorHandling() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            this.handleGlobalError(event.error);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleGlobalError(new Error(event.reason));
            // Prevent the default console error
            event.preventDefault();
        });

        // Handle network connectivity changes
        window.addEventListener('offline', () => {
            if (this.ui) {
                this.ui.showToast('Internet connection lost - application will continue to work offline', 'warning');
            }
        });

        window.addEventListener('online', () => {
            if (this.ui) {
                this.ui.showToast('Internet connection restored', 'success');
            }
        });
    }

    setupPerformanceMonitoring() {
        // Monitor memory usage if performance.memory is available
        if (performance && performance.memory) {
            const memoryCheckInterval = setInterval(() => {
                try {
                    const memory = performance.memory;
                    const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
                    const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
                    
                    // Warn if memory usage is high (>80% of limit)
                    if (usedMB > limitMB * 0.8) {
                        console.warn(`High memory usage detected: ${usedMB}MB of ${limitMB}MB`);
                        
                        // If memory is very high, suggest browser refresh
                        if (usedMB > limitMB * 0.9) {
                            this.ui?.showToast('High memory usage detected. Consider refreshing the page.', 'warning', 8000);
                        }
                    }
                } catch (error) {
                    console.warn('Memory monitoring error:', error);
                    clearInterval(memoryCheckInterval);
                }
            }, 30000); // Check every 30 seconds
        }

        // Monitor page visibility for performance optimization
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Page hidden - pausing non-essential operations');
                // Could pause timers, reduce update frequency, etc.
            } else {
                console.log('Page visible - resuming normal operations');
                // Resume normal operations
            }
        });

        // Monitor for long-running tasks
        const longTaskObserver = window.PerformanceObserver ? new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (entry.duration > 50) { // Tasks longer than 50ms
                    console.warn(`Long task detected: ${entry.duration}ms`);
                }
            });
        }) : null;

        if (longTaskObserver) {
            try {
                longTaskObserver.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.log('Long task observation not supported');
            }
        }
    }

    handleGlobalError(error) {
        const errorMessage = error?.message || 'An unexpected error occurred';
        
        // Prevent spam by throttling error notifications
        const now = Date.now();
        if (!this.lastErrorTime || now - this.lastErrorTime > 5000) {
            if (this.ui) {
                this.ui.showToast(`Error: ${errorMessage}`, 'error', 8000);
            }
            this.lastErrorTime = now;
        }

        // If generation is in progress, stop it gracefully
        if (this.generator?.isGenerating) {
            try {
                this.generator.reset();
                if (this.progressHandler) {
                    this.progressHandler.setError('Generation stopped due to error', errorMessage);
                }
                if (this.ui) {
                    this.ui.setLoadingState(false);
                }
            } catch (resetError) {
                console.error('Error during reset:', resetError);
            }
        }

        // Log detailed error information for debugging
        console.group('Application Error Details');
        console.error('Error message:', errorMessage);
        console.error('Error stack:', error?.stack);
        console.error('Generator state:', {
            isGenerating: this.generator?.isGenerating,
            generatedModCount: this.generator?.generatedMods?.length || 0
        });
        console.groupEnd();
    }

    handleInitializationError(error) {
        const errorMessage = `Failed to initialize application: ${error.message}`;
        
        // Try to show error in UI if validation messages container exists
        const validationContainer = document.getElementById('validation-messages');
        if (validationContainer) {
            validationContainer.innerHTML = `
                <div class="validation-message error" style="display: block;">
                    <strong>⚠️ Initialization Error</strong><br>
                    ${errorMessage}<br>
                    <small style="margin-top: 0.5rem; display: block;">
                        <strong>Common Solutions:</strong><br>
                        • Ensure jszip.min.js and FileSaver.min.js are in the lib/ folder<br>
                        • Check browser console for additional error details<br>
                        • Try refreshing the page<br>
                        • Ensure you're using a modern web browser
                    </small>
                </div>
            `;
            validationContainer.style.display = 'block';
        }

        // Also try to disable the generate button to prevent further errors
        const generateButton = document.getElementById('generate-btn');
        if (generateButton) {
            generateButton.disabled = true;
            generateButton.textContent = 'Initialization Failed';
            generateButton.style.backgroundColor = '#e74c3c';
        }

        // Log to console for debugging
        console.error('Initialization error details:', {
            message: error.message,
            stack: error.stack,
            dependencies: {
                JSZip: typeof JSZip !== 'undefined',
                saveAs: typeof saveAs !== 'undefined'
            }
        });

        // Show alert as last resort
        alert(`Application failed to initialize: ${error.message}\n\nPlease check the browser console for more details and ensure all required files are present.`);
    }

    // Public API methods for external use
    async regenerateWithNewSettings(options) {
        try {
            if (!this.isInitialized) {
                throw new Error('Application not initialized');
            }

            this.generator.setGenerationOptions(options);
            this.ui.updateConfigurationFromOptions(options);
            this.eventHandlers.updatePreview();
            this.ui.showToast('Settings updated successfully', 'success');
            
            return true;
        } catch (error) {
            console.error('Failed to update settings:', error);
            this.ui.showToast('Failed to update settings: ' + error.message, 'error');
            return false;
        }
    }

    async downloadCurrentMods(filename = null) {
        try {
            if (!this.isInitialized) {
                throw new Error('Application not initialized');
            }

            if (!this.generator.generatedMods || this.generator.generatedMods.length === 0) {
                throw new Error('No mods available for download. Please generate mods first.');
            }

            await this.generator.downloadMods(filename);
            this.ui.showToast('Download started successfully!', 'success');
            
            return true;
        } catch (error) {
            console.error('Download failed:', error);
            this.ui.showToast('Download failed: ' + error.message, 'error');
            return false;
        }
    }

    getApplicationInfo() {
        return {
            isInitialized: this.isInitialized,
            isGenerating: this.generator?.isGenerating || false,
            generatedModCount: this.generator?.generatedMods?.length || 0,
            hasTemplatesLoaded: !!(this.generator?.fileProcessor?.metaTemplate && this.generator?.fileProcessor?.modTemplate),
            currentOptions: this.generator?.generationOptions || {},
            version: '1.0.0',
            lastError: this.lastErrorTime ? new Date(this.lastErrorTime).toISOString() : null
        };
    }

    // Settings backup/restore functionality
    exportSettings() {
        try {
            if (!this.isInitialized) {
                throw new Error('Application not initialized');
            }

            const settings = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                options: this.ui.getConfigurationFromForm(),
                templateInfo: this.generator.getTemplateInfo(),
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href
                }
            };

            const settingsJson = JSON.stringify(settings, null, 2);
            const blob = new Blob([settingsJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `racial-scaling-settings-${new Date().toISOString().slice(0, 10)}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.ui.showToast('Settings exported successfully', 'success');
            return true;
        } catch (error) {
            console.error('Failed to export settings:', error);
            this.ui.showToast('Failed to export settings: ' + error.message, 'error');
            return false;
        }
    }

    async importSettings(file) {
        try {
            if (!this.isInitialized) {
                throw new Error('Application not initialized');
            }

            const text = await this.readFile(file);
            const settings = JSON.parse(text);

            // Validate settings format
            if (!settings.version || !settings.options) {
                throw new Error('Invalid settings file format');
            }

            // Check version compatibility (for future versions)
            if (settings.version !== '1.0.0') {
                console.warn(`Settings file version ${settings.version} may not be fully compatible`);
            }

            // Apply settings to UI
            this.ui.updateConfigurationFromOptions(settings.options);
            
            // Update generator options
            this.generator.setGenerationOptions(settings.options);
            
            // Update preview
            this.eventHandlers.updatePreview();

            this.ui.showToast('Settings imported successfully', 'success');
            return true;
        } catch (error) {
            console.error('Failed to import settings:', error);
            this.ui.showToast('Failed to import settings: ' + error.message, 'error');
            return false;
        }
    }

    // Utility method to read file contents
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    // Method to force a complete reset of the application
    resetApplication() {
        try {
            // Reset generator
            if (this.generator) {
                this.generator.reset();
            }

            // Reset UI
            if (this.ui) {
                this.ui.resetUI();
            }

            // Reset progress handler
            if (this.progressHandler) {
                this.progressHandler.hide();
                this.progressHandler.reset();
            }

            // Reset collection manager
            if (this.collectionManager) {
                this.collectionManager.reset();
            }

            // Reset sort order manager
            if (this.sortOrderManager) {
                this.sortOrderManager.reset();
            }

            // Clear error state
            this.lastErrorTime = null;

            // Reinitialize with defaults
            this.initializeDefaultConfiguration();
            this.updateInitialPreview();

            console.log('Application reset successfully');
            this.ui?.showToast('Application reset to defaults', 'info');
            
            return true;
        } catch (error) {
            console.error('Error during application reset:', error);
            this.ui?.showToast('Failed to reset application: ' + error.message, 'error');
            return false;
        }
    }

    // Cleanup method for SPA environments or manual destruction
    destroy() {
        try {
            // Cleanup event handlers
            if (this.eventHandlers) {
                this.eventHandlers.destroy();
            }

            // Cleanup collection manager
            if (this.collectionManager) {
                this.collectionManager.reset();
            }

            // Cleanup sort order manager
            if (this.sortOrderManager) {
                this.sortOrderManager.reset();
            }

            // Reset generator state
            if (this.generator) {
                this.generator.reset();
            }

            // Clear any ongoing timers or intervals
            // (Performance monitoring intervals are handled automatically)

            this.isInitialized = false;
            console.log('Application destroyed successfully');
            return true;
        } catch (error) {
            console.error('Error during application destruction:', error);
            return false;
        }
    }

    // Debug method to get detailed application state
    getDebugInfo() {
        const info = this.getApplicationInfo();
        
        return {
            ...info,
            ui: {
                initialized: this.ui?.isInitialized || false,
                elementsFound: this.ui ? Object.keys(this.ui.elements).length : 0
            },
            progressHandler: {
                visible: this.progressHandler?.isVisible || false,
                currentStep: this.progressHandler?.currentStep || 0,
                totalSteps: this.progressHandler?.totalSteps || 0
            },
            eventHandlers: {
                initialized: this.eventHandlers?.isInitialized || false
            },
            collectionManager: this.collectionManager?.getDebugInfo() || {
                hasCollection: false,
                initialized: false
            },
            sortOrderManager: this.sortOrderManager?.getDebugInfo() || {
                hasSortOrder: false,
                initialized: false
            },
            fileProcessor: {
                metaLoaded: !!this.generator?.fileProcessor?.metaTemplate,
                modLoaded: !!this.generator?.fileProcessor?.modTemplate
            },
            zipManager: {
                folderCount: this.generator?.zipManager?.getFolderList()?.length || 0
            },
            performance: {
                memorySupported: !!(performance && performance.memory),
                userAgent: navigator.userAgent
            }
        };
    }
}

// Global application instance
let ffxivApp = null;

// Initialize application when DOM content is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM content loaded, initializing Racial Scaling Mass Generator...');
    
    try {
        // Create and initialize the application
        ffxivApp = new Application();
        await ffxivApp.initialize();
        
        // Make app globally accessible for debugging
        window.ffxivApp = ffxivApp;
        
        console.log('Application startup completed successfully');
    } catch (error) {
        console.error('Failed to start application:', error);
        
        // Try to show error even if initialization failed
        const errorContainer = document.getElementById('validation-messages');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="validation-message error" style="display: block;">
                    <strong>⚠️ Application Failed to Start</strong><br>
                    ${error.message}<br>
                    <small>Check the browser console for detailed error information.</small>
                </div>
            `;
        }
    }
});

// Handle page unload - warn user if generation is in progress
window.addEventListener('beforeunload', (event) => {
    if (ffxivApp?.generator?.isGenerating) {
        const message = 'Height mod generation is currently in progress. Are you sure you want to leave? Your progress will be lost.';
        event.preventDefault();
        event.returnValue = message;
        return message;
    }
});

// Handle page load errors
window.addEventListener('load', () => {
    // Check if required libraries loaded correctly after page load
    if (!ffxivApp?.isInitialized) {
        console.warn('Application may not have initialized correctly');
        
        // Perform a delayed check
        setTimeout(() => {
            if (!ffxivApp?.isInitialized) {
                const generateButton = document.getElementById('generate-btn');
                if (generateButton) {
                    generateButton.disabled = true;
                    generateButton.textContent = 'Initialization Failed - Check Console';
                }
            }
        }, 2000);
    }
});

// Export Application class for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Application;
}