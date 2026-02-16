import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { OpenSSFLocalChecksScanner } from '../../../src/scanner/security/openssf-local-checks.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'openssf-local-test-'));
}

function writeFixture(dir: string, filePath: string, content: string): void {
  const fullPath = path.join(dir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

function createContext(repoPath: string): ScanContext {
  const config: ScannerConfig = {
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
  };
  return {
    repoPath,
    repoIdentifier: null,
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: null, branch: null, remoteUrl: null },
    signal: AbortSignal.timeout(30_000),
    emit: () => {},
  };
}

describe('OpenSSFLocalChecksScanner', () => {
  let scanner: OpenSSFLocalChecksScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new OpenSSFLocalChecksScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('openssf-local-checks');
      expect(scanner.displayName).toBe('OpenSSF Local Security Checks');
      expect(scanner.pillar).toBe(Pillar.SECURITY);
    });

    it('reports scorecard_source as local in metadata', async () => {
      writeFixture(tmpDir, 'README.md', '# Test\n');
      const findings = await scanner.run(createContext(tmpDir));
      const withSource = findings.find((f) => f.metadata?.scorecard_source === 'local');
      expect(withSource).toBeDefined();
    });
  });

  describe('License check', () => {
    it('PASS when LICENSE file exists', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\n');
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('License'),
      );
      expect(pass).toBeDefined();
    });

    it('CRITICAL when no LICENSE file', async () => {
      writeFixture(tmpDir, 'README.md', '# Test\n');
      const findings = await scanner.run(createContext(tmpDir));
      const critical = findings.find(
        (f) => f.severity === Severity.CRITICAL && f.message.includes('License'),
      );
      expect(critical).toBeDefined();
    });
  });

  describe('Security Policy check', () => {
    it('PASS when SECURITY.md exists', async () => {
      writeFixture(tmpDir, 'SECURITY.md', '# Security Policy\n');
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('Security'),
      );
      expect(pass).toBeDefined();
    });

    it('WARNING when no SECURITY.md', async () => {
      writeFixture(tmpDir, 'README.md', '# Test\n');
      const findings = await scanner.run(createContext(tmpDir));
      const warn = findings.find(
        (f) =>
          (f.severity === Severity.WARNING || f.severity === Severity.CRITICAL) &&
          f.message.includes('Security'),
      );
      expect(warn).toBeDefined();
    });

    it('PASS when security in .github/SECURITY.md', async () => {
      writeFixture(tmpDir, '.github/SECURITY.md', '# Security\n');
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('Security'),
      );
      expect(pass).toBeDefined();
    });
  });

  describe('Binary Artifacts check', () => {
    it('PASS when no binary files', async () => {
      writeFixture(tmpDir, 'src/index.ts', 'console.log("hello");\n');
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('Binary'),
      );
      expect(pass).toBeDefined();
    });

    it('WARNING when binary files present', async () => {
      writeFixture(tmpDir, 'lib/helper.dll', 'binary-content');
      const findings = await scanner.run(createContext(tmpDir));
      const warn = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('Binary'),
      );
      expect(warn).toBeDefined();
    });
  });

  describe('Maintained check', () => {
    it('returns a Maintained check finding', async () => {
      writeFixture(tmpDir, 'README.md', '# Test\n');
      const findings = await scanner.run(createContext(tmpDir));
      const maintained = findings.find((f) => f.message.includes('Maintained'));
      expect(maintained).toBeDefined();
    });
  });

  describe('all checks combined', () => {
    it('runs all local checks on a well-structured repo', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\n');
      writeFixture(tmpDir, 'SECURITY.md', '# Security\n');
      writeFixture(tmpDir, 'README.md', '# Test\n');
      writeFixture(tmpDir, 'src/index.ts', 'export const x = 1;\n');
      const findings = await scanner.run(createContext(tmpDir));
      // Should have findings for: License, Security-Policy, Binary-Artifacts, Maintained
      expect(findings.length).toBeGreaterThanOrEqual(4);
      const passFindings = findings.filter((f) => f.severity === Severity.PASS);
      expect(passFindings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      writeFixture(tmpDir, 'README.md', '# Test\n');
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('openssf-local-checks');
      expect(f.pillar).toBe(Pillar.SECURITY);
      expect(f.category).toBe('openssf-scorecard');
      expect(f.suggestion).toBeDefined();
    });
  });
});
