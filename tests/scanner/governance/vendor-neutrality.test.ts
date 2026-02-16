import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { VendorNeutralityScanner } from '../../../src/scanner/governance/vendor-neutrality.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';

const mockedExecSync = vi.mocked(execSync);

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-neutrality-test-'));
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

/** Build a git log output string from an array of emails. */
function buildGitLogOutput(emails: string[]): string {
  return emails.join('\n') + '\n';
}

/** Helper to set mock return value (cast needed for execSync overloads). */
function mockGitLog(output: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedExecSync.mockReturnValue(output as any);
}

describe('VendorNeutralityScanner', () => {
  let scanner: VendorNeutralityScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new VendorNeutralityScanner();
    tmpDir = createTempDir();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('vendor-neutrality');
      expect(scanner.displayName).toBe('Vendor Neutrality Analysis');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('single vendor > 90% commits', () => {
    it('returns CRITICAL when one domain has > 90% of commits', async () => {
      const emails = [
        ...Array(95).fill('dev1@bigcorp.com'),
        ...Array(5).fill('contributor@other.org'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const critical = findings.find((f) => f.severity === Severity.CRITICAL);

      expect(critical).toBeDefined();
      expect(critical!.message).toContain('bigcorp.com');
      expect(critical!.message).toContain('95');
      expect(critical!.category).toBe('vendor-neutrality');
    });
  });

  describe('single vendor 70-90% commits', () => {
    it('returns WARNING when one domain has 70-90% of commits', async () => {
      const emails = [
        ...Array(75).fill('dev@megacorp.io'),
        ...Array(25).fill('person@indie.dev'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const warning = findings.find((f) => f.severity === Severity.WARNING);

      expect(warning).toBeDefined();
      expect(warning!.message).toContain('megacorp.io');
      expect(warning!.message).toContain('75');
    });
  });

  describe('diverse contributors', () => {
    it('returns PASS when no single vendor exceeds 70%', async () => {
      const emails = [
        ...Array(30).fill('alice@companyA.com'),
        ...Array(30).fill('bob@companyB.com'),
        ...Array(20).fill('carol@companyC.org'),
        ...Array(20).fill('dave@companyD.io'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.toLowerCase().includes('diversity')
      );

      expect(pass).toBeDefined();
    });
  });

  describe('github noreply domain normalization', () => {
    it('groups noreply.github.com and users.noreply.github.com together', async () => {
      const emails = [
        ...Array(40).fill('user1@users.noreply.github.com'),
        ...Array(35).fill('user2@noreply.github.com'),
        ...Array(25).fill('dev@realcompany.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const concentration = findings.find(
        (f) => f.severity === Severity.WARNING || f.severity === Severity.CRITICAL
      );

      // 75% should be github-noreply, triggering WARNING
      expect(concentration).toBeDefined();
      expect(concentration!.message).toContain('github-noreply');
    });
  });

  describe('no git history', () => {
    it('returns INFO when git log returns empty output', async () => {
      mockGitLog('');

      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find(
        (f) => f.severity === Severity.INFO && f.message.toLowerCase().includes('no git')
      );

      expect(info).toBeDefined();
    });
  });

  describe('not a git repo', () => {
    it('returns INFO when git command fails', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find((f) => f.severity === Severity.INFO);

      expect(info).toBeDefined();
      expect(info!.message).toMatch(/git/i);
    });
  });

  describe('succession planning keywords found', () => {
    it('returns PASS when GOVERNANCE.md contains succession keywords', async () => {
      const emails = [
        ...Array(50).fill('dev@companyA.com'),
        ...Array(50).fill('dev@companyB.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));
      writeFixture(tmpDir, 'GOVERNANCE.md', '# Governance\n\nWe have a succession plan for maintainer transition.\n');

      const findings = await scanner.run(createContext(tmpDir));
      const successionPass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.toLowerCase().includes('succession')
      );

      expect(successionPass).toBeDefined();
    });

    it('detects succession keywords in CONTRIBUTING.md', async () => {
      const emails = [
        ...Array(50).fill('dev@companyA.com'),
        ...Array(50).fill('dev@companyB.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));
      writeFixture(tmpDir, 'CONTRIBUTING.md', '# Contributing\n\nMaintainer emeritus process is documented here.\n');

      const findings = await scanner.run(createContext(tmpDir));
      const successionPass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.toLowerCase().includes('succession')
      );

      expect(successionPass).toBeDefined();
    });

    it('detects bus factor keyword in README.md', async () => {
      const emails = [
        ...Array(50).fill('dev@companyA.com'),
        ...Array(50).fill('dev@companyB.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));
      writeFixture(tmpDir, 'README.md', '# Project\n\nWe address bus factor risk by having multiple maintainers.\n');

      const findings = await scanner.run(createContext(tmpDir));
      const successionPass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.toLowerCase().includes('succession')
      );

      expect(successionPass).toBeDefined();
    });
  });

  describe('no succession planning', () => {
    it('returns INFO when no succession planning keywords are found', async () => {
      const emails = [
        ...Array(50).fill('dev@companyA.com'),
        ...Array(50).fill('dev@companyB.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));
      writeFixture(tmpDir, 'README.md', '# Project\n\nJust a regular project readme.\n');

      const findings = await scanner.run(createContext(tmpDir));
      const successionInfo = findings.find(
        (f) => f.severity === Severity.INFO && f.message.toLowerCase().includes('succession')
      );

      expect(successionInfo).toBeDefined();
    });
  });

  describe('finding structure and metadata', () => {
    it('includes expected metadata for vendor concentration findings', async () => {
      const emails = [
        ...Array(80).fill('dev@dominant.com'),
        ...Array(20).fill('person@other.org'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const concentration = findings.find(
        (f) => f.severity === Severity.WARNING || f.severity === Severity.CRITICAL
      );

      expect(concentration).toBeDefined();
      expect(concentration!.id).toContain('vendor-neutrality');
      expect(concentration!.pillar).toBe(Pillar.GOVERNANCE);
      expect(concentration!.category).toBe('vendor-neutrality');
      expect(concentration!.file).toBeNull();
      expect(concentration!.line).toBeNull();
      expect(concentration!.column).toBeNull();
      expect(concentration!.suggestion).toBeDefined();

      const meta = concentration!.metadata as Record<string, unknown>;
      expect(meta).toBeDefined();
      expect(meta.totalCommits).toBe(100);
      expect(meta.uniqueDomains).toBe(2);
      expect(meta.topDomains).toBeDefined();
      expect(Array.isArray(meta.topDomains)).toBe(true);
    });

    it('includes domain info in topDomains metadata', async () => {
      const emails = [
        ...Array(60).fill('dev@alpha.com'),
        ...Array(40).fill('dev@beta.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const domainInfo = findings.find((f) => f.severity === Severity.INFO && f.metadata?.uniqueDomains);

      expect(domainInfo).toBeDefined();
      const meta = domainInfo!.metadata as Record<string, unknown>;
      const topDomains = meta.topDomains as Array<{ domain: string; count: number; pct: number }>;
      expect(topDomains.length).toBe(2);
      expect(topDomains[0].domain).toBe('alpha.com');
      expect(topDomains[0].count).toBe(60);
      expect(topDomains[0].pct).toBe(60);
    });

    it('includes successionPlanFound in metadata', async () => {
      const emails = [
        ...Array(50).fill('dev@companyA.com'),
        ...Array(50).fill('dev@companyB.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));
      writeFixture(tmpDir, 'GOVERNANCE.md', '# Governance\n\nSuccession plan documented.\n');

      const findings = await scanner.run(createContext(tmpDir));
      const successionFinding = findings.find(
        (f) => f.severity === Severity.PASS && f.message.toLowerCase().includes('succession')
      );

      expect(successionFinding).toBeDefined();
      expect(successionFinding!.metadata?.successionPlanFound).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles emails without @ sign gracefully', async () => {
      const emails = [
        ...Array(50).fill('invalid-email'),
        ...Array(50).fill('dev@company.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      // Should not throw; invalid emails grouped under "unknown"
      expect(findings.length).toBeGreaterThan(0);
    });

    it('handles single commit repo', async () => {
      mockGitLog('solo@dev.com\n');

      const findings = await scanner.run(createContext(tmpDir));
      const critical = findings.find((f) => f.severity === Severity.CRITICAL);
      expect(critical).toBeDefined();
      expect(critical!.message).toContain('100');
    });

    it('percentage is exactly 70% does not trigger WARNING', async () => {
      const emails = [
        ...Array(70).fill('dev@exact.com'),
        ...Array(30).fill('dev@other.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      // 70% is the boundary -- "> 70" means 70 exactly should NOT trigger WARNING
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.toLowerCase().includes('diversity')
      );
      expect(pass).toBeDefined();
    });

    it('percentage at 71% triggers WARNING', async () => {
      const emails = [
        ...Array(71).fill('dev@dominant.com'),
        ...Array(29).fill('dev@other.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const warning = findings.find((f) => f.severity === Severity.WARNING);
      expect(warning).toBeDefined();
    });

    it('percentage at 90% triggers WARNING not CRITICAL', async () => {
      const emails = [
        ...Array(90).fill('dev@dominant.com'),
        ...Array(10).fill('dev@other.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const warning = findings.find((f) => f.severity === Severity.WARNING);
      expect(warning).toBeDefined();
      const critical = findings.find((f) => f.severity === Severity.CRITICAL);
      expect(critical).toBeUndefined();
    });

    it('percentage at 91% triggers CRITICAL', async () => {
      const emails = [
        ...Array(91).fill('dev@dominant.com'),
        ...Array(9).fill('dev@other.com'),
      ];
      mockGitLog(buildGitLogOutput(emails));

      const findings = await scanner.run(createContext(tmpDir));
      const critical = findings.find((f) => f.severity === Severity.CRITICAL);
      expect(critical).toBeDefined();
    });
  });
});
