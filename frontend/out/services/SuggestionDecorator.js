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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionDecorator = void 0;
const vscode = __importStar(require("vscode"));
class SuggestionDecorator {
    constructor() {
        this.decorationTypes = new Map();
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('code-improver');
        this.createDecorationTypes();
    }
    createDecorationTypes() {
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
    displaySuggestions(editor, suggestions) {
        this.clearDecorations(editor);
        const diagnostics = [];
        const decorationRanges = {
            high: [],
            medium: [],
            low: []
        };
        suggestions.forEach(suggestion => {
            const line = suggestion.lineNumber - 1; // Convert to 0-based
            const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
            // Create diagnostic
            const diagnostic = new vscode.Diagnostic(range, suggestion.message, this.getDiagnosticSeverity(suggestion.severity));
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
    clearDecorations(editor) {
        if (editor) {
            // Clear decorations for specific editor
            this.decorationTypes.forEach(decorationType => {
                editor.setDecorations(decorationType, []);
            });
        }
        else {
            // Clear all decorations
            this.diagnosticCollection.clear();
            this.decorationTypes.forEach(decorationType => {
                decorationType.dispose();
            });
            this.decorationTypes.clear();
            this.createDecorationTypes();
        }
    }
    getDiagnosticSeverity(severity) {
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
    dispose() {
        this.diagnosticCollection.dispose();
        this.decorationTypes.forEach(decorationType => decorationType.dispose());
        this.decorationTypes.clear();
    }
}
exports.SuggestionDecorator = SuggestionDecorator;
//# sourceMappingURL=SuggestionDecorator.js.map