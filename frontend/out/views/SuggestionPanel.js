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
exports.SuggestionPanel = void 0;
const vscode = __importStar(require("vscode"));
class SuggestionPanel {
    constructor(panel, extensionUri) {
        this.disposables = [];
        this.panel = panel;
        this.setupWebview(extensionUri);
    }
    static createOrShow(extensionUri, suggestions) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (SuggestionPanel.currentPanel) {
            SuggestionPanel.currentPanel.panel.reveal(column);
            SuggestionPanel.currentPanel.update(suggestions);
            return;
        }
        const panel = vscode.window.createWebviewPanel('codeImprover', 'Code Suggestions', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        });
        SuggestionPanel.currentPanel = new SuggestionPanel(panel, extensionUri);
        SuggestionPanel.currentPanel.update(suggestions);
    }
    setupWebview(extensionUri) {
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'applySuggestion':
                    await this.applySuggestion(message.suggestion);
                    break;
                case 'navigateToLine':
                    await this.navigateToLine(message.lineNumber);
                    break;
                case 'dismissSuggestion':
                    await this.dismissSuggestion(message.suggestionId);
                    break;
            }
        }, null, this.disposables);
    }
    async update(suggestions) {
        this.panel.webview.html = this.getWebviewContent(suggestions);
    }
    getWebviewContent(suggestions) {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Code Suggestions</title>
          <style>
            body {
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
              color: var(--vscode-foreground);
              background-color: var(--vscode-editor-background);
              padding: 20px;
            }
            .suggestion {
              border: 1px solid var(--vscode-panel-border);
              border-radius: 4px;
              padding: 12px;
              margin-bottom: 12px;
              background: var(--vscode-panel-background);
            }
            .suggestion-header {
              display: flex;
              justify-content: between;
              align-items: center;
              margin-bottom: 8px;
            }
            .severity-high { border-left: 4px solid #f85149; }
            .severity-medium { border-left: 4px solid #d29922; }
            .severity-low { border-left: 4px solid #3fb950; }
            .category {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 0.8em;
              margin-right: 8px;
            }
            .performance { background: #da3633; color: white; }
            .readability { background: #3fb950; color: white; }
            .security { background: #f85149; color: white; }
            .best-practice { background: #1f6feb; color: white; }
            .message {
              margin: 8px 0;
              line-height: 1.4;
            }
            .code-comparison {
              background: var(--vscode-textCodeBlock-background);
              border: 1px solid var(--vscode-panel-border);
              border-radius: 4px;
              margin: 8px 0;
              overflow: hidden;
            }
            .code-block {
              padding: 8px;
              margin: 0;
              font-family: var(--vscode-editor-font-family);
            }
            .before { background: #da363322; }
            .after { background: #3fb95022; }
            .actions {
              display: flex;
              gap: 8px;
              margin-top: 12px;
            }
            button {
              padding: 6px 12px;
              border: 1px solid var(--vscode-button-border);
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border-radius: 2px;
              cursor: pointer;
            }
            button:hover {
              background: var(--vscode-button-hoverBackground);
            }
            .apply-btn {
              background: var(--vscode-button-background);
            }
            .navigate-btn {
              background: transparent;
              border-color: var(--vscode-button-secondaryBackground);
            }
          </style>
      </head>
      <body>
        <h2>Code Suggestions (${suggestions.length})</h2>
        
        ${suggestions.length === 0
            ? '<p>No suggestions found. Your code looks great! 🎉</p>'
            : suggestions.map(suggestion => `
            <div class="suggestion severity-${suggestion.severity}">
              <div class="suggestion-header">
                <span class="category ${suggestion.category}">${suggestion.category}</span>
                <span class="severity">${suggestion.severity.toUpperCase()}</span>
              </div>
              <div class="message">${suggestion.message}</div>
              
              ${suggestion.before && suggestion.after ? `
                <div class="code-comparison">
                  <div class="code-block before">
                    <strong>Before:</strong><br>
                    <code>${suggestion.before}</code>
                  </div>
                  <div class="code-block after">
                    <strong>After:</strong><br>
                    <code>${suggestion.after}</code>
                  </div>
                </div>
              ` : ''}
              
              ${suggestion.suggestedFix ? `
                <div class="suggested-fix">
                  <strong>Suggested fix:</strong> ${suggestion.suggestedFix}
                </div>
              ` : ''}
              
              <div class="actions">
                <button class="navigate-btn" onclick="navigateToLine(${suggestion.lineNumber})">
                  Go to Line ${suggestion.lineNumber}
                </button>
                ${suggestion.after ? `
                  <button class="apply-btn" onclick="applySuggestion('${suggestion.id}')">
                    Apply Fix
                  </button>
                ` : ''}
                <button onclick="dismissSuggestion('${suggestion.id}')">
                  Dismiss
                </button>
              </div>
            </div>
          `).join('')}
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function navigateToLine(lineNumber) {
            vscode.postMessage({
              command: 'navigateToLine',
              lineNumber: lineNumber - 1 // Convert to 0-based
            });
          }
          
          function applySuggestion(suggestionId) {
            vscode.postMessage({
              command: 'applySuggestion',
              suggestionId: suggestionId
            });
          }
          
          function dismissSuggestion(suggestionId) {
            vscode.postMessage({
              command: 'dismissSuggestion',
              suggestionId: suggestionId
            });
          }
        </script>
      </body>
      </html>
    `;
    }
    async applySuggestion(suggestion) {
        // Implementation for applying code fixes
        const editor = vscode.window.activeTextEditor;
        if (editor && suggestion.before && suggestion.after) {
            // Find the text and replace it
            // This is a simplified implementation
            const document = editor.document;
            const line = document.lineAt(suggestion.lineNumber - 1);
            const text = line.text;
            if (text.includes(suggestion.before)) {
                const newText = text.replace(suggestion.before, suggestion.after);
                await editor.edit(editBuilder => {
                    editBuilder.replace(line.range, newText);
                });
            }
        }
    }
    async navigateToLine(lineNumber) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const position = new vscode.Position(lineNumber, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
        }
    }
    async dismissSuggestion(suggestionId) {
        // Implementation for dismissing suggestions
        vscode.window.showInformationMessage(`Suggestion ${suggestionId} dismissed`);
    }
    dispose() {
        SuggestionPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.SuggestionPanel = SuggestionPanel;
//# sourceMappingURL=SuggestionPanel.js.map