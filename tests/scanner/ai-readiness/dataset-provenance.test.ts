/**
 * Tests for Dataset Provenance scanner.
 *
 * Validates dataset file detection, datasheet documentation checking,
 * section validation, and DVC usage detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DatasetProvenanceScanner } from '../../../src/scanner/ai-readiness/dataset-provenance.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: DatasetProvenanceScanner;

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

function markAsAIRepo(): void {
  fs.writeFileSync(path.join(tmpDir, 'train.py'), 'import torch\nmodel = torch.nn.Linear(10, 5)');
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dataset-prov-test-'));
  scanner = new DatasetProvenanceScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('DatasetProvenanceScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('dataset-provenance');
      expect(scanner.displayName).toBe('Dataset Provenance');
      expect(scanner.pillar).toBe(Pillar.AI_READINESS);
    });
  });

  describe('non-AI repository', () => {
    it('INFO when repository is not an AI repo', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.js'), 'console.log("hello")');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'dataset-provenance');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.INFO);
    });
  });

  describe('no datasets detected', () => {
    it('INFO when AI repo has no dataset files', async () => {
      markAsAIRepo();

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'dataset-detection');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.INFO);
      expect(finding!.metadata?.datasetsDetected).toBe(false);
    });
  });

  describe('dataset file detection', () => {
    it('detects .csv files', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'training_data.csv'), 'col1,col2\n1,2\n3,4');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.metadata?.datasetsDetected === true);
      expect(finding).toBeDefined();
      const signals = finding!.metadata?.datasetSignals as string[];
      expect(signals.some((s) => s.includes('.csv'))).toBe(true);
    });

    it('detects .parquet files', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'data.parquet'), 'binary-content');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.metadata?.datasetsDetected === true);
      expect(finding).toBeDefined();
    });

    it('detects .arrow files', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'dataset.arrow'), 'binary-content');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.metadata?.datasetsDetected === true);
      expect(finding).toBeDefined();
    });

    it('detects .jsonl files', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'train.jsonl'), '{"text": "hello"}\n{"text": "world"}');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.metadata?.datasetsDetected === true);
      expect(finding).toBeDefined();
    });

    it('detects .tsv files', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'labels.tsv'), 'col1\tcol2\n1\t2');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.metadata?.datasetsDetected === true);
      expect(finding).toBeDefined();
    });
  });

  describe('data directory detection', () => {
    it('detects data/ directory', async () => {
      markAsAIRepo();
      fs.mkdirSync(path.join(tmpDir, 'data'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'data', 'train.csv'), 'a,b\n1,2');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.metadata?.datasetsDetected === true);
      expect(finding).toBeDefined();
      const signals = finding!.metadata?.datasetSignals as string[];
      expect(signals.some((s) => s.includes('data/'))).toBe(true);
    });

    it('detects datasets/ directory', async () => {
      markAsAIRepo();
      fs.mkdirSync(path.join(tmpDir, 'datasets'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'datasets', 'info.json'), '{}');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.metadata?.datasetsDetected === true);
      expect(finding).toBeDefined();
    });
  });

  describe('datasheet documentation', () => {
    it('PASS when DATASHEET.md present with sections', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'data.csv'), 'a,b\n1,2');
      fs.writeFileSync(
        path.join(tmpDir, 'DATASHEET.md'),
        `# Datasheet
## Motivation
Why was this dataset created?
## Composition
What is in the dataset?
## Collection Process
How was data collected?
## Preprocessing
How was data cleaned?
## Uses
What is this dataset for?
## Distribution
How is it distributed?
## Maintenance
Who maintains the dataset?
`,
      );

      const findings = await scanner.run(makeContext());
      const docFinding = findings.find((f) => f.category === 'dataset-documentation');
      expect(docFinding).toBeDefined();
      expect(docFinding!.severity).toBe(Severity.PASS);
      const present = docFinding!.metadata?.presentSections as string[];
      expect(present.length).toBe(7);
    });

    it('detects DATA_README.md', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'data.csv'), 'a,b\n1,2');
      fs.writeFileSync(
        path.join(tmpDir, 'DATA_README.md'),
        '## Motivation\nResearch.\n## Composition\nText samples.\n## Uses\nTraining.',
      );

      const findings = await scanner.run(makeContext());
      const docFinding = findings.find((f) => f.category === 'dataset-documentation');
      expect(docFinding).toBeDefined();
      expect(docFinding!.metadata?.source).toBe('DATA_README.md');
    });

    it('detects data/README.md', async () => {
      markAsAIRepo();
      fs.mkdirSync(path.join(tmpDir, 'data'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'data', 'train.csv'), 'a,b\n1,2');
      fs.writeFileSync(
        path.join(tmpDir, 'data', 'README.md'),
        '## Motivation\nResearch.\n## Composition\nSamples.',
      );

      const findings = await scanner.run(makeContext());
      const docFinding = findings.find((f) => f.category === 'dataset-documentation');
      expect(docFinding).toBeDefined();
      expect(docFinding!.metadata?.source).toBe('data/README.md');
    });

    it('WARNING when datasets present but no datasheet', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'training.csv'), 'a,b\n1,2');

      const findings = await scanner.run(makeContext());
      const docFinding = findings.find((f) => f.category === 'dataset-documentation');
      expect(docFinding).toBeDefined();
      expect(docFinding!.severity).toBe(Severity.WARNING);
    });

    it('WARNING when datasheet exists but missing sections', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'data.csv'), 'a,b\n1,2');
      fs.writeFileSync(path.join(tmpDir, 'DATASHEET.md'), '# Datasheet\n\nSome info about data.');

      const findings = await scanner.run(makeContext());
      const docFinding = findings.find((f) => f.category === 'dataset-documentation');
      expect(docFinding).toBeDefined();
      expect(docFinding!.severity).toBe(Severity.WARNING);
      const missing = docFinding!.metadata?.missingSections as string[];
      expect(missing.length).toBeGreaterThan(0);
    });
  });

  describe('DVC detection', () => {
    it('detects .dvc/ directory', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'data.csv'), 'a,b\n1,2');
      fs.mkdirSync(path.join(tmpDir, '.dvc'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.dvc', 'config'), '[core]\nautostage = true');

      const findings = await scanner.run(makeContext());
      const dvcFinding = findings.find((f) => f.category === 'dataset-versioning');
      expect(dvcFinding).toBeDefined();
      expect(dvcFinding!.severity).toBe(Severity.PASS);
      expect(dvcFinding!.metadata?.hasDVC).toBe(true);
    });

    it('detects .dvc files', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'data.csv'), 'a,b\n1,2');
      fs.writeFileSync(path.join(tmpDir, 'data.csv.dvc'), 'md5: abc123\nouts:\n- md5: def456');

      const findings = await scanner.run(makeContext());
      const dvcFinding = findings.find((f) => f.category === 'dataset-versioning');
      expect(dvcFinding).toBeDefined();
      expect(dvcFinding!.severity).toBe(Severity.PASS);
    });

    it('detects .dvcignore', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'data.csv'), 'a,b\n1,2');
      fs.writeFileSync(path.join(tmpDir, '.dvcignore'), '*.tmp\n__pycache__');

      const findings = await scanner.run(makeContext());
      const dvcFinding = findings.find((f) => f.category === 'dataset-versioning');
      expect(dvcFinding).toBeDefined();
      expect(dvcFinding!.metadata?.hasDVC).toBe(true);
    });

    it('no DVC finding when datasets exist without DVC', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'data.csv'), 'a,b\n1,2');

      const findings = await scanner.run(makeContext());
      const dvcFinding = findings.find((f) => f.category === 'dataset-versioning');
      expect(dvcFinding).toBeDefined();
      expect(dvcFinding!.severity).toBe(Severity.INFO);
      expect(dvcFinding!.metadata?.hasDVC).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles missing repo path', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
    });

    it('skips node_modules datasets', async () => {
      markAsAIRepo();
      const nmDir = path.join(tmpDir, 'node_modules', 'some-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'data.csv'), 'a,b\n1,2');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'dataset-detection');
      expect(finding!.metadata?.datasetsDetected).toBe(false);
    });

    it('reports multiple dataset signals', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'train.csv'), 'a,b\n1,2');
      fs.writeFileSync(path.join(tmpDir, 'eval.parquet'), 'binary');
      fs.mkdirSync(path.join(tmpDir, 'data'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'data', 'test.jsonl'), '{"a":1}');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.metadata?.datasetsDetected === true);
      expect(finding).toBeDefined();
      const signals = finding!.metadata?.datasetSignals as string[];
      expect(signals.length).toBeGreaterThanOrEqual(3);
    });
  });
});
