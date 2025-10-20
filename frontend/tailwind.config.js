const { vscodeColors } = require('./vscode-colors');

module.exports = {
  content: [
    "./webview/**/*.{html,js,ts}",
    "./src/views/**/*.{html,js,ts}",
    "./out/**/*.{html,js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        'vscode': {
          'background': 'var(--vscode-editor-background)',
          'foreground': 'var(--vscode-editor-foreground)',
          'button-background': 'var(--vscode-button-background, #0e639c)',
          'button-foreground': 'var(--vscode-button-foreground, #ffffff)',
          'input-background': 'var(--vscode-input-background, #3c3c3c)',
          'input-foreground': 'var(--vscode-input-foreground, #cccccc)',
          'border': 'var(--vscode-panel-border, #3c3c3c)',
          'focus-border': 'var(--vscode-focus-border, #007acc)'
        }
      },
      fontFamily: {
        'vscode': ['var(--vscode-font-family, "Segoe WPC", "Segoe UI", sans-serif)']
      },
      animation: {
        'pulse-slow': 'pulse 3s linear infinite',
        'bounce-subtle': 'bounce 1s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}