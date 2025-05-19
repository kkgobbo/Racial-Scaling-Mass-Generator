// Collection management functionality

class CollectionManager {
    constructor(app, ui) {
        this.app = app;
        this.ui = ui;
        this.collectionData = null;
        this.originalFileName = null;
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;

        this.setupTabNavigation();
        this.setupCollectionHandlers();
        this.isInitialized = true;
    }

    setupTabNavigation() {
        const generatorTab = document.getElementById('generator-tab');
        const collectionTab = document.getElementById('collection-tab');
        const generatorContent = document.getElementById('generator-content');
        const collectionContent = document.getElementById('collection-content');

        generatorTab?.addEventListener('click', () => {
            generatorTab.classList.add('active');
            collectionTab.classList.remove('active');
            generatorContent.style.display = 'block';
            collectionContent.style.display = 'none';
        });

        collectionTab?.addEventListener('click', () => {
            collectionTab.classList.add('active');
            generatorTab.classList.remove('active');
            generatorContent.style.display = 'none';
            collectionContent.style.display = 'block';
        });
    }

    setupCollectionHandlers() {
        const collectionFileInput = document.getElementById('collection-file');
        const updateButton = document.getElementById('update-collection-btn');

        collectionFileInput?.addEventListener('change', (event) => {
            this.handleCollectionUpload(event);
        });

        updateButton?.addEventListener('click', () => {
            this.updateCollection();
        });
    }

    async handleCollectionUpload(event) {
        const file = event.target.files[0];
        const statusElement = document.getElementById('collection-status');
        
        if (!file) {
            statusElement.textContent = 'No collection loaded';
            statusElement.className = 'file-status';
            this.hideCollectionInfo();
            this.updateCollectionPreview();
            return;
        }

        try {
            statusElement.textContent = 'Loading collection...';
            statusElement.className = 'file-status loading';

            const text = await this.readFile(file);
            const json = JSON.parse(text);

            // Validate collection structure more thoroughly
            if (!json.Settings || typeof json.Settings !== 'object') {
                throw new Error('Invalid collection file - missing Settings object');
            }

            if (!json.Name) {
                throw new Error('Invalid collection file - missing Name field');
            }

            // Additional validation to ensure it's a Penumbra collection
            if (!json.Id || !json.Version) {
                throw new Error('Invalid collection file - missing required Penumbra collection fields');
            }

            this.collectionData = json;
            this.originalFileName = file.name;

            // Show collection name in status for immediate feedback
            const collectionName = json.Name || 'Unknown Collection';
            statusElement.textContent = `Loaded: "${collectionName}" (${file.name})`;
            statusElement.className = 'file-status success';

            this.showCollectionInfo();
            this.updateCollectionPreview();

            // Update UI state
            this.updateButtons();

            this.ui.showToast('Collection loaded successfully', 'success');

        } catch (error) {
            console.error('Error loading collection:', error);
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.className = 'file-status error';
            this.ui.showToast('Failed to load collection: ' + error.message, 'error');
            
            // Clear invalid file
            event.target.value = '';
            this.collectionData = null;
            this.originalFileName = null;
            this.hideCollectionInfo();
            this.updateCollectionPreview();
            this.updateButtons();
        }
    }

    showCollectionInfo() {
        const infoContainer = document.getElementById('collection-info');
        const displayNameElement = document.getElementById('collection-display-name');
        const displayFilenameElement = document.getElementById('collection-display-filename');
        const idElement = document.getElementById('collection-id');
        const modCountElement = document.getElementById('collection-mod-count');
        const heightCountElement = document.getElementById('collection-height-count');

        if (infoContainer && this.collectionData) {
            const settings = this.collectionData.Settings || {};
            const totalMods = Object.keys(settings).length;
            const heightMods = Object.keys(settings).filter(name => 
                name.includes('Height') && (name.includes('MIN') || name.includes('MAX'))
            ).length;

            const collectionName = this.collectionData.Name || 'Unknown Collection';
            const collectionId = this.collectionData.Id || 'Unknown ID';

            displayNameElement.textContent = collectionName;
            displayFilenameElement.textContent = this.originalFileName || 'Unknown file';
            idElement.textContent = collectionId;
            modCountElement.textContent = totalMods.toString();
            heightCountElement.textContent = heightMods.toString();

            infoContainer.style.display = 'block';
        }
    }

    hideCollectionInfo() {
        const infoContainer = document.getElementById('collection-info');
        if (infoContainer) {
            infoContainer.style.display = 'none';
        }
    }

    updateButtons() {
        const updateButton = document.getElementById('update-collection-btn');
        if (updateButton) {
            const hasCollection = !!this.collectionData;
            const hasGeneratedMods = this.app.generator.generatedMods.length > 0;
            
            updateButton.disabled = !hasCollection || !hasGeneratedMods;
            
            if (!hasCollection) {
                updateButton.textContent = 'Upload Collection First';
            } else if (!hasGeneratedMods) {
                updateButton.textContent = 'Generate Mods First';
            } else {
                updateButton.textContent = 'Update Collection with Generated Mods';
            }
        }
    }

