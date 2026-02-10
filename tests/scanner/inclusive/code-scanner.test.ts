import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { InclusiveCodeScanner } from '../../../src/scanner/inclusive/code-scanner.js';
import {
  Pillar,
  Severity,
  ScanDepth,
  MaturityLevel,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig, Finding } from '../../../src/types/index.js';

function createConfig(overrides: Partial<ScannerConfig> = {}): ScannerConfig {
  return {
    maturity: MaturityLevel.INCUBATING,
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
    pillars: { disabled: [], weights: {}, disabledScanners: [] },
    bots: { enabled: true, additional: [], exclude: [] },
    inclusive: {
      termListUrl: null,
      customTerms: {},
      ignoredTerms: [],
      excludePatterns: [],
    },
    ...overrides,
  };
}

function createContext(repoPath: string, configOverrides: Partial<ScannerConfig> = {}): ScanContext {
  const config = createConfig(configOverrides);
  return {
    repoPath,
    repoIdentifier: null,
    maturity: config.maturity ?? MaturityLevel.INCUBATING,
    depth: config.depth,
    config,
    git: { commitSha: null, branch: null, remoteUrl: null },
    signal: AbortSignal.timeout(30_000),
    emit: () => {},
  };
}

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'code-scanner-test-'));
}

function writeFixture(dir: string, filePath: string, content: string): void {
  const fullPath = path.join(dir, filePath);
  const fileDir = path.dirname(fullPath);
  fs.mkdirSync(fileDir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

describe('InclusiveCodeScanner', () => {
  let scanner: InclusiveCodeScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new InclusiveCodeScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name and pillar', () => {
      expect(scanner.name).toBe('inclusive-code-scanner');
      expect(scanner.displayName).toBe('Inclusive Code Scanner');
      expect(scanner.pillar).toBe(Pillar.INCLUSIVE);
    });
  });

  describe('single-line comments', () => {
    it('finds terms in // comments and returns correct severity', async () => {
      writeFixture(tmpDir, 'app.ts', [
        'const x = 1;',
        '// This is the master branch config',
        'const y = 2;',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const masterFinding = findings.find((f) => f.message.toLowerCase().includes('master'));
      expect(masterFinding).toBeDefined();
      expect(masterFinding!.severity).toBe(Severity.CRITICAL);
      expect(masterFinding!.file).toContain('app.ts');
      expect(masterFinding!.line).toBe(2);
    });
  });

  describe('multi-line comments', () => {
    it('finds terms in /* */ comments', async () => {
      writeFixture(tmpDir, 'server.js', [
        '/*',
        ' * Configure the whitelist for allowed IPs',
        ' */',
        'function configure() {}',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const whitelistFinding = findings.find((f) => f.message.toLowerCase().includes('whitelist'));
      expect(whitelistFinding).toBeDefined();
      expect(whitelistFinding!.severity).toBe(Severity.CRITICAL);
      expect(whitelistFinding!.file).toContain('server.js');
    });
  });

  describe('Python hash comments', () => {
    it('finds terms in # comments for Python files', async () => {
      writeFixture(tmpDir, 'script.py', [
        'import os',
        '# Add to the blacklist of IPs',
        'blocked = []',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const blacklistFinding = findings.find((f) => f.message.toLowerCase().includes('blacklist'));
      expect(blacklistFinding).toBeDefined();
      expect(blacklistFinding!.severity).toBe(Severity.CRITICAL);
      expect(blacklistFinding!.file).toContain('script.py');
      expect(blacklistFinding!.line).toBe(2);
    });
  });

  describe('string literals', () => {
    it('finds terms in string literals', async () => {
      writeFixture(tmpDir, 'messages.ts', [
        'const msg1 = "Add to the whitelist";',
        "const msg2 = 'This is the master config';",
        'const msg3 = `The slave node is down`;',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      expect(findings.length).toBeGreaterThanOrEqual(3);

      const whitelistFinding = findings.find(
        (f) => f.message.toLowerCase().includes('whitelist') && f.line === 1,
      );
      expect(whitelistFinding).toBeDefined();

      const masterFinding = findings.find(
        (f) => f.message.toLowerCase().includes('master') && f.line === 2,
      );
      expect(masterFinding).toBeDefined();

      const slaveFinding = findings.find(
        (f) => f.message.toLowerCase().includes('slave') && f.line === 3,
      );
      expect(slaveFinding).toBeDefined();
    });
  });

  describe('code identifiers', () => {
    it('does NOT match terms in code identifiers (variable names)', async () => {
      writeFixture(tmpDir, 'clean.ts', [
        'const masterBranch = "main";',
        'function getBlacklist(): string[] { return []; }',
        'let slaveCount = 0;',
        'const whitelist_enabled = true;',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      // These are identifier usages, not comment or string content.
      // The string "main" is clean. Variable names should not be flagged.
      // Only the string literal on line 1 is "main", which is clean.
      // No comments or problematic string literals exist.
      expect(findings).toHaveLength(0);
    });
  });

  describe('suppression comments', () => {
    it('respects // inclusive-naming-ignore suppression', async () => {
      writeFixture(tmpDir, 'suppressed.ts', [
        '// Configure the master node // inclusive-naming-ignore',
        '// The slave handles replication',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      // Line 1 should be suppressed, line 2 should be flagged
      const masterFindings = findings.filter(
        (f) => f.message.toLowerCase().includes('master') && f.line === 1,
      );
      expect(masterFindings).toHaveLength(0);

      const slaveFindings = findings.filter(
        (f) => f.message.toLowerCase().includes('slave') && f.line === 2,
      );
      expect(slaveFindings.length).toBeGreaterThanOrEqual(1);
    });

    it('respects # inclusive-naming-ignore for Python', async () => {
      writeFixture(tmpDir, 'suppressed.py', [
        '# The master config here # inclusive-naming-ignore',
        '# The slave config here',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      const masterFindings = findings.filter(
        (f) => f.message.toLowerCase().includes('master') && f.line === 1,
      );
      expect(masterFindings).toHaveLength(0);

      const slaveFindings = findings.filter(
        (f) => f.message.toLowerCase().includes('slave') && f.line === 2,
      );
      expect(slaveFindings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('file extension filtering', () => {
    it('only scans supported code file extensions', async () => {
      writeFixture(tmpDir, 'readme.md', '# The master branch\n');
      writeFixture(tmpDir, 'notes.txt', 'Check the whitelist\n');
      writeFixture(tmpDir, 'data.json', '{"whitelist": true}\n');
      writeFixture(tmpDir, 'app.ts', '// The whitelist config\n');

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      // Only app.ts should be scanned
      expect(findings.length).toBeGreaterThanOrEqual(1);
      for (const finding of findings) {
        expect(finding.file).toContain('app.ts');
      }
    });
  });

  describe('directory exclusion', () => {
    it('excludes node_modules/ and dist/', async () => {
      writeFixture(tmpDir, 'node_modules/lib/index.js', '// The master config\n');
      writeFixture(tmpDir, 'dist/bundle.js', '// The slave node\n');
      writeFixture(tmpDir, 'src/app.ts', '// The whitelist here\n');

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      // Only src/app.ts should be scanned
      for (const finding of findings) {
        expect(finding.file).not.toContain('node_modules');
        expect(finding.file).not.toContain('dist');
      }
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings.some((f) => f.file!.includes('app.ts'))).toBe(true);
    });
  });

  describe('clean files', () => {
    it('returns empty for files with no problematic terms', async () => {
      writeFixture(tmpDir, 'clean.ts', [
        '// This is a clean file',
        'const primary = "main";',
        '/* No issues here */',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      expect(findings).toHaveLength(0);
    });
  });

  describe('ignoredTerms config', () => {
    it('honors inclusive.ignoredTerms config to skip specific terms', async () => {
      writeFixture(tmpDir, 'app.ts', [
        '// The whitelist of approved domains',
        '// The blacklist of blocked IPs',
      ].join('\n'));

      const ctx = createContext(tmpDir, {
        inclusive: {
          termListUrl: null,
          customTerms: {},
          ignoredTerms: ['whitelist'],
          excludePatterns: [],
        },
      });
      const findings = await scanner.run(ctx);

      // whitelist should be ignored, blacklist should still be found
      const whitelistFindings = findings.filter((f) =>
        f.message.toLowerCase().includes('whitelist'),
      );
      expect(whitelistFindings).toHaveLength(0);

      const blacklistFindings = findings.filter((f) =>
        f.message.toLowerCase().includes('blacklist'),
      );
      expect(blacklistFindings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('severity mapping', () => {
    it('maps tier 1 to CRITICAL, tier 2 to WARNING, tier 3 to INFO', async () => {
      writeFixture(tmpDir, 'mixed.ts', [
        '// The whitelist config',
        '// Sanity check this logic',
        '// Calculate man-hours required',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      const whitelistF = findings.find((f) => f.message.toLowerCase().includes('whitelist'));
      expect(whitelistF).toBeDefined();
      expect(whitelistF!.severity).toBe(Severity.CRITICAL);

      const sanityF = findings.find((f) => f.message.toLowerCase().includes('sanity'));
      expect(sanityF).toBeDefined();
      expect(sanityF!.severity).toBe(Severity.WARNING);

      const manHoursF = findings.find((f) => f.message.toLowerCase().includes('man-hour'));
      expect(manHoursF).toBeDefined();
      expect(manHoursF!.severity).toBe(Severity.INFO);
    });
  });

  describe('finding structure', () => {
    it('creates Finding objects with required fields', async () => {
      writeFixture(tmpDir, 'example.ts', '// Check the blacklist\n');

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings[0];

      expect(finding.id).toBeDefined();
      expect(finding.id).toContain('inclusive-code-scanner');
      expect(finding.severity).toBeDefined();
      expect(finding.pillar).toBe(Pillar.INCLUSIVE);
      expect(finding.category).toBeDefined();
      expect(finding.message).toBeDefined();
      expect(finding.file).toBeDefined();
      expect(finding.line).toBeDefined();
      expect(typeof finding.line).toBe('number');
      expect(finding.suggestion).toBeDefined();
    });
  });

  describe('Ruby hash comments', () => {
    it('finds terms in # comments for Ruby files', async () => {
      writeFixture(tmpDir, 'app.rb', [
        '# The master database connection',
        'db = connect()',
      ].join('\n'));

      const ctx = createContext(tmpDir);
      const findings = await scanner.run(ctx);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const masterFinding = findings.find((f) => f.message.toLowerCase().includes('master'));
      expect(masterFinding).toBeDefined();
      expect(masterFinding!.file).toContain('app.rb');
    });
  });
});
