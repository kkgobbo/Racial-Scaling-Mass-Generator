// Progress tracking and feedback

class ProgressHandler {
    constructor(containerElement, textElement, percentageElement, fillElement, detailsElement) {
        this.container = containerElement;
        this.text = textElement;
        this.percentage = percentageElement;
        this.fill = fillElement;
        this.details = detailsElement;
        
        this.currentStep = 0;
        this.totalSteps = 0;
        this.isVisible = false;
        this.startTime = null;
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.isVisible = true;
            this.startTime = Date.now();
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            this.startTime = null;
        }
    }

    updateProgress(data) {
        const {
            percentage = 0,
            message = '',
            details = '',
            phase = null,
            current = null,
            total = null
        } = data;

        // Update progress bar
        if (this.fill) {
            this.fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }

        // Update percentage text
        if (this.percentage) {
            this.percentage.textContent = `${Math.round(percentage)}%`;
        }

        // Update main message
        if (this.text && message) {
            this.text.textContent = message;
        }

        // Update details
        if (this.details) {
            let detailText = details;
            
            // Add timing information if available
            if (this.startTime && percentage > 0) {
                const elapsed = Date.now() - this.startTime;
                const estimated = (elapsed / percentage) * 100;
                const remaining = Math.max(0, estimated - elapsed);
                
                if (percentage < 100 && remaining > 1000) {
                    const remainingSeconds = Math.round(remaining / 1000);
                    detailText += ` • ~${remainingSeconds}s remaining`;
                }
            }
            
            // Add current/total information if available
            if (current !== null && total !== null) {
                detailText += ` • ${current}/${total}`;
            }
            
            this.details.textContent = detailText;
        }

        // Add phase-specific styling
        if (this.container && phase) {
            this.container.className = this.container.className.replace(/\bphase-\w+\b/g, '');
            this.container.classList.add(`phase-${phase}`);
        }
    }

    setSteps(steps) {
        this.totalSteps = steps.length;
        this.currentStep = 0;
        
        return steps;
    }

    nextStep(stepName = null) {
        this.currentStep = Math.min(this.currentStep + 1, this.totalSteps);
        
        const percentage = this.totalSteps > 0 ? 
            (this.currentStep / this.totalSteps) * 100 : 0;
        
        this.updateProgress({
            percentage,
            message: stepName || `Step ${this.currentStep} of ${this.totalSteps}`,
            details: `Processing step ${this.currentStep}...`
        });
    }

    setError(message, details = '') {
        this.updateProgress({
            percentage: 0,
            message: `Error: ${message}`,
            details: details,
            phase: 'error'
        });
        
        // Add error styling
        if (this.container) {
            this.container.classList.add('progress-error');
        }
        
        if (this.fill) {
            this.fill.style.backgroundColor = 'var(--error-color)';
        }
    }

    setSuccess(message, details = '') {
        this.updateProgress({
            percentage: 100,
            message: message,
            details: details,
            phase: 'success'
        });
        
        // Add success styling
        if (this.container) {
            this.container.classList.add('progress-success');
        }
        
        if (this.fill) {
            this.fill.style.backgroundColor = 'var(--success-color)';
        }
    }

    reset() {
        this.currentStep = 0;
        this.totalSteps = 0;
        this.startTime = null;
        
        // Reset styling
        if (this.container) {
            this.container.className = this.container.className
                .replace(/\bphase-\w+\b/g, '')
                .replace(/\bprogress-(error|success)\b/g, '');
        }
        
        if (this.fill) {
            this.fill.style.backgroundColor = '';
            this.fill.style.width = '0%';
        }
        
        // Clear text
        if (this.text) this.text.textContent = '';
        if (this.percentage) this.percentage.textContent = '0%';
        if (this.details) this.details.textContent = '';
    }

    getElapsedTime() {
        return this.startTime ? Date.now() - this.startTime : 0;
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // Predefined step templates for common operations
    static createFileProcessingSteps(fileCount) {
        const steps = [
            'Initializing',
            'Loading templates',
            'Validating configuration'
        ];
        
        for (let i = 1; i <= fileCount; i++) {
            steps.push(`Processing file ${i}`);
        }
        
        steps.push('Creating ZIP archive', 'Finalizing');
        
        return steps;
    }

    static createGenerationSteps(modCount) {
        return [
            'Initializing generation',
            'Validating templates',
            'Calculating multipliers',
            `Generating ${modCount} mods`,
            'Creating ZIP archive',
            'Validating output',
            'Preparing download'
        ];
    }

    // Utility method for smooth progress animations
    animateToProgress(targetPercentage, duration = 300) {
        if (!this.fill) return;
        
        const startPercentage = parseFloat(this.fill.style.width) || 0;
        const diff = targetPercentage - startPercentage;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeOutCubic(progress);
            const currentPercentage = startPercentage + (diff * easeProgress);
            
            this.fill.style.width = `${currentPercentage}%`;
            
            if (this.percentage) {
                this.percentage.textContent = `${Math.round(currentPercentage)}%`;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
}