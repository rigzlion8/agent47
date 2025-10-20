import * as vscode from 'vscode';
import { CodeImprover } from './codeImprover';
import { SettingsManager } from './settingsManager';
import { ChatPanel } from './views/ChatPanel';
import { ChatService } from './services/ChatService';
import { ChatViewProvider } from './views/ChatViewProvider';

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

  context.subscriptions.push(
    analyzeFileCommand,
    analyzeProjectCommand,
    openSettingsCommand,
    openChatCommand,
    explainCodeCommand,
    improveCodeCommand,
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