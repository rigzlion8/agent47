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
                placeholder="Ask me anything about your code..." 
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
          
          messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
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