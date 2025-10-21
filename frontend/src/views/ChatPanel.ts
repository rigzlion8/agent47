import * as vscode from 'vscode';
import { ChatService } from '../services/ChatService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeContext?: {
    filePath?: string;
    language?: string;
    selectedText?: string;
  };
}

export class ChatPanel {
  private static currentPanel: ChatPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private chatService: ChatService;
  private messages: ChatMessage[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, chatService: ChatService) {
    this.panel = panel;
    this.chatService = chatService;
    this.setupWebview(extensionUri);
    this.addWelcomeMessage();
  }

  public static createOrShow(extensionUri: vscode.Uri, chatService: ChatService): ChatPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel.panel.reveal(column);
      return ChatPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeImproverChat',
      'AI Assistant',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, chatService);
    return ChatPanel.currentPanel;
  }

  private setupWebview(extensionUri: vscode.Uri) {
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'sendMessage':
            await this.handleUserMessage(message.content, message.codeContext);
            break;
          case 'clearChat':
            this.clearChat();
            break;
          case 'getCodeContext':
            await this.sendCodeContext();
            break;
          case 'openSettings':
            await vscode.commands.executeCommand('code-improver.openSettings');
            break;
          case 'analyzeCode':
            await this.handleCodeAnalysis(message.code, message.language, message.context);
            break;
          case 'readCode':
            await this.handleCodeReading(message.filePath, message.context);
            break;
          case 'editCode':
            await this.handleCodeEditing(message.code, message.language, message.instructions, message.context);
            break;
          case 'createDiff':
            await this.handleDiffCreation(message.originalCode, message.improvedCode, message.language, message.context);
            break;
          case 'refactorCode':
            await this.handleCodeRefactoring(message.code, message.language, message.refactoringType, message.context);
            break;
          case 'optimizeCode':
            await this.handleCodeOptimization(message.code, message.language, message.optimizationGoal, message.context);
            break;
          case 'reviewCode':
            await this.handleCodeReview(message.code, message.language, message.context);
            break;
          case 'documentCode':
            await this.handleCodeDocumentation(message.code, message.language, message.documentationType, message.context);
            break;
          case 'showContentMenu':
            await this.showContentMenu();
            break;
          case 'showCommandMenu':
            await this.showCommandMenu();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private addWelcomeMessage() {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your AI coding assistant. I can help you with:

• Code explanations and improvements
• Debugging assistance
• Code generation and refactoring
• Best practices and patterns
• Framework-specific guidance

You can also select code in your editor and ask me about it directly!`,
      timestamp: new Date()
    };

    this.messages.push(welcomeMessage);
    this.updateWebview();
  }

  private async handleUserMessage(content: string, codeContext?: any) {
    // Check if the message contains file references and handle them
    const fileAnalysisResult = await this.detectAndHandleFileReferences(content, codeContext);
    
    if (fileAnalysisResult.handled) {
      // File reference was handled, don't proceed with regular message
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      codeContext
    };

    this.messages.push(userMessage);
    this.updateWebview();

    // Show typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Thinking...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.sendMessage(content, codeContext);
      
      // Remove typing indicator
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      // Remove typing indicator
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };

      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private async detectAndHandleFileReferences(content: string, codeContext?: any): Promise<{ handled: boolean }> {
    // Detect file references in the message
    const fileReferences = this.extractFileReferences(content);
    
    if (fileReferences.length === 0) {
      return { handled: false };
    }

    // Handle the first file reference found
    const filePath = await this.resolveFilePath(fileReferences[0]);
    
    if (!filePath) {
      // File not found, show error
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I couldn't find the file "${fileReferences[0]}". Please make sure the file exists in your workspace.`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
      return { handled: true };
    }

    // Determine the operation type based on the message content
    const operationType = this.determineOperationType(content);
    
    switch (operationType) {
      case 'analyze':
        await this.handleCodeReading(filePath, codeContext);
        break;
      case 'read':
        await this.handleCodeReading(filePath, codeContext);
        break;
      case 'review':
        await this.handleCodeReading(filePath, codeContext);
        break;
      default:
        // Default to reading and analyzing
        await this.handleCodeReading(filePath, codeContext);
        break;
    }

    return { handled: true };
  }

  private extractFileReferences(content: string): string[] {
    const filePatterns = [
      // Match file names with extensions
      /\b(\w+\.(ts|js|tsx|jsx|py|java|cpp|c|cs|php|rb|go|rs|swift|kt|html|css|scss|json|xml|yaml|yml))\b/gi,
      // Match file paths with extensions
      /[\w\/\-\.]+\.(ts|js|tsx|jsx|py|java|cpp|c|cs|php|rb|go|rs|swift|kt|html|css|scss|json|xml|yaml|yml)/gi,
      // Match quoted file names
      /["']([^"']+\.[^"']+)["']/gi
    ];

    const references: string[] = [];
    
    for (const pattern of filePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        references.push(...matches);
      }
    }

    return [...new Set(references)]; // Remove duplicates
  }

  private async resolveFilePath(fileReference: string): Promise<string | null> {
    try {
      // Clean the file reference (remove quotes, etc.)
      const cleanReference = fileReference.replace(/["']/g, '');
      
      // Check if it's an absolute path
      if (cleanReference.startsWith('/') || cleanReference.includes(':\\')) {
        return cleanReference;
      }

      // Check if file exists in workspace
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        return null;
      }

      // Search for the file in workspace
      const files = await vscode.workspace.findFiles(`**/${cleanReference}`, null, 1);
      
      if (files.length > 0) {
        return files[0].fsPath;
      }

      // Check if it's the current active file
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const currentFileName = editor.document.fileName.split('/').pop();
        if (currentFileName === cleanReference) {
          return editor.document.fileName;
        }
      }

      return null;
    } catch (error) {
      console.error('Error resolving file path:', error);
      return null;
    }
  }

  private determineOperationType(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('analyze') || lowerContent.includes('analysis')) {
      return 'analyze';
    } else if (lowerContent.includes('read') || lowerContent.includes('understand')) {
      return 'read';
    } else if (lowerContent.includes('review') || lowerContent.includes('code review')) {
      return 'review';
    } else if (lowerContent.includes('edit') || lowerContent.includes('modify')) {
      return 'edit';
    } else if (lowerContent.includes('refactor')) {
      return 'refactor';
    } else if (lowerContent.includes('optimize')) {
      return 'optimize';
    } else if (lowerContent.includes('document')) {
      return 'document';
    }
    
    return 'analyze'; // Default to analyze
  }

  private async sendCodeContext() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const selectedText = document.getText(selection);

    this.panel.webview.postMessage({
      command: 'codeContext',
      context: {
        filePath: document.fileName,
        language: document.languageId,
        selectedText: selectedText || document.getText(),
        hasSelection: !selection.isEmpty
      }
    });
  }

  private clearChat() {
    this.messages = [];
    this.addWelcomeMessage();
  }

  private async handleCodeAnalysis(code: string, language: string, context?: any) {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Analyze this ${language} code:\n\n${code}`,
      timestamp: new Date(),
      codeContext: context
    };

    this.messages.push(userMessage);
    this.updateWebview();

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Analyzing code...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.analyzeCode(code, language, context);
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private async handleCodeReading(filePath: string, context?: any) {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Read and understand code from: ${filePath}`,
      timestamp: new Date(),
      codeContext: context
    };

    this.messages.push(userMessage);
    this.updateWebview();

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Reading code file...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.readCode(filePath, context);
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to read code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private async handleCodeEditing(code: string, language: string, instructions: string, context?: any) {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Edit this ${language} code with instructions: ${instructions}\n\nCode:\n${code}`,
      timestamp: new Date(),
      codeContext: context
    };

    this.messages.push(userMessage);
    this.updateWebview();

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Editing code...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.editCode(code, language, instructions, context);
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to edit code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private async handleDiffCreation(originalCode: string, improvedCode: string, language: string, context?: any) {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Create diff between original and improved ${language} code`,
      timestamp: new Date(),
      codeContext: context
    };

    this.messages.push(userMessage);
    this.updateWebview();

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Creating diff...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.createDiff(originalCode, language, improvedCode, context);
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to create diff: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private async handleCodeRefactoring(code: string, language: string, refactoringType: string, context?: any) {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Refactor this ${language} code using ${refactoringType}:\n\n${code}`,
      timestamp: new Date(),
      codeContext: context
    };

    this.messages.push(userMessage);
    this.updateWebview();

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Refactoring code...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.refactorCode(code, language, refactoringType, context);
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to refactor code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private async handleCodeOptimization(code: string, language: string, optimizationGoal: string, context?: any) {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Optimize this ${language} code for ${optimizationGoal}:\n\n${code}`,
      timestamp: new Date(),
      codeContext: context
    };

    this.messages.push(userMessage);
    this.updateWebview();

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Optimizing code...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.optimizeCode(code, language, optimizationGoal, context);
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to optimize code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private async handleCodeReview(code: string, language: string, context?: any) {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Review this ${language} code:\n\n${code}`,
      timestamp: new Date(),
      codeContext: context
    };

    this.messages.push(userMessage);
    this.updateWebview();

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Reviewing code...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.reviewCode(code, language, context);
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to review code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private async handleCodeDocumentation(code: string, language: string, documentationType: string, context?: any) {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Create ${documentationType} documentation for this ${language} code:\n\n${code}`,
      timestamp: new Date(),
      codeContext: context
    };

    this.messages.push(userMessage);
    this.updateWebview();

    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: 'Creating documentation...',
      timestamp: new Date()
    };
    this.messages.push(typingMessage);
    this.updateWebview();

    try {
      const response = await this.chatService.documentCode(code, language, documentationType, context);
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.messages.push(assistantMessage);
      this.updateWebview();
    } catch (error) {
      this.messages = this.messages.filter(msg => msg.id !== 'typing');
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to create documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.messages.push(errorMessage);
      this.updateWebview();
    }
  }

  private updateWebview() {
    this.panel.webview.html = this.getWebviewContent();
  }

  private getWebviewContent(): string {
    const nonce = getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${this.panel.webview.cspSource}; script-src 'nonce-${nonce}';">
          <title>AI Assistant</title>
          <style>
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 16px;
              border-bottom: 1px solid var(--vscode-panel-border);
              background: var(--vscode-panel-background);
            }
            
            .header-title {
              font-weight: bold;
              font-size: var(--vscode-font-size);
              color: var(--vscode-foreground);
            }
            
            .settings-button {
              background: none;
              border: none;
              cursor: pointer;
              font-size: 16px;
              padding: 4px;
              border-radius: 4px;
            }
            
            .settings-button:hover {
              background: var(--vscode-toolbar-hoverBackground);
            }
            
            body {
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
              color: var(--vscode-foreground);
              background-color: var(--vscode-editor-background);
              margin: 0;
              padding: 0;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            
            .chat-container {
              flex: 1;
              display: flex;
              flex-direction: column;
              height: 100%;
            }
            
            .messages {
              flex: 1;
              overflow-y: auto;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            
            .message {
              max-width: 85%;
              padding: 12px 16px;
              border-radius: 8px;
              line-height: 1.4;
              word-wrap: break-word;
            }
            
            .user-message {
              align-self: flex-end;
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
            }
            
            .assistant-message {
              align-self: flex-start;
              background: var(--vscode-input-background);
              border: 1px solid var(--vscode-input-border);
            }
            
            .typing {
              opacity: 0.7;
              font-style: italic;
            }
            
            .input-area {
              padding: 16px;
              border-top: 1px solid var(--vscode-panel-border);
              background: var(--vscode-panel-background);
            }
            
            .input-container {
              display: flex;
              gap: 8px;
              align-items: flex-end;
            }
            
            textarea {
              flex: 1;
              min-height: 60px;
              max-height: 120px;
              padding: 8px 12px;
              border: 1px solid var(--vscode-input-border);
              background: var(--vscode-input-background);
              color: var(--vscode-input-foreground);
              border-radius: 4px;
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
              resize: vertical;
            }
            
            textarea:focus {
              outline: 1px solid var(--vscode-focusBorder);
            }
            
            .buttons {
              display: flex;
              gap: 8px;
            }
            
            button {
              padding: 8px 12px;
              border: 1px solid var(--vscode-button-border);
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border-radius: 4px;
              cursor: pointer;
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
            }
            
            button:hover {
              background: var(--vscode-button-hoverBackground);
            }
            
            button:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            
            .secondary {
              background: transparent;
              border-color: var(--vscode-button-secondaryBackground);
            }
            
            .code-context {
              font-size: 0.8em;
              color: var(--vscode-descriptionForeground);
              margin-top: 4px;
            }
            
            .timestamp {
              font-size: 0.7em;
              color: var(--vscode-descriptionForeground);
              margin-top: 4px;
              text-align: right;
            }
            
            pre {
              background: var(--vscode-textCodeBlock-background);
              padding: 8px;
              border-radius: 4px;
              overflow-x: auto;
              margin: 8px 0;
            }
            
            code {
              font-family: var(--vscode-editor-font-family);
              font-size: 0.9em;
            }
          </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">CODE IMPROVER: AI ASSISTANT</div>
          <div class="header-actions">
            <button id="settingsButton" class="settings-button" title="Open Settings">
              ⚙️
            </button>
          </div>
        </div>
        <div class="chat-container">
          <div class="messages" id="messages">
            ${this.messages.map(message => `
              <div class="message ${message.role}-message ${message.id === 'typing' ? 'typing' : ''}">
                <div>${this.formatMessageContent(message.content)}</div>
                ${message.codeContext && message.codeContext.selectedText ? `
                  <div class="code-context">
                    📄 Context: ${message.codeContext.filePath ? message.codeContext.filePath.split('/').pop() : 'Current file'}
                  </div>
                ` : ''}
                ${message.id !== 'typing' ? `
                  <div class="timestamp">
                    ${message.timestamp.toLocaleTimeString()}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
          
          <div class="input-area">
            <div class="input-container">
              <textarea
                id="messageInput"
                placeholder="Type a message...&#10;(@ to add content, / for commands, hold shift to drag in files)"
                rows="3"
              ></textarea>
              <div class="buttons">
                <button id="sendButton">Send</button>
                <button id="clearButton" class="secondary">Clear</button>
              </div>
            </div>
          </div>
        </div>
        
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          const messagesContainer = document.getElementById('messages');
          const messageInput = document.getElementById('messageInput');
          const sendButton = document.getElementById('sendButton');
          const clearButton = document.getElementById('clearButton');
          const settingsButton = document.getElementById('settingsButton');
          
          // Auto-scroll to bottom
          function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
          
          // Get code context from active editor
          async function getCodeContext() {
            vscode.postMessage({ command: 'getCodeContext' });
          }
          
          // Send message
          function sendMessage() {
            const content = messageInput.value.trim();
            if (!content) return;
            
            // Get current code context
            const editor = document.querySelector('.active-editor');
            const codeContext = editor ? {
              filePath: editor.dataset.filePath,
              language: editor.dataset.language,
              selectedText: editor.dataset.selectedText
            } : undefined;
            
            vscode.postMessage({
              command: 'sendMessage',
              content: content,
              codeContext: codeContext
            });
            
            messageInput.value = '';
            messageInput.style.height = 'auto';
          }

          // Handle file drag and drop
          function handleFileDrop(event) {
            event.preventDefault();
            messageInput.style.border = '1px solid var(--vscode-input-border)';
            
            const files = event.dataTransfer.files;
            if (files.length > 0) {
              const file = files[0];
              
              // Read the file content
              const reader = new FileReader();
              reader.onload = function(e) {
                const fileContent = e.target.result;
                const fileName = file.name;
                
                // Send file content to extension
                vscode.postMessage({
                  command: 'sendMessage',
                  content: 'I\\'ve uploaded the file "' + fileName + '". Please analyze this code:\\n\\n' + fileContent,
                  codeContext: {
                    filePath: fileName,
                    language: getLanguageFromExtension(fileName),
                    selectedText: fileContent
                  }
                });
              };
              
              reader.readAsText(file);
            }
          }

          // Get language from file extension
          function getLanguageFromExtension(fileName) {
            const ext = fileName.split('.').pop().toLowerCase();
            const languageMap = {
              'js': 'javascript',
              'ts': 'typescript',
              'jsx': 'javascript',
              'tsx': 'typescript',
              'py': 'python',
              'java': 'java',
              'cpp': 'cpp',
              'c': 'c',
              'cs': 'csharp',
              'php': 'php',
              'rb': 'ruby',
              'go': 'go',
              'rs': 'rust',
              'swift': 'swift',
              'kt': 'kotlin',
              'html': 'html',
              'css': 'css',
              'scss': 'scss',
              'json': 'json',
              'xml': 'xml',
              'yaml': 'yaml',
              'yml': 'yaml'
            };
            
            return languageMap[ext] || 'unknown';
          }

          // Handle @ mentions for content
          function handleAtMention() {
            const cursorPos = messageInput.selectionStart;
            const textBeforeCursor = messageInput.value.substring(0, cursorPos);
            
            // Check if user typed @
            if (textBeforeCursor.endsWith('@')) {
              // Show content selection menu
              vscode.postMessage({
                command: 'showContentMenu'
              });
            }
          }

          // Handle / commands
          function handleSlashCommand() {
            const cursorPos = messageInput.selectionStart;
            const textBeforeCursor = messageInput.value.substring(0, cursorPos);
            
            // Check if user typed /
            if (textBeforeCursor.endsWith('/')) {
              // Show command menu
              vscode.postMessage({
                command: 'showCommandMenu'
              });
            }
          }
          
          // Clear chat
          function clearChat() {
            vscode.postMessage({ command: 'clearChat' });
          }
          
          // Open settings
          function openSettings() {
            vscode.postMessage({ command: 'openSettings' });
          }
          
          // Event listeners
          sendButton.addEventListener('click', sendMessage);
          clearButton.addEventListener('click', clearChat);
          if (settingsButton) {
            settingsButton.addEventListener('click', openSettings);
          }
          
          // Add drag and drop event listeners
          messageInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.shiftKey) {
              messageInput.style.border = '2px dashed var(--vscode-focusBorder)';
            }
          });
          
          messageInput.addEventListener('dragleave', (e) => {
            e.preventDefault();
            messageInput.style.border = '1px solid var(--vscode-input-border)';
          });
          
          messageInput.addEventListener('drop', handleFileDrop);
          
          messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            } else if (e.key === '@') {
              handleAtMention();
            } else if (e.key === '/') {
              handleSlashCommand();
            }
          });
          
          messageInput.addEventListener('input', (e) => {
            // Auto-resize textarea
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          });
          
          // Auto-focus input
          messageInput.focus();
          
          // Listen for code context updates
          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.command === 'codeContext') {
              // Store context for next message
              window.currentCodeContext = message.context;
            }
          });
          
          // Get initial code context
          getCodeContext();
          
          // Scroll to bottom on load
          scrollToBottom();
        </script>
      </body>
      </html>
    `;
  }

  private async showContentMenu() {
    // Show quick pick for content types
    const contentTypes = [
      'Current File',
      'Selected Code',
      'Workspace Files',
      'Project Structure',
      'Dependencies',
      'Configuration Files'
    ];
    
    const selected = await vscode.window.showQuickPick(contentTypes, {
      placeHolder: 'Select content to add to context'
    });
    
    if (selected) {
      // Handle the selected content type
      this.addContentToContext(selected);
    }
  }

  private async showCommandMenu() {
    // Show quick pick for commands
    const commands = [
      { label: 'Analyze Code', description: 'Analyze selected code for improvements' },
      { label: 'Explain Code', description: 'Get detailed explanation of code' },
      { label: 'Refactor Code', description: 'Refactor code using best practices' },
      { label: 'Review Code', description: 'Perform code review' },
      { label: 'Optimize Code', description: 'Optimize for performance' },
      { label: 'Document Code', description: 'Generate documentation' },
      { label: 'Debug Code', description: 'Help debug issues' },
      { label: 'Generate Tests', description: 'Create test cases' }
    ];
    
    const selected = await vscode.window.showQuickPick(commands, {
      placeHolder: 'Select a command to execute'
    });
    
    if (selected) {
      // Handle the selected command
      this.executeCommand(selected.label);
    }
  }

  private async addContentToContext(contentType: string) {
    // Implementation for adding content to context
    const editor = vscode.window.activeTextEditor;
    
    switch (contentType) {
      case 'Current File':
        if (editor) {
          const document = editor.document;
          const content = document.getText();
          // Add file content to context
          this.panel.webview.postMessage({
            command: 'addContent',
            content: `Current file content:\n\n${content}`,
            type: 'file'
          });
        }
        break;
      case 'Selected Code':
        if (editor && !editor.selection.isEmpty) {
          const selectedText = editor.document.getText(editor.selection);
          this.panel.webview.postMessage({
            command: 'addContent',
            content: `Selected code:\n\n${selectedText}`,
            type: 'selection'
          });
        }
        break;
      // Add other content types as needed
    }
  }

  private async executeCommand(command: string) {
    // Implementation for executing commands
    const editor = vscode.window.activeTextEditor;
    
    switch (command) {
      case 'Analyze Code':
        if (editor) {
          const document = editor.document;
          const selection = editor.selection;
          const code = selection.isEmpty ? document.getText() : document.getText(selection);
          await this.handleCodeAnalysis(code, document.languageId);
        }
        break;
      case 'Explain Code':
        if (editor) {
          const document = editor.document;
          const selection = editor.selection;
          const code = selection.isEmpty ? document.getText() : document.getText(selection);
          // Send explanation request
          await this.handleUserMessage(`Please explain this ${document.languageId} code:\n\n${code}`);
        }
        break;
      // Add other command implementations as needed
    }
  }

  private formatMessageContent(content: string): string {
    // Simple markdown-like formatting for code blocks
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private dispose() {
    ChatPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}