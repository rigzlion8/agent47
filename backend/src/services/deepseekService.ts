import axios from 'axios';
import { AnalysisRequest, Suggestion } from '../types/shared';

export class DeepseekService {
  private apiKey: string;
  private baseURL = 'https://api.deepseek.com/v1';
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  }

  async analyzeCode(request: AnalysisRequest): Promise<Suggestion[]> {
    const prompt = this.buildAnalysisPrompt(request);

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
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
          temperature: 0.2,
          max_tokens: 2000
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
      console.error('DeepSeek API error:', error);
      throw new Error('Failed to analyze code with DeepSeek');
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
      const content = response.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        console.warn('DeepSeek response missing content field');
        return [];
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }

      return [];
    } catch (error) {
      console.error('Failed to parse DeepSeek response:', error);
      return [];
    }
  }
}

