/**
 * Tests for Issue/PR Response Time Collection scanner.
 *
 * Validates GitHub GraphQL querying for issues/PRs, time-to-first-comment
 * calculation, and response time metric generation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResponseTimeScanner } from '../../../src/scanner/community/response-time.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig, Finding } from '../../../src/types/index.js';

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

/** Build a mock GraphQL response with issues and PRs. */
function buildGraphQLResponse(
  issues: Array<{ createdAt: string; firstCommentAt: string | null }>,
  pullRequests: Array<{ createdAt: string; firstCommentAt: string | null }>,
): object {
  return {
    data: {
      repository: {
        issues: {
          nodes: issues.map((iss, i) => ({
            number: i + 1,
            createdAt: iss.createdAt,
            comments: {
              nodes: iss.firstCommentAt
                ? [{ createdAt: iss.firstCommentAt, author: { login: 'reviewer' } }]
                : [],
            },
          })),
        },
        pullRequests: {
          nodes: pullRequests.map((pr, i) => ({
            number: i + 100,
            createdAt: pr.createdAt,
            comments: {
              nodes: pr.firstCommentAt
                ? [{ createdAt: pr.firstCommentAt, author: { login: 'reviewer' } }]
                : [],
            },
          })),
        },
      },
    },
  };
}

let scanner: ResponseTimeScanner;

