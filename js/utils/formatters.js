// String formatting and number processing functions

function formatModName(multiplier, variant = null, prefix = '') {
    // Convert multiplier to string
    let multiplierStr = multiplier.toString();
    
    // If no decimal point, add .0
    if (!multiplierStr.includes('.')) {
        multiplierStr += '.0';
    }
    
    // Remove decimal point and pad to 4 digits with leading zeros
    const paddedNumber = multiplierStr.replace('.', '').padStart(4, '0');
    let variantText = '';
    
    if (variant) {
        variantText = ` ${variant}`;
    } else {
        // Auto-determine variant based on multiplier
        variantText = multiplier < 1.0 ? ' MIN' : ' MAX';
    }
    
    const baseName = `[${paddedNumber}] Height${variantText} - ${formatMultiplier(multiplier)}x`;
    
    return prefix ? `${prefix}${baseName}` : baseName;
}

function formatMultiplier(value, decimals = 3) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        return '0.000';
    }
    
    // Round to specified decimal places and remove trailing zeros
    const formatted = num.toFixed(decimals);
    return formatted.replace(/\.?0+$/, '');
}

function padNumber(number, length = 4) {
    const str = number.toString();
    return str.padStart(length, '0');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(milliseconds) {
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

function generateMultiplierArray(min, max, step) {
    const multipliers = [];
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);
    const stepNum = parseFloat(step);
    
    // Use a small epsilon to handle floating point precision issues
    const epsilon = 1e-10;
    
    for (let current = minNum; current <= maxNum + epsilon; current += stepNum) {
        // Round to avoid floating point precision issues
        const rounded = Math.round(current / stepNum) * stepNum;
        
        // Ensure we don't exceed the maximum
        if (rounded <= maxNum + epsilon) {
            multipliers.push(parseFloat(rounded.toFixed(3)));
        }
    }
    
    return multipliers;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function formatValidationMessage(message, type = 'error') {
    const timestamp = new Date().toLocaleTimeString();
    return `[${timestamp}] ${message}`;
}

function createFolderName(modName) {
    // Remove any characters that aren't safe for folder names
    return modName.replace(/[<>:"/\\|?*]/g, '_');
}

function formatProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    return {
        percentage,
        text: `${current} of ${total}`,
        decimal: current / total
    };
}

function pluralize(count, singular, plural = null) {
    if (count === 1) {
        return `${count} ${singular}`;
    }
    
    const pluralForm = plural || `${singular}s`;
    return `${count} ${pluralForm}`;
}

function escapeJsonString(str) {
    return str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
}

function truncateText(text, maxLength = 50) {
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
}