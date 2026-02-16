import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { GovernanceClassificationScanner } from '../../../src/scanner/governance/governance-classification.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gov-class-test-'));
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

describe('GovernanceClassificationScanner', () => {
  let scanner: GovernanceClassificationScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new GovernanceClassificationScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('governance-classification');
      expect(scanner.displayName).toBe('Governance Model Classification');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('no governance files', () => {
    it('returns INFO when no governance-related files exist', async () => {
      writeFixture(tmpDir, 'README.md', '# My Project\nJust a simple project.\n');
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find((f) => f.severity === Severity.INFO);
      expect(info).toBeDefined();
      expect(info!.message).toContain('No governance model detected');
    });
  });

  describe('BDFL classification', () => {
    it('detects BDFL from explicit keyword', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThis project operates under a BDFL model.\nThe project creator has the final say on all decisions.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('BDFL');
    });

    it('detects BDFL from benevolent dictator language', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThe benevolent dictator for life makes all final decisions.\nThe founder has final say.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('BDFL');
    });
  });

  describe('Meritocracy classification', () => {
    it('detects Meritocracy from explicit keywords', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThis project follows a meritocracy model.\nContributors earn committer status through sustained quality contributions.\nPromotion to maintainer is based on merit.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Meritocracy');
    });
  });

  describe('Foundation-backed classification', () => {
    it('detects Foundation-backed from CNCF keyword', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThis project is a CNCF graduated project.\nThe Technical Steering Committee oversees the project direction.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Foundation-backed');
    });

    it('detects Foundation-backed from Apache Foundation', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThis project follows the Apache Software Foundation governance.\nA board of directors and charter guide the project.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Foundation-backed');
    });

    it('detects Foundation-backed from TSC references', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThe Technical Steering Committee (TSC) makes architectural decisions.\nMembers are elected per the project charter.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Foundation-backed');
    });
  });

  describe('Corporate classification', () => {
    it('detects Corporate from company-sponsored language', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThis project is sponsored by Acme Corp.\nAll development is driven by the company.\nCopyright held by Acme Corp.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Corporate');
    });
  });

  describe('Community classification', () => {
    it('detects Community from consensus-based language', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThis project is governed by community consensus.\nMajor decisions are made democratically through lazy consensus.\nWe use working groups.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Community');
    });
  });

  describe('multiple file locations', () => {
    it('reads from docs/governance.md', async () => {
      writeFixture(
        tmpDir,
        'docs/governance.md',
        '# Governance\nCommunity consensus with democratic voting.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Community');
    });

    it('reads from .github/GOVERNANCE.md', async () => {
      writeFixture(
        tmpDir,
        '.github/GOVERNANCE.md',
        '# Governance\nThis is a Linux Foundation project with a charter and TSC.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Foundation-backed');
    });

    it('reads governance signals from CONTRIBUTING.md', async () => {
      writeFixture(
        tmpDir,
        'CONTRIBUTING.md',
        '# Contributing\n\nThis is a CNCF project. The Technical Steering Committee reviews all proposals.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.governanceModel).toBe('Foundation-backed');
    });
  });

  describe('confidence scoring', () => {
    it('returns confidence score in metadata', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\nBDFL (Benevolent Dictator For Life). The creator has final say.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(typeof pass!.metadata?.confidence).toBe('number');
      expect(pass!.metadata!.confidence as number).toBeGreaterThanOrEqual(0);
      expect(pass!.metadata!.confidence as number).toBeLessThanOrEqual(100);
    });

    it('returns higher confidence with more keyword matches', async () => {
      writeFixture(tmpDir, 'GOVERNANCE.md', '# Governance\nMeritocracy model.\n');
      const findingsLow = await scanner.run(createContext(tmpDir));
      const lowConf = findingsLow.find((f) => f.metadata?.governanceModel === 'Meritocracy');

      fs.rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = createTempDir();
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\n\nThis project follows a meritocracy model.\nContributors earn committer status.\nPromotion is based on merit. Contributions determine your role.\nCommitter access is earned through sustained effort.\n',
      );
      const findingsHigh = await scanner.run(createContext(tmpDir));
      const highConf = findingsHigh.find((f) => f.metadata?.governanceModel === 'Meritocracy');

      expect(lowConf).toBeDefined();
      expect(highConf).toBeDefined();
      expect(highConf!.metadata!.confidence as number).toBeGreaterThan(
        lowConf!.metadata!.confidence as number,
      );
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\nBDFL model with benevolent dictator having final say.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('governance-classification');
      expect(f.pillar).toBe(Pillar.GOVERNANCE);
      expect(f.category).toBe('governance');
      expect(f.suggestion).toBeDefined();
    });

    it('includes governance model and confidence in metadata', async () => {
      writeFixture(
        tmpDir,
        'GOVERNANCE.md',
        '# Governance\nCNCF project with Technical Steering Committee and charter.\n',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata).toHaveProperty('governanceModel');
      expect(pass!.metadata).toHaveProperty('confidence');
      expect(pass!.metadata).toHaveProperty('matchedKeywords');
    });
  });
});
