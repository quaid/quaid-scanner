import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DepPinningPackagesScanner } from '../../../src/scanner/security/dep-pinning-packages.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dep-pinning-test-'));
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

describe('DepPinningPackagesScanner', () => {
  let scanner: DepPinningPackagesScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new DepPinningPackagesScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('dep-pinning-packages');
      expect(scanner.displayName).toBe('Dependency Pinning - Package Managers');
      expect(scanner.pillar).toBe(Pillar.SECURITY);
    });
  });

  describe('package.json scanning', () => {
    it('flags wildcard (*) versions as CRITICAL', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        dependencies: { lodash: '*' },
      }));
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('lodash') && f.message.includes('*'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
    });

    it('flags "latest" versions as CRITICAL', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        dependencies: { express: 'latest' },
      }));
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('express'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
    });

    it('flags "x" versions as CRITICAL', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        devDependencies: { jest: 'x' },
      }));
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('jest'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
    });

    it('flags ^ prefix as WARNING', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        dependencies: { react: '^18.0.0' },
      }));
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('react') && f.message.includes('^'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
    });

    it('flags ~ prefix as WARNING', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        dependencies: { vue: '~3.0.0' },
      }));
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('vue') && f.message.includes('~'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
    });

    it('does not flag exact versions', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        dependencies: { lodash: '4.17.21' },
      }));
      const findings = await scanner.run(createContext(tmpDir));
      const depFindings = findings.filter((f) => f.message.includes('lodash'));
      expect(depFindings).toHaveLength(0);
    });

    it('scans both dependencies and devDependencies', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        dependencies: { a: '*' },
        devDependencies: { b: 'latest' },
      }));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('"a"'))).toBe(true);
      expect(findings.some((f) => f.message.includes('"b"'))).toBe(true);
    });
  });

  describe('package-lock.json validation', () => {
    it('PASS if package-lock.json present with lockfileVersion >= 2', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({ dependencies: { a: '1.0.0' } }));
      writeFixture(tmpDir, 'package-lock.json', JSON.stringify({ lockfileVersion: 3 }));
      const findings = await scanner.run(createContext(tmpDir));
      const lockFinding = findings.find((f) => f.message.includes('lock'));
      expect(lockFinding).toBeDefined();
      expect(lockFinding!.severity).toBe(Severity.PASS);
    });

    it('WARNING if package-lock.json has lockfileVersion < 2', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({ dependencies: { a: '1.0.0' } }));
      writeFixture(tmpDir, 'package-lock.json', JSON.stringify({ lockfileVersion: 1 }));
      const findings = await scanner.run(createContext(tmpDir));
      const lockFinding = findings.find((f) => f.message.includes('lockfileVersion'));
      expect(lockFinding).toBeDefined();
      expect(lockFinding!.severity).toBe(Severity.WARNING);
    });

    it('WARNING if no package-lock.json when package.json exists', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({ dependencies: { a: '1.0.0' } }));
      const findings = await scanner.run(createContext(tmpDir));
      const lockFinding = findings.find((f) => f.message.includes('lock') && f.severity === Severity.WARNING);
      expect(lockFinding).toBeDefined();
    });
  });

  describe('requirements.txt scanning', () => {
    it('flags missing == pinning as CRITICAL', async () => {
      writeFixture(tmpDir, 'requirements.txt', 'requests\nflask>=2.0\n');
      const findings = await scanner.run(createContext(tmpDir));
      const reqFinding = findings.find((f) => f.message.includes('requests') && f.severity === Severity.CRITICAL);
      expect(reqFinding).toBeDefined();
    });

    it('flags >= pinning as WARNING', async () => {
      writeFixture(tmpDir, 'requirements.txt', 'flask>=2.0\n');
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('flask'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
    });

    it('does not flag == pinned dependencies', async () => {
      writeFixture(tmpDir, 'requirements.txt', 'requests==2.28.0\nflask==2.3.0\n');
      const findings = await scanner.run(createContext(tmpDir));
      const pyFindings = findings.filter((f) => f.file === 'requirements.txt');
      expect(pyFindings).toHaveLength(0);
    });

    it('ignores comments and blank lines', async () => {
      writeFixture(tmpDir, 'requirements.txt', '# this is a comment\n\nrequests==2.28.0\n');
      const findings = await scanner.run(createContext(tmpDir));
      const pyFindings = findings.filter((f) => f.file === 'requirements.txt');
      expect(pyFindings).toHaveLength(0);
    });
  });

  describe('Gemfile scanning', () => {
    it('flags gem without version constraint as WARNING', async () => {
      writeFixture(tmpDir, 'Gemfile', "source 'https://rubygems.org'\ngem 'rails'\ngem 'puma'\n");
      const findings = await scanner.run(createContext(tmpDir));
      const railsFinding = findings.find((f) => f.message.includes('rails'));
      expect(railsFinding).toBeDefined();
      expect(railsFinding!.severity).toBe(Severity.WARNING);
    });

    it('does not flag gem with version constraint', async () => {
      writeFixture(tmpDir, 'Gemfile', "gem 'rails', '~> 7.0'\ngem 'puma', '>= 5.0'\n");
      const findings = await scanner.run(createContext(tmpDir));
      const gemFindings = findings.filter((f) => f.file === 'Gemfile');
      expect(gemFindings).toHaveLength(0);
    });
  });

  describe('go.mod scanning', () => {
    it('INFO if go.mod exists but no go.sum', async () => {
      writeFixture(tmpDir, 'go.mod', 'module example.com/project\ngo 1.21\n');
      const findings = await scanner.run(createContext(tmpDir));
      const goFinding = findings.find((f) => f.message.includes('go.sum'));
      expect(goFinding).toBeDefined();
      expect(goFinding!.severity).toBe(Severity.INFO);
    });

    it('no finding if go.mod and go.sum both exist', async () => {
      writeFixture(tmpDir, 'go.mod', 'module example.com/project\ngo 1.21\n');
      writeFixture(tmpDir, 'go.sum', 'some checksum data\n');
      const findings = await scanner.run(createContext(tmpDir));
      const goFinding = findings.find((f) => f.message.includes('go.sum') && f.severity !== Severity.PASS);
      expect(goFinding).toBeUndefined();
    });
  });

  describe('Cargo.toml scanning', () => {
    it('flags wildcard (*) versions as CRITICAL', async () => {
      writeFixture(tmpDir, 'Cargo.toml', '[dependencies]\nserde = "*"\n');
      const findings = await scanner.run(createContext(tmpDir));
      const cargoFinding = findings.find((f) => f.message.includes('serde'));
      expect(cargoFinding).toBeDefined();
      expect(cargoFinding!.severity).toBe(Severity.CRITICAL);
    });

    it('does not flag pinned Cargo dependencies', async () => {
      writeFixture(tmpDir, 'Cargo.toml', '[dependencies]\nserde = "1.0.197"\ntokio = { version = "1.36", features = ["full"] }\n');
      const findings = await scanner.run(createContext(tmpDir));
      const cargoFindings = findings.filter((f) => f.file === 'Cargo.toml');
      expect(cargoFindings).toHaveLength(0);
    });
  });

  describe('missing dependency files', () => {
    it('returns empty findings when no dependency files exist', async () => {
      writeFixture(tmpDir, 'README.md', '# Hello\n');
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });
  });

  describe('finding structure', () => {
    it('creates findings with required fields', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        dependencies: { lodash: '*' },
      }));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toBeDefined();
      expect(f.severity).toBeDefined();
      expect(f.pillar).toBe(Pillar.SECURITY);
      expect(f.category).toBe('dependency-pinning');
      expect(f.message).toBeDefined();
      expect(f.file).toBeDefined();
      expect(f.suggestion).toBeDefined();
    });
  });
});
