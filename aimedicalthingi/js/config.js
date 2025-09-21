// config.js - Configuration management
export class Config {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        // Try to load from various sources
        let envConfig = {};
        
        // 1. Check if ENV is set globally (from setup page)
        if (window.ENV) {
            envConfig = window.ENV;
        }
        // 2. Try localStorage (for development persistence)
        else if (localStorage.getItem('MEDCIPHER_CONFIG')) {
            try {
                envConfig = JSON.parse(localStorage.getItem('MEDCIPHER_CONFIG'));
                window.ENV = envConfig; // Set globally for other modules
            } catch (e) {
                console.warn('Failed to parse stored configuration');
            }
        }
        
        return {
            GEMINI_API_KEY: envConfig.GEMINI_API_KEY,
            MEDICINE_API_URL: envConfig.MEDICINE_API_URL || 'http://127.0.0.1:5000'
        };
    }

    get(key) {
        const value = this.config[key];
        if (!value && key === 'GEMINI_API_KEY') {
            throw new Error(`Missing required configuration: ${key}. Please configure your API key.`);
        }
        return value;
    }

    // Method to set config at runtime (for development)
    setApiKey(apiKey) {
        this.config.GEMINI_API_KEY = apiKey;
        // Update global and localStorage
        window.ENV = window.ENV || {};
        window.ENV.GEMINI_API_KEY = apiKey;
        localStorage.setItem('MEDCIPHER_CONFIG', JSON.stringify(window.ENV));
    }

    // Check if configuration is complete
    isConfigured() {
        return !!(this.config.GEMINI_API_KEY);
    }
}

// Singleton instance
export const config = new Config();
