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
exports.FileIndexer = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class FileIndexer {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.indexedFiles = new Map();
        this.excludedPatterns = [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/*.min.js',
            '**/*.min.css'
        ];
    }
    async indexWorkspace() {
        try {
            const files = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,cpp,c,cs,php,rb,go,rs,swift,kt}', `{${this.excludedPatterns.join(',')}}`);
            const indexedFiles = [];
            for (const file of files) {
                try {
                    const stats = await fs.promises.stat(file.fsPath);
                    const fileContent = await fs.promises.readFile(file.fsPath, 'utf8');
                    const indexedFile = {
                        filePath: file.fsPath,
                        fileName: path.basename(file.fsPath),
                        language: this.getLanguage(file.fsPath),
                        size: stats.size,
                        lastModified: stats.mtime,
                        linesOfCode: fileContent.split('\n').length
                    };
                    this.indexedFiles.set(file.fsPath, indexedFile);
                    indexedFiles.push(indexedFile);
                }
                catch (error) {
                    console.error(`Error indexing file ${file.fsPath}:`, error);
                }
            }
            return indexedFiles;
        }
        catch (error) {
            console.error('Error indexing workspace:', error);
            return [];
        }
    }
    async searchFiles(query) {
        const results = [];
        const lowercaseQuery = query.toLowerCase();
        for (const file of this.indexedFiles.values()) {
            if (file.fileName.toLowerCase().includes(lowercaseQuery) ||
                file.filePath.toLowerCase().includes(lowercaseQuery)) {
                results.push(file);
            }
        }
        return results.sort((a, b) => a.fileName.localeCompare(b.fileName));
    }
    getFileByPath(filePath) {
        return this.indexedFiles.get(filePath);
    }
    getAllFiles() {
        return Array.from(this.indexedFiles.values());
    }
    getLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.kt': 'kotlin'
        };
        return languageMap[ext] || 'unknown';
    }
    async updateFileIndex(filePath) {
        try {
            const stats = await fs.promises.stat(filePath);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            const indexedFile = {
                filePath,
                fileName: path.basename(filePath),
                language: this.getLanguage(filePath),
                size: stats.size,
                lastModified: stats.mtime,
                linesOfCode: fileContent.split('\n').length
            };
            this.indexedFiles.set(filePath, indexedFile);
        }
        catch (error) {
            console.error(`Error updating file index for ${filePath}:`, error);
        }
    }
    removeFileFromIndex(filePath) {
        this.indexedFiles.delete(filePath);
    }
}
exports.FileIndexer = FileIndexer;
//# sourceMappingURL=FileIndexer.js.map