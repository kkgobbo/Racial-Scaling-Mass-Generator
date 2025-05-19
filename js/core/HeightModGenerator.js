// Main application class

class HeightModGenerator {
    constructor() {
        this.fileProcessor = new FileProcessor();
        this.zipManager = new ZipManager();
        this.generationOptions = {};
        this.isGenerating = false;
        this.generatedMods = [];
    }

    async loadTemplates(metaFile = null, modFile = null) {
        try {
            const metaResult = await this.fileProcessor.loadMetaTemplate(metaFile);
            const modResult = await this.fileProcessor.loadModTemplate(modFile);
            
            return {
                success: true,
                meta: metaResult,
                mod: modResult
            };
        } catch (error) {
            throw new Error(`Failed to load templates: ${error.message}`);
        }
    }

    setGenerationOptions(options) {
        this.generationOptions = {
            minMultiplier: parseFloat(options.minMultiplier) || 0.5,
            maxMultiplier: parseFloat(options.maxMultiplier) || 2.0,
            stepIncrement: parseFloat(options.stepIncrement) || 0.1,
            generateMin: options.generateMin !== false,
            generateMax: options.generateMax !== false,
            prefix: options.prefix || ''
        };
    }

    validateOptions() {
        return validateGenerationOptions(this.generationOptions);
    }

    calculateGenerationInfo() {
        const multipliers = generateMultiplierArray(
            this.generationOptions.minMultiplier,
            this.generationOptions.maxMultiplier,
            this.generationOptions.stepIncrement
        );

        let totalMods = 0;
        
        if (this.generationOptions.generateMin && this.generationOptions.generateMax) {
            // Both MIN and MAX variants for each multiplier
            totalMods = multipliers.length * 2;
        } else {
            // Either MIN or MAX variants
            totalMods = multipliers.length;
        }

        return {
            multiplierCount: multipliers.length,
            multipliers: multipliers,
            totalMods: totalMods,
            variants: this.getVariantTypes(),
            estimatedTime: this.estimateGenerationTime(totalMods)
        };
    }

    getVariantTypes() {
        const variants = [];
        if (this.generationOptions.generateMin) variants.push('MIN');
        if (this.generationOptions.generateMax) variants.push('MAX');
        return variants;
    }

    estimateGenerationTime(totalMods) {
        // Rough estimate: ~10ms per mod for processing + ZIP creation
        const estimatedMs = totalMods * 10;
        return Math.max(1, Math.round(estimatedMs / 1000)); // Convert to seconds, minimum 1 second
    }

