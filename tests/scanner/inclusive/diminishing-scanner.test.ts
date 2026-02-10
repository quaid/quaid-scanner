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

    it('returns CRITICAL finding when welcoming score < 60', async () => {
      // Need enough issues: 14 WARNINGs = 42 deducted => score 58
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
      expect(summary!.severity).toBe(Severity.CRITICAL);
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
});
