import * as vscode from 'vscode';
import { SettingsManager } from './settingsManager';
import { SuggestionDecorator } from './services/SuggestionDecorator';
import { SuggestionPanel } from './views/SuggestionPanel';
import { FileIndexer } from './services/FileIndexer';
import axios from 'axios';
import { Suggestion } from './types/shared';

export class CodeImprover {
  private settingsManager: SettingsManager;
  private suggestionDecorator: SuggestionDecorator;
  private fileIndexer: FileIndexer;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
    this.suggestionDecorator = new SuggestionDecorator();
    
    // Initialize file indexer with workspace root if available
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.fileIndexer = new FileIndexer(workspaceRoot);
  }

  public async analyzeCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    // Debug: Check current settings
    const apiKey = this.settingsManager.getApiKey();
    console.log('Current API Key from settings:', apiKey ? '***' + apiKey.slice(-4) : 'undefined');
    console.log('All settings:', this.settingsManager.getSettings());

    await this.analyzeDocument(editor.document);
  }

  public async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    try {
      const code = document.getText();
      const language = document.languageId;
      const filePath = document.fileName;

      if (!code.trim()) {
        vscode.window.showWarningMessage('File is empty');
        return;
      }

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing code...',
        cancellable: false
      }, async (progress) => {
        try {
          const backendUrl = this.settingsManager.getBackendUrl();
          const apiKey = this.settingsManager.getApiKey();

          if (!apiKey) {
            vscode.window.showErrorMessage('API key not configured. Please set it in settings.');
            return;
          }

          const headers = this.getAuthHeaders(backendUrl, apiKey);
          
          const response = await axios.post(`${backendUrl}/api/code/analyze`, {
            code,
            language,
            filePath,
            context: {
              framework: this.detectFramework(document)
            }
          }, {
            headers
          });

          const { analysisId, status } = response.data;

          if (status === 'queued') {
            vscode.window.showInformationMessage(`Analysis queued (ID: ${analysisId})`);
            
            // Poll for results
            const suggestions = await this.pollForResults(analysisId, backendUrl, apiKey);
            if (suggestions) {
              this.displaySuggestions(suggestions, vscode.window.activeTextEditor!);
            }
          }

        } catch (error: any) {
          console.error('Analysis error:', error);
          vscode.window.showErrorMessage(`Analysis failed: ${error.response?.data?.error || error.message}`);
        }
      });

    } catch (error: any) {
      vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
  }

  public async analyzeProject(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    vscode.window.showInformationMessage('Project analysis feature coming soon!');
  }

  public async openSettings(): Promise<void> {
    // Open VS Code settings for this extension
    await vscode.commands.executeCommand('workbench.action.openSettings', 'codeImprover');
  }

  private detectFramework(document: vscode.TextDocument): string | undefined {
    const fileName = document.fileName.toLowerCase();
    const content = document.getText();

    if (fileName.endsWith('.vue')) return 'vue';
    if (fileName.endsWith('.svelte')) return 'svelte';
    if (fileName.includes('angular')) return 'angular';
    if (fileName.includes('react') || content.includes('React')) return 'react';
    if (content.includes('@Component') && content.includes('angular')) return 'angular';
    
    return undefined;
  }

  private async pollForResults(analysisId: string, backendUrl: string, apiKey: string): Promise<Suggestion[] | null> {
    const maxAttempts = 30; // 30 seconds max
    const delay = 1000; // 1 second between attempts

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const headers = this.getAuthHeaders(backendUrl, apiKey);
        const response = await axios.get(`${backendUrl}/api/code/analysis/${analysisId}`, {
          headers
        });

        const { status, suggestions } = response.data;

        if (status === 'completed') {
          return suggestions || [];
        } else if (status === 'failed') {
          vscode.window.showErrorMessage('Analysis failed');
          return null;
        }

        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.error('Polling error:', error);
        return null;
      }
    }

    vscode.window.showWarningMessage('Analysis timed out');
    return null;
  }

  private getAuthHeaders(backendUrl: string, apiKey: string | undefined): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (!apiKey) {
      console.warn('No API key provided for authentication');
      return headers;
    }

    // Debug logging for authentication
    console.log('AuthHeaders - Backend URL:', backendUrl);
    console.log('AuthHeaders - API Key length:', apiKey.length);

    // Handle different authentication schemes based on backend URL
    if (backendUrl.includes('edenai.run') || backendUrl.includes('edenai')) {
      // Eden AI uses lowercase 'authorization' header for JavaScript/Node.js
      console.log('AuthHeaders - Using Eden AI Bearer token authentication (lowercase header)');
      headers['authorization'] = `Bearer ${apiKey}`;
    } else if (backendUrl.includes('openai.com')) {
      // OpenAI uses Bearer tokens
      console.log('AuthHeaders - Using OpenAI Bearer token authentication');
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (backendUrl.includes('anthropic.com')) {
      // Anthropic uses x-api-key header
      console.log('AuthHeaders - Using Anthropic x-api-key authentication');
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      // Default to Bearer token for custom backends
      console.log('AuthHeaders - Using default Bearer token authentication');
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    console.log('AuthHeaders - Final headers:', Object.keys(headers));
    return headers;
  }

  private displaySuggestions(suggestions: Suggestion[], editor: vscode.TextEditor): void {
    // Display suggestions in the editor
    this.suggestionDecorator.displaySuggestions(editor, suggestions);
    
    // Show suggestions panel
    SuggestionPanel.createOrShow(vscode.Uri.file(__dirname), suggestions);
    
    vscode.window.showInformationMessage(`Found ${suggestions.length} suggestions`);
  }

  public dispose(): void {
    this.suggestionDecorator.dispose();
  }
}