import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { InclusiveDocScanner } from '../../../src/scanner/inclusive/doc-scanner.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';

/**
 * Create a temporary directory with fixture files for testing.
 */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'doc-scanner-test-'));
}

/**
 * Write a file inside the temp directory, creating subdirs as needed.
 */
function writeFixture(tmpDir: string, relativePath: string, content: string): void {
  const fullPath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Remove a temp directory recursively.
 */
function removeTempDir(tmpDir: string): void {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Create a minimal ScanContext pointing at the given repo path.
 */
function createScanContext(repoPath: string, overrides: Partial<ScannerConfig> = {}): ScanContext {
  const config: ScannerConfig = {
    maturity: null,
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
    pillars: {
      disabled: [],
      weights: {},
      disabledScanners: [],
    },
    bots: {
      enabled: false,
      additional: [],
      exclude: [],
    },
    inclusive: {
      termListUrl: null,
      customTerms: {},
      ignoredTerms: [],
      excludePatterns: [],
    },
    ...overrides,
  };

  return {
    repoPath,
    repoIdentifier: null,
    maturity: MaturityLevel.SANDBOX,
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

describe('InclusiveDocScanner', () => {
  let scanner: InclusiveDocScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new InclusiveDocScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  describe('scanner metadata', () => {
    it('has correct name and pillar', () => {
      expect(scanner.name).toBe('inclusive-doc-scanner');
      expect(scanner.displayName).toBe('Documentation Language Scanner');
      expect(scanner.pillar).toBe(Pillar.INCLUSIVE);
    });
  });

  describe('tier 1 terms produce CRITICAL findings', () => {
    it('finds tier 1 terms in .md files and returns CRITICAL findings', async () => {
      writeFixture(tmpDir, 'README.md', 'This uses a master-slave architecture.\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBeGreaterThan(0);
      const finding = findings.find((f) => f.message.includes('master-slave'));
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.CRITICAL);
      expect(finding!.pillar).toBe(Pillar.INCLUSIVE);
    });
  });

  describe('tier 2 terms produce WARNING findings', () => {
    it('finds tier 2 terms and returns WARNING findings', async () => {
      writeFixture(tmpDir, 'docs/guide.md', 'Do a sanity check before deploying.\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const finding = findings.find((f) => f.message.includes('sanity check'));
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('tier 3 terms produce INFO findings', () => {
    it('finds tier 3 terms and returns INFO findings', async () => {
      writeFixture(tmpDir, 'notes.txt', 'Estimate in man-hours for the project.\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const finding = findings.find((f) => f.message.includes('man-hour'));
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.INFO);
    });
  });

  describe('location reporting', () => {
    it('reports correct file, line, column for each finding', async () => {
      writeFixture(tmpDir, 'test.md', 'Line one is fine.\nThe whitelist is here.\nLine three.\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const finding = findings.find((f) => f.message.includes('whitelist'));
      expect(finding).toBeDefined();
      // "whitelist" appears on line 2
      expect(finding!.line).toBe(2);
      // "The whitelist" -> column = 4 (0-based index of 'w' in "The whitelist")
      expect(finding!.column).toBe(4);
      // File should be relative to repoPath
      expect(finding!.file).toBe('test.md');
    });
  });

  describe('context extraction', () => {
    it('includes context with plus/minus 20 chars around match', async () => {
      // Create a line with enough surrounding text to test +-20 chars
      const prefix = 'AAAAAAAAAA1234567890 ';
      const suffix = ' 1234567890BBBBBBBBBB more text here.';
      const line = prefix + 'blacklist' + suffix;
      writeFixture(tmpDir, 'context-test.md', line + '\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const finding = findings.find((f) => f.message.includes('blacklist'));
      expect(finding).toBeDefined();
      expect(finding!.context).toBeDefined();
      // The context should contain the match
      expect(finding!.context).toContain('blacklist');
      // Should include up to 20 chars before the match (prefix is 21 chars,
      // so we lose 1 char and get an ellipsis prefix)
      expect(finding!.context).toContain('1234567890 blacklist');
      // Should include up to 20 chars after the match
      expect(finding!.context).toContain('blacklist 1234567890');
      // Should not include text beyond the 20-char radius
      expect(finding!.context).not.toContain('AAAAAAAAAA');
      expect(finding!.context).not.toContain('more text here');
    });
  });

  describe('suppression', () => {
    it('respects <!-- inclusive-naming-ignore --> suppression', async () => {
      writeFixture(
        tmpDir,
        'suppressed.md',
        'The master branch is used. <!-- inclusive-naming-ignore -->\nThe slave node runs here.\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      // Line 1 should be suppressed
      const masterOnLine1 = findings.find(
        (f) => f.message.includes('master') && f.line === 1
      );
      expect(masterOnLine1).toBeUndefined();

      // Line 2 should still produce a finding
      const slaveOnLine2 = findings.find(
        (f) => f.message.includes('slave') && f.line === 2
      );
      expect(slaveOnLine2).toBeDefined();
    });
  });

  describe('directory exclusions', () => {
    it('excludes node_modules/ paths', async () => {
      writeFixture(tmpDir, 'node_modules/some-pkg/README.md', 'The master branch.\n');
      writeFixture(tmpDir, 'real-doc.md', 'The master branch.\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      // Should only find results from real-doc.md, not node_modules
      const nodeModuleFinding = findings.find(
        (f) => f.file !== null && f.file.includes('node_modules')
      );
      expect(nodeModuleFinding).toBeUndefined();

      // But the real doc should have findings
      const realFinding = findings.find((f) => f.file === 'real-doc.md');
      expect(realFinding).toBeDefined();
    });
  });

  describe('file extension filtering', () => {
    it('only scans doc file extensions (.md, .txt, .rst, .adoc, .html)', async () => {
      writeFixture(tmpDir, 'readme.md', 'The whitelist entry.\n');
      writeFixture(tmpDir, 'notes.txt', 'The whitelist entry.\n');
      writeFixture(tmpDir, 'guide.rst', 'The whitelist entry.\n');
      writeFixture(tmpDir, 'manual.adoc', 'The whitelist entry.\n');
      writeFixture(tmpDir, 'page.html', 'The whitelist entry.\n');
      writeFixture(tmpDir, 'code.ts', 'The whitelist entry.\n');
      writeFixture(tmpDir, 'style.css', 'The whitelist entry.\n');
      writeFixture(tmpDir, 'data.json', 'The whitelist entry.\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const scannedFiles = new Set(findings.map((f) => f.file));
      expect(scannedFiles).toContain('readme.md');
      expect(scannedFiles).toContain('notes.txt');
      expect(scannedFiles).toContain('guide.rst');
      expect(scannedFiles).toContain('manual.adoc');
      expect(scannedFiles).toContain('page.html');
      expect(scannedFiles).not.toContain('code.ts');
      expect(scannedFiles).not.toContain('style.css');
      expect(scannedFiles).not.toContain('data.json');
    });
  });

  describe('clean files', () => {
    it('returns empty array for clean files', async () => {
      writeFixture(tmpDir, 'clean.md', 'This document is perfectly fine.\nNo issues here.\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings).toEqual([]);
    });
  });

  describe('ignored terms from config', () => {
    it('handles ignored terms from config', async () => {
      writeFixture(tmpDir, 'test.md', 'The whitelist and blacklist entries.\n');
      const context = createScanContext(tmpDir, {
        inclusive: {
          termListUrl: null,
          customTerms: {},
          ignoredTerms: ['whitelist'],
          excludePatterns: [],
        },
      });

      const findings = await scanner.run(context);

      // whitelist should be ignored
      const whitelistFinding = findings.find((f) => f.message.includes('whitelist'));
      expect(whitelistFinding).toBeUndefined();

      // blacklist should still be found
      const blacklistFinding = findings.find((f) => f.message.includes('blacklist'));
      expect(blacklistFinding).toBeDefined();
    });
  });
});
