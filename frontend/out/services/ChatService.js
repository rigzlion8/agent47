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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class ChatService {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
    }
    async sendMessage(message, context) {
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
        }
        else {
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
            // Use DeepSeek's chat completion endpoint
            const endpoint = backendUrl.includes('deepseek.com')
                ? `${backendUrl}/chat/completions`
                : `${backendUrl}/api/code/analyze`;
            const payload = backendUrl.includes('deepseek.com')
                ? {
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful AI assistant that provides code analysis, suggestions, and improvements. Focus on performance, readability, and best practices.'
                        },
                        {
                            role: 'user',
                            content: `Please analyze this ${fullContext.language || 'typescript'} code:\n\n${message}\n\nProvide code analysis, suggestions, and improvements.`
                        }
                    ],
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
            const response = await axios_1.default.post(endpoint, payload, {
                headers,
                timeout: 30000 // 30 second timeout
            });
            console.log('ChatService - Response status:', response.status);
            console.log('ChatService - Response data:', response.data);
            if (backendUrl.includes('deepseek.com')) {
                // Handle DeepSeek response format
                if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
                    return response.data.choices[0].message.content;
                }
                else {
                    throw new Error('Invalid response format from DeepSeek');
                }
            }
            else if (backendUrl.includes('edenai.run')) {
                // Handle Eden AI response format
                if (response.data && response.data.openai && response.data.openai.generated_text) {
                    return response.data.openai.generated_text;
                }
                else {
                    throw new Error('Invalid response format from Eden AI');
                }
            }
            else {
                if (response.data && response.data.analysisId) {
                    // For now, return a placeholder response since we need to handle async analysis
                    return "Your code analysis has been queued. The backend will process it and provide suggestions shortly.";
                }
                else {
                    throw new Error('Invalid response format from analysis service');
                }
            }
        }
        catch (error) {
            console.error('Chat service error:', error);
            console.error('Chat service error response:', error.response?.data);
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Unable to connect to the analysis service. Please check if the backend server is running.');
            }
            else if (error.response?.status === 401) {
                // Authentication error - provide a helpful message with guidance
                return "I can see the backend server is running, but authentication is required. Please configure your API key in the Code Improver settings:\n\n1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)\n2. Search for 'Code Improver: Open Settings'\n3. Enter your API key in the 'API Key' field\n4. Save the settings\n\nFor development, you might need to set up authentication or use a development API key.";
            }
            else if (error.response?.status === 402) {
                // Payment required - Eden AI account may need credits
                return "Your Eden AI account requires payment or credits to use this service. Please check your account balance at https://app.edenai.run/admin/billing and ensure you have sufficient credits for text generation services.";
            }
            else if (error.response?.status === 404) {
                throw new Error('Analysis endpoint not found. Please check the backend configuration.');
            }
            else if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            else if (error.response?.data?.error) {
                throw new Error(`Analysis service error: ${error.response.data.error}`);
            }
            else {
                throw new Error(`Failed to send message: ${error.message}`);
            }
        }
    }
    async getEditorContext() {
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
            fullDocument: selectedText ? undefined : fullDocument,
            workspaceRoot
        };
    }
    async getCodeExplanation(code, language) {
        const prompt = `Please explain the following ${language} code:\n\n${code}\n\nProvide a clear explanation of what this code does, its purpose, and any notable patterns or issues.`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code
        });
    }
    async getCodeImprovement(code, language) {
        const prompt = `Please review and suggest improvements for this ${language} code:\n\n${code}\n\nFocus on performance, readability, and best practices. Provide specific suggestions with examples.`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code
        });
    }
    async debugCode(code, language, error) {
        const prompt = error
            ? `I'm getting this error in my ${language} code:\n\nError: ${error}\n\nCode:\n${code}\n\nPlease help me debug this issue.`
            : `Please help me debug this ${language} code:\n\n${code}\n\nLook for potential issues and suggest fixes.`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code
        });
    }
    async generateCode(description, language, context) {
        const prompt = `Please generate ${language} code for: ${description}\n\nProvide complete, working code with proper formatting and comments.`;
        return this.sendMessage(prompt, {
            language,
            ...context
        });
    }
    getAuthHeaders(backendUrl, apiKey) {
        const headers = {
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
        if (backendUrl.includes('deepseek.com')) {
            // DeepSeek uses standard Authorization header with Bearer token
            console.log('AuthHeaders - Using DeepSeek Bearer token authentication');
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        else if (backendUrl.includes('edenai.run') || backendUrl.includes('edenai')) {
            // Eden AI uses lowercase 'authorization' header for JavaScript/Node.js
            console.log('AuthHeaders - Using Eden AI Bearer token authentication (lowercase header)');
            headers['authorization'] = `Bearer ${apiKey}`;
        }
        else if (backendUrl.includes('openai.com')) {
            // OpenAI uses Bearer tokens
            console.log('AuthHeaders - Using OpenAI Bearer token authentication');
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        else if (backendUrl.includes('anthropic.com')) {
            // Anthropic uses x-api-key header
            console.log('AuthHeaders - Using Anthropic x-api-key authentication');
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        }
        else {
            // Default to Bearer token for custom backends
            console.log('AuthHeaders - Using default Bearer token authentication');
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        console.log('AuthHeaders - Final headers:', Object.keys(headers));
        return headers;
    }
    dispose() {
        // Clean up any resources if needed
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=ChatService.js.map