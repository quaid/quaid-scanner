/**
 * AI Repository Detection scanner.
 *
 * Detects AI/ML repositories by analyzing Python imports, model files,
 * model directories, ML config files, dependency manifests, and notebooks.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** ML framework import patterns for Python files. */
const ML_IMPORT_PATTERNS = [
  /^\s*import\s+torch\b/m,
  /^\s*from\s+torch[\s.]/m,
  /^\s*import\s+tensorflow\b/m,
  /^\s*from\s+tensorflow[\s.]/m,
  /^\s*import\s+transformers\b/m,
  /^\s*from\s+transformers[\s.]/m,
  /^\s*import\s+keras\b/m,
  /^\s*from\s+keras[\s.]/m,
  /^\s*import\s+sklearn\b/m,
  /^\s*from\s+sklearn[\s.]/m,
  /^\s*import\s+jax\b/m,
  /^\s*from\s+jax[\s.]/m,
  /^\s*import\s+paddle\b/m,
  /^\s*from\s+paddle[\s.]/m,
];

/** ML model file extensions. */
const MODEL_FILE_EXTENSIONS = new Set([
  '.onnx', '.pt', '.pth', '.h5', '.hdf5',
  '.safetensors', '.pkl', '.joblib',
  '.mlmodel', '.tflite',
]);

/** ML config files that indicate an AI repo. */
const ML_CONFIG_FILES = new Set([
  'tokenizer.json',
  'vocab.txt',
  'Modelfile',
]);

/** ML package names to detect in dependency manifests. */
const ML_PACKAGES = new Set([
  'torch', 'pytorch', 'tensorflow', 'tf', 'transformers',
  'keras', 'sklearn', 'scikit-learn', 'jax', 'paddle',
  'paddlepaddle', 'onnx', 'onnxruntime', 'datasets',
  'huggingface-hub', 'diffusers', 'accelerate', 'safetensors',
  'sentence-transformers', 'langchain', 'llama-index',
  'openai', 'anthropic', 'cohere',
]);

/** Directories to skip during scanning. */
const EXCLUDED_DIRS = ['node_modules', '.git', 'vendor', 'dist', 'build', '__pycache__'];

export class AIRepoDetectionScanner implements Scanner {
  readonly name = 'ai-repo-detection';
  readonly displayName = 'AI Repository Detection';
  readonly pillar = Pillar.AI_READINESS;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const signals: string[] = [];

    try {
      const ignorePatterns = EXCLUDED_DIRS.map((d) => `**/${d}/**`);

      const allFiles = await glob('**/*', {
        cwd: repoPath,
        absolute: true,
        nodir: true,
        dot: true,
        ignore: ignorePatterns,
      });

      for (const absolutePath of allFiles) {
        const relativePath = path.relative(repoPath, absolutePath);
        const basename = path.basename(absolutePath);
        const ext = path.extname(absolutePath).toLowerCase();

        // Check model file extensions
        if (MODEL_FILE_EXTENSIONS.has(ext)) {
          signals.push(`Model file: ${relativePath} (${ext})`);
          continue;
        }

        // Check ML config files
        if (ML_CONFIG_FILES.has(basename)) {
          signals.push(`ML config: ${relativePath}`);
          continue;
        }

        // Check Python files for ML imports
        if (ext === '.py') {
          this.checkPythonImports(absolutePath, relativePath, signals);
          continue;
        }

        // Check Jupyter notebooks for ML imports
        if (ext === '.ipynb') {
          this.checkNotebook(absolutePath, relativePath, signals);
          continue;
        }

        // Check dependency manifests
        if (basename === 'requirements.txt') {
          this.checkRequirementsTxt(absolutePath, signals);
          continue;
        }

        if (basename === 'pyproject.toml') {
          this.checkPyprojectToml(absolutePath, signals);
          continue;
        }
      }

      // Check for model/models directories
      this.checkModelDirectories(repoPath, signals);
    } catch {
      // Handle missing repo path or glob errors
    }

    return [this.makeFinding(signals)];
  }

  private checkPythonImports(filePath: string, relativePath: string, signals: string[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of ML_IMPORT_PATTERNS) {
        const match = pattern.exec(content);
        if (match) {
          const framework = match[0].trim().replace(/^(import|from)\s+/, '').split(/[\s.]/)[0];
          signals.push(`Python ML import: ${framework} in ${relativePath}`);
          return;
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  private checkNotebook(filePath: string, relativePath: string, signals: string[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const notebook = JSON.parse(content);
      if (!Array.isArray(notebook.cells)) return;

      for (const cell of notebook.cells) {
        if (cell.cell_type !== 'code') continue;
        const source = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
        for (const pattern of ML_IMPORT_PATTERNS) {
          const match = pattern.exec(source);
          if (match) {
            const framework = match[0].trim().replace(/^(import|from)\s+/, '').split(/[\s.]/)[0];
            signals.push(`Notebook ML import: ${framework} in ${relativePath}`);
            return;
          }
        }
      }
    } catch {
      // Skip malformed notebooks
    }
  }

  private checkRequirementsTxt(filePath: string, signals: string[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const pkg = line.trim().split(/[=<>!~[\s]/)[0].toLowerCase();
        if (pkg && ML_PACKAGES.has(pkg)) {
          signals.push(`ML dependency in requirements.txt: ${pkg}`);
          return;
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  private checkPyprojectToml(filePath: string, signals: string[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pkg of ML_PACKAGES) {
        if (content.includes(pkg)) {
          signals.push(`ML dependency in pyproject.toml: ${pkg}`);
          return;
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  private checkModelDirectories(repoPath: string, signals: string[]): void {
    try {
      const entries = fs.readdirSync(repoPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && (entry.name === 'model' || entry.name === 'models')) {
          signals.push(`ML directory: ${entry.name}/`);
        }
      }
    } catch {
      // Skip if directory can't be read
    }
  }

  private makeFinding(signals: string[]): Finding {
    const detected = signals.length > 0;

    return {
      id: `${this.name}-1`,
      severity: detected ? Severity.PASS : Severity.INFO,
      pillar: this.pillar,
      category: 'ai-repo-detection',
      message: detected
        ? `AI/ML repository detected (${signals.length} signal${signals.length > 1 ? 's' : ''} found)`
        : 'No AI/ML signals detected — not an AI repository',
      file: null,
      line: null,
      column: null,
      suggestion: detected
        ? 'Ensure model cards, dataset documentation, and agentic rules are in place.'
        : 'No action needed. AI-Readiness checks are informational for non-AI repositories.',
      metadata: {
        aiRepoDetected: detected,
        signals,
        signalCount: signals.length,
      },
    };
  }
}
