import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface IndexedFile {
  filePath: string;
  fileName: string;
  language: string;
  size: number;
  lastModified: Date;
  linesOfCode: number;
  projectId?: string;
}

export class FileIndexer {
  private indexedFiles: Map<string, IndexedFile> = new Map();
  private excludedPatterns: string[] = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/*.min.js',
    '**/*.min.css'
  ];

  constructor(private workspaceRoot: string) {}

  async indexWorkspace(): Promise<IndexedFile[]> {
    try {
      const files = await vscode.workspace.findFiles(
        '**/*.{js,ts,jsx,tsx,py,java,cpp,c,cs,php,rb,go,rs,swift,kt}',
        `{${this.excludedPatterns.join(',')}}`
      );

      const indexedFiles: IndexedFile[] = [];

      for (const file of files) {
        try {
          const stats = await fs.promises.stat(file.fsPath);
          const fileContent = await fs.promises.readFile(file.fsPath, 'utf8');
          
          const indexedFile: IndexedFile = {
            filePath: file.fsPath,
            fileName: path.basename(file.fsPath),
            language: this.getLanguage(file.fsPath),
            size: stats.size,
            lastModified: stats.mtime,
            linesOfCode: fileContent.split('\n').length
          };

          this.indexedFiles.set(file.fsPath, indexedFile);
          indexedFiles.push(indexedFile);
        } catch (error) {
          console.error(`Error indexing file ${file.fsPath}:`, error);
        }
      }

      return indexedFiles;
    } catch (error) {
      console.error('Error indexing workspace:', error);
      return [];
    }
  }

  async searchFiles(query: string): Promise<IndexedFile[]> {
    const results: IndexedFile[] = [];
    const lowercaseQuery = query.toLowerCase();

    for (const file of this.indexedFiles.values()) {
      if (
        file.fileName.toLowerCase().includes(lowercaseQuery) ||
        file.filePath.toLowerCase().includes(lowercaseQuery)
      ) {
        results.push(file);
      }
    }

    return results.sort((a, b) => a.fileName.localeCompare(b.fileName));
  }

  getFileByPath(filePath: string): IndexedFile | undefined {
    return this.indexedFiles.get(filePath);
  }

  getAllFiles(): IndexedFile[] {
    return Array.from(this.indexedFiles.values());
  }

  private getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: { [key: string]: string } = {
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

  async updateFileIndex(filePath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(filePath);
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      
      const indexedFile: IndexedFile = {
        filePath,
        fileName: path.basename(filePath),
        language: this.getLanguage(filePath),
        size: stats.size,
        lastModified: stats.mtime,
        linesOfCode: fileContent.split('\n').length
      };

      this.indexedFiles.set(filePath, indexedFile);
    } catch (error) {
      console.error(`Error updating file index for ${filePath}:`, error);
    }
  }

  removeFileFromIndex(filePath: string): void {
    this.indexedFiles.delete(filePath);
  }
}