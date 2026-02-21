/**
 * Tests for Model Card Section Detection scanner.
 *
 * Validates detection of required and recommended Model Card sections
 * in README.md and standalone MODEL_CARD.md files.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ModelCardDetectionScanner } from '../../../src/scanner/ai-readiness/model-card-detection.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: ModelCardDetectionScanner;

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

/** Helper to mark repo as AI-detected by creating a .py with ML import. */
function markAsAIRepo(): void {
  fs.writeFileSync(path.join(tmpDir, 'train.py'), 'import torch\nmodel = torch.nn.Linear(10, 5)');
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-card-test-'));
  scanner = new ModelCardDetectionScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ModelCardDetectionScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('model-card-detection');
      expect(scanner.displayName).toBe('Model Card Section Detection');
      expect(scanner.pillar).toBe(Pillar.AI_READINESS);
    });
  });

  describe('non-AI repository', () => {
    it('INFO when repository is not an AI repo', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.js'), 'console.log("hello")');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-detection');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.INFO);
      expect(finding!.message).toMatch(/not.*AI/i);
    });
  });

  describe('required sections in README', () => {
    it('PASS when all required sections present', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# My Model

## Model Description
This is a text classification model.

## Intended Use
For classifying support tickets.

## Limitations
Does not work well on languages other than English.
`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.PASS);
      const present = finding!.metadata?.presentRequired as string[];
      expect(present).toContain('Model Description');
      expect(present).toContain('Intended Use');
      expect(present).toContain('Limitations');
    });

    it('WARNING when some required sections missing', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# My Model

## Model Description
This is a text classification model.
`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.WARNING);
      const missing = finding!.metadata?.missingRequired as string[];
      expect(missing).toContain('Intended Use');
      expect(missing).toContain('Limitations');
    });

    it('WARNING when no README exists in AI repo', async () => {
      markAsAIRepo();

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('recommended sections', () => {
    it('reports recommended sections when present', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# My Model

## Model Description
A classification model.

## Intended Use
Support ticket classification.

## Limitations
English only.

## Training Data
Trained on the XYZ dataset.

## Evaluation
Evaluated on the test split.

## Bias
No significant bias detected.

## Ethical Considerations
Should not be used for automated decisions.
`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.PASS);
      const presentRecommended = finding!.metadata?.presentRecommended as string[];
      expect(presentRecommended).toContain('Training Data');
      expect(presentRecommended).toContain('Evaluation');
      expect(presentRecommended).toContain('Bias');
      expect(presentRecommended).toContain('Ethical Considerations');
    });

    it('reports missing recommended sections', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# My Model

## Model Description
A model.

## Intended Use
Classification.

## Limitations
English only.
`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      const missingRecommended = finding!.metadata?.missingRecommended as string[];
      expect(missingRecommended).toContain('Training Data');
      expect(missingRecommended).toContain('Evaluation');
    });
  });

  describe('standalone MODEL_CARD.md', () => {
    it('detects MODEL_CARD.md at root', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'MODEL_CARD.md'),
        `# Model Card

## Model Description
A classification model.

## Intended Use
Support tickets.

## Limitations
English only.
`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.PASS);
      expect(finding!.metadata?.source).toBe('MODEL_CARD.md');
    });

    it('detects model_card.md (lowercase)', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'model_card.md'),
        `# Model Card

## Model Description
A model.

## Intended Use
General use.

## Limitations
None known.
`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.PASS);
    });

    it('prefers MODEL_CARD.md over README.md', async () => {
      markAsAIRepo();
      // MODEL_CARD.md has all required sections
      fs.writeFileSync(
        path.join(tmpDir, 'MODEL_CARD.md'),
        `## Model Description\nA model.\n## Intended Use\nClassification.\n## Limitations\nNone.`,
      );
      // README.md has none
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# My Project\nA web app.');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.PASS);
      expect(finding!.metadata?.source).toBe('MODEL_CARD.md');
    });
  });

  describe('section heading variations', () => {
    it('detects "Description" as alias for "Model Description"', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model\n## Description\nA model.\n## Intended Use\nClassify.\n## Limitations\nNone.`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      const present = finding!.metadata?.presentRequired as string[];
      expect(present).toContain('Model Description');
    });

    it('detects "Uses" as alias for "Intended Use"', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model\n## Model Description\nA model.\n## Uses\nClassify.\n## Limitations\nNone.`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      const present = finding!.metadata?.presentRequired as string[];
      expect(present).toContain('Intended Use');
    });

    it('detects "Known Limitations" as alias for "Limitations"', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model\n## Model Description\nA model.\n## Intended Use\nClassify.\n## Known Limitations\nNone.`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      const present = finding!.metadata?.presentRequired as string[];
      expect(present).toContain('Limitations');
    });

    it('detects "Training Details" as alias for "Training Data"', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model\n## Model Description\nA model.\n## Intended Use\nClassify.\n## Limitations\nNone.\n## Training Details\nTrained on XYZ.`,
      );

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      const presentRecommended = finding!.metadata?.presentRecommended as string[];
      expect(presentRecommended).toContain('Training Data');
    });
  });

  describe('HuggingFace YAML front matter', () => {
    it('detects model-index in YAML front matter', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `---
model-index:
  - name: my-model
    results:
      - task:
          type: text-classification
---

## Model Description
A model.

## Intended Use
Classify.

## Limitations
None.
`,
      );

      const findings = await scanner.run(makeContext());
      const hfFinding = findings.find((f) => f.category === 'model-card-frontmatter');
      expect(hfFinding).toBeDefined();
      expect(hfFinding!.severity).toBe(Severity.PASS);
      expect(hfFinding!.metadata?.hasModelIndex).toBe(true);
    });

    it('no frontmatter finding when YAML absent', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `## Model Description\nA model.\n## Intended Use\nClassify.\n## Limitations\nNone.`,
      );

      const findings = await scanner.run(makeContext());
      const hfFinding = findings.find((f) => f.category === 'model-card-frontmatter');
      expect(hfFinding).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles missing repo path', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
    });

    it('handles empty README.md in AI repo', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-sections');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.WARNING);
    });
  });
});
