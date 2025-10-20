import * as vscode from 'vscode';
import axios from 'axios';
import { SettingsManager } from '../settingsManager';

export interface ChatContext {
  filePath?: string;
  language?: string;
  selectedText?: string;
  fullDocument?: string;
  workspaceRoot?: string;
}

export class ChatService {
  private settingsManager: SettingsManager;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
  }

  public async sendMessage(message: string, context?: ChatContext): Promise<string> {
    const backendUrl = this.settingsManager.getBackendUrl();
    const apiKey = this.settingsManager.getApiKey();

    if (!apiKey) {
      // For development, allow requests without API key but show a warning
      console.warn('API key not configured. Some features may not work properly.');
      // Continue without API key for now
    }

    try {
      // Get additional context from active editor if available
      const editorContext = await this.getEditorContext();
      const fullContext = { ...context, ...editorContext };

      const response = await axios.post(`${backendUrl}/api/code/analyze`, {
        code: message,
        language: fullContext.language || 'typescript',
        filePath: fullContext.filePath,
        context: fullContext
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data && response.data.analysisId) {
        // For now, return a placeholder response since we need to handle async analysis
        return "Your code analysis has been queued. The backend will process it and provide suggestions shortly.";
      } else {
        throw new Error('Invalid response format from analysis service');
      }
    } catch (error: any) {
      console.error('Chat service error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to the analysis service. Please check if the backend server is running.');
      } else if (error.response?.status === 401) {
        // Authentication error - provide a helpful message
        return "I can see the backend server is running, but authentication is required. For development, you might need to set up authentication or use a development API key.";
      } else if (error.response?.status === 404) {
        throw new Error('Analysis endpoint not found. Please check the backend configuration.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.data?.error) {
        throw new Error(`Analysis service error: ${error.response.data.error}`);
      } else {
        throw new Error(`Failed to send message: ${error.message}`);
      }
    }
  }

  private async getEditorContext(): Promise<ChatContext> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return {};
    }

    const document = editor.document;
    const selection = editor.selection;
    const selectedText = document.getText(selection);
    const fullDocument = document.getText();

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    return {
      filePath: document.fileName,
      language: document.languageId,
      selectedText: selectedText || undefined,
      fullDocument: selectedText ? undefined : fullDocument, // Only send full document if no selection
      workspaceRoot
    };
  }

  public async getCodeExplanation(code: string, language: string): Promise<string> {
    const prompt = `Please explain the following ${language} code:\n\n${code}\n\nProvide a clear explanation of what this code does, its purpose, and any notable patterns or issues.`;

    return this.sendMessage(prompt, {
      language,
      selectedText: code
    });
  }

  public async getCodeImprovement(code: string, language: string): Promise<string> {
    const prompt = `Please review and suggest improvements for this ${language} code:\n\n${code}\n\nFocus on performance, readability, and best practices. Provide specific suggestions with examples.`;

    return this.sendMessage(prompt, {
      language,
      selectedText: code
    });
  }

  public async debugCode(code: string, language: string, error?: string): Promise<string> {
    const prompt = error 
      ? `I'm getting this error in my ${language} code:\n\nError: ${error}\n\nCode:\n${code}\n\nPlease help me debug this issue.`
      : `Please help me debug this ${language} code:\n\n${code}\n\nLook for potential issues and suggest fixes.`;

    return this.sendMessage(prompt, {
      language,
      selectedText: code
    });
  }

  public async generateCode(description: string, language: string, context?: ChatContext): Promise<string> {
    const prompt = `Please generate ${language} code for: ${description}\n\nProvide complete, working code with proper formatting and comments.`;

    return this.sendMessage(prompt, {
      language,
      ...context
    });
  }

  public dispose(): void {
    // Clean up any resources if needed
  }
}