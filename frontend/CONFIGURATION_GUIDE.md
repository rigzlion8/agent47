# Code Improver Extension Configuration Guide

## Current Issues Identified

### 1. Kilo Code Extension Errors
The errors you're seeing in the console are from the Kilo Code extension, not your custom "Code Improver" extension. These include:
- Navigator migration warnings
- Authentication errors (401)
- Webview resource loading issues

**Solution**: These are known issues with Kilo Code and don't affect your extension's functionality.

### 2. Backend Configuration
Your extension is configured to use:
- Default backend: `http://localhost:3006` (requires authentication)
- DeepSeek API: `https://api.deepseek.com/v1` (requires API key)

## Configuration Options

### Option 1: Use Local Backend (Recommended for Development)
1. Set up your local backend server
2. Run it with `npm run dev` (no auth setup needed; the backend now auto-creates a shared dev user)
3. Update settings in VS Code:
   - Backend URL: `http://localhost:3006`
   - API Key: *(leave blank)*

### Option 2: Use DeepSeek API (backend-managed)
1. Get an API key from [DeepSeek](https://platform.deepseek.com/).
2. Add the key to `backend/.env`:
   ```
   DEEPSEEK_API_KEY=sk-...
   # Optional: override model
   # DEEPSEEK_MODEL=deepseek-chat
   ```
3. Restart the backend (`npm run dev` or `npm run start`). The queue will prefer DeepSeek directly and fall back to OpenRouter (`OPENROUTER_API_KEY`) if DeepSeek isn’t configured.

### Option 3: Use Other AI Services
The extension supports:
- Google Gemini
- OpenAI
- Anthropic
- Eden AI

## Quick Setup

### For Local Development:
```bash
# Set environment variable for testing
export DEEPSEEK_API_KEY=your_actual_api_key

# Or set in VS Code settings:
# 1. Open Command Palette (Ctrl+Shift+P)
# 2. Search for "Preferences: Open Settings (JSON)"
# 3. Add:
#    "codeImprover.backendUrl": "https://api.deepseek.com/v1",
#    "codeImprover.apiKey": "your_api_key_here"
```

### VS Code Settings Configuration:
Open VS Code settings (Ctrl+,) and search for "Code Improver" or add to settings.json:

```json
{
  "codeImprover.backendUrl": "https://api.deepseek.com/v1",
  "codeImprover.apiKey": "your_api_key_here",
  "codeImprover.model": "deepseek-chat",
  "codeImprover.autoAnalyze": false
}
```

## Testing Your Setup

1. **Test Backend Connection**:
   ```bash
   node test-connection.js
   ```

2. **Test Local Backend**:
   ```bash
   node test-backend-connection.js
   ```

3. **Test Extension**:
   - Open Command Palette (Ctrl+Shift+P)
   - Search for "Code Improver: Open AI Assistant"
   - Try sending a message

## Troubleshooting

### Common Issues:

1. **401 Authentication Errors**:
   - Check if API key is set
   - Verify backend URL is correct
   - Ensure backend server is running (for local backend)

2. **Connection Timeouts**:
   - Check network connectivity
   - Verify backend URL accessibility
   - Check firewall settings

3. **Rate Limiting**:
   - Wait and retry
   - Check API usage limits

### Extension Commands Available:
- `Code Improver: Analyze Current File`
- `Code Improver: Analyze Project`
- `Code Improver: Open AI Assistant`
- `Code Improver: Explain Selected Code`
- `Code Improver: Improve Selected Code`
- `Code Improver: Open Settings`

## Development Notes

- The extension automatically handles different backend formats (DeepSeek, Google Gemini, OpenAI, etc.)
- Authentication headers are automatically configured based on backend URL
- Retry logic is built-in for network issues
- File size limits are enforced to prevent timeouts