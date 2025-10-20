import * as vscode from 'vscode';
import { ExtensionSettings } from '../settingsManager';

export class SettingsWebview {
  private static currentPanel: SettingsWebview | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, settings: ExtensionSettings) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SettingsWebview.currentPanel) {
      SettingsWebview.currentPanel.panel.reveal(column);
      SettingsWebview.currentPanel.update(settings);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeImproverSettings',
      'Code Improver Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    SettingsWebview.currentPanel = new SettingsWebview(panel, extensionUri);
    SettingsWebview.currentPanel.update(settings);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.setupWebview();
  }

  private setupWebview() {
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'updateSettings':
            await vscode.workspace.getConfiguration('codeImprover').update(
              message.key,
              message.value,
              vscode.ConfigurationTarget.Global
            );
            break;
          case 'testConnection':
            await this.testBackendConnection(message.backendUrl);
            break;
          case 'resetSettings':
            await this.resetSettings();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private async update(settings: ExtensionSettings) {
    this.panel.webview.html = this.getWebviewContent(settings);
  }

  private getWebviewContent(settings: ExtensionSettings): string {
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
                  <p class="text-xs text-vscode-descriptionForeground mt-1">
                    For DeepSeek, use your API key from <a href="https://platform.deepseek.com/api_keys" class="text-vscode-textLink-foreground hover:underline" onclick="openDeepSeekDocs()">platform.deepseek.com</a>
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-2">AI Model</label>
                  <select
                    id="model"
                    class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-border rounded focus:outline-none focus:border-vscode-focus-border"
                  >
                    <option value="gpt-3.5-turbo" ${settings.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                    <option value="gpt-4" ${settings.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                    <option value="gpt-4-turbo" ${settings.model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                    <option value="claude-3-opus" ${settings.model === 'claude-3-opus' ? 'selected' : ''}>Claude 3 Opus</option>
                    <option value="claude-3-sonnet" ${settings.model === 'claude-3-sonnet' ? 'selected' : ''}>Claude 3 Sonnet</option>
                    <option value="claude-3-haiku" ${settings.model === 'claude-3-haiku' ? 'selected' : ''}>Claude 3 Haiku</option>
                    <option value="custom" ${!['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'].includes(settings.model) ? 'selected' : ''}>Custom Model</option>
                  </select>
                </div>

                <div id="customModelContainer" style="${!['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'].includes(settings.model) ? '' : 'display: none;'}">
                  <label class="block text-sm font-medium mb-2">Custom Model Name</label>
                  <input
                    type="text"
                    value="${!['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'].includes(settings.model) ? settings.model : ''}"
                    class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-border rounded focus:outline-none focus:border-vscode-focus-border"
                    id="customModel"
                    placeholder="Enter custom model name"
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
            const modelSelect = document.getElementById('model');
            const customModelInput = document.getElementById('customModel');
            let modelValue = modelSelect.value;
            
            if (modelValue === 'custom') {
              modelValue = customModelInput.value.trim();
              if (!modelValue) {
                vscode.postMessage({
                  type: 'showMessage',
                  text: 'Please enter a custom model name'
                });
                return;
              }
            }

            const settings = {
              backendUrl: document.getElementById('backendUrl').value,
              apiKey: document.getElementById('apiKey').value,
              model: modelValue,
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

          function toggleCustomModel() {
            const modelSelect = document.getElementById('model');
            const customModelContainer = document.getElementById('customModelContainer');
            
            if (modelSelect.value === 'custom') {
              customModelContainer.style.display = 'block';
            } else {
              customModelContainer.style.display = 'none';
            }
          }

          // Initialize event listeners
          document.addEventListener('DOMContentLoaded', function() {
            const modelSelect = document.getElementById('model');
            modelSelect.addEventListener('change', toggleCustomModel);
          });

          function testConnection() {
            const backendUrl = document.getElementById('backendUrl').value;
            vscode.postMessage({
              type: 'testConnection',
              backendUrl: backendUrl
            });
          }

          function openDeepSeekDocs() {
            vscode.postMessage({
              type: 'showMessage',
              text: 'Opening DeepSeek API keys page...'
            });
            // Note: In a real implementation, we would open the URL
            // For now, we'll just show a message
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

  private async testBackendConnection(backendUrl: string) {
    try {
      // Test connection logic here
      vscode.window.showInformationMessage(`Testing connection to ${backendUrl}...`);
    } catch (error) {
      vscode.window.showErrorMessage('Connection test failed');
    }
  }

  private async resetSettings() {
    const configuration = vscode.workspace.getConfiguration('codeImprover');
    await configuration.update('backendUrl', 'http://localhost:3000', vscode.ConfigurationTarget.Global);
    await configuration.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
    await configuration.update('autoAnalyze', false, vscode.ConfigurationTarget.Global);
    // ... reset other settings
  }

  private dispose() {
    SettingsWebview.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}