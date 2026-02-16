/**
 * Tests for Response Time Classification scanner.
 *
 * Validates health classification of response times with
 * median/p90/p99 calculations and latency drift detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResponseClassificationScanner } from '../../../src/scanner/community/response-classification.js';
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
    git: {
      commitSha: 'abc123',
      branch: 'main',
      remoteUrl: 'https://github.com/owner/repo.git',
    },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

function buildGraphQLResponse(
  issues: Array<{ createdAt: string; comments: Array<{ createdAt: string; login: string }> }>,
  pullRequests: Array<{ createdAt: string; comments: Array<{ createdAt: string; login: string }> }>,
): object {
  return {
    data: {
      repository: {
        issues: {
          nodes: issues.map((iss, i) => ({
            number: i + 1,
            createdAt: iss.createdAt,
            comments: {
              nodes: iss.comments.map((c) => ({
                createdAt: c.createdAt,
                author: { login: c.login },
              })),
            },
          })),
        },
        pullRequests: {
          nodes: pullRequests.map((pr, i) => ({
            number: i + 100,
            createdAt: pr.createdAt,
            comments: {
              nodes: pr.comments.map((c) => ({
                createdAt: c.createdAt,
                author: { login: c.login },
              })),
            },
          })),
        },
      },
    },
  };
}

let scanner: ResponseClassificationScanner;

beforeEach(() => {
  scanner = new ResponseClassificationScanner();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResponseClassificationScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('response-classification');
      expect(scanner.displayName).toBe('Response Time Classification');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('percentile calculations', () => {
    it('calculates median, p90, and p99 for issues', async () => {
      // Create 10 issues with varying response times (2h to 20h)
      const issues = Array.from({ length: 10 }, (_, i) => ({
        createdAt: '2026-01-01T00:00:00Z',
        comments: [{ createdAt: `2026-01-01T${String((i + 1) * 2).padStart(2, '0')}:00:00Z`, login: 'reviewer' }],
      }));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(buildGraphQLResponse(issues, [])),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const statsFinding = findings.find((f) => f.metadata?.p90Hours !== undefined);
      expect(statsFinding).toBeDefined();
      expect(statsFinding!.metadata?.medianHours).toBeDefined();
      expect(statsFinding!.metadata?.p90Hours).toBeDefined();
      expect(statsFinding!.metadata?.p99Hours).toBeDefined();
    });

    it('calculates separate metrics for issues and PRs', async () => {
      const response = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-01T10:00:00Z', login: 'r' }] },
        ],
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-01T02:00:00Z', login: 'r' }] },
        ],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const issueFinding = findings.find((f) => f.message.includes('Issue'));
      const prFinding = findings.find((f) => f.message.includes('PR'));
      expect(issueFinding).toBeDefined();
      expect(prFinding).toBeDefined();
    });
  });

  describe('health classification', () => {
    it('classifies healthy response time (< 48h)', async () => {
      const response = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-01T06:00:00Z', login: 'r' }] },
          { createdAt: '2026-01-02T00:00:00Z', comments: [{ createdAt: '2026-01-02T12:00:00Z', login: 'r' }] },
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);

      const findings = await scanner.run(makeContext());
      const classification = findings.find((f) => f.message.includes('Issue'));
      expect(classification!.severity).toBe(Severity.PASS);
    });

    it('classifies warning response time (48h - 7d)', async () => {
      const response = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-04T00:00:00Z', login: 'r' }] },
          { createdAt: '2026-01-05T00:00:00Z', comments: [{ createdAt: '2026-01-08T00:00:00Z', login: 'r' }] },
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);

      const findings = await scanner.run(makeContext());
      const classification = findings.find((f) => f.message.includes('Issue'));
      expect(classification!.severity).toBe(Severity.WARNING);
    });

    it('classifies critical response time (> 7d)', async () => {
      const response = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-15T00:00:00Z', login: 'r' }] },
          { createdAt: '2026-01-05T00:00:00Z', comments: [{ createdAt: '2026-01-20T00:00:00Z', login: 'r' }] },
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);

      const findings = await scanner.run(makeContext());
      const classification = findings.find((f) => f.message.includes('Issue'));
      expect(classification!.severity).toBe(Severity.CRITICAL);
    });
  });

  describe('PR vs Issue friction flag', () => {
    it('flags when PR response time significantly exceeds issue response time', async () => {
      const response = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-01T06:00:00Z', login: 'r' }] },
        ],
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-04T00:00:00Z', login: 'r' }] },
        ],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);

      const findings = await scanner.run(makeContext());
      const frictionFinding = findings.find((f) => f.message.includes('friction'));
      expect(frictionFinding).toBeDefined();
      expect(frictionFinding!.severity).toBe(Severity.WARNING);
    });

    it('does not flag when PR and issue response times are similar', async () => {
      const response = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-01T10:00:00Z', login: 'r' }] },
        ],
        [
          { createdAt: '2026-01-01T00:00:00Z', comments: [{ createdAt: '2026-01-01T12:00:00Z', login: 'r' }] },
        ],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);

      const findings = await scanner.run(makeContext());
      const frictionFinding = findings.find((f) => f.message.includes('friction'));
      expect(frictionFinding).toBeUndefined();
    });
  });

  describe('prerequisites', () => {
    it('returns INFO when no GitHub token provided', async () => {
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

  describe('API errors', () => {
    it('handles fetch failure gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('timeout'));
      const findings = await scanner.run(makeContext());
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
    });
  });
});
