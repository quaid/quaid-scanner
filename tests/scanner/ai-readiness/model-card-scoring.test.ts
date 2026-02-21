/**
 * Tests for Model Card Scoring scanner.
 *
 * Validates completeness scoring with weighted formula,
 * severity thresholds, and optional section detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ModelCardScoringScanner } from '../../../src/scanner/ai-readiness/model-card-scoring.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: ModelCardScoringScanner;

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-card-score-test-'));
  scanner = new ModelCardScoringScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ModelCardScoringScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('model-card-scoring');
      expect(scanner.displayName).toBe('Model Card Scoring');
      expect(scanner.pillar).toBe(Pillar.AI_READINESS);
    });
  });

  describe('non-AI repository', () => {
    it('INFO when repository is not an AI repo', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.js'), 'console.log("hello")');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'model-card-scoring');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.INFO);
    });
  });

  describe('PASS threshold (>70%)', () => {
    it('PASS when all required and recommended sections present', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model
## Model Description
A text classifier.
## Intended Use
Classify tickets.
## Limitations
English only.
## Training Data
XYZ dataset.
## Evaluation
95% accuracy.
## Bias
No significant bias.
## Ethical Considerations
Do not use for automated decisions.
`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring).toBeDefined();
      expect(scoring!.severity).toBe(Severity.PASS);
      expect(scoring!.metadata?.completenessPercent).toBeGreaterThan(70);
    });

    it('PASS when all required + some recommended + some optional', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model
## Model Description
A classifier.
## Intended Use
Classification.
## Limitations
English only.
## Training Data
XYZ dataset.
## Evaluation
95% accuracy.
## Citation
Please cite this paper.
## Acknowledgments
Thanks to the team.
`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring).toBeDefined();
      expect(scoring!.severity).toBe(Severity.PASS);
      expect(scoring!.metadata?.completenessPercent).toBeGreaterThan(70);
    });
  });

  describe('WARNING threshold (40-70%)', () => {
    it('WARNING when only required sections present', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model
## Model Description
A classifier.
## Intended Use
Classification.
## Limitations
English only.
`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring).toBeDefined();
      // 3 required × 3 = 9 out of max (9 + 8 + 4 = 21) = 42.8%
      expect(scoring!.severity).toBe(Severity.WARNING);
      const pct = scoring!.metadata?.completenessPercent as number;
      expect(pct).toBeGreaterThanOrEqual(40);
      expect(pct).toBeLessThanOrEqual(70);
    });
  });

  describe('CRITICAL threshold (<40%)', () => {
    it('CRITICAL when only one required section present', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model
## Model Description
A classifier.
`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring).toBeDefined();
      expect(scoring!.severity).toBe(Severity.CRITICAL);
      expect(scoring!.metadata?.completenessPercent).toBeLessThan(40);
    });

    it('CRITICAL when no sections present in AI repo', async () => {
      markAsAIRepo();
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# My Model\nA cool model.');

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring).toBeDefined();
      expect(scoring!.severity).toBe(Severity.CRITICAL);
      expect(scoring!.metadata?.completenessPercent).toBe(0);
    });

    it('CRITICAL when no README at all in AI repo', async () => {
      markAsAIRepo();

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring).toBeDefined();
      expect(scoring!.severity).toBe(Severity.CRITICAL);
    });
  });

  describe('optional sections', () => {
    it('detects Citation section', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model\n## Model Description\nA model.\n## Intended Use\nUse.\n## Limitations\nNone.\n## Citation\nPlease cite.`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      const presentOptional = scoring!.metadata?.presentOptional as string[];
      expect(presentOptional).toContain('Citation');
    });

    it('detects Acknowledgments section', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model\n## Model Description\nA model.\n## Intended Use\nUse.\n## Limitations\nNone.\n## Acknowledgments\nThanks.`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      const presentOptional = scoring!.metadata?.presentOptional as string[];
      expect(presentOptional).toContain('Acknowledgments');
    });

    it('detects Environmental Impact section', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model\n## Model Description\nA model.\n## Intended Use\nUse.\n## Limitations\nNone.\n## Environmental Impact\n100kg CO2.`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      const presentOptional = scoring!.metadata?.presentOptional as string[];
      expect(presentOptional).toContain('Environmental Impact');
    });

    it('detects Glossary section', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model\n## Model Description\nA model.\n## Intended Use\nUse.\n## Limitations\nNone.\n## Glossary\nTerms.`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      const presentOptional = scoring!.metadata?.presentOptional as string[];
      expect(presentOptional).toContain('Glossary');
    });
  });

  describe('weighted scoring formula', () => {
    it('metadata includes score breakdown', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model
## Model Description
A model.
## Intended Use
Use.
## Limitations
None.
## Training Data
XYZ.
`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring!.metadata?.requiredScore).toBeDefined();
      expect(scoring!.metadata?.recommendedScore).toBeDefined();
      expect(scoring!.metadata?.optionalScore).toBeDefined();
      expect(scoring!.metadata?.totalScore).toBeDefined();
      expect(scoring!.metadata?.maxScore).toBeDefined();
      expect(scoring!.metadata?.completenessPercent).toBeDefined();
    });

    it('max score reachable with all sections', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Model
## Model Description
A model.
## Intended Use
Use.
## Limitations
None.
## Training Data
Data.
## Evaluation
Results.
## Bias
None.
## Ethical Considerations
Be responsible.
## Citation
Cite this.
## Acknowledgments
Thanks.
## Glossary
Terms.
## Environmental Impact
Carbon.
`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring!.metadata?.completenessPercent).toBe(100);
      expect(scoring!.metadata?.totalScore).toBe(scoring!.metadata?.maxScore);
    });
  });

  describe('MODEL_CARD.md support', () => {
    it('scores from MODEL_CARD.md when present', async () => {
      markAsAIRepo();
      fs.writeFileSync(
        path.join(tmpDir, 'MODEL_CARD.md'),
        `# Model Card
## Model Description
A model.
## Intended Use
Classification.
## Limitations
English only.
## Training Data
XYZ.
## Evaluation
95% accuracy.
## Bias
No significant bias.
`,
      );

      const findings = await scanner.run(makeContext());
      const scoring = findings.find((f) => f.category === 'model-card-scoring');
      expect(scoring).toBeDefined();
      expect(scoring!.severity).toBe(Severity.PASS);
      expect(scoring!.metadata?.source).toBe('MODEL_CARD.md');
    });
  });

  describe('HuggingFace front matter bonus', () => {
    it('adds bonus for model-index in YAML front matter', async () => {
      markAsAIRepo();
      const withoutFrontmatter = `# Model\n## Model Description\nA model.\n## Intended Use\nUse.\n## Limitations\nNone.`;
      const withFrontmatter = `---\nmodel-index:\n  - name: my-model\n---\n${withoutFrontmatter}`;

      fs.writeFileSync(path.join(tmpDir, 'README.md'), withoutFrontmatter);
      const findingsWithout = await scanner.run(makeContext());
      const scoreWithout = findingsWithout.find((f) => f.category === 'model-card-scoring');
      const pctWithout = scoreWithout!.metadata?.completenessPercent as number;

      fs.writeFileSync(path.join(tmpDir, 'README.md'), withFrontmatter);
      const findingsWith = await scanner.run(makeContext());
      const scoreWith = findingsWith.find((f) => f.category === 'model-card-scoring');
      const pctWith = scoreWith!.metadata?.completenessPercent as number;

      expect(pctWith).toBeGreaterThan(pctWithout);
      expect(scoreWith!.metadata?.hasModelIndex).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles missing repo path', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});
