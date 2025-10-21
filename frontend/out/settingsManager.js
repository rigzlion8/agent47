"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsManager = void 0;
const vscode = __importStar(require("vscode"));
class SettingsManager {
    constructor() {
        this.configuration = vscode.workspace.getConfiguration('codeImprover');
        this.changeListeners = [];
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('codeImprover')) {
                this.notifyListeners();
            }
        });
    }
    getSettings() {
        return {
            backendUrl: this.configuration.get('backendUrl') || 'https://api.deepseek.com/v1',
            apiKey: this.configuration.get('apiKey'),
            model: this.configuration.get('model') || 'deepseek-chat',
            autoAnalyze: this.configuration.get('autoAnalyze') || false,
            excludedPatterns: this.configuration.get('excludedPatterns') || [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**'
            ],
            includedLanguages: this.configuration.get('includedLanguages') || [
                'javascript',
                'typescript',
                'python',
                'java',
                'cpp'
            ],
            maxFileSize: this.configuration.get('maxFileSize') || 50000,
            showInlineSuggestions: this.configuration.get('showInlineSuggestions') || true,
            suggestionSeverity: this.configuration.get('suggestionSeverity') || 'all',
            theme: this.configuration.get('theme') || 'auto'
        };
    }
    async updateSettings(newSettings) {
        const configuration = vscode.workspace.getConfiguration('codeImprover');
        for (const [key, value] of Object.entries(newSettings)) {
            await configuration.update(key, value, vscode.ConfigurationTarget.Global);
        }
        this.notifyListeners();
    }
    async openSettings() {
        await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:your-username.code-improver');
    }
    async resetSettings() {
        const configuration = vscode.workspace.getConfiguration('codeImprover');
        const defaultSettings = this.getDefaultSettings();
        for (const [key, value] of Object.entries(defaultSettings)) {
            await configuration.update(key, value, vscode.ConfigurationTarget.Global);
        }
        this.notifyListeners();
    }
    onSettingsChange(listener) {
        this.changeListeners.push(listener);
        return new vscode.Disposable(() => {
            const index = this.changeListeners.indexOf(listener);
            if (index > -1) {
                this.changeListeners.splice(index, 1);
            }
        });
    }
    notifyListeners() {
        const settings = this.getSettings();
        this.changeListeners.forEach(listener => listener(settings));
    }
    getDefaultSettings() {
        return {
            backendUrl: 'https://api.deepseek.com/v1',
            apiKey: undefined,
            model: 'deepseek-chat',
            autoAnalyze: false,
            excludedPatterns: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**'
            ],
            includedLanguages: [
                'javascript',
                'typescript',
                'python',
                'java',
                'cpp'
            ],
            maxFileSize: 50000,
            showInlineSuggestions: true,
            suggestionSeverity: 'all',
            theme: 'auto'
        };
    }
    getBackendUrl() {
        return this.getSettings().backendUrl;
    }
    getApiKey() {
        return this.getSettings().apiKey;
    }
    getAutoAnalyze() {
        return this.getSettings().autoAnalyze;
    }
    getModel() {
        return this.getSettings().model;
    }
}
exports.SettingsManager = SettingsManager;
//# sourceMappingURL=settingsManager.js.map