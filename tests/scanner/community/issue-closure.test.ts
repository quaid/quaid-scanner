/**
 * Tests for Issue Closure Metrics scanner.
 *
 * Validates closure ratio calculation and capacity classification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IssueClosureScanner } from '../../../src/scanner/community/issue-closure.js';
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

function buildRestResponse(opened: number, closed: number): Array<{ state: string; created_at: string; closed_at: string | null }> {
  const items: Array<{ state: string; created_at: string; closed_at: string | null }> = [];
  for (let i = 0; i < closed; i++) {
    items.push({ state: 'closed', created_at: '2026-01-01T00:00:00Z', closed_at: '2026-01-05T00:00:00Z' });
  }
  for (let i = 0; i < opened - closed; i++) {
    items.push({ state: 'open', created_at: '2026-01-01T00:00:00Z', closed_at: null });
  }
  return items;
}

let scanner: IssueClosureScanner;

beforeEach(() => {
  scanner = new IssueClosureScanner();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IssueClosureScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('issue-closure');
      expect(scanner.displayName).toBe('Issue Closure Metrics');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('closure ratio classification', () => {
    it('PASS for sustainable ratio (~1.0)', async () => {
      // 10 opened, 10 closed = ratio 1.0
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(buildRestResponse(10, 10)),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(buildRestResponse(5, 5)),
        } as Response);

      const findings = await scanner.run(makeContext());
      const ratioFinding = findings.find((f) => f.metadata?.closureRatio !== undefined);
      expect(ratioFinding).toBeDefined();
      expect(ratioFinding!.severity).toBe(Severity.PASS);
      expect(ratioFinding!.metadata?.closureRatio).toBe(1);
    });

    it('WARNING for manageable ratio (0.5-0.8)', async () => {
      // 20 issues opened, 14 closed = ratio 0.7
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(buildRestResponse(20, 14)),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);

      const findings = await scanner.run(makeContext());
      const ratioFinding = findings.find((f) => f.metadata?.closureRatio !== undefined);
      expect(ratioFinding).toBeDefined();
      expect(ratioFinding!.severity).toBe(Severity.WARNING);
    });

    it('CRITICAL for overwhelmed ratio (< 0.5)', async () => {
      // 20 issues opened, 8 closed = ratio 0.4
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(buildRestResponse(20, 8)),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);

      const findings = await scanner.run(makeContext());
      const ratioFinding = findings.find((f) => f.metadata?.closureRatio !== undefined);
      expect(ratioFinding).toBeDefined();
      expect(ratioFinding!.severity).toBe(Severity.CRITICAL);
    });

    it('INFO for manageable-sustainable range (0.8-1.0)', async () => {
      // 10 issues opened, 9 closed = ratio 0.9
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(buildRestResponse(10, 9)),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);

      const findings = await scanner.run(makeContext());
      const ratioFinding = findings.find((f) => f.metadata?.closureRatio !== undefined);
      expect(ratioFinding).toBeDefined();
      // 0.8-1.0 is manageable but not critical
      expect([Severity.PASS, Severity.INFO]).toContain(ratioFinding!.severity);
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
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
    });
  });

  describe('combined issues and PRs', () => {
    it('combines issue and PR closure ratios', async () => {
      // Issues: 10 opened, 8 closed; PRs: 5 opened, 5 closed
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(buildRestResponse(10, 8)),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(buildRestResponse(5, 5)),
        } as Response);

      const findings = await scanner.run(makeContext());
      const ratioFinding = findings.find((f) => f.metadata?.closureRatio !== undefined);
      expect(ratioFinding).toBeDefined();
      // (8+5) / (10+5) = 0.87
      expect(ratioFinding!.metadata?.closureRatio).toBeCloseTo(0.87, 1);
    });
  });

  describe('error handling', () => {
    it('handles API failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'));
      const findings = await scanner.run(makeContext());
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
    });

    it('handles empty results', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);

      const findings = await scanner.run(makeContext());
      const empty = findings.find((f) => f.message.includes('No issues or pull requests'));
      expect(empty).toBeDefined();
    });
  });
});
