// Input validation functions

function validateMultiplierRange(min, max, step) {
    const errors = [];
    
    // Convert to numbers if they're strings
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);
    const stepNum = parseFloat(step);
    
    // Check if values are valid numbers
    if (isNaN(minNum) || isNaN(maxNum) || isNaN(stepNum)) {
        errors.push("All multiplier values must be valid numbers");
        return { isValid: false, errors };
    }
    
    // Check minimum bounds
    if (minNum < VALIDATION_RULES.MIN_MULTIPLIER) {
        errors.push(`Minimum multiplier must be at least ${VALIDATION_RULES.MIN_MULTIPLIER}`);
    }
    
    // Check maximum bounds
    if (maxNum > VALIDATION_RULES.MAX_MULTIPLIER) {
        errors.push(`Maximum multiplier must not exceed ${VALIDATION_RULES.MAX_MULTIPLIER}`);
    }
    
    // Check logical range
    if (minNum >= maxNum) {
        errors.push("Minimum multiplier must be less than maximum multiplier");
    }
    
    // Check step size
    if (stepNum < VALIDATION_RULES.MIN_STEP) {
        errors.push(`Step increment must be at least ${VALIDATION_RULES.MIN_STEP}`);
    }
    
    if (stepNum > VALIDATION_RULES.MAX_STEP) {
        errors.push(`Step increment must not exceed ${VALIDATION_RULES.MAX_STEP}`);
    }
    
    // Check if step makes sense for the range
    if (stepNum > (maxNum - minNum)) {
        errors.push("Step increment is larger than the multiplier range");
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function validateJSONStructure(jsonData, requiredFields) {
    const errors = [];
    
    if (!jsonData || typeof jsonData !== 'object') {
        errors.push("Invalid JSON structure");
        return { isValid: false, errors };
    }
    
    // Check for required fields
    for (const field of requiredFields) {
        if (!(field in jsonData)) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function validateFileUpload(file) {
    const errors = [];
    
    if (!file) {
        errors.push("No file selected");
        return { isValid: false, errors };
    }
    
    // Check file type
    if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
        errors.push(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }
    
    // Check file size
    if (file.size > VALIDATION_RULES.MAX_FILE_SIZE) {
        errors.push(ERROR_MESSAGES.FILE_TOO_LARGE);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function validateGenerationOptions(options) {
    const errors = [];
    
    // Check if at least one variant type is selected
    if (!options.generateMin && !options.generateMax) {
        errors.push(ERROR_MESSAGES.NO_VARIANTS_SELECTED);
    }
    
    // Validate multiplier range
    const rangeValidation = validateMultiplierRange(
        options.minMultiplier,
        options.maxMultiplier,
        options.stepIncrement
    );
    
    if (!rangeValidation.isValid) {
        errors.push(...rangeValidation.errors);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function validateModTemplate(modData) {
    const errors = [];
    
    if (!modData.Manipulations || !Array.isArray(modData.Manipulations)) {
        errors.push("Mod template must contain a Manipulations array");
        return { isValid: false, errors };
    }
    
    // Check for valid manipulation structure
    let hasValidManipulations = false;
    
    for (const manipulation of modData.Manipulations) {
        if (manipulation.Type === "Rsp" && 
            manipulation.Manipulation &&
            manipulation.Manipulation.SubRace &&
            (manipulation.Manipulation.Attribute === "FemaleMinSize" || 
             manipulation.Manipulation.Attribute === "FemaleMaxSize")) {
            hasValidManipulations = true;
            break;
        }
    }
    
    if (!hasValidManipulations) {
        errors.push("Mod template must contain valid height manipulations");
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    // Remove potentially dangerous characters
    return input.replace(/[<>\"'&]/g, '');
}

function validatePrefix(prefix) {
    if (!prefix) return { isValid: true, errors: [] };
    
    const errors = [];
    
    // Check for invalid characters in prefix
    if (!/^[a-zA-Z0-9_-]*$/.test(prefix)) {
        errors.push("Prefix can only contain letters, numbers, underscores, and hyphens");
    }
    
    if (prefix.length > 50) {
        errors.push("Prefix must be 50 characters or less");
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}