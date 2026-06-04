import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DiminishingLanguageScanner } from '../../../src/scanner/inclusive/diminishing-scanner.js';
import {
  Pillar,
  Severity,
  ScanDepth,
  OutputFormat,
  type ScanContext,
  type ScannerConfig,
} from '../../../src/types/index.js';

/**
 * Creates a minimal ScanContext with a temp repo path.
 */
function createContext(repoPath: string): ScanContext {
  const config: ScannerConfig = {
    maturity: null,
    depth: ScanDepth.STANDARD,
    format: OutputFormat.JSON,
    output: null,
    threshold: null,
    quiet: false,
    verbose: false,
    scannerTimeout: 30_000,
    githubToken: null,
    zerodbApiKey: null,
    zerodbProjectId: null,
    pillars: {
      disabled: [],
      weights: {},
      disabledScanners: [],
    },
    bots: {
      enabled: true,
      additional: [],
      exclude: [],
    },
    inclusive: {
      termListUrl: null,
      customTerms: {},
      ignoredTerms: [],
      excludePatterns: [],
    },
  };

  return {
    repoPath,
    repoIdentifier: null,
    maturity: 'sandbox' as any,
    depth: ScanDepth.STANDARD,
    config,
    git: {
      commitSha: null,
      branch: null,
      remoteUrl: null,
    },
    signal: new AbortController().signal,
    emit: () => {},
  };
}

