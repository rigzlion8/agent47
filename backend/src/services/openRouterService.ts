import axios from 'axios';
import { AnalysisRequest, Suggestion } from '../types/shared';

export class OpenRouterService {
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeCode(request: AnalysisRequest): Promise<Suggestion[]> {
    const prompt = this.buildAnalysisPrompt(request);

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'deepseek/deepseek-chat',
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
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return this.parseResponse(response.data, request.code);
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error('Failed to analyze code');
    }
  }

  private buildAnalysisPrompt(request: AnalysisRequest): string {
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

  private parseResponse(response: any, originalCode: string): Suggestion[] {
    try {
      const content = response.choices[0]?.message?.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to parse OpenRouter response:', error);
      return [];
    }
  }
}