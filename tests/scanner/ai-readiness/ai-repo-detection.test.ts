/**
 * Tests for AI Repository Detection scanner.
 *
 * Validates detection of AI/ML repositories via imports, model files,
 * model directories, ML config files, and dependency manifests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AIRepoDetectionScanner } from '../../../src/scanner/ai-readiness/ai-repo-detection.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: AIRepoDetectionScanner;

function makeContext(overrides: Partial<ScanContext> = {}): ScanContext {
  const config: ScannerConfig = {
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    format: OutputFormat.JSON,
    output: null,
    threshold: null,
    quiet: false,
    verbose: false,
    scannerTimeout: 30000,
    githubToken: null,
    zerodbApiKey: null,
    zerodbProjectId: null,
    pillars: { disabled: [], weights: {}, disabledScanners: [] },
    bots: { enabled: true, additional: [], exclude: [] },
    inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
  };

  return {
    repoPath: tmpDir,
    repoIdentifier: 'owner/repo',
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: 'abc', branch: 'main', remoteUrl: null },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-repo-detect-test-'));
  scanner = new AIRepoDetectionScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('AIRepoDetectionScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('ai-repo-detection');
      expect(scanner.displayName).toBe('AI Repository Detection');
      expect(scanner.pillar).toBe(Pillar.AI_READINESS);
    });
  });

  describe('non-AI repository', () => {
    it('INFO when no AI signals found', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.js'), 'console.log("hello");');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected !== undefined);
      expect(detection).toBeDefined();
      expect(detection!.severity).toBe(Severity.INFO);
      expect(detection!.metadata?.aiRepoDetected).toBe(false);
    });

    it('empty repo returns INFO with aiRepoDetected false', async () => {
      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected !== undefined);
      expect(detection).toBeDefined();
      expect(detection!.metadata?.aiRepoDetected).toBe(false);
    });
  });

  describe('Python ML imports', () => {
    it('detects torch import', async () => {
      fs.writeFileSync(path.join(tmpDir, 'train.py'), 'import torch\nmodel = torch.nn.Linear(10, 5)');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
      expect(detection!.severity).toBe(Severity.PASS);
      const signals = detection!.metadata?.signals as string[];
      expect(signals.some((s) => s.includes('torch'))).toBe(true);
    });

    it('detects tensorflow import', async () => {
      fs.writeFileSync(path.join(tmpDir, 'model.py'), 'import tensorflow as tf');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects transformers import', async () => {
      fs.writeFileSync(path.join(tmpDir, 'app.py'), 'from transformers import AutoModel');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects keras import', async () => {
      fs.writeFileSync(path.join(tmpDir, 'network.py'), 'from keras.layers import Dense');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects sklearn import', async () => {
      fs.writeFileSync(path.join(tmpDir, 'classify.py'), 'from sklearn.ensemble import RandomForestClassifier');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects jax import', async () => {
      fs.writeFileSync(path.join(tmpDir, 'compute.py'), 'import jax\nimport jax.numpy as jnp');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('does not flag non-ML Python imports', async () => {
      fs.writeFileSync(path.join(tmpDir, 'server.py'), 'import flask\nfrom flask import Flask');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected !== undefined);
      expect(detection!.metadata?.aiRepoDetected).toBe(false);
    });
  });

  describe('model file detection', () => {
    it('detects .onnx files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'model.onnx'), 'binary-content');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
      const signals = detection!.metadata?.signals as string[];
      expect(signals.some((s) => s.includes('.onnx'))).toBe(true);
    });

    it('detects .pt files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'weights.pt'), 'binary-content');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects .h5 files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'model.h5'), 'binary-content');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects .safetensors files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'model.safetensors'), 'binary-content');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects .tflite files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'model.tflite'), 'binary-content');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });
  });

  describe('model directory detection', () => {
    it('detects model/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, 'model'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'model', 'config.json'), '{}');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
      const signals = detection!.metadata?.signals as string[];
      expect(signals.some((s) => s.includes('model/'))).toBe(true);
    });

    it('detects models/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, 'models'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'models', 'README.md'), '# Models');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });
  });

  describe('ML config file detection', () => {
    it('detects tokenizer.json', async () => {
      fs.writeFileSync(path.join(tmpDir, 'tokenizer.json'), '{"type": "BPE"}');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects vocab.txt', async () => {
      fs.writeFileSync(path.join(tmpDir, 'vocab.txt'), '[PAD]\n[UNK]\n[CLS]');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects Modelfile', async () => {
      fs.writeFileSync(path.join(tmpDir, 'Modelfile'), 'FROM llama2\nPARAMETER temperature 0.7');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });
  });

  describe('ML dependency detection', () => {
    it('detects ML packages in requirements.txt', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'requirements.txt'),
        'flask==2.0.0\ntorch==2.1.0\nnumpy==1.24.0',
      );

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('detects ML packages in pyproject.toml', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'pyproject.toml'),
        '[project]\ndependencies = ["transformers>=4.0", "datasets"]',
      );

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('does not flag non-ML requirements.txt', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'requirements.txt'),
        'flask==2.0.0\nrequests==2.28.0\ngunicorn==21.2.0',
      );

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected !== undefined);
      expect(detection!.metadata?.aiRepoDetected).toBe(false);
    });
  });

  describe('Jupyter notebook detection', () => {
    it('detects notebooks with ML imports', async () => {
      const notebook = JSON.stringify({
        cells: [
          {
            cell_type: 'code',
            source: ['import torch\n', 'model = torch.nn.Linear(10, 5)'],
          },
        ],
      });
      fs.writeFileSync(path.join(tmpDir, 'training.ipynb'), notebook);

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
    });

    it('does not flag notebooks without ML imports', async () => {
      const notebook = JSON.stringify({
        cells: [
          {
            cell_type: 'code',
            source: ['import pandas\n', 'df = pandas.read_csv("data.csv")'],
          },
        ],
      });
      fs.writeFileSync(path.join(tmpDir, 'analysis.ipynb'), notebook);

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected !== undefined);
      expect(detection!.metadata?.aiRepoDetected).toBe(false);
    });
  });

  describe('multiple signals', () => {
    it('reports all detected signals', async () => {
      fs.writeFileSync(path.join(tmpDir, 'train.py'), 'import torch');
      fs.writeFileSync(path.join(tmpDir, 'model.onnx'), 'binary');
      fs.mkdirSync(path.join(tmpDir, 'models'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'models', 'v1.pt'), 'binary');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected === true);
      expect(detection).toBeDefined();
      const signals = detection!.metadata?.signals as string[];
      expect(signals.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('handles missing repo path', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
      const detection = findings.find((f) => f.metadata?.aiRepoDetected !== undefined);
      expect(detection!.metadata?.aiRepoDetected).toBe(false);
    });

    it('skips node_modules directory', async () => {
      const nmDir = path.join(tmpDir, 'node_modules', 'some-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'train.py'), 'import torch');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected !== undefined);
      expect(detection!.metadata?.aiRepoDetected).toBe(false);
    });

    it('skips .git directory', async () => {
      const gitDir = path.join(tmpDir, '.git', 'hooks');
      fs.mkdirSync(gitDir, { recursive: true });
      fs.writeFileSync(path.join(gitDir, 'model.py'), 'import tensorflow');

      const findings = await scanner.run(makeContext());
      const detection = findings.find((f) => f.metadata?.aiRepoDetected !== undefined);
      expect(detection!.metadata?.aiRepoDetected).toBe(false);
    });
  });
});
