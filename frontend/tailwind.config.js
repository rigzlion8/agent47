module.exports = {
  content: [
    "./webview/**/*.{html,js,ts}",
    "./src/views/**/*.{html,js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        'vscode': {
          'background': 'var(--vscode-editor-background)',
          'foreground': 'var(--vscode-editor-foreground)',
          'border': 'var(--vscode-panel-border)'
        }
      },
      fontFamily: {
        'vscode': ['var(--vscode-font-family)', 'monospace']
      }
    },
  },
  plugins: [],
}