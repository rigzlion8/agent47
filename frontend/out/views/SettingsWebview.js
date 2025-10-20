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
exports.SettingsWebview = void 0;
const vscode = __importStar(require("vscode"));
class SettingsWebview {
    static createOrShow(extensionUri, settings) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (SettingsWebview.currentPanel) {
            SettingsWebview.currentPanel.panel.reveal(column);
            SettingsWebview.currentPanel.update(settings);
            return;
        }
        const panel = vscode.window.createWebviewPanel('codeImproverSettings', 'Code Improver Settings', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        });
        SettingsWebview.currentPanel = new SettingsWebview(panel, extensionUri);
        SettingsWebview.currentPanel.update(settings);
    }
    constructor(panel, extensionUri) {
        this.disposables = [];
        this.panel = panel;
        this.setupWebview();
    }
    setupWebview() {
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'updateSettings':
                    await vscode.workspace.getConfiguration('codeImprover').update(message.key, message.value, vscode.ConfigurationTarget.Global);
                    break;
                case 'testConnection':
                    await this.testBackendConnection(message.backendUrl);
                    break;
                case 'resetSettings':
                    await this.resetSettings();
                    break;
            }
        }, null, this.disposables);
    }
    async update(settings) {
        this.panel.webview.html = this.getWebviewContent(settings);
    }
    getWebviewContent(settings) {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Code Improver Settings</title>
          <link rel="stylesheet" href="${this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.panel.webview.asWebviewUri(vscode.Uri.file(__dirname)), '../../out/webview/styles.css'))}">
      </head>
      <body class="bg-vscode-background text-vscode-foreground font-vscode p-6">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold mb-6">Code Improver Settings</h1>
          
          <div class="space-y-6">
            <!-- Connection Settings -->
            <div class="suggestion-card border-vscode-border">
              <h2 class="text-xl font-semibold mb-4">Connection</h2>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Backend URL</label>
                  <input 
                    type="text" 
                    value="${settings.backendUrl}"
                    class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-border rounded focus:outline-none focus:border-vscode-focus-border"
                    id="backendUrl"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium mb-2">API Key</label>
                  <input 
                    type="password" 
                    value="${settings.apiKey || ''}"
                    class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-border rounded focus:outline-none focus:border-vscode-focus-border"
                    id="apiKey"
                    placeholder="Enter your API key"
                  />
                </div>
                
                <button 
                  onclick="testConnection()"
                  class="btn-primary"
                >
                  Test Connection
                </button>
              </div>
            </div>

            <!-- Analysis Settings -->
            <div class="suggestion-card border-vscode-border">
              <h2 class="text-xl font-semibold mb-4">Analysis Settings</h2>
              
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium">Auto-analyze on save</label>
                  <input 
                    type="checkbox" 
                    ${settings.autoAnalyze ? 'checked' : ''}
                    id="autoAnalyze"
                    class="w-4 h-4"
                  />
                </div>

                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium">Show inline suggestions</label>
                  <input 
                    type="checkbox" 
                    ${settings.showInlineSuggestions ? 'checked' : ''}
                    id="showInlineSuggestions"
                    class="w-4 h-4"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium mb-2">Suggestion Severity</label>
                  <select 
                    id="suggestionSeverity"
                    class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-border rounded focus:outline-none focus:border-vscode-focus-border"
                  >
                    <option value="all" ${settings.suggestionSeverity === 'all' ? 'selected' : ''}>All Suggestions</option>
                    <option value="medium-high" ${settings.suggestionSeverity === 'medium-high' ? 'selected' : ''}>Medium & High</option>
                    <option value="high" ${settings.suggestionSeverity === 'high' ? 'selected' : ''}>High Only</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-2">Max File Size (bytes)</label>
                  <input 
                    type="number" 
                    value="${settings.maxFileSize}"
                    class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-border rounded focus:outline-none focus:border-vscode-focus-border"
                    id="maxFileSize"
                  />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-4">
              <button onclick="saveSettings()" class="btn-primary">
                Save Settings
              </button>
              <button onclick="resetSettings()" class="btn-secondary">
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function saveSettings() {
            const settings = {
              backendUrl: document.getElementById('backendUrl').value,
              apiKey: document.getElementById('apiKey').value,
              autoAnalyze: document.getElementById('autoAnalyze').checked,
              showInlineSuggestions: document.getElementById('showInlineSuggestions').checked,
              suggestionSeverity: document.getElementById('suggestionSeverity').value,
              maxFileSize: parseInt(document.getElementById('maxFileSize').value)
            };

            Object.entries(settings).forEach(([key, value]) => {
              vscode.postMessage({
                type: 'updateSettings',
                key: key,
                value: value
              });
            });

            vscode.postMessage({
              type: 'showMessage',
              text: 'Settings saved successfully!'
            });
          }

          function testConnection() {
            const backendUrl = document.getElementById('backendUrl').value;
            vscode.postMessage({
              type: 'testConnection',
              backendUrl: backendUrl
            });
          }

          function resetSettings() {
            vscode.postMessage({
              type: 'resetSettings'
            });
          }
        </script>
      </body>
      </html>
    `;
    }
    async testBackendConnection(backendUrl) {
        try {
            // Test connection logic here
            vscode.window.showInformationMessage(`Testing connection to ${backendUrl}...`);
        }
        catch (error) {
            vscode.window.showErrorMessage('Connection test failed');
        }
    }
    async resetSettings() {
        const configuration = vscode.workspace.getConfiguration('codeImprover');
        await configuration.update('backendUrl', 'http://localhost:3000', vscode.ConfigurationTarget.Global);
        await configuration.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
        await configuration.update('autoAnalyze', false, vscode.ConfigurationTarget.Global);
        // ... reset other settings
    }
    dispose() {
        SettingsWebview.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.SettingsWebview = SettingsWebview;
//# sourceMappingURL=SettingsWebview.js.map