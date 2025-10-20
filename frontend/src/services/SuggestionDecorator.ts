import * as vscode from 'vscode';
import { Suggestion } from '../../../shared/types';

export class SuggestionDecorator {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('code-improver');
    this.createDecorationTypes();
  }

  private createDecorationTypes() {
    // Create different decoration types for different severity levels
    const severityStyles = {
      high: {
        backgroundColor: 'rgba(248, 81, 73, 0.1)',
        border: '1px solid #f85149',
        overviewRulerColor: '#f85149'
      },
      medium: {
        backgroundColor: 'rgba(210, 153, 34, 0.1)',
        border: '1px solid #d29922',
        overviewRulerColor: '#d29922'
      },
      low: {
        backgroundColor: 'rgba(63, 185, 80, 0.1)',
        border: '1px solid #3fb950',
        overviewRulerColor: '#3fb950'
      }
    };

    Object.entries(severityStyles).forEach(([severity, style]) => {
      const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: style.backgroundColor,
        border: style.border,
        overviewRulerColor: style.overviewRulerColor,
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
          border: style.border
        },
        dark: {
          border: style.border
        }
      });
      this.decorationTypes.set(severity, decorationType);
    });
  }

  public displaySuggestions(editor: vscode.TextEditor, suggestions: Suggestion[]) {
    this.clearDecorations(editor);

    const diagnostics: vscode.Diagnostic[] = [];
    const decorationRanges: { [key: string]: vscode.Range[] } = {
      high: [],
      medium: [],
      low: []
    };

    suggestions.forEach(suggestion => {
      const line = suggestion.lineNumber - 1; // Convert to 0-based
      const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
      
      // Create diagnostic
      const diagnostic = new vscode.Diagnostic(
        range,
        suggestion.message,
        this.getDiagnosticSeverity(suggestion.severity)
      );
      diagnostic.source = 'Code Improver';
      diagnostic.code = suggestion.category;
      diagnostics.push(diagnostic);

      // Add to decoration ranges
      if (decorationRanges[suggestion.severity]) {
        decorationRanges[suggestion.severity].push(range);
      }
    });

    // Set diagnostics
    this.diagnosticCollection.set(editor.document.uri, diagnostics);

    // Apply decorations
    Object.entries(decorationRanges).forEach(([severity, ranges]) => {
      const decorationType = this.decorationTypes.get(severity);
      if (decorationType && ranges.length > 0) {
        editor.setDecorations(decorationType, ranges);
      }
    });
  }

  public clearDecorations(editor?: vscode.TextEditor) {
    if (editor) {
      // Clear decorations for specific editor
      this.decorationTypes.forEach(decorationType => {
        editor.setDecorations(decorationType, []);
      });
    } else {
      // Clear all decorations
      this.diagnosticCollection.clear();
      this.decorationTypes.forEach(decorationType => {
        decorationType.dispose();
      });
      this.decorationTypes.clear();
      this.createDecorationTypes();
    }
  }

  private getDiagnosticSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'high':
        return vscode.DiagnosticSeverity.Error;
      case 'medium':
        return vscode.DiagnosticSeverity.Warning;
      case 'low':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  public dispose() {
    this.diagnosticCollection.dispose();
    this.decorationTypes.forEach(decorationType => decorationType.dispose());
    this.decorationTypes.clear();
  }
}