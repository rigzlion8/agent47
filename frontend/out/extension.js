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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const codeImprover_1 = require("./codeImprover");
const settingsManager_1 = require("./settingsManager");
const ChatPanel_1 = require("./views/ChatPanel");
const ChatService_1 = require("./services/ChatService");
const ChatViewProvider_1 = require("./views/ChatViewProvider");
let codeImprover;
let chatService;
function activate(context) {
    console.log('Code Improver extension activated');
    const settingsManager = new settingsManager_1.SettingsManager();
    codeImprover = new codeImprover_1.CodeImprover(settingsManager);
    chatService = new ChatService_1.ChatService(settingsManager);
    // Register view provider for the AI Assistant sidebar
    const chatViewProvider = new ChatViewProvider_1.ChatViewProvider(context.extensionUri, chatService);
    const chatViewDisposable = vscode.window.registerWebviewViewProvider('code-improver-chat', chatViewProvider);
    // Register commands
    const analyzeFileCommand = vscode.commands.registerCommand('code-improver.analyzeFile', () => codeImprover.analyzeCurrentFile());
    const analyzeProjectCommand = vscode.commands.registerCommand('code-improver.analyzeProject', () => codeImprover.analyzeProject());
    const openSettingsCommand = vscode.commands.registerCommand('code-improver.openSettings', () => codeImprover.openSettings());
    // Chat commands
    const openChatCommand = vscode.commands.registerCommand('code-improver.openChat', () => ChatPanel_1.ChatPanel.createOrShow(context.extensionUri, chatService));
    const explainCodeCommand = vscode.commands.registerCommand('code-improver.explainCode', async () => {
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
        const chatPanel = ChatPanel_1.ChatPanel.createOrShow(context.extensionUri, chatService);
        // Auto-send explanation request
        setTimeout(async () => {
            try {
                const explanation = await chatService.getCodeExplanation(selectedText, document.languageId);
                // This will be handled by the chat panel's message handling
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to get code explanation: ${error}`);
            }
        }, 100);
    });
    const improveCodeCommand = vscode.commands.registerCommand('code-improver.improveCode', async () => {
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
        const chatPanel = ChatPanel_1.ChatPanel.createOrShow(context.extensionUri, chatService);
        // Auto-send improvement request
        setTimeout(async () => {
            try {
                const improvements = await chatService.getCodeImprovement(selectedText, document.languageId);
                // This will be handled by the chat panel's message handling
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to get code improvements: ${error}`);
            }
        }, 100);
    });
    context.subscriptions.push(analyzeFileCommand, analyzeProjectCommand, openSettingsCommand, openChatCommand, explainCodeCommand, improveCodeCommand, chatViewDisposable);
    // Auto-analyze on save if enabled
    if (settingsManager.getAutoAnalyze()) {
        const saveDisposable = vscode.workspace.onDidSaveTextDocument((document) => {
            if (document.languageId !== 'plaintext') {
                codeImprover.analyzeDocument(document);
            }
        });
        context.subscriptions.push(saveDisposable);
    }
}
exports.activate = activate;
function deactivate() {
    codeImprover?.dispose();
    chatService?.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map