beforeEach(() => {
  scanner = new ResponseTimeScanner();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResponseTimeScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('response-time');
      expect(scanner.displayName).toBe('Issue/PR Response Time');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('prerequisites', () => {
    it('returns INFO when no GitHub token provided', async () => {
      const ctx = makeContext({ config: { ...makeContext().config, githubToken: null } });
      const findings = await scanner.run(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
      expect(findings[0].message).toContain('GitHub token');
    });

    it('returns INFO when no remote URL available', async () => {
      const ctx = makeContext({ git: { commitSha: null, branch: null, remoteUrl: null } });
      const findings = await scanner.run(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
      expect(findings[0].message).toContain('remote URL');
    });

    it('returns INFO for non-GitHub remotes', async () => {
      const ctx = makeContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://gitlab.com/owner/repo.git' },
      });
      const findings = await scanner.run(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
      expect(findings[0].message).toContain('GitHub');
    });
  });

  describe('response time calculation', () => {
    it('calculates median response time for issues', async () => {
      const mockResponse = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T12:00:00Z' }, // 12h
          { createdAt: '2026-01-02T00:00:00Z', firstCommentAt: '2026-01-02T06:00:00Z' }, // 6h
          { createdAt: '2026-01-03T00:00:00Z', firstCommentAt: '2026-01-04T00:00:00Z' }, // 24h
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const issueFinding = findings.find((f) => f.message.includes('Issue'));
      expect(issueFinding).toBeDefined();
      expect(issueFinding!.metadata?.medianHours).toBe(12); // median of [6, 12, 24]
    });

    it('calculates median response time for pull requests', async () => {
      const mockResponse = buildGraphQLResponse(
        [],
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T02:00:00Z' }, // 2h
          { createdAt: '2026-01-02T00:00:00Z', firstCommentAt: '2026-01-02T04:00:00Z' }, // 4h
          { createdAt: '2026-01-03T00:00:00Z', firstCommentAt: '2026-01-03T08:00:00Z' }, // 8h
        ],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const prFinding = findings.find((f) => f.message.includes('Pull request'));
      expect(prFinding).toBeDefined();
      expect(prFinding!.metadata?.medianHours).toBe(4); // median of [2, 4, 8]
    });

    it('handles issues with no comments (no response)', async () => {
      const mockResponse = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: null },
          { createdAt: '2026-01-02T00:00:00Z', firstCommentAt: null },
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const noResponse = findings.find((f) => f.message.includes('no response'));
      expect(noResponse).toBeDefined();
      expect(noResponse!.severity).toBe(Severity.WARNING);
    });

    it('skips items with no comments for median calculation', async () => {
      const mockResponse = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T10:00:00Z' }, // 10h
          { createdAt: '2026-01-02T00:00:00Z', firstCommentAt: null }, // no response
          { createdAt: '2026-01-03T00:00:00Z', firstCommentAt: '2026-01-03T20:00:00Z' }, // 20h
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const issueFinding = findings.find(
        (f) => f.message.includes('Issue') && f.metadata?.medianHours !== undefined,
      );
      expect(issueFinding).toBeDefined();
      expect(issueFinding!.metadata?.medianHours).toBe(15); // median of [10, 20]
    });
  });

  describe('severity classification', () => {
    it('PASS for healthy response time (< 48 hours)', async () => {
      const mockResponse = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T06:00:00Z' },
          { createdAt: '2026-01-02T00:00:00Z', firstCommentAt: '2026-01-02T12:00:00Z' },
        ],
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T03:00:00Z' },
        ],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const issueFinding = findings.find(
        (f) => f.message.includes('Issue') && f.metadata?.medianHours !== undefined,
      );
      expect(issueFinding).toBeDefined();
      expect(issueFinding!.severity).toBe(Severity.PASS);
    });

    it('WARNING for moderate response time (48h - 7 days)', async () => {
      const mockResponse = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-04T00:00:00Z' }, // 72h
          { createdAt: '2026-01-05T00:00:00Z', firstCommentAt: '2026-01-08T00:00:00Z' }, // 72h
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const issueFinding = findings.find(
        (f) => f.message.includes('Issue') && f.metadata?.medianHours !== undefined,
      );
      expect(issueFinding!.severity).toBe(Severity.WARNING);
    });

    it('CRITICAL for slow response time (> 7 days)', async () => {
      const mockResponse = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-15T00:00:00Z' }, // 14 days
          { createdAt: '2026-01-05T00:00:00Z', firstCommentAt: '2026-01-20T00:00:00Z' }, // 15 days
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const issueFinding = findings.find(
        (f) => f.message.includes('Issue') && f.metadata?.medianHours !== undefined,
      );
      expect(issueFinding!.severity).toBe(Severity.CRITICAL);
    });
  });

  describe('API error handling', () => {
    it('handles HTTP error from GraphQL API', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
      expect(findings[0].message).toContain('403');
    });

    it('handles network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network timeout'));

      const ctx = makeContext();
      const findings = await scanner.run(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
      expect(findings[0].message).toContain('Network timeout');
    });

    it('handles empty repository (no issues/PRs)', async () => {
      const mockResponse = buildGraphQLResponse([], []);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const infoFinding = findings.find((f) => f.message.includes('No issues or pull requests'));
      expect(infoFinding).toBeDefined();
      expect(infoFinding!.severity).toBe(Severity.INFO);
    });
  });

  describe('repo parsing', () => {
    it('parses owner/repo from HTTPS URL', async () => {
      const mockResponse = buildGraphQLResponse(
        [{ createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T01:00:00Z' }],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/myorg/myrepo.git' },
      });
      await scanner.run(ctx);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.variables.owner).toBe('myorg');
      expect(body.variables.name).toBe('myrepo');
    });

    it('parses owner/repo from SSH URL', async () => {
      const mockResponse = buildGraphQLResponse(
        [{ createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T01:00:00Z' }],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext({
        git: { commitSha: null, branch: null, remoteUrl: 'git@github.com:myorg/myrepo.git' },
      });
      await scanner.run(ctx);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.variables.owner).toBe('myorg');
      expect(body.variables.name).toBe('myrepo');
    });
  });

  describe('finding structure', () => {
    it('includes proper metadata in findings', async () => {
      const mockResponse = buildGraphQLResponse(
        [
          { createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T10:00:00Z' },
          { createdAt: '2026-01-02T00:00:00Z', firstCommentAt: '2026-01-02T20:00:00Z' },
        ],
        [],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      const issueFinding = findings.find(
        (f) => f.message.includes('Issue') && f.metadata?.medianHours !== undefined,
      );
      expect(issueFinding!.id).toMatch(/^response-time-\d+$/);
      expect(issueFinding!.pillar).toBe(Pillar.COMMUNITY);
      expect(issueFinding!.category).toBe('response-time');
      expect(issueFinding!.metadata?.sampleSize).toBe(2);
      expect(issueFinding!.metadata?.medianHours).toBeDefined();
    });

    it('provides summary finding with overall metrics', async () => {
      const mockResponse = buildGraphQLResponse(
        [{ createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T06:00:00Z' }],
        [{ createdAt: '2026-01-01T00:00:00Z', firstCommentAt: '2026-01-01T03:00:00Z' }],
      );

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const ctx = makeContext();
      const findings = await scanner.run(ctx);

      expect(findings.length).toBeGreaterThanOrEqual(2);
      const issueFinding = findings.find((f) => f.message.includes('Issue'));
      const prFinding = findings.find((f) => f.message.includes('Pull request'));
      expect(issueFinding).toBeDefined();
      expect(prFinding).toBeDefined();
    });
  });
});
