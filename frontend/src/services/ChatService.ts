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

    // Debug logging for API key and backend URL
    console.log('=== CHAT SERVICE DEBUG ===');
    console.log('ChatService - Backend URL:', backendUrl);
    console.log('ChatService - API Key present:', !!apiKey);
    if (apiKey) {
      console.log('ChatService - API Key length:', apiKey.length);
      console.log('ChatService - API Key starts with:', apiKey.substring(0, 4) + '...');
      console.log('ChatService - API Key ends with:', '...' + apiKey.substring(apiKey.length - 4));
      console.log('ChatService - API Key value (first 10 chars):', apiKey.substring(0, 10) + '...');
    } else {
      console.log('ChatService - NO API KEY FOUND!');
      console.log('ChatService - All settings:', this.settingsManager.getSettings());
      console.log('ChatService - SettingsManager instance:', this.settingsManager);
    }

    if (!apiKey) {
      // For development, allow requests without API key but show a warning
      console.warn('API key not configured. Some features may not work properly.');
      // Continue without API key for now
    }

    try {
      // Get additional context from active editor if available
      const editorContext = await this.getEditorContext();
      const fullContext = { ...context, ...editorContext };

      const headers = this.getAuthHeaders(backendUrl, apiKey);
      
      // Use Eden AI's text generation endpoint for code analysis
      const endpoint = backendUrl.includes('edenai.run')
        ? `${backendUrl}/text/generation`
        : `${backendUrl}/api/code/analyze`;
      
      const payload = backendUrl.includes('edenai.run')
        ? {
            providers: ['openai'],
            text: `Please analyze this ${fullContext.language || 'typescript'} code:\n\n${message}\n\nProvide code analysis, suggestions, and improvements.`,
            temperature: 0.1,
            max_tokens: 1000
          }
        : {
            code: message,
            language: fullContext.language || 'typescript',
            filePath: fullContext.filePath,
            context: fullContext
          };

      console.log('ChatService - Making request to:', endpoint);
      console.log('ChatService - Request headers:', headers);
      console.log('ChatService - Request payload:', payload);

      const response = await axios.post(endpoint, payload, {
        headers,
        timeout: 30000 // 30 second timeout
      });

      console.log('ChatService - Response status:', response.status);
      console.log('ChatService - Response data:', response.data);

      if (backendUrl.includes('edenai.run')) {
        // Handle Eden AI response format
        if (response.data && response.data.openai && response.data.openai.generated_text) {
          return response.data.openai.generated_text;
        } else {
          throw new Error('Invalid response format from Eden AI');
        }
      } else {
        if (response.data && response.data.analysisId) {
          // For now, return a placeholder response since we need to handle async analysis
          return "Your code analysis has been queued. The backend will process it and provide suggestions shortly.";
        } else {
          throw new Error('Invalid response format from analysis service');
        }
      }
    } catch (error: any) {
      console.error('Chat service error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to the analysis service. Please check if the backend server is running.');
      } else if (error.response?.status === 401) {
        // Authentication error - provide a helpful message with guidance
        return "I can see the backend server is running, but authentication is required. Please configure your API key in the Code Improver settings:\n\n1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)\n2. Search for 'Code Improver: Open Settings'\n3. Enter your API key in the 'API Key' field\n4. Save the settings\n\nFor development, you might need to set up authentication or use a development API key.";
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

  public dispose(): void {
    // Clean up any resources if needed
  }
}