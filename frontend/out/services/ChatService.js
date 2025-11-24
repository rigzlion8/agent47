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
const axiosConfig_1 = __importDefault(require("../utils/axiosConfig"));
const authUtils_1 = require("../utils/authUtils");
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
        console.log(`=== CHAT SERVICE REQUEST (Attempt ${attempt}) ===`);
        console.log(`Message length: ${message.length} characters`);
        console.log(`Context:`, context ? {
            filePath: context.filePath,
            language: context.language,
            hasSelectedText: !!context.selectedText,
            hasFullDocument: !!context.fullDocument
        } : 'No context');
        console.log('Backend URL:', backendUrl);
        console.log('API Key present:', !!apiKey);
        if (apiKey) {
            console.log('API Key length:', apiKey.length);
            console.log('API Key starts with:', apiKey.substring(0, 4) + '...');
            console.log('API Key ends with:', '...' + apiKey.substring(apiKey.length - 4));
        }
        else {
            console.log('NO API KEY FOUND!');
            console.log('All settings:', this.settingsManager.getSettings());
        }
        if (!apiKey) {
            console.warn('API key not configured. Some features may not work properly.');
            // For development, allow requests without API key to local backends
            if (!backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
                throw new Error('API key is required for external backend services. Please configure your API key in the extension settings.');
            }
        }
        // Get additional context from active editor if available
        const editorContext = await this.getEditorContext();
        const fullContext = { ...context, ...editorContext };
        const headers = authUtils_1.AuthUtils.getAuthHeaders(backendUrl, apiKey);
        // Use appropriate requestEndpoint based on backend URL
        let requestEndpoint;
        if (backendUrl.includes('generativelanguage.googleapis.com')) {
            requestEndpoint = `${backendUrl}/models/${this.settingsManager.getModel()}:generateContent?key=${apiKey}`;
        }
        else if (backendUrl.includes('deepseek.com')) {
            requestEndpoint = `${backendUrl}/chat/completions`;
        }
        else {
            requestEndpoint = `${backendUrl}/api/code/analyze`;
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
        console.log(`=== MAKING REQUEST TO BACKEND ===`);
        console.log('Endpoint:', requestEndpoint);
        console.log('Headers:', Object.keys(headers));
        console.log('Payload keys:', Object.keys(payload));
        console.log('Model:', this.settingsManager.getModel());
        console.log('Timeout: 30 seconds');
        // Create axios instance with better timeout and cancellation handling
        const source = axiosConfig_1.default.CancelToken.source();
        const timeout = setTimeout(() => {
            source.cancel('Request timeout after 30 seconds');
        }, 30000);
        try {
            const response = await axiosConfig_1.default.post(requestEndpoint, payload, {
                headers,
                cancelToken: source.token,
                timeout: 30000 // 30 second timeout
            });
            clearTimeout(timeout);
            console.log(`=== BACKEND RESPONSE RECEIVED ===`);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            console.log('Response data keys:', Object.keys(response.data));
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
        }
        catch (error) {
            clearTimeout(timeout);
            console.error(`=== BACKEND REQUEST ERROR (Attempt ${attempt}) ===`);
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error response status:', error.response?.status);
            console.error('Error response data:', error.response?.data);
            console.error('Error stack:', error.stack);
            // Handle axios cancellation specifically
            if (axiosConfig_1.default.isCancel(error)) {
                throw new Error('Request was cancelled due to timeout. Please try again.');
            }
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Unable to connect to the analysis service. Please check if the backend server is running.');
            }
            else if (error.response?.status === 401) {
                console.error('Authentication failed: Invalid or expired API token');
                authUtils_1.AuthUtils.showAuthError();
                throw new Error('Authentication failed: Invalid or expired API token');
            }
            else if (error.response?.status === 402) {
                // Payment required - Eden AI account may need credits
                return "Your Eden AI account requires payment or credits to use this service. Please check your account balance at https://app.edenai.run/admin/billing and ensure you have sufficient credits for text generation services.";
            }
            else if (error.response?.status === 404) {
                throw new Error('Analysis requestEndpoint not found. Please check the backend configuration.');
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
            else if (error.message?.includes('fetch failed') || error.code === 'ENOTFOUND') {
                throw new Error(`Cannot connect to the backend server at ${backendUrl}. Please check if the server is running and the URL is correct.`);
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
    async analyzeCode(code, language, context) {
        const prompt = `Please analyze this ${language} code:\n\n${code}\n\nProvide comprehensive analysis including:\n- Code quality assessment\n- Performance considerations\n- Security issues\n- Best practices\n- Potential improvements\n- Code smells and anti-patterns`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code,
            ...context
        });
    }
    async readCode(filePath, context) {
        console.log(`=== READ CODE START: ${filePath} ===`);
        try {
            const fs = require('fs').promises;
            const path = require('path');
            console.log(`Reading file: ${filePath}`);
            // Check if file exists and get stats
            const stats = await fs.stat(filePath);
            const fileSizeInMB = stats.size / (1024 * 1024);
            const fileSizeInKB = stats.size / 1024;
            console.log(`File stats - Size: ${fileSizeInKB.toFixed(2)} KB (${fileSizeInMB.toFixed(2)} MB)`);
            // Warn about large files
            if (fileSizeInMB > 1) {
                console.warn(`Large file detected: ${filePath} (${fileSizeInMB.toFixed(2)} MB)`);
            }
            // Read file asynchronously
            console.log(`Starting file read...`);
            const code = await fs.readFile(filePath, 'utf8');
            console.log(`File read completed. Content length: ${code.length} characters`);
            const language = this.getLanguageFromPath(filePath);
            console.log(`Detected language: ${language}`);
            // For large files, create a more focused prompt
            let prompt;
            if (fileSizeInMB > 0.5) {
                // For larger files, focus on key parts
                const lines = code.split('\n');
                const sampleSize = Math.min(100, Math.floor(lines.length * 0.2)); // 20% or 100 lines max
                const sampleCode = lines.slice(0, sampleSize).join('\n');
                console.log(`Large file detected. Using sample: ${sampleSize} lines out of ${lines.length} total`);
                prompt = `Please analyze this ${language} file (${filePath}). The file is ${fileSizeInMB.toFixed(2)} MB with approximately ${lines.length} lines.\n\nHere's a sample of the code:\n\n${sampleCode}\n\nPlease provide:\n- Overall purpose and architecture\n- Key components and patterns\n- Main functions and their purposes\n- Any notable code quality issues\n- Suggestions for improvement`;
            }
            else {
                // For smaller files, send the complete content
                console.log(`Small file. Sending complete content.`);
                prompt = `Please read and understand this ${language} code from file ${filePath}:\n\n${code}\n\nProvide a comprehensive understanding including:\n- Overall purpose and functionality\n- Key components and their relationships\n- Important functions and methods\n- Data flow and architecture\n- Dependencies and imports\n- Code quality assessment`;
            }
            console.log(`Prompt length: ${prompt.length} characters`);
            console.log(`Calling sendMessage with file context...`);
            const result = await this.sendMessage(prompt, {
                language,
                filePath,
                fullDocument: code,
                ...context
            });
            console.log(`=== READ CODE SUCCESS: ${filePath} ===`);
            return result;
        }
        catch (error) {
            console.error(`=== READ CODE ERROR: ${filePath} ===`);
            console.error(`Error details:`, error);
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            }
            else if (error.code === 'EACCES') {
                throw new Error(`Permission denied: ${filePath}`);
            }
            else {
                throw new Error(`Failed to read file ${filePath}: ${error.message}`);
            }
        }
    }
    async editCode(code, language, editInstructions, context) {
        const prompt = `Please edit this ${language} code based on the following instructions:\n\nInstructions: ${editInstructions}\n\nOriginal code:\n${code}\n\nProvide the complete edited code with explanations of the changes made.`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code,
            ...context
        });
    }
    async createDiff(code, language, improvedCode, context) {
        const prompt = `Please create a diff comparison between the original ${language} code and the improved version:\n\nOriginal code:\n${code}\n\nImproved code:\n${improvedCode}\n\nProvide a detailed diff showing:\n- Lines removed\n- Lines added\n- Lines modified\n- Summary of changes\n- Impact of improvements`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code,
            ...context
        });
    }
    async refactorCode(code, language, refactoringType, context) {
        const prompt = `Please refactor this ${language} code using ${refactoringType}:\n\n${code}\n\nProvide the refactored code with explanations of:\n- What was changed\n- Why it was changed\n- Benefits of the refactoring\n- Any trade-offs or considerations`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code,
            ...context
        });
    }
    async optimizeCode(code, language, optimizationGoal, context) {
        const prompt = `Please optimize this ${language} code for ${optimizationGoal}:\n\n${code}\n\nProvide the optimized code with:\n- Performance improvements\n- Memory usage optimizations\n- Algorithm enhancements\n- Before/after comparisons\n- Benchmarking considerations`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code,
            ...context
        });
    }
    async reviewCode(code, language, context) {
        const prompt = `Please conduct a comprehensive code review for this ${language} code:\n\n${code}\n\nProvide a detailed review covering:\n- Code quality and maintainability\n- Security vulnerabilities\n- Performance issues\n- Best practices compliance\n- Testing considerations\n- Documentation quality\n- Specific recommendations for improvement`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code,
            ...context
        });
    }
    async documentCode(code, language, documentationType, context) {
        const prompt = `Please create ${documentationType} documentation for this ${language} code:\n\n${code}\n\nProvide comprehensive documentation including:\n- Function/method descriptions\n- Parameter explanations\n- Return value documentation\n- Usage examples\n- Edge cases and limitations\n- API documentation if applicable`;
        return this.sendMessage(prompt, {
            language,
            selectedText: code,
            ...context
        });
    }
    getLanguageFromPath(filePath) {
        const ext = require('path').extname(filePath).toLowerCase();
        const languageMap = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.json': 'json',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml'
        };
        return languageMap[ext] || 'unknown';
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
    isRetryableError(error) {
        // Retry on network errors, timeouts, and server errors (5xx)
        if (axiosConfig_1.default.isCancel(error)) {
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