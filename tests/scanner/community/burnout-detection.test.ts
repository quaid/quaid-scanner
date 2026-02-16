/**
 * Tests for Maintainer Burnout Detection scanner.
 *
 * Validates latency drift, zombie project detection, and open issue age analysis.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BurnoutDetectionScanner } from '../../../src/scanner/community/burnout-detection.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

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
    githubToken: 'ghp_test_token',
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

let scanner: BurnoutDetectionScanner;

beforeEach(() => {
  scanner = new BurnoutDetectionScanner();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeIssues(
  items: Array<{ daysOld: number; state: string }>,
): Array<{ state: string; created_at: string; closed_at: string | null }> {
  const now = Date.now();
  return items.map((item) => ({
    state: item.state,
    created_at: new Date(now - item.daysOld * 24 * 60 * 60 * 1000).toISOString(),
    closed_at: item.state === 'closed' ? new Date().toISOString() : null,
  }));
}

function makeRelease(daysAgo: number): object {
  return {
    tag_name: 'v1.0.0',
    published_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  };
}

describe('BurnoutDetectionScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('burnout-detection');
      expect(scanner.displayName).toBe('Maintainer Burnout Detection');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('open issue age analysis', () => {
    it('PASS when median open issue age < 30 days', async () => {
      const issues = makeIssues([
        { daysOld: 10, state: 'open' },
        { daysOld: 20, state: 'open' },
        { daysOld: 5, state: 'open' },
      ]);

      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(issues) } as Response)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makeRelease(30)]) } as Response);

      const findings = await scanner.run(makeContext());
      const ageFinding = findings.find((f) => f.metadata?.medianAgeDays !== undefined);
      expect(ageFinding).toBeDefined();
      expect(ageFinding!.severity).toBe(Severity.PASS);
    });

    it('WARNING when median open issue age > 90 days', async () => {
      const issues = makeIssues([
        { daysOld: 100, state: 'open' },
        { daysOld: 120, state: 'open' },
        { daysOld: 95, state: 'open' },
      ]);

      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(issues) } as Response)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makeRelease(30)]) } as Response);

      const findings = await scanner.run(makeContext());
      const ageFinding = findings.find((f) => f.metadata?.medianAgeDays !== undefined);
      expect(ageFinding).toBeDefined();
      expect(ageFinding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('zombie project detection', () => {
    it('flags zombie when no recent releases and low closure', async () => {
      const issues = makeIssues([
        { daysOld: 200, state: 'open' },
        { daysOld: 150, state: 'open' },
        { daysOld: 100, state: 'open' },
        { daysOld: 50, state: 'closed' },
      ]);

      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(issues) } as Response)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makeRelease(200)]) } as Response);

      const findings = await scanner.run(makeContext());
      const zombieFinding = findings.find((f) => f.message.includes('zombie'));
      expect(zombieFinding).toBeDefined();
      expect(zombieFinding!.severity).toBe(Severity.CRITICAL);
    });

    it('does not flag zombie with recent releases', async () => {
      const issues = makeIssues([
        { daysOld: 100, state: 'open' },
        { daysOld: 50, state: 'open' },
      ]);

      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(issues) } as Response)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makeRelease(30)]) } as Response);

      const findings = await scanner.run(makeContext());
      const zombieFinding = findings.find((f) => f.message.includes('zombie'));
      expect(zombieFinding).toBeUndefined();
    });
  });

  describe('closure ratio', () => {
    it('reports healthy closure ratio', async () => {
      const issues = makeIssues([
        { daysOld: 10, state: 'closed' },
        { daysOld: 20, state: 'closed' },
        { daysOld: 5, state: 'open' },
      ]);

      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(issues) } as Response)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makeRelease(30)]) } as Response);

      const findings = await scanner.run(makeContext());
      const closureFinding = findings.find((f) => f.metadata?.closureRatio !== undefined);
      expect(closureFinding).toBeDefined();
    });
  });

  describe('prerequisites', () => {
    it('returns INFO without GitHub token', async () => {
      const ctx = makeContext({ config: { ...makeContext().config, githubToken: null } });
      const findings = await scanner.run(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
    });

    it('returns INFO for non-GitHub repos', async () => {
      const ctx = makeContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://gitlab.com/x/y' },
      });
      const findings = await scanner.run(ctx);
      expect(findings[0].severity).toBe(Severity.INFO);
    });
  });

  describe('error handling', () => {
    it('handles API failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('timeout'));
      const findings = await scanner.run(makeContext());
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
    });
  });
});
