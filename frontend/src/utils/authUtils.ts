import * as vscode from 'vscode';
import axios from './axiosConfig';

/**
 * Utility functions for authentication and token management
 */
export class AuthUtils {
  
  /**
   * Validates an API token by making a simple test request
   */
  public static async validateApiToken(backendUrl: string, apiKey: string): Promise<boolean> {
    try {
      console.log('Validating API token for:', backendUrl);
      
      // Skip validation for local backends
      if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
        console.log('Skipping validation for local backend');
        return true;
      }

      const headers = this.getAuthHeaders(backendUrl, apiKey);
      
      let testEndpoint;
      let testPayload;
      
      if (backendUrl.includes('deepseek.com')) {
        testEndpoint = `${backendUrl}/chat/completions`;
        testPayload = {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: 'Hello, please respond with "OK"'
            }
          ],
          max_tokens: 10
        };
      } else if (backendUrl.includes('generativelanguage.googleapis.com')) {
        testEndpoint = `${backendUrl}/models/gemini-pro:generateContent?key=${apiKey}`;
        testPayload = {
          contents: [
            {
              parts: [
                {
                  text: 'Hello, please respond with "OK"'
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 10
          }
        };
      } else {
        // For custom backends, assume token is valid if we can connect
        console.log('Skipping validation for custom backend');
        return true;
      }

      const response = await axios.post(testEndpoint, testPayload, {
        headers,
        timeout: 10000
      });

      // If we get a successful response, the token is valid
      return response.status >= 200 && response.status < 300;
      
    } catch (error: any) {
      console.error('Token validation failed:', error.message);
      
      if (error.response?.status === 401) {
        return false; // Invalid token
      }
      
      // For other errors (network issues, etc.), assume token might be valid
      // but show a warning
      console.warn('Token validation inconclusive due to:', error.message);
      return true;
    }
  }

  /**
   * Gets authentication headers for a given backend URL and API key
   */
  public static getAuthHeaders(backendUrl: string, apiKey: string | undefined): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Development mode: Allow requests without API key for local backends
    if (!apiKey && backendUrl.includes('localhost')) {
      console.log('AuthHeaders - Development mode: No API key required for local backend');
      return headers;
    }

    if (!apiKey) {
      console.warn('No API key provided for authentication');
      return headers;
    }

    // Debug logging for authentication
    console.log('AuthHeaders - Backend URL:', backendUrl);
    console.log('AuthHeaders - API Key length:', apiKey.length);

    // Handle different authentication schemes based on backend URL
    if (backendUrl.includes('generativelanguage.googleapis.com')) {
      // Google Gemini uses query parameter for API key, no special headers needed
      console.log('AuthHeaders - Using Google Gemini API key authentication (via query parameter)');
    } else if (backendUrl.includes('deepseek.com')) {
      // DeepSeek uses standard Authorization header with Bearer token
      console.log('AuthHeaders - Using DeepSeek Bearer token authentication');
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (backendUrl.includes('edenai.run') || backendUrl.includes('edenai')) {
      // Eden AI uses lowercase 'authorization' header for JavaScript/Node.js
      console.log('AuthHeaders - Using Eden AI Bearer token authentication (lowercase header)');
      headers['authorization'] = `Bearer ${apiKey}`;
    } else if (backendUrl.includes('openai.com')) {
      // OpenAI uses Bearer tokens
      console.log('AuthHeaders - Using OpenAI Bearer token authentication');
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (backendUrl.includes('anthropic.com')) {
      // Anthropic uses x-api-key header
      console.log('AuthHeaders - Using Anthropic x-api-key authentication');
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      // Default to Bearer token for custom backends
      console.log('AuthHeaders - Using default Bearer token authentication');
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    console.log('AuthHeaders - Final headers:', Object.keys(headers));
    return headers;
  }

  /**
   * Shows a user-friendly authentication error message
   */
  public static showAuthError(message: string = 'Authentication failed: Invalid or expired API token'): void {
    vscode.window.showErrorMessage(message, 'Open Settings').then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('code-improver.openSettings');
      }
    });
  }

  /**
   * Checks if the current settings have a valid API configuration
   */
  public static hasValidApiConfig(backendUrl: string, apiKey: string | undefined): boolean {
    if (!backendUrl || !backendUrl.trim()) {
      return false;
    }

    // For local backends, API key is optional
    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
      return true;
    }

    // For external backends, API key is required
    return !!apiKey && apiKey.trim().length > 0;
  }
}