import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BranchProtectionScanner } from '../../../src/scanner/security/branch-protection.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createConfig(overrides: Partial<ScannerConfig> = {}): ScannerConfig {
  return {
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
    ...overrides,
  };
}

function createContext(overrides: {
  githubToken?: string | null;
  remoteUrl?: string | null;
  branch?: string | null;
} = {}): ScanContext {
  const config = createConfig({
    githubToken: overrides.githubToken ?? null,
  });
  return {
    repoPath: '/tmp/fake-repo',
    repoIdentifier: null,
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: {
      commitSha: null,
      branch: overrides.branch ?? 'main',
      remoteUrl: overrides.remoteUrl ?? null,
    },
    signal: AbortSignal.timeout(30_000),
    emit: () => {},
  };
}

/** Helper to create a mock fetch response. */
function mockFetchResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Forbidden',
    json: () => Promise.resolve(body),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => mockFetchResponse(status, body),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('BranchProtectionScanner', () => {
  let scanner: BranchProtectionScanner;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    scanner = new BranchProtectionScanner();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('branch-protection');
      expect(scanner.displayName).toBe('Branch Protection Audit');
      expect(scanner.pillar).toBe(Pillar.SECURITY);
    });
  });

  describe('missing prerequisites', () => {
    it('returns INFO when no GitHub token is provided', async () => {
      const context = createContext({ remoteUrl: 'https://github.com/owner/repo.git' });
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
      expect(findings[0].message).toMatch(/token/i);
      expect(findings[0].id).toBe('branch-protection-1');
      expect(findings[0].pillar).toBe(Pillar.SECURITY);
      expect(findings[0].category).toBe('branch-protection');
    });

    it('returns INFO when no remote URL is provided', async () => {
      const context = createContext({ githubToken: 'ghp_test123', remoteUrl: null });
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
      expect(findings[0].message).toMatch(/remote/i);
    });

    it('returns INFO for non-GitHub remote URLs', async () => {
      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://gitlab.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
      expect(findings[0].message).toMatch(/github/i);
    });

    it('returns INFO for Bitbucket remote URLs', async () => {
      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'git@bitbucket.org:owner/repo.git',
      });
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
    });
  });

  describe('GitHub URL parsing', () => {
    it('parses HTTPS URL with .git suffix', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockFetchResponse(404, { message: 'Not Found' })
      );
      globalThis.fetch = fetchMock;

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/myorg/myrepo.git',
      });
      await scanner.run(context);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/repos/myorg/myrepo/branches/main/protection'),
        expect.any(Object),
      );
    });

    it('parses HTTPS URL without .git suffix', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockFetchResponse(404, { message: 'Not Found' })
      );
      globalThis.fetch = fetchMock;

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/myorg/myrepo',
      });
      await scanner.run(context);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/repos/myorg/myrepo/branches/main/protection'),
        expect.any(Object),
      );
    });

    it('parses SSH URL (git@ format)', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockFetchResponse(404, { message: 'Not Found' })
      );
      globalThis.fetch = fetchMock;

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'git@github.com:owner/repo.git',
      });
      await scanner.run(context);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/repos/owner/repo/branches/main/protection'),
        expect.any(Object),
      );
    });

    it('parses SSH URL without .git suffix', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockFetchResponse(404, { message: 'Not Found' })
      );
      globalThis.fetch = fetchMock;

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'git@github.com:owner/repo',
      });
      await scanner.run(context);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/repos/owner/repo/branches/main/protection'),
        expect.any(Object),
      );
    });

    it('uses context.git.branch when available', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockFetchResponse(404, { message: 'Not Found' })
      );
      globalThis.fetch = fetchMock;

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
        branch: 'develop',
      });
      await scanner.run(context);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/branches/develop/protection'),
        expect.any(Object),
      );
    });

    it('defaults to main when branch is null', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockFetchResponse(404, { message: 'Not Found' })
      );
      globalThis.fetch = fetchMock;

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
        branch: null,
      });
      await scanner.run(context);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/branches/main/protection'),
        expect.any(Object),
      );
    });
  });

  describe('API error handling', () => {
    it('returns CRITICAL when 404 (no branch protection)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(404, { message: 'Not Found' })
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.CRITICAL);
      expect(findings[0].message).toMatch(/no branch protection/i);
    });

    it('returns WARNING when 403 (insufficient permissions)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(403, { message: 'Forbidden' })
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
      expect(findings[0].message).toMatch(/permission/i);
    });

    it('returns WARNING on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
      expect(findings[0].message).toMatch(/error|failed/i);
    });

    it('returns WARNING on unexpected status codes', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(500, { message: 'Internal Server Error' })
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
    });
  });

  describe('fully protected branch', () => {
    const fullProtection = {
      required_pull_request_reviews: {
        required_approving_review_count: 2,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: true,
      },
      required_status_checks: {
        strict: true,
        contexts: ['ci/tests', 'ci/lint'],
      },
      allow_force_pushes: { enabled: false },
      allow_deletions: { enabled: false },
      required_signatures: { enabled: true },
    };

    it('returns multiple PASS findings for fully protected branch', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, fullProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const passingFindings = findings.filter((f) => f.severity === Severity.PASS);
      expect(passingFindings.length).toBeGreaterThanOrEqual(4);
    });

    it('reports PASS for required reviews', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, fullProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const reviewFinding = findings.find((f) =>
        f.message.toLowerCase().includes('pull request review')
      );
      expect(reviewFinding).toBeDefined();
      expect(reviewFinding!.severity).toBe(Severity.PASS);
    });

    it('reports PASS for required status checks', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, fullProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const statusFinding = findings.find((f) =>
        f.message.toLowerCase().includes('status check')
      );
      expect(statusFinding).toBeDefined();
      expect(statusFinding!.severity).toBe(Severity.PASS);
    });

    it('reports PASS for force push disabled', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, fullProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const forcePushFinding = findings.find((f) =>
        f.message.toLowerCase().includes('force push')
      );
      expect(forcePushFinding).toBeDefined();
      expect(forcePushFinding!.severity).toBe(Severity.PASS);
    });

    it('reports PASS for deletion protection', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, fullProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const deletionFinding = findings.find((f) =>
        f.message.toLowerCase().includes('delet')
      );
      expect(deletionFinding).toBeDefined();
      expect(deletionFinding!.severity).toBe(Severity.PASS);
    });

    it('reports PASS for signed commits enabled', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, fullProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const signedFinding = findings.find((f) =>
        f.message.toLowerCase().includes('signed commit')
      );
      expect(signedFinding).toBeDefined();
      expect(signedFinding!.severity).toBe(Severity.PASS);
    });
  });

  describe('unprotected branch (missing settings)', () => {
    const noProtection = {
      required_pull_request_reviews: null,
      required_status_checks: null,
      allow_force_pushes: { enabled: true },
      allow_deletions: { enabled: true },
      required_signatures: { enabled: false },
    };

    it('returns CRITICAL for missing required reviews', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, noProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const reviewFinding = findings.find((f) =>
        f.message.toLowerCase().includes('pull request review')
      );
      expect(reviewFinding).toBeDefined();
      expect(reviewFinding!.severity).toBe(Severity.CRITICAL);
    });

    it('returns WARNING for missing status checks', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, noProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const statusFinding = findings.find((f) =>
        f.message.toLowerCase().includes('status check')
      );
      expect(statusFinding).toBeDefined();
      expect(statusFinding!.severity).toBe(Severity.WARNING);
    });

    it('returns CRITICAL for force push enabled', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, noProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const forcePushFinding = findings.find((f) =>
        f.message.toLowerCase().includes('force push')
      );
      expect(forcePushFinding).toBeDefined();
      expect(forcePushFinding!.severity).toBe(Severity.CRITICAL);
    });

    it('returns WARNING for deletion allowed', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, noProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const deletionFinding = findings.find((f) =>
        f.message.toLowerCase().includes('delet')
      );
      expect(deletionFinding).toBeDefined();
      expect(deletionFinding!.severity).toBe(Severity.WARNING);
    });

    it('reports INFO for signed commits not required', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, noProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const signedFinding = findings.find((f) =>
        f.message.toLowerCase().includes('signed commit')
      );
      expect(signedFinding).toBeDefined();
      expect(signedFinding!.severity).toBe(Severity.INFO);
    });
  });

  describe('partial protection', () => {
    const partialProtection = {
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: false,
        require_code_owner_reviews: false,
      },
      required_status_checks: null,
      allow_force_pushes: { enabled: false },
      allow_deletions: { enabled: true },
      required_signatures: { enabled: false },
    };

    it('returns a mix of PASS, WARNING, and CRITICAL findings', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, partialProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      const severities = new Set(findings.map((f) => f.severity));
      expect(severities.size).toBeGreaterThanOrEqual(2);
    });

    it('has PASS for reviews and force push, but warnings for others', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, partialProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      // Reviews should be PASS (they exist)
      const reviewFinding = findings.find((f) =>
        f.message.toLowerCase().includes('pull request review')
      );
      expect(reviewFinding!.severity).toBe(Severity.PASS);

      // Force push should be PASS (disabled)
      const forcePushFinding = findings.find((f) =>
        f.message.toLowerCase().includes('force push')
      );
      expect(forcePushFinding!.severity).toBe(Severity.PASS);

      // Status checks should be WARNING (missing)
      const statusFinding = findings.find((f) =>
        f.message.toLowerCase().includes('status check')
      );
      expect(statusFinding!.severity).toBe(Severity.WARNING);

      // Deletions should be WARNING (allowed)
      const deletionFinding = findings.find((f) =>
        f.message.toLowerCase().includes('delet')
      );
      expect(deletionFinding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('finding structure validation', () => {
    it('all findings have required fields', async () => {
      const fullProtection = {
        required_pull_request_reviews: {
          required_approving_review_count: 2,
        },
        required_status_checks: { strict: true, contexts: ['ci'] },
        allow_force_pushes: { enabled: false },
        allow_deletions: { enabled: false },
        required_signatures: { enabled: true },
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, fullProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      const findings = await scanner.run(context);

      for (const finding of findings) {
        expect(finding.id).toMatch(/^branch-protection-\d+$/);
        expect(finding.pillar).toBe(Pillar.SECURITY);
        expect(finding.category).toBe('branch-protection');
        expect(typeof finding.message).toBe('string');
        expect(finding.message.length).toBeGreaterThan(0);
        expect(typeof finding.suggestion).toBe('string');
        expect(finding.suggestion.length).toBeGreaterThan(0);
        expect(finding.file).toBeNull();
        expect(finding.line).toBeNull();
        expect(finding.column).toBeNull();
      }
    });

    it('passes Authorization header with token', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockFetchResponse(404, { message: 'Not Found' })
      );
      globalThis.fetch = fetchMock;

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
      });
      await scanner.run(context);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token ghp_test123',
          }),
        }),
      );
    });
  });

  describe('metadata in findings', () => {
    it('includes branch and protection details in metadata', async () => {
      const fullProtection = {
        required_pull_request_reviews: {
          required_approving_review_count: 2,
        },
        required_status_checks: { strict: true, contexts: ['ci'] },
        allow_force_pushes: { enabled: false },
        allow_deletions: { enabled: false },
        required_signatures: { enabled: false },
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, fullProtection)
      );

      const context = createContext({
        githubToken: 'ghp_test123',
        remoteUrl: 'https://github.com/owner/repo.git',
        branch: 'main',
      });
      const findings = await scanner.run(context);

      // At least one finding should have branch metadata
      const withMeta = findings.filter((f) => f.metadata?.branch);
      expect(withMeta.length).toBeGreaterThan(0);
      expect(withMeta[0].metadata!.branch).toBe('main');
    });
  });
});
