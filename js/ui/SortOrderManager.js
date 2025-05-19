// Sort Order management functionality

class SortOrderManager {
    constructor(app, ui) {
        this.app = app;
        this.ui = ui;
        this.sortOrderData = null;
        this.originalFileName = null;
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;

        this.setupTabNavigation();
        this.setupSortOrderHandlers();
        this.isInitialized = true;
    }

    setupTabNavigation() {
        const generatorTab = document.getElementById('generator-tab');
        const collectionTab = document.getElementById('collection-tab');
        const sortOrderTab = document.getElementById('sort-order-tab');
        const generatorContent = document.getElementById('generator-content');
        const collectionContent = document.getElementById('collection-content');
        const sortOrderContent = document.getElementById('sort-order-content');

        generatorTab?.addEventListener('click', () => {
            this.setActiveTab(generatorTab, generatorContent);
        });

        collectionTab?.addEventListener('click', () => {
            this.setActiveTab(collectionTab, collectionContent);
        });

        sortOrderTab?.addEventListener('click', () => {
            this.setActiveTab(sortOrderTab, sortOrderContent);
        });
    }

    setActiveTab(activeTab, activeContent) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hide all content
        document.querySelectorAll('main').forEach(content => {
            content.style.display = 'none';
        });

        // Activate selected tab and content
        activeTab.classList.add('active');
        activeContent.style.display = 'block';
    }

    setupSortOrderHandlers() {
        const sortOrderFileInput = document.getElementById('sort-order-file');
        const updateButton = document.getElementById('update-sort-order-btn');
        const heightFolderPathInput = document.getElementById('height-folder-path');
        const updateExistingToggle = document.getElementById('update-existing-heights');

        if (sortOrderFileInput) {
            sortOrderFileInput.addEventListener('change', (event) => {
                this.handleSortOrderUpload(event);
            });
        }

        if (updateButton) {
            updateButton.addEventListener('click', () => {
                this.updateSortOrder();
            });
        }

        if (heightFolderPathInput) {
            heightFolderPathInput.addEventListener('input', () => {
                this.validateHeightFolderPath();
            });
        }

        if (updateExistingToggle) {
            updateExistingToggle.addEventListener('change', () => {
                this.updateButtons();
            });
        }
    }

    async handleSortOrderUpload(event) {
        const file = event.target.files[0];
        const statusElement = document.getElementById('sort-order-status');
        
        if (!file) {
            statusElement.textContent = 'No sort order file loaded';
            statusElement.className = 'file-status';
            this.hideSortOrderInfo();
            this.hideSortOrderConfig();
            this.sortOrderData = null;
            this.originalFileName = null;
            this.updateButtons();
            return;
        }

        try {
            statusElement.textContent = 'Loading sort order file...';
            statusElement.className = 'file-status loading';

            const text = await this.readFile(file);
            const json = JSON.parse(text);

            // Validate sort order structure
            if (!json.Data || typeof json.Data !== 'object') {
                throw new Error('Invalid sort order file - missing or invalid Data object');
            }

            // EmptyFolders is optional but should be an array if present
            if (json.EmptyFolders && !Array.isArray(json.EmptyFolders)) {
                throw new Error('Invalid sort order file - EmptyFolders must be an array');
            }

            this.sortOrderData = json;
            this.originalFileName = file.name;

            statusElement.textContent = `Loaded: ${file.name}`;
            statusElement.className = 'file-status success';

            this.showSortOrderInfo();
            this.showSortOrderConfig();
            this.updateButtons();

            this.ui.showToast('Sort order file loaded successfully', 'success');

        } catch (error) {
            console.error('Error loading sort order file:', error);
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.className = 'file-status error';
            this.ui.showToast('Failed to load sort order file: ' + error.message, 'error');
            
            // Clear invalid file
            event.target.value = '';
            this.sortOrderData = null;
            this.originalFileName = null;
            this.hideSortOrderInfo();
            this.hideSortOrderConfig();
            this.updateButtons();
        }
    }

    showSortOrderInfo() {
        const infoContainer = document.getElementById('sort-order-info');
        const entryCountElement = document.getElementById('sort-order-entry-count');
        const heightCountElement = document.getElementById('sort-order-height-count');
        const emptyCountElement = document.getElementById('sort-order-empty-count');

        if (infoContainer && this.sortOrderData) {
            const data = this.sortOrderData.Data || {};
            const emptyFolders = this.sortOrderData.EmptyFolders || [];
            
            const totalEntries = Object.keys(data).length;
            const heightModEntries = Object.keys(data).filter(name => 
                name.includes('Height') && (name.includes('MIN') || name.includes('MAX'))
            ).length;

            entryCountElement.textContent = totalEntries.toString();
            heightCountElement.textContent = heightModEntries.toString();
            emptyCountElement.textContent = emptyFolders.length.toString();

            infoContainer.style.display = 'block';
        }
    }

    hideSortOrderInfo() {
        const infoContainer = document.getElementById('sort-order-info');
        if (infoContainer) {
            infoContainer.style.display = 'none';
        }
    }

    showSortOrderConfig() {
        const configContainer = document.getElementById('sort-order-config');
        if (configContainer) {
            configContainer.style.display = 'block';
        }
    }

    hideSortOrderConfig() {
        const configContainer = document.getElementById('sort-order-config');
        if (configContainer) {
            configContainer.style.display = 'none';
        }
    }

    validateHeightFolderPath() {
        const heightFolderPathInput = document.getElementById('height-folder-path');
        if (!heightFolderPathInput) return true;

        const value = heightFolderPathInput.value.trim();
        
        // Remove invalid characters for folder paths
        const sanitized = value.replace(/[<>:"|?*]/g, '');
        if (sanitized !== value) {
            heightFolderPathInput.value = sanitized;
        }

        // Basic validation
        heightFolderPathInput.classList.remove('error', 'valid');
        
        if (!value) {
            heightFolderPathInput.classList.add('error');
            return false;
        } else {
            heightFolderPathInput.classList.add('valid');
            return true;
        }
    }

    getHeightFolderPath() {
        const heightFolderPathInput = document.getElementById('height-folder-path');
        return heightFolderPathInput?.value.trim() || 'NewHeightMods';
    }

    shouldUpdateExistingHeights() {
        const updateExistingToggle = document.getElementById('update-existing-heights');
        return updateExistingToggle?.checked || false;
    }

    updateButtons() {
        const updateButton = document.getElementById('update-sort-order-btn');
        
        if (updateButton) {
            const hasSortOrder = !!this.sortOrderData;
            const hasGeneratedMods = this.app.generator.generatedMods.length > 0;
            const willUpdateExisting = this.shouldUpdateExistingHeights();
            
            // Enable button if we have sort order and either generated mods OR will update existing
            updateButton.disabled = !hasSortOrder || (!hasGeneratedMods && !willUpdateExisting);
            
            if (!hasSortOrder) {
                updateButton.textContent = 'Upload Sort Order File First';
            } else if (!hasGeneratedMods && !willUpdateExisting) {
                updateButton.textContent = 'Generate Mods or Enable Existing Update';
            } else if (hasGeneratedMods && willUpdateExisting) {
                updateButton.textContent = 'Update Sort Order (New + Existing Mods)';
            } else if (willUpdateExisting) {
                updateButton.textContent = 'Update Existing Height Mods';
            } else {
                updateButton.textContent = 'Update Sort Order with Generated Mods';
            }
        }
    }

    async updateSortOrder() {
        if (!this.sortOrderData) {
            this.ui.showToast('No sort order file loaded', 'error');
            return;
        }

        const hasGeneratedMods = this.app.generator.generatedMods.length > 0;
        const willUpdateExisting = this.shouldUpdateExistingHeights();

        if (!hasGeneratedMods && !willUpdateExisting) {
            this.ui.showToast('No operations to perform. Generate mods or enable existing update.', 'error');
            return;
        }

        try {
            const validationContainer = document.getElementById('sort-order-validation-messages');
            if (validationContainer) {
                validationContainer.innerHTML = '';
            }

            // Validate height folder path
            if (!this.validateHeightFolderPath()) {
                this.ui.showToast('Please enter a valid height folder path', 'error');
                return;
            }

            const heightFolderPath = this.getHeightFolderPath();

            // Create a copy of the sort order data
            const updatedSortOrder = JSON.parse(JSON.stringify(this.sortOrderData));
            let addedCount = 0;
            let skippedCount = 0;
            let updatedExistingCount = 0;

            // Update existing height mods if toggle is enabled
            if (willUpdateExisting) {
                for (const [modName, currentPath] of Object.entries(updatedSortOrder.Data)) {
                    if (this.isHeightMod(modName)) {
                        const newPath = `${heightFolderPath}/${modName}`;
                        if (currentPath !== newPath) {
                            updatedSortOrder.Data[modName] = newPath;
                            updatedExistingCount++;
                        }
                    }
                }
            }

            // Add each generated mod to the sort order
            if (hasGeneratedMods) {
                for (const mod of this.app.generator.generatedMods) {
                    const modName = mod.folderName;
                    const sortPath = `${heightFolderPath}/${modName}`;

                    // Check if mod already exists
                    if (updatedSortOrder.Data[modName]) {
                        skippedCount++;
                        // Update path if different and not already counted
                        if (updatedSortOrder.Data[modName] !== sortPath && !willUpdateExisting) {
                            updatedSortOrder.Data[modName] = sortPath;
                            updatedExistingCount++;
                        }
                    } else {
                        // Add new mod entry
                        updatedSortOrder.Data[modName] = sortPath;
                        addedCount++;
                    }
                }
            }

            // Sort the Data object alphabetically by the path (value)
            const sortedData = this.sortDataByPath(updatedSortOrder.Data);
            updatedSortOrder.Data = sortedData;

            // Download the updated sort order
            await this.downloadUpdatedSortOrder(updatedSortOrder);

            // Show success message
            let messageParts = [];
            if (addedCount > 0) messageParts.push(`Added ${addedCount} new mods`);
            if (skippedCount > 0) messageParts.push(`Skipped ${skippedCount} existing`);
            if (updatedExistingCount > 0) messageParts.push(`Updated ${updatedExistingCount} paths`);
            
            const message = messageParts.length > 0 ? 
                `Sort order updated! ${messageParts.join(', ')}` : 
                'Sort order updated!';

            this.ui.showToast(message, 'success', 5000);

            // Display detailed summary
            if (validationContainer) {
                validationContainer.innerHTML = `
                    <div class="validation-message success">
                        ✅ Sort order updated successfully!<br>
                        Height Folder Path: <strong>${heightFolderPath}</strong><br>
                        ${addedCount > 0 ? `Added: ${addedCount} new mods<br>` : ''}
                        ${skippedCount > 0 ? `Skipped: ${skippedCount} existing mods<br>` : ''}
                        ${updatedExistingCount > 0 ? `Updated: ${updatedExistingCount} existing paths<br>` : ''}
                        All entries are sorted alphabetically by path.
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error updating sort order:', error);
            this.ui.showToast('Failed to update sort order: ' + error.message, 'error');
            
            const validationContainer = document.getElementById('sort-order-validation-messages');
            if (validationContainer) {
                validationContainer.innerHTML = `
                    <div class="validation-message error">
                        ❌ Failed to update sort order: ${error.message}
                    </div>
                `;
            }
        }
    }

    isHeightMod(modName) {
        return modName.includes('Height') && (modName.includes('MIN') || modName.includes('MAX'));
    }

    sortDataByPath(data) {
        const sortedEntries = Object.entries(data)
            .sort(([, pathA], [, pathB]) => pathA.localeCompare(pathB));
        
        const sortedData = {};
        for (const [key, value] of sortedEntries) {
            sortedData[key] = value;
        }
        
        return sortedData;
    }

    async downloadUpdatedSortOrder(sortOrderData) {
        try {
            const jsonString = JSON.stringify(sortOrderData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Use the original filename
            const filename = this.originalFileName || 'sort_order.json';

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
            throw new Error(`Failed to download sort order: ${error.message}`);
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
    }

    // Reset sort order state
    reset() {
        this.sortOrderData = null;
        this.originalFileName = null;
        
        const sortOrderFileInput = document.getElementById('sort-order-file');
        if (sortOrderFileInput) {
            sortOrderFileInput.value = '';
        }

        const statusElement = document.getElementById('sort-order-status');
        if (statusElement) {
            statusElement.textContent = 'No sort order file loaded';
            statusElement.className = 'file-status';
        }

        this.hideSortOrderInfo();
        this.hideSortOrderConfig();
        this.updateButtons();

        const validationContainer = document.getElementById('sort-order-validation-messages');
        if (validationContainer) {
            validationContainer.innerHTML = '';
        }

        // Reset height folder path to default
        const heightFolderPathInput = document.getElementById('height-folder-path');
        if (heightFolderPathInput) {
            heightFolderPathInput.value = 'NewHeightMods';
            heightFolderPathInput.classList.remove('error', 'valid');
        }

        // Reset toggle
        const updateExistingToggle = document.getElementById('update-existing-heights');
        if (updateExistingToggle) {
            updateExistingToggle.checked = false;
        }
    }

    // Get debug information
    getDebugInfo() {
        return {
            hasSortOrder: !!this.sortOrderData,
            originalFileName: this.originalFileName,
            entryCount: this.sortOrderData ? Object.keys(this.sortOrderData.Data).length : 0,
            heightFolderPath: this.getHeightFolderPath(),
            willUpdateExisting: this.shouldUpdateExistingHeights(),
            isInitialized: this.isInitialized
        };
    }
}