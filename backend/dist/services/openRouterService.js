"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterService = void 0;
const axios_1 = __importDefault(require("axios"));
class OpenRouterService {
    constructor(apiKey) {
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.apiKey = apiKey;
    }
    async analyzeCode(request) {
        const prompt = this.buildAnalysisPrompt(request);
        try {
            const response = await axios_1.default.post(`${this.baseURL}/chat/completions`, {
                model: 'anthropic/claude-2',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert code reviewer. Provide specific, actionable suggestions to improve code quality.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return this.parseResponse(response.data, request.code);
        }
        catch (error) {
            console.error('OpenRouter API error:', error);
            throw new Error('Failed to analyze code');
        }
    }
    buildAnalysisPrompt(request) {
        return `
Analyze the following ${request.language} code and provide specific improvement suggestions.

File: ${request.filePath}
Language: ${request.language}
Framework: ${request.context?.framework || 'Not specified'}

Code:
\`\`\`${request.language}
${request.code}
\`\`\`

Please provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "lineNumber": 1,
      "message": "Specific suggestion",
      "severity": "low|medium|high",
      "category": "performance|readability|security|best-practice",
      "suggestedFix": "Optional specific fix",
      "before": "Original code snippet",
      "after": "Improved code snippet"
    }
  ]
}

Focus on:
- Code quality and best practices
- Performance optimizations
- Security vulnerabilities
- Readability and maintainability
- Potential bugs
`;
    }
    parseResponse(response, originalCode) {
        try {
            const content = response.choices[0]?.message?.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.suggestions || [];
            }
            return [];
        }
        catch (error) {
            console.error('Failed to parse OpenRouter response:', error);
            return [];
        }
    }
}
exports.OpenRouterService = OpenRouterService;
