// ============================================
// Frontend Configuration
// ============================================

/**
 * API Configuration
 * Update these values to match your backend setup
 */
const CONFIG = {
    // Backend API URL
    API_URL: 'http://localhost:5000/api',

    // API Endpoints
    ENDPOINTS: {
        stats: '/stats',
        predictions: '/predictions',
        predict: '/predict',
        pipeline_runs: '/pipeline/runs',
        model_metrics: '/model/metrics',
        features: '/features'
    },

    // App Settings
    APP_NAME: 'GDP Growth ML Predictor',
    VERSION: '1.0.0',
    ENVIRONMENT: 'development', // 'development' or 'production'

    // UI Settings
    UI: {
        theme: 'light', // 'light' or 'dark'
        language: 'th', // 'th' or 'en'
        autoRefresh: true,
        refreshInterval: 30000, // milliseconds
    },

    // Feature toggles
    FEATURES: {
        enablePredictions: true,
        enableDashboard: true,
        enableAnalytics: true,
        enableAPIIntegration: false, // Set to true when backend is ready
    },

    // Prediction Settings
    PREDICTION: {
        defaultConfidenceThreshold: 0.8,
        maxRetries: 3,
        timeoutMs: 30000,
    },

    // Chart Settings
    CHARTS: {
        theme: 'light',
        animationDuration: 750,
        defaultHeight: 300,
    },

    // Logging
    DEBUG: true,
    VERBOSE: false,

    // Storage
    STORAGE: {
        saveLocal: true,
        maxPredictionHistory: 10,
        storageKeyPrefix: 'gdp_predictor_',
    }
};

/**
 * Set API URL based on environment
 */
function setApiUrl(url) {
    CONFIG.API_URL = url;
    logDebug(`API URL updated to: ${url}`);
}

/**
 * Get full API endpoint URL
 */
function getApiEndpoint(key) {
    if (!CONFIG.ENDPOINTS[key]) {
        console.warn(`Endpoint '${key}' not found in configuration`);
        return null;
    }
    return CONFIG.API_URL + CONFIG.ENDPOINTS[key];
}

/**
 * Debug logging
 */
function logDebug(message, data = null) {
    if (CONFIG.DEBUG) {
        console.log(`[${CONFIG.APP_NAME}] ${message}`, data || '');
    }
}

/**
 * Verbose logging
 */
function logVerbose(message, data = null) {
    if (CONFIG.VERBOSE && CONFIG.DEBUG) {
        console.log(`[VERBOSE] ${message}`, data || '');
    }
}

/**
 * Error logging
 */
function logError(message, error = null) {
    console.error(`[ERROR] ${message}`, error || '');
}

/**
 * Warning logging
 */
function logWarn(message, data = null) {
    console.warn(`[WARNING] ${message}`, data || '');
}

/**
 * Initialize configuration
 */
function initConfig() {
    logDebug(`Initializing ${CONFIG.APP_NAME} v${CONFIG.VERSION}`);
    logDebug(`Environment: ${CONFIG.ENVIRONMENT}`);
    logDebug(`API URL: ${CONFIG.API_URL}`);

    // Load overrides from localStorage if available
    const savedConfig = localStorage.getItem(`${CONFIG.STORAGE.storageKeyPrefix}config`);
    if (savedConfig) {
        try {
            const overrides = JSON.parse(savedConfig);
            Object.assign(CONFIG, overrides);
            logDebug('Loaded configuration from localStorage');
        } catch (e) {
            logWarn('Could not load saved configuration');
        }
    }
}

/**
 * Save user preferences to localStorage
 */
function savePreferences() {
    const preferences = {
        theme: CONFIG.UI.theme,
        language: CONFIG.UI.language,
        autoRefresh: CONFIG.UI.autoRefresh,
    };
    localStorage.setItem(
        `${CONFIG.STORAGE.storageKeyPrefix}preferences`,
        JSON.stringify(preferences)
    );
    logDebug('Preferences saved');
}

/**
 * Load user preferences from localStorage
 */
function loadPreferences() {
    const saved = localStorage.getItem(`${CONFIG.STORAGE.storageKeyPrefix}preferences`);
    if (saved) {
        try {
            const prefs = JSON.parse(saved);
            Object.assign(CONFIG.UI, prefs);
            logDebug('Preferences loaded');
        } catch (e) {
            logWarn('Could not load saved preferences');
        }
    }
}

/**
 * Validate configuration
 */
function validateConfig() {
    const errors = [];

    if (!CONFIG.API_URL) {
        errors.push('API_URL is not configured');
    }

    if (CONFIG.PREDICTION.timeoutMs <= 0) {
        errors.push('PREDICTION.timeoutMs must be positive');
    }

    if (CONFIG.STORAGE.maxPredictionHistory <= 0) {
        errors.push('STORAGE.maxPredictionHistory must be positive');
    }

    if (errors.length > 0) {
        logError('Configuration validation failed:', errors);
        return false;
    }

    logDebug('Configuration validation passed');
    return true;
}

/**
 * Get configuration summary
 */
function getConfigSummary() {
    return {
        appName: CONFIG.APP_NAME,
        version: CONFIG.VERSION,
        apiUrl: CONFIG.API_URL,
        environment: CONFIG.ENVIRONMENT,
        features: CONFIG.FEATURES,
    };
}

/**
 * Export config functions globally if needed
 */
window.gdpConfig = {
    CONFIG,
    setApiUrl,
    getApiEndpoint,
    logDebug,
    logVerbose,
    logError,
    logWarn,
    initConfig,
    savePreferences,
    loadPreferences,
    validateConfig,
    getConfigSummary,
};

// Initialize on load
initConfig();
loadPreferences();
validateConfig();

logDebug('Configuration loaded successfully', getConfigSummary());
