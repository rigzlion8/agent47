export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: 'free' | 'pro' | 'enterprise';
  apiKey?: string;
  ssoProvider?: 'github' | 'google';
  ssoId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeAnalysis {
  id: string;
  userId: string;
  filePath: string;
  language: string;
  code: string;
  suggestions: Suggestion[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface Suggestion {
  id: string;
  lineNumber: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  category: 'performance' | 'readability' | 'security' | 'best-practice';
  suggestedFix?: string;
  before?: string;
  after?: string;
}

export interface AnalysisRequest {
  code: string;
  language: string;
  filePath: string;
  userId: string;
  context?: {
    framework?: string;
    dependencies?: string[];
  };
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}