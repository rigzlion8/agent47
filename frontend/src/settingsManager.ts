import * as vscode from 'vscode';

export interface ExtensionSettings {
  backendUrl: string;
  apiKey?: string;
  model: string;
  autoAnalyze: boolean;
  excludedPatterns: string[];
  includedLanguages: string[];
  maxFileSize: number;
  showInlineSuggestions: boolean;
  suggestionSeverity: 'all' | 'medium-high' | 'high';
  theme: 'auto' | 'light' | 'dark';
}

export class SettingsManager {
  private configuration = vscode.workspace.getConfiguration('codeImprover');
  private changeListeners: Array<(settings: ExtensionSettings) => void> = [];

  constructor() {
    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codeImprover')) {
        this.notifyListeners();
      }
    });
  }

  getSettings(): ExtensionSettings {
    return {
      backendUrl: this.configuration.get<string>('backendUrl') || 'http://localhost:3006',
      apiKey: this.configuration.get<string>('apiKey'),
      model: this.configuration.get<string>('model') || 'deepseek-chat',
      autoAnalyze: this.configuration.get<boolean>('autoAnalyze') || false,
      excludedPatterns: this.configuration.get<string[]>('excludedPatterns') || [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**'
      ],
      includedLanguages: this.configuration.get<string[]>('includedLanguages') || [
        'javascript',
        'typescript',
        'python',
        'java',
        'cpp'
      ],
      maxFileSize: this.configuration.get<number>('maxFileSize') || 50000, // 50KB
      showInlineSuggestions: this.configuration.get<boolean>('showInlineSuggestions') || true,
      suggestionSeverity: this.configuration.get<'all' | 'medium-high' | 'high'>('suggestionSeverity') || 'all',
      theme: this.configuration.get<'auto' | 'light' | 'dark'>('theme') || 'auto'
    };
  }

  async updateSettings(newSettings: Partial<ExtensionSettings>): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('codeImprover');
    
    for (const [key, value] of Object.entries(newSettings)) {
      await configuration.update(key, value, vscode.ConfigurationTarget.Global);
    }
    
    this.notifyListeners();
  }

  async openSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:your-username.code-improver');
  }

  async resetSettings(): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('codeImprover');
    const defaultSettings = this.getDefaultSettings();
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      await configuration.update(key, value, vscode.ConfigurationTarget.Global);
    }
    
    this.notifyListeners();
  }

  onSettingsChange(listener: (settings: ExtensionSettings) => void): vscode.Disposable {
    this.changeListeners.push(listener);
    
    return new vscode.Disposable(() => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    });
  }

  private notifyListeners(): void {
    const settings = this.getSettings();
    this.changeListeners.forEach(listener => listener(settings));
  }

  private getDefaultSettings(): ExtensionSettings {
    return {
      backendUrl: 'http://localhost:3006',
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

  getBackendUrl(): string {
    return this.getSettings().backendUrl;
  }

  getApiKey(): string | undefined {
    return this.getSettings().apiKey;
  }

  getAutoAnalyze(): boolean {
    return this.getSettings().autoAnalyze;
  }

  getModel(): string {
    return this.getSettings().model;
  }
}