describe('DiminishingLanguageScanner', () => {
  let scanner: DiminishingLanguageScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new DiminishingLanguageScanner();
    tmpDir = mkdtempSync(join(tmpdir(), 'diminishing-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name and pillar', () => {
      expect(scanner.name).toBe('diminishing-language-scanner');
      expect(scanner.displayName).toBe('Diminishing Language Scanner');
      expect(scanner.pillar).toBe(Pillar.INCLUSIVE);
    });
  });

  describe('pattern detection', () => {
    it('detects "just run" as WARNING', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'To get started, just run npm install.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('just run'),
      );
      expect(match).toBeDefined();
      expect(match!.file).toContain('README.md');
    });

    it('detects "simply add" as WARNING', async () => {
      writeFileSync(join(tmpDir, 'CONTRIBUTING.md'), 'You simply add the dependency.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('simply add'),
      );
      expect(match).toBeDefined();
    });

    it('detects "obviously" as WARNING', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Obviously this is the best approach.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('obvious'),
      );
      expect(match).toBeDefined();
    });

    it('detects "easy" as INFO', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'This is an easy setup process.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('easy'),
      );
      expect(match).toBeDefined();
    });

    it('detects "trivial" as INFO', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'The fix is trivial to implement.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('trivial'),
      );
      expect(match).toBeDefined();
    });

    it('detects "everyone knows" as WARNING', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Everyone knows how to use git.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('everyone knows'),
      );
      expect(match).toBeDefined();
    });

    it('detects "as you know" as WARNING', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'As you know, this works well.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('as you'),
      );
      expect(match).toBeDefined();
    });

    it('detects "as you probably know" as WARNING', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'As you probably know, this is common.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('as you'),
      );
      expect(match).toBeDefined();
    });

    it('detects "of course" as INFO', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Of course you need Node.js installed.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('of course'),
      );
      expect(match).toBeDefined();
    });

    it('detects "clearly" as INFO', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Clearly this is the right approach.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('clearly'),
      );
      expect(match).toBeDefined();
    });

    it('detects "basically" as INFO', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Basically you need to configure this.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('basically'),
      );
      expect(match).toBeDefined();
    });
  });

  describe('code block exclusion', () => {
    it('skips content inside fenced code blocks', async () => {
      const content = [
        '# Setup Guide',
        '',
        'Follow these steps:',
        '',
        '```bash',
        'just run npm install',
        '```',
        '',
        'That completes the setup.',
      ].join('\n');
      writeFileSync(join(tmpDir, 'README.md'), content);
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('just run'),
      );
      expect(match).toBeUndefined();
    });

    it('skips content inside indented code blocks', async () => {
      const content = [
        '# Setup Guide',
        '',
        'Example:',
        '',
        '    just run npm install',
        '',
        'That completes the setup.',
      ].join('\n');
      writeFileSync(join(tmpDir, 'README.md'), content);
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('just run'),
      );
      expect(match).toBeUndefined();
    });
  });

  describe('suppression', () => {
    it('respects <!-- inclusive-ok --> suppression on the line', async () => {
      const content = 'Just run the tests. <!-- inclusive-ok -->\n';
      writeFileSync(join(tmpDir, 'README.md'), content);
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('just run'),
      );
      expect(match).toBeUndefined();
    });
  });

  describe('welcoming score and thresholds', () => {
    it('returns PASS finding when welcoming score > 85', async () => {
      // Clean file with no diminishing language
      writeFileSync(
        join(tmpDir, 'README.md'),
        '# Welcome\n\nThis project helps you build great software.\n',
      );
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const summary = findings.find(
        (f) => f.category === 'welcoming-score' && f.severity === Severity.PASS,
      );
      expect(summary).toBeDefined();
      expect(summary!.metadata?.welcomingScore).toBe(100);
    });

    it('returns WARNING finding when welcoming score is 60-85', async () => {
      // Generate enough warnings to bring score to 60-85 range
      // Each WARNING = 3 points deducted. 6 warnings = 18 deducted => score 82
      const lines = [
        'Just run the first command.',
        'Just do the second step.',
        'Simply add the config.',
        'Obviously this is needed.',
        'Everyone knows this pattern.',
        'Just use the defaults.',
      ];
      writeFileSync(join(tmpDir, 'README.md'), lines.join('\n') + '\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const summary = findings.find((f) => f.category === 'welcoming-score');
      expect(summary).toBeDefined();
      expect(summary!.severity).toBe(Severity.WARNING);
      const score = summary!.metadata?.welcomingScore as number;
      expect(score).toBeGreaterThanOrEqual(60);
      expect(score).toBeLessThanOrEqual(85);
    });

    it('returns WARNING finding when welcoming score < 60', async () => {
      // Need enough issues: 14 WARNINGs = 42 deducted => score 58
      // Inclusive scanners are capped at WARNING — no CRITICAL emitted (#165)
      const lines = [
        'Just run this command.',
        'Just do this step.',
        'Just add the config.',
        'Just use the defaults.',
        'Just set the environment.',
        'Just put it here.',
        'Just make the file.',
        'Simply run the tests.',
        'Simply do the build.',
        'Simply add the dep.',
        'Obviously this works.',
        'Everyone knows git.',
        'Just click the button.',
        'Just type the command.',
      ];
      writeFileSync(join(tmpDir, 'README.md'), lines.join('\n') + '\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const summary = findings.find((f) => f.category === 'welcoming-score');
      expect(summary).toBeDefined();
      expect(summary!.severity).toBe(Severity.WARNING);
      expect(summary!.severity).not.toBe(Severity.CRITICAL);
      const score = summary!.metadata?.welcomingScore as number;
      expect(score).toBeLessThan(60);
    });
  });

  describe('clean files', () => {
    it('returns findings with only a PASS summary for clean files', async () => {
      writeFileSync(
        join(tmpDir, 'README.md'),
        '# Project\n\nFollow these steps to get started.\n\n1. Install dependencies\n2. Run the tests\n',
      );
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      // Should only have the summary finding
      const nonSummary = findings.filter((f) => f.category !== 'welcoming-score');
      expect(nonSummary).toHaveLength(0);

      const summary = findings.find((f) => f.category === 'welcoming-score');
      expect(summary).toBeDefined();
      expect(summary!.severity).toBe(Severity.PASS);
    });
  });

  describe('file scanning scope', () => {
    it('scans .md files', async () => {
      writeFileSync(join(tmpDir, 'guide.md'), 'Just run the command.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('just run'),
      );
      expect(match).toBeDefined();
    });

    it('scans files in docs/ directory', async () => {
      mkdirSync(join(tmpDir, 'docs'), { recursive: true });
      writeFileSync(join(tmpDir, 'docs', 'setup.txt'), 'Just run the command.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('just run'),
      );
      expect(match).toBeDefined();
    });

    it('does not scan non-documentation files outside docs/', async () => {
      mkdirSync(join(tmpDir, 'src'), { recursive: true });
      writeFileSync(join(tmpDir, 'src', 'index.ts'), '// just run the tests\n');
      // Only a .md file with clean content
      writeFileSync(join(tmpDir, 'README.md'), '# Clean readme\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('just run'),
      );
      expect(match).toBeUndefined();
    });
  });

  describe('finding details', () => {
    it('includes file, line number, and context in findings', async () => {
      writeFileSync(
        join(tmpDir, 'README.md'),
        '# Title\n\nJust run npm install to get started.\n',
      );
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('just run'),
      );
      expect(match).toBeDefined();
      expect(match!.file).toContain('README.md');
      expect(match!.line).toBe(3);
      expect(match!.context).toBeDefined();
      expect(match!.context).toContain('Just run');
    });

    it('groups findings by file via metadata', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Just run npm install.\nJust do the setup.\n');
      writeFileSync(join(tmpDir, 'CONTRIBUTING.md'), 'Obviously fork first.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const summary = findings.find((f) => f.category === 'welcoming-score');
      expect(summary).toBeDefined();
      expect(summary!.metadata?.fileGroups).toBeDefined();
      const fileGroups = summary!.metadata!.fileGroups as Record<string, number>;
      // README.md should have 2 findings, CONTRIBUTING.md should have 1
      expect(Object.keys(fileGroups).length).toBe(2);
    });
  });

  describe('source attribution (#152)', () => {
    it('per-match findings cite Microsoft Style Guide, not inclusivenaming.org', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Just run npm install to get started.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const matchFindings = findings.filter((f) => f.category === 'diminishing-language');
      expect(matchFindings.length).toBeGreaterThan(0);
      for (const finding of matchFindings) {
        expect(finding.referenceUrl).toContain('learn.microsoft.com');
        expect(finding.referenceUrl).not.toContain('inclusivenaming.org');
      }
    });

    it('welcoming-score summary finding cites Microsoft Style Guide, not inclusivenaming.org', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Just run npm install to get started.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const summary = findings.find((f) => f.category === 'welcoming-score');
      expect(summary).toBeDefined();
      expect(summary!.referenceUrl).toContain('learn.microsoft.com');
      expect(summary!.referenceUrl).not.toContain('inclusivenaming.org');
    });
  });

  describe('per-term referenceUrl (#153)', () => {
    it('finding for "just run" has referenceUrl containing /j/just', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Just run npm install.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.category === 'diminishing-language' && f.message.includes('just run'),
      );
      expect(match).toBeDefined();
      expect(match!.referenceUrl).toContain('/j/just');
    });

    it('finding for "simply add" has referenceUrl containing /s/simply', async () => {
      writeFileSync(join(tmpDir, 'CONTRIBUTING.md'), 'You simply add the dependency.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.category === 'diminishing-language' && f.message.includes('simply add'),
      );
      expect(match).toBeDefined();
      expect(match!.referenceUrl).toContain('/s/simply');
    });

    it('finding for "easy" has referenceUrl containing /e/easy-easily', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'This is an easy setup process.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.category === 'diminishing-language' && f.message.includes('easy'),
      );
      expect(match).toBeDefined();
      expect(match!.referenceUrl).toContain('/e/easy-easily');
    });

    it('finding for "trivial" has referenceUrl containing plainlanguage.gov', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'The fix is trivial to implement.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.category === 'diminishing-language' && f.message.includes('trivial'),
      );
      expect(match).toBeDefined();
      expect(match!.referenceUrl).toContain('plainlanguage.gov');
    });

    it('finding for "everyone knows" has referenceUrl containing content-guide.18f.gov', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Everyone knows how to use git.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const match = findings.find(
        (f) => f.category === 'diminishing-language' && f.message.includes('everyone knows'),
      );
      expect(match).toBeDefined();
      expect(match!.referenceUrl).toContain('content-guide.18f.gov');
    });

    it('summary welcoming-score referenceUrl is unchanged (generic Microsoft URL)', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Just run npm install.\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const summary = findings.find((f) => f.category === 'welcoming-score');
      expect(summary).toBeDefined();
      expect(summary!.referenceUrl).toBe(
        'https://learn.microsoft.com/en-us/style-guide/word-choice/words-and-terms-to-use-and-avoid',
      );
    });
  });

  describe('severity ceiling (#165)', () => {
    it('never emits a CRITICAL finding regardless of score', async () => {
      // Saturate with diminishing language — score should drop well below 60
      const lines = Array.from({ length: 20 }, (_, i) => `Just run step ${i + 1}.`);
      writeFileSync(join(tmpDir, 'README.md'), lines.join('\n') + '\n');
      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const criticalFindings = findings.filter((f) => f.severity === Severity.CRITICAL);
      expect(criticalFindings).toHaveLength(0);
    });
  });

  describe('ignore patterns (#122)', () => {
    it('skips files matching config excludePatterns', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Just run npm install.\n');
      const context = createContext(tmpDir);
      context.config.inclusive = {
        termListUrl: null,
        customTerms: {},
        ignoredTerms: [],
        excludePatterns: ['README.md'],
      };

      const findings = await scanner.run(context);

      const readmeFindings = findings.filter(
        (f) => f.file === 'README.md' && f.category === 'diminishing-language',
      );
      expect(readmeFindings).toHaveLength(0);
    });

    it('skips files matching .quaid-scanner-ignore patterns', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Just run npm install.\n');
      writeFileSync(join(tmpDir, '.quaid-scanner-ignore'), 'README.md\n');
      const context = createContext(tmpDir);

      const findings = await scanner.run(context);

      const readmeFindings = findings.filter(
        (f) => f.file === 'README.md' && f.category === 'diminishing-language',
      );
      expect(readmeFindings).toHaveLength(0);
    });

    it('still scans files not matching exclude patterns', async () => {
      writeFileSync(join(tmpDir, 'README.md'), 'Clean readme.\n');
      writeFileSync(join(tmpDir, 'CONTRIBUTING.md'), 'Obviously fork first.\n');
      const context = createContext(tmpDir);
      context.config.inclusive = {
        termListUrl: null,
        customTerms: {},
        ignoredTerms: [],
        excludePatterns: ['README.md'],
      };

      const findings = await scanner.run(context);

      const contributingFindings = findings.filter(
        (f) => f.file === 'CONTRIBUTING.md' && f.category === 'diminishing-language',
      );
      expect(contributingFindings.length).toBeGreaterThan(0);
    });
  });

  describe('self-report exclusion (#169)', () => {
    it('produces zero diminishing-language findings for a quaid-scan-*.md report file', async () => {
      // Arrange: report file containing diminishing language
      mkdirSync(join(tmpDir, 'docs', 'reports'), { recursive: true });
      writeFileSync(
        join(tmpDir, 'docs', 'reports', 'quaid-scan-2026-06-04.md'),
        '# Scan Report\nIt is easy to see that the scan found issues.\nJust run the scanner again.\n',
      );

      const context = createContext(tmpDir);

      // Act
      const findings = await scanner.run(context);

      // Assert: the report file must produce zero diminishing-language findings
      const reportFindings = findings.filter(
        (f) =>
          f.file?.startsWith('docs/reports/quaid-scan-') &&
          f.category === 'diminishing-language',
      );
      expect(reportFindings).toHaveLength(0);
    });

    it('produces zero diminishing-language findings for a quaid-scan-*.json report file', async () => {
      // Arrange: JSON report containing diminishing language in its text
      mkdirSync(join(tmpDir, 'docs', 'reports'), { recursive: true });
      writeFileSync(
        join(tmpDir, 'docs', 'reports', 'quaid-scan-2026-06-03.json'),
        '{"message":"it is easy to fix this issue, just run the command"}\n',
      );

      const context = createContext(tmpDir);

      // Act
      const findings = await scanner.run(context);

      // Assert: the JSON report file must produce zero findings
      const reportFindings = findings.filter(
        (f) =>
          f.file?.startsWith('docs/reports/quaid-scan-') &&
          f.category === 'diminishing-language',
      );
      expect(reportFindings).toHaveLength(0);
    });

    it('still flags a legitimate CONTRIBUTING.md containing diminishing language', async () => {
      // Arrange: report file (excluded) + legitimate doc (must be flagged)
      mkdirSync(join(tmpDir, 'docs', 'reports'), { recursive: true });
      writeFileSync(
        join(tmpDir, 'docs', 'reports', 'quaid-scan-2026-06-04.md'),
        '# Scan Report\nJust run the scanner to get easy results.\n',
      );
      writeFileSync(
        join(tmpDir, 'CONTRIBUTING.md'),
        'To contribute, just run npm install and it is easy.\n',
      );

      const context = createContext(tmpDir);

      // Act
      const findings = await scanner.run(context);

      // Assert: CONTRIBUTING.md findings exist; report file findings do not
      const reportFindings = findings.filter(
        (f) =>
          f.file?.startsWith('docs/reports/quaid-scan-') &&
          f.category === 'diminishing-language',
      );
      expect(reportFindings).toHaveLength(0);

      const contributingFindings = findings.filter(
        (f) => f.file === 'CONTRIBUTING.md' && f.category === 'diminishing-language',
      );
      expect(contributingFindings.length).toBeGreaterThan(0);
    });
  });
});
