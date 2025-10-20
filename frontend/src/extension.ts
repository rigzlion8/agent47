import * as vscode from 'vscode';
import { CodeImprover } from './codeImprover';
import { SettingsManager } from './settingsManager';

let codeImprover: CodeImprover;

export function activate(context: vscode.ExtensionContext) {
  console.log('Code Improver extension activated');

  const settingsManager = new SettingsManager();
  codeImprover = new CodeImprover(settingsManager);

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

  context.subscriptions.push(
    analyzeFileCommand,
    analyzeProjectCommand,
    openSettingsCommand
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
}