    updateCollectionPreview() {
        const previewContainer = document.getElementById('collection-preview');
        if (!previewContainer) return;

        const hasCollection = !!this.collectionData;
        const generatedMods = this.app.generator.generatedMods || [];

        if (!hasCollection) {
            previewContainer.innerHTML = '<p>Upload a collection file to see preview.</p>';
            return;
        }

        if (generatedMods.length === 0) {
            previewContainer.innerHTML = '<p>Generate height mods to see what will be added to the collection.</p>';
            return;
        }

        // Show preview of what will be added
        const collectionName = this.collectionData.Name || 'Unknown Collection';
        let html = `
            <div class="collection-summary">
                <h4>📁 Ready to Update Collection</h4>
                <p><strong>${generatedMods.length} mods</strong> will be added to <strong>"${collectionName}"</strong></p>
                <p><small>File: ${this.originalFileName}</small></p>
            </div>
            <h4>Mods to be Added:</h4>
        `;

        generatedMods.forEach(mod => {
            const priority = this.extractPriority(mod.folderName);
            html += `
                <div class="preview-mod-item">
                    <div class="mod-info">
                        <h4>${mod.folderName}</h4>
                        <p>Type: ${mod.variant} | Multiplier: ${mod.multiplier}</p>
                    </div>
                    <div class="mod-priority">Priority: ${priority}</div>
                </div>
            `;
        });

        previewContainer.innerHTML = html;
    }

    extractPriority(modName) {
        // Extract number from brackets like [0005] or [0140]
        const match = modName.match(/\[(\d+)\]/);
        return match ? parseInt(match[1], 10) : 0;
    }

    async updateCollection() {
        if (!this.collectionData || !this.app.generator.generatedMods.length) {
            this.ui.showToast('No collection or generated mods available', 'error');
            return;
        }

        try {
            const validationContainer = document.getElementById('collection-validation-messages');
            if (validationContainer) {
                validationContainer.innerHTML = '';
            }

            // Create a copy of the collection data
            const updatedCollection = JSON.parse(JSON.stringify(this.collectionData));
            let addedCount = 0;
            let skippedCount = 0;

            // Add each generated mod to the collection
            for (const mod of this.app.generator.generatedMods) {
                const modName = mod.folderName;
                const priority = this.extractPriority(modName);

                // Check if mod already exists
                if (updatedCollection.Settings[modName]) {
                    skippedCount++;
                    console.log(`Skipped existing mod: ${modName}`);
                    continue;
                }

                // Add new mod entry
                updatedCollection.Settings[modName] = {
                    Settings: {},
                    Priority: priority,
                    Enabled: false
                };

                addedCount++;
            }

            // Download the updated collection
            await this.downloadUpdatedCollection(updatedCollection);

            // Show success message
            this.ui.showToast(
                `Collection updated! Added ${addedCount} mods${skippedCount > 0 ? `, skipped ${skippedCount} existing` : ''}`,
                'success',
                5000
            );

            // Display summary
            if (validationContainer) {
                validationContainer.innerHTML = `
                    <div class="validation-message success">
                        ✅ Collection updated successfully!<br>
                        Added: ${addedCount} mods | Skipped: ${skippedCount} existing mods
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error updating collection:', error);
            this.ui.showToast('Failed to update collection: ' + error.message, 'error');
            
            const validationContainer = document.getElementById('collection-validation-messages');
            if (validationContainer) {
                validationContainer.innerHTML = `
                    <div class="validation-message error">
                        ❌ Failed to update collection: ${error.message}
                    </div>
                `;
            }
        }
    }

    async downloadUpdatedCollection(collectionData) {
        try {
            const jsonString = JSON.stringify(collectionData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Use the original filename
            const filename = this.originalFileName || 'updated_collection.json';

            // Download using FileSaver.js if available, otherwise fallback
            if (typeof saveAs !== 'undefined') {
                saveAs(blob, filename);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            return true;
        } catch (error) {
            throw new Error(`Failed to download collection: ${error.message}`);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Called when generation completes to update UI
    onGenerationComplete() {
        this.updateButtons();
        this.updateCollectionPreview();
    }

    // Reset collection state
    reset() {
        this.collectionData = null;
        this.originalFileName = null;
        
        const collectionFileInput = document.getElementById('collection-file');
        if (collectionFileInput) {
            collectionFileInput.value = '';
        }

        const statusElement = document.getElementById('collection-status');
        if (statusElement) {
            statusElement.textContent = 'No collection loaded';
            statusElement.className = 'file-status';
        }

        this.hideCollectionInfo();
        this.updateCollectionPreview();
        this.updateButtons();

        const validationContainer = document.getElementById('collection-validation-messages');
        if (validationContainer) {
            validationContainer.innerHTML = '';
        }
    }

    // Get debug information
    getDebugInfo() {
        return {
            hasCollection: !!this.collectionData,
            collectionName: this.collectionData?.Name || null,
            originalFileName: this.originalFileName,
            modCount: this.collectionData ? Object.keys(this.collectionData.Settings).length : 0,
            isInitialized: this.isInitialized
        };
    }
}