import * as vscode from 'vscode';
import { CodeImprover } from './codeImprover';
import { SettingsManager } from './settingsManager';
import { ChatPanel } from './views/ChatPanel';
import { ChatService } from './services/ChatService';
import { ChatViewProvider } from './views/ChatViewProvider';
import { AuthUtils } from './utils/authUtils';

let codeImprover: CodeImprover;
let chatService: ChatService;

export function activate(context: vscode.ExtensionContext) {
  console.log('Code Improver extension activated');

  const settingsManager = new SettingsManager();
  codeImprover = new CodeImprover(settingsManager);
  chatService = new ChatService(settingsManager);

  // Register view provider for the AI Assistant sidebar
  const chatViewProvider = new ChatViewProvider(context.extensionUri, chatService);
  const chatViewDisposable = vscode.window.registerWebviewViewProvider(
    'code-improver-chat',
    chatViewProvider
  );

  // Register commands
  const analyzeFileCommand = vscode.commands.registerCommand(
    'code-improver.analyzeFile',
    () => codeImprover.analyzeCurrentFile()
  );

  const analyzeProjectCommand = vscode.commands.registerCommand(
    'code-improver.analyzeProject',
    () => codeImprover.analyzeProject()
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    'code-improver.openSettings',
    () => codeImprover.openSettings()
  );

  // Chat commands
  const openChatCommand = vscode.commands.registerCommand(
    'code-improver.openChat',
    () => ChatPanel.createOrShow(context.extensionUri, chatService)
  );

  const explainCodeCommand = vscode.commands.registerCommand(
    'code-improver.explainCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      const document = editor.document;
      const selectedText = selection.isEmpty ? document.getText() : document.getText(selection);

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      const chatPanel = ChatPanel.createOrShow(context.extensionUri, chatService);
      
      // Auto-send explanation request
      setTimeout(async () => {
        try {
          const explanation = await chatService.getCodeExplanation(
            selectedText,
            document.languageId
          );
          
          // This will be handled by the chat panel's message handling
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to get code explanation: ${error}`);
        }
      }, 100);
    }
  );

  const improveCodeCommand = vscode.commands.registerCommand(
    'code-improver.improveCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      const document = editor.document;
      const selectedText = selection.isEmpty ? document.getText() : document.getText(selection);

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      const chatPanel = ChatPanel.createOrShow(context.extensionUri, chatService);
      
      // Auto-send improvement request
      setTimeout(async () => {
        try {
          const improvements = await chatService.getCodeImprovement(
            selectedText,
            document.languageId
          );
          
          // This will be handled by the chat panel's message handling
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to get code improvements: ${error}`);
        }
      }, 100);
    }
  );

  // New code operation commands
  const analyzeCodeCommand = vscode.commands.registerCommand(
    'code-improver.analyzeCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      const document = editor.document;
      const selectedText = selection.isEmpty ? document.getText() : document.getText(selection);

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      const chatPanel = ChatPanel.createOrShow(context.extensionUri, chatService);
      
      // Auto-send analysis request
      setTimeout(async () => {
        try {
          const analysis = await chatService.analyzeCode(
            selectedText,
            document.languageId,
            {
              filePath: document.fileName,
              language: document.languageId,
              selectedText: selectedText
            }
          );
          
          // This will be handled by the chat panel's message handling
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to analyze code: ${error}`);
        }
      }, 100);
    }
  );

  const readCodeCommand = vscode.commands.registerCommand(
    'code-improver.readCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;
      const chatPanel = ChatPanel.createOrShow(context.extensionUri, chatService);
      
      // Auto-send read request
      setTimeout(async () => {
        try {
          const analysis = await chatService.readCode(
            document.fileName,
            {
              filePath: document.fileName,
              language: document.languageId,
              fullDocument: document.getText()
            }
          );
          
          // This will be handled by the chat panel's message handling
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to read code: ${error}`);
        }
      }, 100);
    }
  );

  const editCodeCommand = vscode.commands.registerCommand(
    'code-improver.editCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      const document = editor.document;
      const selectedText = selection.isEmpty ? document.getText() : document.getText(selection);

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      // Ask user for edit instructions
      const instructions = await vscode.window.showInputBox({
        prompt: 'Enter edit instructions',
        placeHolder: 'e.g., Add error handling, optimize performance, etc.'
      });

      if (!instructions) {
        return;
      }

      const chatPanel = ChatPanel.createOrShow(context.extensionUri, chatService);
      
      // Auto-send edit request
      setTimeout(async () => {
        try {
          const editedCode = await chatService.editCode(
            selectedText,
            document.languageId,
            instructions,
            {
              filePath: document.fileName,
              language: document.languageId,
              selectedText: selectedText
            }
          );
          
          // This will be handled by the chat panel's message handling
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to edit code: ${error}`);
        }
      }, 100);
    }
  );

  const reviewCodeCommand = vscode.commands.registerCommand(
    'code-improver.reviewCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      const document = editor.document;
      const selectedText = selection.isEmpty ? document.getText() : document.getText(selection);

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      const chatPanel = ChatPanel.createOrShow(context.extensionUri, chatService);
      
      // Auto-send review request
      setTimeout(async () => {
        try {
          const review = await chatService.reviewCode(
            selectedText,
            document.languageId,
            {
              filePath: document.fileName,
              language: document.languageId,
              selectedText: selectedText
            }
          );
          
          // This will be handled by the chat panel's message handling
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to review code: ${error}`);
        }
      }, 100);
    }
  );

  const validateApiTokenCommand = vscode.commands.registerCommand(
    'code-improver.validateApiToken',
    async () => {
      const settingsManager = new SettingsManager();
      const backendUrl = settingsManager.getBackendUrl();
      const apiKey = settingsManager.getApiKey();

      if (!apiKey) {
        vscode.window.showErrorMessage('No API key configured. Please set your API key in the extension settings.', 'Open Settings').then(selection => {
          if (selection === 'Open Settings') {
            vscode.commands.executeCommand('code-improver.openSettings');
          }
        });
        return;
      }

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Validating API token...',
        cancellable: false
      }, async (progress) => {
        try {
          const isValid = await AuthUtils.validateApiToken(backendUrl, apiKey);
          
          if (isValid) {
            vscode.window.showInformationMessage('✅ API token is valid! Your authentication is working correctly.');
          } else {
            vscode.window.showErrorMessage('❌ API token is invalid or expired. Please check your API key in the extension settings.', 'Open Settings').then(selection => {
              if (selection === 'Open Settings') {
                vscode.commands.executeCommand('code-improver.openSettings');
              }
            });
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(`Token validation failed: ${error.message}`);
        }
      });
    }
  );

  context.subscriptions.push(
    analyzeFileCommand,
    analyzeProjectCommand,
    openSettingsCommand,
    openChatCommand,
    explainCodeCommand,
    improveCodeCommand,
    analyzeCodeCommand,
    readCodeCommand,
    editCodeCommand,
    reviewCodeCommand,
    validateApiTokenCommand,
    chatViewDisposable
  );

  // Auto-analyze on save if enabled
  if (settingsManager.getAutoAnalyze()) {
    const saveDisposable = vscode.workspace.onDidSaveTextDocument(
      (document) => {
        if (document.languageId !== 'plaintext') {
          codeImprover.analyzeDocument(document);
        }
      }
    );
    context.subscriptions.push(saveDisposable);
  }
}

export function deactivate() {
  codeImprover?.dispose();
  chatService?.dispose();
}