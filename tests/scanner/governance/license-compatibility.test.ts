import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { LicenseCompatibilityScanner } from '../../../src/scanner/governance/license-compatibility.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'license-compat-test-'));
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

describe('LicenseCompatibilityScanner', () => {
  let scanner: LicenseCompatibilityScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new LicenseCompatibilityScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('license-compatibility');
      expect(scanner.displayName).toBe('License Compatibility Analysis');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('no license or dependencies', () => {
    it('returns INFO when no LICENSE file found', async () => {
      writeFixture(tmpDir, 'README.md', '# Test\n');
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find((f) => f.severity === Severity.INFO);
      expect(info).toBeDefined();
    });
  });

  describe('MIT project with permissive deps', () => {
    it('returns PASS when all deps are compatible', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
    });
  });

  describe('MIT project with copyleft dep', () => {
    it('returns CRITICAL when copyleft dependency in permissive project', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'gpl-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/gpl-pkg/package.json',
        JSON.stringify({ name: 'gpl-pkg', license: 'GPL-3.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const critical = findings.find((f) => f.severity === Severity.CRITICAL);
      expect(critical).toBeDefined();
      expect(critical!.message).toContain('copyleft');
    });
  });

  describe('MIT project with weak copyleft dep', () => {
    it('returns WARNING for weak copyleft (LGPL/MPL) in permissive project', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'lgpl-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lgpl-pkg/package.json',
        JSON.stringify({ name: 'lgpl-pkg', license: 'LGPL-3.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const warn = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('weak copyleft'),
      );
      expect(warn).toBeDefined();
    });
  });

  describe('GPL project with GPL dep', () => {
    it('returns PASS for compatible copyleft licenses', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'GNU GENERAL PUBLIC LICENSE\nVersion 3\n29 June 2007',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'gpl-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/gpl-pkg/package.json',
        JSON.stringify({ name: 'gpl-pkg', license: 'GPL-3.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('gpl-pkg'),
      );
      expect(pass).toBeDefined();
    });
  });

  describe('Apache project with attribution check', () => {
    it('returns INFO when Apache dep requires NOTICE but no NOTICE file', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'apache-pkg': '^2.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/apache-pkg/package.json',
        JSON.stringify({ name: 'apache-pkg', license: 'Apache-2.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      // Apache in MIT project is compatible but needs NOTICE
      const info = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('NOTICE'),
      );
      expect(info).toBeDefined();
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('license-compatibility');
      expect(f.pillar).toBe(Pillar.GOVERNANCE);
      expect(f.category).toBe('license-compatibility');
      expect(f.suggestion).toBeDefined();
    });
  });
});