    async generateMods(progressCallback = null) {
        if (this.isGenerating) {
            throw new Error("Generation already in progress");
        }

        try {
            this.isGenerating = true;
            this.generatedMods = [];

            // Validate options
            const validation = this.validateOptions();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Validate templates
            const templateValidation = this.fileProcessor.validateTemplates();
            if (!templateValidation.isValid) {
                throw new Error(templateValidation.errors.join(', '));
            }

            // Calculate generation info
            const info = this.calculateGenerationInfo();
            
            if (progressCallback) {
                progressCallback({
                    phase: 'initializing',
                    percentage: 0,
                    message: 'Initializing generation...',
                    details: `Preparing to generate ${info.totalMods} mod variants`
                });
            }

            // Generate multiplier array and filter out those that would exceed 512
            const multipliers = info.multipliers.filter(multiplier => {
                // Check if any race would exceed 512 with this multiplier
                const maxBaseValue = Math.max(...Object.values(BASE_VALUES));
                return multiplier * maxBaseValue <= VALIDATION_RULES.MAX_ENTRY_VALUE;
            });
            
            let currentMod = 0;
            const totalMods = multipliers.length * (this.generationOptions.generateMin && this.generationOptions.generateMax ? 2 : 1);

            // Clear ZIP manager
            this.zipManager.clear();

            // Generate mods for each multiplier and variant combination
            for (const multiplier of multipliers) {
                const variants = this.getVariantsForMultiplier(multiplier);
                
                for (const variant of variants) {
                    currentMod++;
                    
                    if (progressCallback) {
                        progressCallback({
                            phase: 'generating',
                            percentage: Math.round((currentMod / totalMods) * 80), // 80% for generation
                            message: `Generating mod ${currentMod} of ${totalMods}`,
                            details: `Creating ${variant} variant for multiplier ${multiplier}`
                        });
                    }

                    // Generate mod data
                    const modData = this.fileProcessor.generateModForMultiplier(
                        multiplier,
                        this.fileProcessor.metaTemplate,
                        this.fileProcessor.modTemplate,
                        { variant, prefix: this.generationOptions.prefix }
                    );

                    // Add to generated mods array
                    this.generatedMods.push(modData);

                    // Add to ZIP
                    await this.zipManager.addModToZip(modData);

                    // Small delay to prevent blocking UI
                    await this.sleep(1);
                }
            }

            if (progressCallback) {
                progressCallback({
                    phase: 'finalizing',
                    percentage: 90,
                    message: 'Finalizing ZIP file...',
                    details: 'Compressing and preparing download'
                });
            }

            // Validate ZIP
            const zipValidation = await this.zipManager.validateZip();
            if (!zipValidation.isValid) {
                throw new Error(`ZIP validation failed: ${zipValidation.errors.join(', ')}`);
            }

            if (progressCallback) {
                progressCallback({
                    phase: 'complete',
                    percentage: 100,
                    message: 'Generation complete!',
                    details: `Successfully generated ${this.generatedMods.length} height mod variants`
                });
            }

            return {
                success: true,
                modCount: this.generatedMods.length,
                zipInfo: zipValidation.info
            };

        } catch (error) {
            throw new Error(`Generation failed: ${error.message}`);
        } finally {
            this.isGenerating = false;
        }
    }

    getVariantsForMultiplier(multiplier) {
        const variants = [];
        
        if (this.generationOptions.generateMin && this.generationOptions.generateMax) {
            // Both variants for each multiplier
            variants.push('MIN', 'MAX');
        } else if (this.generationOptions.generateMin) {
            variants.push('MIN');
        } else if (this.generationOptions.generateMax) {
            variants.push('MAX');
        }
        
        return variants;
    }

    async downloadMods(filename = null) {
        try {
            if (this.generatedMods.length === 0) {
                throw new Error("No mods generated. Please generate mods first.");
            }

            const defaultFilename = this.generateDefaultFilename();
            const downloadFilename = filename || defaultFilename;

            await this.zipManager.downloadZip(downloadFilename);
            
            return {
                success: true,
                filename: downloadFilename
            };
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    generateDefaultFilename() {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_');
        const variants = this.getVariantTypes().join('_');
        const range = `${this.generationOptions.minMultiplier}-${this.generationOptions.maxMultiplier}`;
        
        return `FFXIV_Height_Mods_${variants}_${range}_${timestamp}.zip`;
    }

    getGenerationSummary() {
        if (this.generatedMods.length === 0) {
            return null;
        }

        const summary = {
            totalMods: this.generatedMods.length,
            variants: {},
            multipliers: {
                min: Math.min(...this.generatedMods.map(m => m.multiplier)),
                max: Math.max(...this.generatedMods.map(m => m.multiplier)),
                count: new Set(this.generatedMods.map(m => m.multiplier)).size
            }
        };

        // Count variants
        for (const mod of this.generatedMods) {
            summary.variants[mod.variant] = (summary.variants[mod.variant] || 0) + 1;
        }

        return summary;
    }

    reset() {
        this.isGenerating = false;
        this.generatedMods = [];
        this.zipManager.clear();
        this.generationOptions = {};
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getTemplateInfo() {
        return this.fileProcessor.getTemplateInfo();
    }

    async getZipPreview() {
        try {
            return await this.zipManager.getZipInfo();
        } catch (error) {
            return null;
        }
    }
}