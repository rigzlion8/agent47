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
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.sendMessageWithRetry(message, context, attempt);
            }
            catch (error) {
                // If it's the last attempt or the error is not retryable, throw the error
                if (attempt === maxRetries || !this.isRetryableError(error)) {
                    throw error;
                }
                console.log(`Retry attempt ${attempt}/${maxRetries} after error:`, error.message);
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
        throw new Error('All retry attempts failed');
    }
    async sendMessageWithRetry(message, context, attempt = 1) {
        const backendUrl = this.settingsManager.getBackendUrl();
        const apiKey = this.settingsManager.getApiKey();
        // Debug logging for API key and backend URL
        console.log(`=== CHAT SERVICE DEBUG (Attempt ${attempt}) ===`);
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
            // Use appropriate endpoint based on backend URL
            let endpoint;
            if (backendUrl.includes('generativelanguage.googleapis.com')) {
                endpoint = `${backendUrl}/models/${this.settingsManager.getModel()}:generateContent?key=${apiKey}`;
            }
            else if (backendUrl.includes('deepseek.com')) {
                endpoint = `${backendUrl}/chat/completions`;
            }
            else {
                endpoint = `${backendUrl}/api/code/analyze`;
            }
            let payload;
            if (backendUrl.includes('generativelanguage.googleapis.com')) {
                payload = {
                    contents: [
                        {
                            parts: [
                                {
                                    text: `You are a helpful AI assistant that provides code analysis, suggestions, and improvements. Focus on performance, readability, and best practices. Please analyze this ${fullContext.language || 'typescript'} code:\n\n${message}\n\nProvide code analysis, suggestions, and improvements.`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 1000
                    }
                };
            }
            else if (backendUrl.includes('deepseek.com')) {
                payload = {
                    model: this.settingsManager.getModel(),
                    messages: [
                        {
                            role: "user",
                            content: `You are a helpful AI assistant that provides code analysis, suggestions, and improvements. Focus on performance, readability, and best practices. Please analyze this ${fullContext.language || 'typescript'} code:\n\n${message}\n\nProvide code analysis, suggestions, and improvements.`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1000
                };
            }
            else {
                payload = {
                    code: message,
                    language: fullContext.language || 'typescript',
                    filePath: fullContext.filePath,
                    context: fullContext
                };
            }
            console.log('ChatService - Making request to:', endpoint);
            console.log('ChatService - Request headers:', headers);
            console.log('ChatService - Request payload:', payload);
            console.log('ChatService - Backend URL:', backendUrl);
            console.log('ChatService - Model:', this.settingsManager.getModel());
            // Create axios instance with better timeout and cancellation handling
            const source = axios_1.default.CancelToken.source();
            const timeout = setTimeout(() => {
                source.cancel('Request timeout after 30 seconds');
            }, 30000);
            try {
                const response = await axios_1.default.post(endpoint, payload, {
                    headers,
                    cancelToken: source.token,
                    timeout: 30000 // 30 second timeout
                });
                clearTimeout(timeout);
                console.log('ChatService - Response status:', response.status);
                console.log('ChatService - Response data:', response.data);
                if (backendUrl.includes('generativelanguage.googleapis.com')) {
                    // Handle Google Gemini response format
                    if (response.data && response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content) {
                        return response.data.candidates[0].content.parts[0].text;
                    }
                    else {
                        throw new Error('Invalid response format from Google Gemini');
                    }
                }
                else if (backendUrl.includes('deepseek.com')) {
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
                return this.handleResponse(response.data, backendUrl);
            }
            catch (error) {
                clearTimeout(timeout);
                throw error;
            }
        }
        catch (error) {
            console.error('Chat service error:', error);
            console.error('Chat service error response:', error.response?.data);
            // Handle axios cancellation specifically
            if (axios_1.default.isCancel(error)) {
                throw new Error('Request was cancelled due to timeout. Please try again.');
            }
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
                // Handle Google Gemini error format
                const errorData = error.response.data.error;
                if (typeof errorData === 'object' && errorData.message) {
                    throw new Error(`Google Gemini API error: ${errorData.message}`);
                }
                else if (typeof errorData === 'string') {
                    throw new Error(`Analysis service error: ${errorData}`);
                }
                else {
                    throw new Error(`Analysis service error: ${JSON.stringify(errorData)}`);
                }
            }
            else if (error.message?.includes('aborted') || error.message?.includes('cancel')) {
                throw new Error('Request was cancelled. This might be due to network issues or timeout. Please try again.');
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
    handleResponse(responseData, backendUrl) {
        if (backendUrl.includes('generativelanguage.googleapis.com')) {
            // Handle Google Gemini response format
            if (responseData && responseData.candidates && responseData.candidates[0] && responseData.candidates[0].content) {
                return responseData.candidates[0].content.parts[0].text;
            }
            else {
                throw new Error('Invalid response format from Google Gemini');
            }
        }
        else if (backendUrl.includes('deepseek.com')) {
            // Handle DeepSeek response format
            if (responseData && responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
                return responseData.choices[0].message.content;
            }
            else {
                throw new Error('Invalid response format from DeepSeek');
            }
        }
        else if (backendUrl.includes('edenai.run')) {
            // Handle Eden AI response format
            if (responseData && responseData.openai && responseData.openai.generated_text) {
                return responseData.openai.generated_text;
            }
            else {
                throw new Error('Invalid response format from Eden AI');
            }
        }
        else {
            if (responseData && responseData.analysisId) {
                // For now, return a placeholder response since we need to handle async analysis
                return "Your code analysis has been queued. The backend will process it and provide suggestions shortly.";
            }
            else {
                throw new Error('Invalid response format from analysis service');
            }
        }
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
        if (backendUrl.includes('generativelanguage.googleapis.com')) {
            // Google Gemini uses query parameter for API key
            console.log('AuthHeaders - Using Google Gemini API key authentication');
            // Note: Google Gemini API key is typically passed as a query parameter, not header
            // We'll handle this in the endpoint URL construction
        }
        else if (backendUrl.includes('deepseek.com')) {
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
    isRetryableError(error) {
        // Retry on network errors, timeouts, and server errors (5xx)
        if (axios_1.default.isCancel(error)) {
            return true; // Timeout or cancellation
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return true; // Network connectivity issues
        }
        if (error.response?.status >= 500) {
            return true; // Server errors
        }
        if (error.message?.includes('aborted') || error.message?.includes('cancel')) {
            return true; // Request aborted
        }
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.response?.status === 429) {
            return true; // Rate limit - wait and retry
        }
        return false;
    }
    dispose() {
        // Clean up any resources if needed
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=ChatService.js.map