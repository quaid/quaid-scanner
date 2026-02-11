import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { GovernanceDetectionScanner } from '../../../src/scanner/governance/governance-detection.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'governance-test-'));
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

describe('GovernanceDetectionScanner', () => {
  let scanner: GovernanceDetectionScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new GovernanceDetectionScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('governance-detection');
      expect(scanner.displayName).toBe('Governance File Detection');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('governance file detection in root', () => {
    it('detects GOVERNANCE.md in root', async () => {
      writeFixture(tmpDir, 'GOVERNANCE.md', '# Governance\nThis project uses consensus-based governance.\n');
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
      expect(passFinding!.message).toContain('GOVERNANCE.md');
    });

    it('detects GOVERNANCE (no extension) in root', async () => {
      writeFixture(tmpDir, 'GOVERNANCE', '# Governance\nDecision process documented here.\n');
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
    });
  });

  describe('governance file detection in docs/', () => {
    it('detects docs/governance.md', async () => {
      writeFixture(tmpDir, 'docs/governance.md', '# Governance Model\n');
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
      expect(passFinding!.message).toContain('docs/governance.md');
    });

    it('detects docs/GOVERNANCE.md', async () => {
      writeFixture(tmpDir, 'docs/GOVERNANCE.md', '# Project Governance\n');
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
    });
  });

  describe('governance file detection in .github/', () => {
    it('detects .github/GOVERNANCE.md', async () => {
      writeFixture(tmpDir, '.github/GOVERNANCE.md', '# Community Governance\n');
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
      expect(passFinding!.message).toContain('.github/GOVERNANCE.md');
    });
  });

  describe('missing governance file', () => {
    it('returns INFO when no governance file exists', async () => {
      writeFixture(tmpDir, 'README.md', '# Project\n');
      const findings = await scanner.run(createContext(tmpDir));
      const infoFinding = findings.find((f) => f.severity === Severity.INFO);
      expect(infoFinding).toBeDefined();
      expect(infoFinding!.message).toContain('No governance');
    });
  });

  describe('metadata extraction', () => {
    it('stores governance file content in metadata', async () => {
      const content = '# Governance\nThis project uses BDFL governance.\n';
      writeFixture(tmpDir, 'GOVERNANCE.md', content);
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
      expect(passFinding!.metadata?.content).toBe(content);
    });

    it('stores file path in metadata', async () => {
      writeFixture(tmpDir, 'GOVERNANCE.md', '# Governance\n');
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding!.metadata?.filePath).toBe('GOVERNANCE.md');
    });
  });

  describe('empty governance file', () => {
    it('returns INFO for empty governance file', async () => {
      writeFixture(tmpDir, 'GOVERNANCE.md', '');
      const findings = await scanner.run(createContext(tmpDir));
      const infoFinding = findings.find((f) => f.severity === Severity.INFO);
      expect(infoFinding).toBeDefined();
      expect(infoFinding!.message).toContain('empty');
    });
  });

  describe('whitespace-only governance file', () => {
    it('returns INFO for whitespace-only governance file', async () => {
      writeFixture(tmpDir, 'GOVERNANCE.md', '   \n  \n  ');
      const findings = await scanner.run(createContext(tmpDir));
      const infoFinding = findings.find((f) => f.severity === Severity.INFO);
      expect(infoFinding).toBeDefined();
    });
  });

  describe('priority order', () => {
    it('picks the first found file in priority order', async () => {
      writeFixture(tmpDir, 'GOVERNANCE.md', '# Root governance\n');
      writeFixture(tmpDir, 'docs/governance.md', '# Docs governance\n');
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
      expect(passFinding!.message).toContain('GOVERNANCE.md');
      expect(passFinding!.metadata?.filePath).toBe('GOVERNANCE.md');
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      writeFixture(tmpDir, 'GOVERNANCE.md', '# Governance\n');
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('governance-detection');
      expect(f.pillar).toBe(Pillar.GOVERNANCE);
      expect(f.category).toBe('governance');
      expect(f.suggestion).toBeDefined();
    });
  });
});
