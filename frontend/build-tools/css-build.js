const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class CSSBuilder {
  constructor() {
    this.inputPath = './webview/styles/tailwind.css';
    this.outputPath = './out/webview/styles.css';
  }

  async build() {
    return new Promise((resolve, reject) => {
      // Ensure output directory exists
      const outputDir = path.dirname(this.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      exec(`npx tailwindcss -i ${this.inputPath} -o ${this.outputPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error('CSS build error:', error);
          reject(error);
          return;
        }
        console.log('CSS built successfully:', stdout);
        resolve(stdout);
      });
    });
  }

  async watch() {
    console.log('Watching for CSS changes...');
    exec(`npx tailwindcss -i ${this.inputPath} -o ${this.outputPath} --watch`, (error, stdout, stderr) => {
      if (error) {
        console.error('CSS watch error:', error);
        return;
      }
      console.log('CSS watch:', stdout);
    });
  }
}

module.exports = { CSSBuilder };