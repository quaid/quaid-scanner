import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenSSFScorecardScanner } from '../../../src/scanner/security/openssf-scorecard.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createContext(overrides: Partial<ScanContext> = {}): ScanContext {
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
    repoPath: '/tmp/test-repo',
    repoIdentifier: null,
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: null, branch: null, remoteUrl: null },
    signal: AbortSignal.timeout(30_000),
    emit: () => {},
    ...overrides,
  };
}

describe('OpenSSFScorecardScanner', () => {
  let scanner: OpenSSFScorecardScanner;

  beforeEach(() => {
    scanner = new OpenSSFScorecardScanner();
    vi.restoreAllMocks();
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('openssf-scorecard');
      expect(scanner.displayName).toBe('OpenSSF Scorecard');
      expect(scanner.pillar).toBe(Pillar.SECURITY);
    });
  });

  describe('no remote URL', () => {
    it('returns INFO when no remote URL is available', async () => {
      const findings = await scanner.run(createContext());
      const info = findings.find((f) => f.severity === Severity.INFO);
      expect(info).toBeDefined();
      expect(info!.message).toContain('remote URL');
    });
  });

  describe('non-GitHub remote', () => {
    it('returns INFO for non-GitHub remotes', async () => {
      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://gitlab.com/user/repo.git' },
      });
      const findings = await scanner.run(ctx);
      const info = findings.find((f) => f.severity === Severity.INFO);
      expect(info).toBeDefined();
      expect(info!.message).toContain('GitHub');
    });
  });

  describe('API query', () => {
    it('maps high scores (>=8) to PASS', async () => {
      const mockResponse = {
        date: '2026-02-01',
        repo: { name: 'github.com/owner/repo' },
        scorecard: { version: 'v5.0.0' },
        score: 8.5,
        checks: [
          { name: 'Code-Review', score: 9, reason: 'Found 10/10 approved changesets' },
          { name: 'Maintained', score: 10, reason: 'Project is maintained' },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo.git' },
      });
      const findings = await scanner.run(ctx);

      const passFindings = findings.filter((f) => f.severity === Severity.PASS);
      expect(passFindings.length).toBeGreaterThan(0);
      // Overall score finding
      const overall = findings.find((f) => f.message.includes('Overall'));
      expect(overall).toBeDefined();
      expect(overall!.severity).toBe(Severity.PASS);
    });

    it('maps medium scores (5-7) to WARNING', async () => {
      const mockResponse = {
        date: '2026-02-01',
        repo: { name: 'github.com/owner/repo' },
        scorecard: { version: 'v5.0.0' },
        score: 6.0,
        checks: [
          { name: 'Code-Review', score: 6, reason: 'Found 6/10 approved changesets' },
          { name: 'Vulnerabilities', score: 5, reason: 'Some vulnerabilities found' },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo' },
      });
      const findings = await scanner.run(ctx);

      const overall = findings.find((f) => f.message.includes('Overall'));
      expect(overall).toBeDefined();
      expect(overall!.severity).toBe(Severity.WARNING);
    });

    it('maps low scores (<5) to CRITICAL', async () => {
      const mockResponse = {
        date: '2026-02-01',
        repo: { name: 'github.com/owner/repo' },
        scorecard: { version: 'v5.0.0' },
        score: 3.0,
        checks: [
          { name: 'Code-Review', score: 2, reason: 'Found 2/10 approved changesets' },
          { name: 'Branch-Protection', score: 0, reason: 'No branch protection' },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo' },
      });
      const findings = await scanner.run(ctx);

      const overall = findings.find((f) => f.message.includes('Overall'));
      expect(overall).toBeDefined();
      expect(overall!.severity).toBe(Severity.CRITICAL);
    });

    it('generates per-check findings', async () => {
      const mockResponse = {
        date: '2026-02-01',
        repo: { name: 'github.com/owner/repo' },
        scorecard: { version: 'v5.0.0' },
        score: 7.0,
        checks: [
          { name: 'Code-Review', score: 9, reason: 'Good' },
          { name: 'Branch-Protection', score: 3, reason: 'Bad' },
          { name: 'Maintained', score: 6, reason: 'OK' },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo' },
      });
      const findings = await scanner.run(ctx);

      // 1 overall + 3 check findings
      expect(findings.length).toBe(4);
      const codeReview = findings.find((f) => f.message.includes('Code-Review'));
      expect(codeReview).toBeDefined();
      expect(codeReview!.severity).toBe(Severity.PASS);
      const branchProt = findings.find((f) => f.message.includes('Branch-Protection'));
      expect(branchProt).toBeDefined();
      expect(branchProt!.severity).toBe(Severity.CRITICAL);
    });

    it('tracks scorecard_source as api in metadata', async () => {
      const mockResponse = {
        date: '2026-02-01',
        repo: { name: 'github.com/owner/repo' },
        scorecard: { version: 'v5.0.0' },
        score: 8.0,
        checks: [{ name: 'Maintained', score: 10, reason: 'Active' }],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo' },
      });
      const findings = await scanner.run(ctx);

      const overall = findings.find((f) => f.message.includes('Overall'));
      expect(overall!.metadata?.scorecard_source).toBe('api');
    });
  });

  describe('API failure', () => {
    it('returns WARNING when API returns error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo' },
      });
      const findings = await scanner.run(ctx);

      const warn = findings.find((f) => f.severity === Severity.WARNING);
      expect(warn).toBeDefined();
      expect(warn!.message).toContain('unavailable');
    });

    it('returns WARNING when fetch throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo' },
      });
      const findings = await scanner.run(ctx);

      const warn = findings.find((f) => f.severity === Severity.WARNING);
      expect(warn).toBeDefined();
    });
  });

  describe('URL parsing', () => {
    it('handles SSH git@ URLs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'git@github.com:owner/repo.git' },
      });
      const findings = await scanner.run(ctx);
      // Should have tried the API (not returned early for non-GitHub)
      expect(findings.some((f) => f.message.includes('unavailable') || f.message.includes('Overall'))).toBe(true);
    });

    it('strips .git suffix from HTTPS URLs', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo.git' },
      });
      await scanner.run(ctx);

      const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('owner/repo');
      expect(calledUrl).not.toContain('.git');
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          date: '2026-02-01',
          repo: { name: 'github.com/owner/repo' },
          scorecard: { version: 'v5.0.0' },
          score: 8.0,
          checks: [{ name: 'Maintained', score: 10, reason: 'Active' }],
        }),
      } as Response);

      const ctx = createContext({
        git: { commitSha: null, branch: null, remoteUrl: 'https://github.com/owner/repo' },
      });
      const findings = await scanner.run(ctx);

      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('openssf-scorecard');
      expect(f.pillar).toBe(Pillar.SECURITY);
      expect(f.category).toBe('openssf-scorecard');
      expect(f.suggestion).toBeDefined();
    });
  });
});
