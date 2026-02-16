import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DepLicenseScanningScanner } from '../../../src/scanner/governance/dep-license-scanning.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dep-license-test-'));
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

describe('DepLicenseScanningScanner', () => {
  let scanner: DepLicenseScanningScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new DepLicenseScanningScanner();
    tmpDir = createTempDir();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('dep-license-scanning');
      expect(scanner.displayName).toBe('Dependency License Scanning');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('no dependency files', () => {
    it('returns INFO when no dependency files exist', async () => {
      writeFixture(tmpDir, 'README.md', '# Project\n');
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find((f) => f.severity === Severity.INFO);
      expect(info).toBeDefined();
      expect(info!.message).toContain('No dependency');
    });
  });

  describe('package.json scanning', () => {
    it('reports known permissive licenses as PASS', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: {
            lodash: '^4.17.21',
          },
        }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS && f.message.includes('lodash'));
      expect(pass).toBeDefined();
    });

    it('flags copyleft licenses as WARNING', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: { 'some-gpl-pkg': '^1.0.0' },
        }),
      );
      writeFixture(
        tmpDir,
        'node_modules/some-gpl-pkg/package.json',
        JSON.stringify({ name: 'some-gpl-pkg', license: 'GPL-3.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const warn = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('some-gpl-pkg'),
      );
      expect(warn).toBeDefined();
      expect(warn!.message).toContain('copyleft');
    });

    it('flags missing license as WARNING', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: { 'unlicensed-pkg': '^1.0.0' },
        }),
      );
      writeFixture(
        tmpDir,
        'node_modules/unlicensed-pkg/package.json',
        JSON.stringify({ name: 'unlicensed-pkg' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const warn = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('unlicensed-pkg'),
      );
      expect(warn).toBeDefined();
      expect(warn!.message).toContain('unknown');
    });

    it('handles node_modules not present gracefully', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: { lodash: '^4.17.21' },
        }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find((f) => f.severity === Severity.INFO);
      expect(info).toBeDefined();
    });
  });

  describe('requirements.txt scanning', () => {
    it('returns INFO for Python deps without local detection', async () => {
      writeFixture(tmpDir, 'requirements.txt', 'flask==2.3.0\nrequests==2.31.0\n');
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find((f) => f.severity === Severity.INFO);
      expect(info).toBeDefined();
    });
  });

  describe('summary finding', () => {
    it('includes dependency count summary', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: {
            lodash: '^4.17.21',
            express: '^4.18.0',
          },
        }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      writeFixture(
        tmpDir,
        'node_modules/express/package.json',
        JSON.stringify({ name: 'express', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const summary = findings.find((f) => f.message.includes('dependencies'));
      expect(summary).toBeDefined();
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: { lodash: '^4.17.21' },
        }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('dep-license-scanning');
      expect(f.pillar).toBe(Pillar.GOVERNANCE);
      expect(f.category).toBe('dependency-license');
      expect(f.suggestion).toBeDefined();
    });
  });
});
