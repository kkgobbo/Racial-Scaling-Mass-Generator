// Template loading and JSON manipulation

class FileProcessor {
    constructor() {
        this.metaTemplate = null;
        this.modTemplate = null;
    }

    async loadMetaTemplate(file = null) {
        try {
            if (file) {
                const text = await this.readFile(file);
                const json = JSON.parse(text);
                
                const validation = validateJSONStructure(json, VALIDATION_RULES.REQUIRED_META_FIELDS);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join(', '));
                }
                
                this.metaTemplate = json;
            } else {
                // Use default template
                this.metaTemplate = { ...DEFAULT_TEMPLATES.META };
            }
            
            return { success: true, template: this.metaTemplate };
        } catch (error) {
            throw new Error(`Failed to load meta template: ${error.message}`);
        }
    }

    async loadModTemplate(file = null) {
        try {
            if (file) {
                const text = await this.readFile(file);
                const json = JSON.parse(text);
                
                const validation = validateModTemplate(json);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join(', '));
                }
                
                this.modTemplate = json;
            } else {
                // Use default template with basic structure
                this.modTemplate = this.createDefaultModTemplate();
            }
            
            return { success: true, template: this.modTemplate };
        } catch (error) {
            throw new Error(`Failed to load mod template: ${error.message}`);
        }
    }

    createDefaultModTemplate() {
        const template = { ...DEFAULT_TEMPLATES.MOD };
        
        // Create default manipulations for all races
        template.Manipulations = this.createDefaultManipulations();
        
        return template;
    }

    createDefaultManipulations() {
        const races = [
            "Midlander", "Highlander", "KeeperOfTheMoon", "SeekerOfTheSun",
            "Seawolf", "Hellsguard", "Raen", "Xaela", "Rava", "Veena"
        ];

        return races.map(race => ({
            Type: "Rsp",
            FileSource: 0,
            Manipulation: {
                SubRace: race,
                Attribute: "FemaleMaxSize", // Default to MAX, will be changed based on variant
                Entry: 1.0 // Default value, will be overwritten
            }
        }));
    }

    async readFile(file) {
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

    generateModForMultiplier(multiplier, baseMetadata, baseModData, options = {}) {
        try {
            const { variant = 'AUTO', prefix = '' } = options;
            
            // Determine variant if auto
            let actualVariant = variant;
            if (variant === 'AUTO') {
                actualVariant = multiplier < 1.0 ? 'MIN' : 'MAX';
            }
            
            // Generate folder name
            const folderName = this.generateFolderName(multiplier, actualVariant, prefix);
            
            // Create modified metadata
            const modifiedMeta = { ...baseMetadata };
            modifiedMeta.Name = folderName;
            
            // Update ModTags based on variant
            modifiedMeta.ModTags = actualVariant === 'MIN' ? 
                ['Size', 'SizeMin'] : ['Size', 'SizeMax'];
            
            // Create modified mod data
            const modifiedMod = JSON.parse(JSON.stringify(baseModData));
            
            // Update manipulations
            modifiedMod.Manipulations.forEach(manipulation => {
                if (manipulation.Type === "Rsp" && 
                    manipulation.Manipulation && 
                    manipulation.Manipulation.SubRace) {
                    
                    // Set the appropriate attribute based on variant
                    manipulation.Manipulation.Attribute = actualVariant === 'MIN' ? 
                        'FemaleMinSize' : 'FemaleMaxSize';
                    
                    // Calculate new entry value and cap at 512
                    const baseValue = this.getBaseValueForRace(manipulation.Manipulation.SubRace);
                    const calculatedEntry = baseValue * multiplier;
                    manipulation.Manipulation.Entry = parseFloat(Math.min(calculatedEntry, 512).toFixed(3));
                }
            });
            
            return {
                folderName: this.sanitizeFolderName(folderName),
                metaJson: JSON.stringify(modifiedMeta, null, 2),
                modJson: JSON.stringify(modifiedMod, null, 2),
                variant: actualVariant,
                multiplier: multiplier
            };
        } catch (error) {
            throw new Error(`Failed to generate mod for multiplier ${multiplier}: ${error.message}`);
        }
    }

    generateFolderName(multiplier, variant, prefix) {
        // Convert multiplier to string
        let multiplierStr = multiplier.toString();
        
        // If no decimal point, add .0
        if (!multiplierStr.includes('.')) {
            multiplierStr += '.0';
        }
        
        // Remove decimal point and pad to 4 digits with leading zeros
        const paddedNumber = multiplierStr.replace('.', '').padStart(4, '0');
        const baseName = `[${paddedNumber}] Height ${variant} - ${formatMultiplier(multiplier)}x`;
        return prefix ? `${prefix}${baseName}` : baseName;
    }

    getBaseValueForRace(race) {
        return BASE_VALUES[race] || 1.0;
    }

    sanitizeFolderName(name) {
        // Remove or replace characters that aren't safe for folder names
        return name.replace(/[<>:"/\\|?*]/g, '_');
    }

    validateTemplates() {
        const errors = [];
        
        if (!this.metaTemplate) {
            errors.push("Meta template not loaded");
        }
        
        if (!this.modTemplate) {
            errors.push("Mod template not loaded");
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    getTemplateInfo() {
        return {
            meta: {
                loaded: !!this.metaTemplate,
                name: this.metaTemplate?.Name || 'Default Template'
            },
            mod: {
                loaded: !!this.modTemplate,
                manipulationCount: this.modTemplate?.Manipulations?.length || 0
            }
        };
    }
}