import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AssetProtectionScanner } from '../../../src/scanner/governance/asset-protection.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'asset-protection-test-'));
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

describe('AssetProtectionScanner', () => {
  let scanner: AssetProtectionScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new AssetProtectionScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('asset-protection');
      expect(scanner.displayName).toBe('Asset Protection & Legal Barriers');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('trademark detection', () => {
    it('returns PASS when TRADEMARK.md is present', async () => {
      writeFixture(tmpDir, 'TRADEMARK.md', '# Trademark Policy\nOur marks are protected.\n');
      const findings = await scanner.run(createContext(tmpDir));
      const trademarkFinding = findings.find(
        (f) => f.category === 'trademark' && f.severity === Severity.PASS,
      );
      expect(trademarkFinding).toBeDefined();
      expect(trademarkFinding!.message).toContain('Trademark');
    });

    it('returns PASS when TRADEMARK (no extension) is present', async () => {
      writeFixture(tmpDir, 'TRADEMARK', '# Trademark\nUse policy.\n');
      const findings = await scanner.run(createContext(tmpDir));
      const trademarkFinding = findings.find(
        (f) => f.category === 'trademark' && f.severity === Severity.PASS,
      );
      expect(trademarkFinding).toBeDefined();
    });

    it('returns PASS when docs/trademark.md is present', async () => {
      writeFixture(tmpDir, 'docs/trademark.md', '# Trademark Usage\n');
      const findings = await scanner.run(createContext(tmpDir));
      const trademarkFinding = findings.find(
        (f) => f.category === 'trademark' && f.severity === Severity.PASS,
      );
      expect(trademarkFinding).toBeDefined();
    });

    it('returns PASS when BRAND.md is present', async () => {
      writeFixture(tmpDir, 'BRAND.md', '# Brand Guidelines\n');
      const findings = await scanner.run(createContext(tmpDir));
      const trademarkFinding = findings.find(
        (f) => f.category === 'trademark' && f.severity === Severity.PASS,
      );
      expect(trademarkFinding).toBeDefined();
    });

    it('returns INFO when no trademark file exists', async () => {
      writeFixture(tmpDir, 'README.md', '# Project\n');
      const findings = await scanner.run(createContext(tmpDir));
      const trademarkFinding = findings.find((f) => f.category === 'trademark');
      expect(trademarkFinding).toBeDefined();
      expect(trademarkFinding!.severity).toBe(Severity.INFO);
      expect(trademarkFinding!.message).toContain('No trademark');
    });
  });

  describe('export control detection', () => {
    it('returns PASS when EXPORT-CONTROL.md is present', async () => {
      writeFixture(tmpDir, 'EXPORT-CONTROL.md', '# Export Control\nCompliance info.\n');
      const findings = await scanner.run(createContext(tmpDir));
      const exportFinding = findings.find(
        (f) => f.category === 'export-control' && f.severity === Severity.PASS,
      );
      expect(exportFinding).toBeDefined();
      expect(exportFinding!.message).toContain('Export control');
    });

    it('returns PASS when EXPORT_CONTROL is present', async () => {
      writeFixture(tmpDir, 'EXPORT_CONTROL', '# Export Control\n');
      const findings = await scanner.run(createContext(tmpDir));
      const exportFinding = findings.find(
        (f) => f.category === 'export-control' && f.severity === Severity.PASS,
      );
      expect(exportFinding).toBeDefined();
    });

    it('returns PASS when docs/export-control.md is present', async () => {
      writeFixture(tmpDir, 'docs/export-control.md', '# Export\n');
      const findings = await scanner.run(createContext(tmpDir));
      const exportFinding = findings.find(
        (f) => f.category === 'export-control' && f.severity === Severity.PASS,
      );
      expect(exportFinding).toBeDefined();
    });

    it('returns INFO when no export control file exists', async () => {
      writeFixture(tmpDir, 'README.md', '# Project\n');
      const findings = await scanner.run(createContext(tmpDir));
      const exportFinding = findings.find((f) => f.category === 'export-control');
      expect(exportFinding).toBeDefined();
      expect(exportFinding!.severity).toBe(Severity.INFO);
      expect(exportFinding!.message).toContain('No export control');
    });
  });

  describe('CLA detection', () => {
    it('returns PASS with High friction when CLA file and bot config exist', async () => {
      writeFixture(tmpDir, 'CLA.md', '# Contributor License Agreement\n');
      writeFixture(tmpDir, '.github/.clabot', '{ "message": "Please sign CLA" }');
      const findings = await scanner.run(createContext(tmpDir));
      const claFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(claFinding).toBeDefined();
      expect(claFinding!.message).toContain('CLA');
      expect(claFinding!.message).toContain('automation');
    });

    it('returns PASS when CLA file and .cla.json config exist', async () => {
      writeFixture(tmpDir, 'CLA', '# CLA\n');
      writeFixture(tmpDir, '.github/.cla.json', '{ "signees": [] }');
      const findings = await scanner.run(createContext(tmpDir));
      const claFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(claFinding).toBeDefined();
    });

    it('returns PASS when CLA file and cla.yml workflow exist', async () => {
      writeFixture(tmpDir, '.cla', 'CLA content\n');
      writeFixture(tmpDir, '.github/workflows/cla.yml', 'name: CLA\non: pull_request\n');
      const findings = await scanner.run(createContext(tmpDir));
      const claFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(claFinding).toBeDefined();
    });

    it('returns PASS when contributor-license-agreement.md exists with automation', async () => {
      writeFixture(tmpDir, 'contributor-license-agreement.md', '# CLA\n');
      writeFixture(tmpDir, '.github/.clabot', '{}');
      const findings = await scanner.run(createContext(tmpDir));
      const claFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(claFinding).toBeDefined();
    });

    it('returns WARNING when CLA file exists but no automation', async () => {
      writeFixture(tmpDir, 'CLA.md', '# CLA\nSign before contributing.\n');
      const findings = await scanner.run(createContext(tmpDir));
      const claWarning = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.WARNING,
      );
      expect(claWarning).toBeDefined();
      expect(claWarning!.message).toContain('CLA');
      expect(claWarning!.message).toContain('no automation');
    });

    it('detects CLA workflow in GitHub Actions containing cla-assistant action', async () => {
      writeFixture(tmpDir, 'CLA.md', '# CLA\n');
      writeFixture(
        tmpDir,
        '.github/workflows/ci.yml',
        'name: CI\nsteps:\n  - uses: contributor-assistant/github-action@v2\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const claFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(claFinding).toBeDefined();
    });
  });

  describe('DCO detection', () => {
    it('returns PASS with Medium friction when DCO file exists', async () => {
      writeFixture(tmpDir, 'DCO', '# Developer Certificate of Origin\n');
      const findings = await scanner.run(createContext(tmpDir));
      const dcoFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(dcoFinding).toBeDefined();
      expect(dcoFinding!.message).toContain('DCO');
    });

    it('returns PASS when DCO.md exists', async () => {
      writeFixture(tmpDir, 'DCO.md', '# DCO\n');
      const findings = await scanner.run(createContext(tmpDir));
      const dcoFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(dcoFinding).toBeDefined();
    });

    it('returns PASS when .github/dco.yml exists', async () => {
      writeFixture(tmpDir, '.github/dco.yml', 'require: true\n');
      const findings = await scanner.run(createContext(tmpDir));
      const dcoFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(dcoFinding).toBeDefined();
    });

    it('detects DCO requirement from CONTRIBUTING.md mentioning sign-off', async () => {
      writeFixture(
        tmpDir,
        'CONTRIBUTING.md',
        '# Contributing\n\nAll commits must include a Signed-off-by line.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const dcoFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(dcoFinding).toBeDefined();
      expect(dcoFinding!.message).toContain('DCO');
    });

    it('detects DCO requirement from CONTRIBUTING.md mentioning DCO', async () => {
      writeFixture(
        tmpDir,
        'CONTRIBUTING.md',
        '# Contributing\n\nWe require DCO compliance.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const dcoFinding = findings.find(
        (f) => f.category === 'cla-dco' && f.severity === Severity.PASS,
      );
      expect(dcoFinding).toBeDefined();
    });
  });

  describe('friction classification', () => {
    it('classifies Low friction when no CLA/DCO requirement', async () => {
      writeFixture(tmpDir, 'README.md', '# Project\n');
      const findings = await scanner.run(createContext(tmpDir));
      const frictionFinding = findings.find((f) => f.category === 'friction-level');
      expect(frictionFinding).toBeDefined();
      expect(frictionFinding!.severity).toBe(Severity.INFO);
      expect(frictionFinding!.metadata?.frictionLevel).toBe('Low');
    });

    it('classifies Medium friction for DCO only', async () => {
      writeFixture(tmpDir, 'DCO', '# DCO\n');
      const findings = await scanner.run(createContext(tmpDir));
      const frictionFinding = findings.find((f) => f.category === 'friction-level');
      expect(frictionFinding).toBeDefined();
      expect(frictionFinding!.metadata?.frictionLevel).toBe('Medium');
    });

    it('classifies High friction for CLA with automation', async () => {
      writeFixture(tmpDir, 'CLA.md', '# CLA\n');
      writeFixture(tmpDir, '.github/.clabot', '{}');
      const findings = await scanner.run(createContext(tmpDir));
      const frictionFinding = findings.find((f) => f.category === 'friction-level');
      expect(frictionFinding).toBeDefined();
      expect(frictionFinding!.metadata?.frictionLevel).toBe('High');
    });

    it('classifies Very High friction for CLA without automation', async () => {
      writeFixture(tmpDir, 'CLA.md', '# CLA\nPlease sign.\n');
      const findings = await scanner.run(createContext(tmpDir));
      const frictionFinding = findings.find((f) => f.category === 'friction-level');
      expect(frictionFinding).toBeDefined();
      expect(frictionFinding!.metadata?.frictionLevel).toBe('Very High');
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      writeFixture(tmpDir, 'TRADEMARK.md', '# Trademark\n');
      writeFixture(tmpDir, 'CLA.md', '# CLA\n');
      writeFixture(tmpDir, '.github/.clabot', '{}');
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThanOrEqual(4);
      for (const f of findings) {
        expect(f.id).toContain('asset-protection');
        expect(f.pillar).toBe(Pillar.GOVERNANCE);
        expect(typeof f.category).toBe('string');
        expect(typeof f.message).toBe('string');
        expect(typeof f.suggestion).toBe('string');
        expect(f.severity).toBeDefined();
      }
    });

    it('returns findings for all four categories', async () => {
      writeFixture(tmpDir, 'README.md', '# Project\n');
      const findings = await scanner.run(createContext(tmpDir));
      const categories = findings.map((f) => f.category);
      expect(categories).toContain('trademark');
      expect(categories).toContain('export-control');
      expect(categories).toContain('cla-dco');
      expect(categories).toContain('friction-level');
    });
  });

  describe('empty repo', () => {
    it('returns INFO findings for all categories when repo is empty', async () => {
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBe(4);
      const trademarkFinding = findings.find((f) => f.category === 'trademark');
      const exportFinding = findings.find((f) => f.category === 'export-control');
      const claDcoFinding = findings.find((f) => f.category === 'cla-dco');
      const frictionFinding = findings.find((f) => f.category === 'friction-level');
      expect(trademarkFinding!.severity).toBe(Severity.INFO);
      expect(exportFinding!.severity).toBe(Severity.INFO);
      expect(claDcoFinding!.severity).toBe(Severity.INFO);
      expect(frictionFinding!.severity).toBe(Severity.INFO);
      expect(frictionFinding!.metadata?.frictionLevel).toBe('Low');
    });
  });
});
