/**
 * Tests for Contributor Funnel Analysis scanner.
 *
 * Validates cohort classification (casual/regular/core), conversion rates,
 * churn detection, and revolving door warnings.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContributorFunnelScanner } from '../../../src/scanner/community/contributor-funnel.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';
import { execSync } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

function makeContext(overrides: Partial<ScanContext> = {}): ScanContext {
  const config: ScannerConfig = {
    maturity: MaturityLevel.INCUBATING,
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
    pillars: { disabled: [], weights: {}, disabledScanners: [] },
    bots: { enabled: true, additional: [], exclude: [] },
    inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
  };

  return {
    repoPath: '/tmp/test-repo',
    repoIdentifier: 'owner/repo',
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: 'abc123', branch: 'main', remoteUrl: 'https://github.com/owner/repo.git' },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

let scanner: ContributorFunnelScanner;

beforeEach(() => {
  scanner = new ContributorFunnelScanner();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function generateEmails(counts: Record<string, number>): string {
  const lines: string[] = [];
  for (const [email, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) lines.push(email);
  }
  return lines.join('\n') + '\n';
}

describe('ContributorFunnelScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('contributor-funnel');
      expect(scanner.displayName).toBe('Contributor Funnel Analysis');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('cohort classification', () => {
    it('classifies casual contributors (1-5 commits)', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({ 'casual1@test.com': 2, 'casual2@test.com': 3 }),
      ));

      const findings = await scanner.run(makeContext());
      const cohort = findings.find((f) => f.metadata?.casual !== undefined);
      expect(cohort).toBeDefined();
      expect(cohort!.metadata?.casual).toBe(2);
    });

    it('classifies regular contributors (6-50 commits)', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({ 'regular@test.com': 20, 'casual@test.com': 3 }),
      ));

      const findings = await scanner.run(makeContext());
      const cohort = findings.find((f) => f.metadata?.regular !== undefined);
      expect(cohort).toBeDefined();
      expect(cohort!.metadata?.regular).toBe(1);
    });

    it('classifies core contributors (50+ commits)', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({ 'core@test.com': 60, 'regular@test.com': 15, 'casual@test.com': 2 }),
      ));

      const findings = await scanner.run(makeContext());
      const cohort = findings.find((f) => f.metadata?.core !== undefined);
      expect(cohort).toBeDefined();
      expect(cohort!.metadata?.core).toBe(1);
      expect(cohort!.metadata?.regular).toBe(1);
      expect(cohort!.metadata?.casual).toBe(1);
    });
  });

  describe('conversion rates', () => {
    it('calculates casual to regular conversion rate', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({
          'core@test.com': 60,
          'reg1@test.com': 20,
          'reg2@test.com': 10,
          'cas1@test.com': 3,
          'cas2@test.com': 2,
          'cas3@test.com': 1,
          'cas4@test.com': 4,
          'cas5@test.com': 1,
        }),
      ));

      const findings = await scanner.run(makeContext());
      const convFinding = findings.find((f) => f.metadata?.casualToRegularPct !== undefined);
      expect(convFinding).toBeDefined();
      // 2 regulars / 5 casuals = 40%
      expect(convFinding!.metadata?.casualToRegularPct).toBe(40);
    });

    it('calculates regular to core conversion rate', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({
          'core@test.com': 60,
          'reg1@test.com': 20,
          'reg2@test.com': 10,
          'cas1@test.com': 3,
        }),
      ));

      const findings = await scanner.run(makeContext());
      const convFinding = findings.find((f) => f.metadata?.regularToCorePct !== undefined);
      expect(convFinding).toBeDefined();
      // 1 core / 2 regulars = 50%
      expect(convFinding!.metadata?.regularToCorePct).toBe(50);
    });
  });

  describe('revolving door warning', () => {
    it('warns when >80% of contributors are casual', async () => {
      // 9 casual, 1 regular = 90% casual
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({
          'reg@test.com': 10,
          'c1@test.com': 1,
          'c2@test.com': 2,
          'c3@test.com': 3,
          'c4@test.com': 1,
          'c5@test.com': 2,
          'c6@test.com': 1,
          'c7@test.com': 3,
          'c8@test.com': 1,
          'c9@test.com': 2,
        }),
      ));

      const findings = await scanner.run(makeContext());
      const revolving = findings.find((f) => f.message.includes('revolving door'));
      expect(revolving).toBeDefined();
      expect(revolving!.severity).toBe(Severity.WARNING);
    });

    it('does not warn when casual ratio is reasonable', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({
          'core@test.com': 60,
          'reg1@test.com': 20,
          'reg2@test.com': 15,
          'cas1@test.com': 3,
          'cas2@test.com': 2,
        }),
      ));

      const findings = await scanner.run(makeContext());
      const revolving = findings.find((f) => f.message.includes('revolving door'));
      expect(revolving).toBeUndefined();
    });
  });

  describe('healthy funnel benchmark', () => {
    it('PASS when casual-to-regular conversion > 10%', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({
          'reg1@test.com': 20,
          'reg2@test.com': 15,
          'cas1@test.com': 3,
          'cas2@test.com': 2,
          'cas3@test.com': 1,
        }),
      ));

      const findings = await scanner.run(makeContext());
      const convFinding = findings.find((f) => f.metadata?.casualToRegularPct !== undefined);
      expect(convFinding).toBeDefined();
      // 2 regular / 3 casual = 66%
      expect(convFinding!.severity).toBe(Severity.PASS);
    });

    it('WARNING when casual-to-regular conversion <= 10%', async () => {
      // 1 regular, 20 casuals = 5% conversion
      const casuals: Record<string, number> = {};
      for (let i = 0; i < 20; i++) casuals[`c${i}@test.com`] = 2;
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        generateEmails({ 'reg@test.com': 10, ...casuals }),
      ));

      const findings = await scanner.run(makeContext());
      const convFinding = findings.find((f) => f.metadata?.casualToRegularPct !== undefined);
      expect(convFinding).toBeDefined();
      expect(convFinding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('error handling', () => {
    it('handles git log failure', async () => {
      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('not a git repo');
      });

      const findings = await scanner.run(makeContext());
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
    });

    it('handles empty git log', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(''));

      const findings = await scanner.run(makeContext());
      const empty = findings.find((f) => f.message.includes('No commits'));
      expect(empty).toBeDefined();
    });
  });
});
