// Application constants and base values

const BASE_VALUES = {
    "Midlander": 1.04,
    "Highlander": 1.144,
    "KeeperOfTheMoon": 1.04,
    "SeekerOfTheSun": 1.04,
    "Seawolf": 1.16,
    "Hellsguard": 1.16,
    "Raen": 1.01,
    "Xaela": 1.01,
    "Rava": 1.189,
    "Veena": 1.189
};

const VALIDATION_RULES = {
    MIN_MULTIPLIER: 0.001, // Very low but not zero to avoid division issues
    MAX_MULTIPLIER: 1000.0, // High limit, actual cap is based on entry values
    MIN_STEP: 0.01,
    MAX_STEP: 1000.0, // Uncapped step increment
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    REQUIRED_META_FIELDS: ['Name', 'Author', 'Version'],
    REQUIRED_MOD_FIELDS: ['FileSwaps', 'Manipulations'],
    MAX_ENTRY_VALUE: 512 // Maximum value for any entry
};

const RACE_MAPPING = {
    "FemaleMaxSize": "MAX",
    "FemaleMinSize": "MIN"
};

const DEFAULT_TEMPLATES = {
    META: {
        "Name": "[PLACEHOLDER] Height Mod",
        "Author": "Height Mod Generator",
        "Version": "1.0.0",
        "ModTags": ["Character", "Body"],
        "Description": "Generated height modification for FFXIV characters",
        "ModVersion": "1.0",
        "GameVersion": "6.0+",
        "Website": "",
        "BinVersion": 4,
        "TargetApplicationName": "FFXIV_DX11",
        "IsUiMod": false,
        "IsMetaMod": false
    },
    MOD: {
        "FileSwaps": {},
        "Manipulations": []
    }
};

const ERROR_MESSAGES = {
    INVALID_FILE_TYPE: "Please select a valid JSON file",
    FILE_TOO_LARGE: "File size exceeds maximum limit",
    INVALID_JSON: "Invalid JSON format",
    MISSING_REQUIRED_FIELDS: "Missing required fields",
    INVALID_MULTIPLIER_RANGE: "Invalid multiplier range",
    INVALID_STEP_SIZE: "Invalid step size",
    NO_VARIANTS_SELECTED: "Please select at least one variant type (MIN or MAX)",
    GENERATION_FAILED: "Generation failed. Please try again."
};

const SUCCESS_MESSAGES = {
    FILE_LOADED: "File loaded successfully",
    VALIDATION_PASSED: "All settings are valid",
    GENERATION_COMPLETE: "Height mods generated successfully"
};

const ATTRIBUTE_TYPES = {
    MIN: "FemaleMinSize",
    MAX: "FemaleMaxSize"
};