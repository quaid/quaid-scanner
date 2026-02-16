/**
 * Tests for Release Cadence & Project Vitality scanner.
 *
 * Validates release recency, SemVer hygiene, and vitality classification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReleaseCadenceScanner } from '../../../src/scanner/technical/release-cadence.js';
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
    git: { commitSha: 'abc', branch: 'main', remoteUrl: 'https://github.com/owner/repo.git' },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

let scanner: ReleaseCadenceScanner;

beforeEach(() => {
  scanner = new ReleaseCadenceScanner();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRelease(tag: string, daysAgo: number, prerelease = false): object {
  return {
    tag_name: tag,
    published_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    prerelease,
  };
}

describe('ReleaseCadenceScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('release-cadence');
      expect(scanner.displayName).toBe('Release Cadence & Vitality');
      expect(scanner.pillar).toBe(Pillar.TECHNICAL);
    });
  });

  describe('vitality classification', () => {
    it('PASS for active project (< 90 days since release)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRelease('v1.2.0', 30)]),
      } as Response);

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('v1.2.0\nv1.1.0\nv1.0.0\n'));

      const findings = await scanner.run(makeContext());
      const vitalityFinding = findings.find((f) => f.metadata?.daysSinceRelease !== undefined);
      expect(vitalityFinding).toBeDefined();
      expect(vitalityFinding!.severity).toBe(Severity.PASS);
      expect(vitalityFinding!.metadata?.vitality).toBe('active');
    });

    it('INFO for stable project (90-365 days)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRelease('v2.0.0', 200)]),
      } as Response);

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('v2.0.0\n'));

      const findings = await scanner.run(makeContext());
      const vitalityFinding = findings.find((f) => f.metadata?.daysSinceRelease !== undefined);
      expect(vitalityFinding!.severity).toBe(Severity.INFO);
      expect(vitalityFinding!.metadata?.vitality).toBe('stable');
    });

    it('WARNING for potentially dormant (365-730 days)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRelease('v1.0.0', 500)]),
      } as Response);

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('v1.0.0\n'));

      const findings = await scanner.run(makeContext());
      const vitalityFinding = findings.find((f) => f.metadata?.daysSinceRelease !== undefined);
      expect(vitalityFinding!.severity).toBe(Severity.WARNING);
      expect(vitalityFinding!.metadata?.vitality).toBe('potentially-dormant');
    });

    it('CRITICAL for likely abandoned (> 730 days)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRelease('v0.1.0', 800)]),
      } as Response);

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('v0.1.0\n'));

      const findings = await scanner.run(makeContext());
      const vitalityFinding = findings.find((f) => f.metadata?.daysSinceRelease !== undefined);
      expect(vitalityFinding!.severity).toBe(Severity.CRITICAL);
      expect(vitalityFinding!.metadata?.vitality).toBe('likely-abandoned');
    });
  });

  describe('SemVer validation', () => {
    it('PASS when tags follow SemVer', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRelease('v2.1.0', 10)]),
      } as Response);

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('v2.1.0\nv2.0.0\nv1.0.0\n'));

      const findings = await scanner.run(makeContext());
      const semverFinding = findings.find((f) => f.message.includes('SemVer'));
      expect(semverFinding).toBeDefined();
      expect(semverFinding!.severity).toBe(Severity.PASS);
    });

    it('WARNING when tags do not follow SemVer', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRelease('release-2023', 10)]),
      } as Response);

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('release-2023\nbuild-123\nlatest\n'));

      const findings = await scanner.run(makeContext());
      const semverFinding = findings.find((f) => f.message.includes('SemVer'));
      expect(semverFinding).toBeDefined();
      expect(semverFinding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('pre-release detection', () => {
    it('WARNING when only pre-releases exist', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          makeRelease('v1.0.0-beta.1', 10, true),
          makeRelease('v1.0.0-alpha.3', 30, true),
        ]),
      } as Response);

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('v1.0.0-beta.1\nv1.0.0-alpha.3\n'));

      const findings = await scanner.run(makeContext());
      const preFinding = findings.find((f) => f.message.includes('pre-release'));
      expect(preFinding).toBeDefined();
      expect(preFinding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('no releases', () => {
    it('INFO when no releases found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(''));

      const findings = await scanner.run(makeContext());
      const noRelease = findings.find((f) => f.message.includes('No releases'));
      expect(noRelease).toBeDefined();
    });
  });

  describe('prerequisites', () => {
    it('returns INFO for non-GitHub repos without token', async () => {
      const ctx = makeContext({
        config: { ...makeContext().config, githubToken: null },
        git: { commitSha: null, branch: null, remoteUrl: null },
      });

      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('v1.0.0\n'));

      const findings = await scanner.run(ctx);
      // Should still work with git tags even without GitHub API
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('handles API failure gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('timeout'));
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from('v1.0.0\n'));

      const findings = await scanner.run(makeContext());
      // Should still produce findings from git tags
      expect(findings.length).toBeGreaterThan(0);
    });

    it('handles git tag failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRelease('v1.0.0', 30)]),
      } as Response);

      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('not a git repo');
      });

      const findings = await scanner.run(makeContext());
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});
