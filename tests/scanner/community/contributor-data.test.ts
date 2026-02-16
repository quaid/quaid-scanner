/**
 * Tests for Contributor Data Collection scanner.
 *
 * Validates git log parsing, email normalization, and contributor
 * distribution analysis.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ContributorDataScanner } from '../../../src/scanner/community/contributor-data.js';
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

let scanner: ContributorDataScanner;

beforeEach(() => {
  scanner = new ContributorDataScanner();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ContributorDataScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('contributor-data');
      expect(scanner.displayName).toBe('Contributor Data Collection');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('contributor counting', () => {
    it('counts unique contributors from git log', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        'alice@example.com\nalice@example.com\nbob@example.com\ncharlie@example.com\nalice@example.com\n',
      ));

      const findings = await scanner.run(makeContext());
      const countFinding = findings.find((f) => f.metadata?.uniqueContributors !== undefined);
      expect(countFinding).toBeDefined();
      expect(countFinding!.metadata?.uniqueContributors).toBe(3);
    });

    it('counts commits per contributor', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        'alice@example.com\nalice@example.com\nalice@example.com\nbob@example.com\n',
      ));

      const findings = await scanner.run(makeContext());
      const countFinding = findings.find((f) => f.metadata?.commitCounts !== undefined);
      expect(countFinding).toBeDefined();
      const counts = countFinding!.metadata?.commitCounts as Record<string, number>;
      expect(counts['alice@example.com']).toBe(3);
      expect(counts['bob@example.com']).toBe(1);
    });
  });

  describe('email normalization', () => {
    it('normalizes email addresses to lowercase', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        'Alice@Example.COM\nalice@example.com\n',
      ));

      const findings = await scanner.run(makeContext());
      const countFinding = findings.find((f) => f.metadata?.uniqueContributors !== undefined);
      expect(countFinding!.metadata?.uniqueContributors).toBe(1);
    });

    it('maps noreply.github.com emails to usernames', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        '12345+alice@users.noreply.github.com\nalice@example.com\n',
      ));

      const findings = await scanner.run(makeContext());
      const countFinding = findings.find((f) => f.metadata?.uniqueContributors !== undefined);
      // These are different identities (one is github noreply, one is real email)
      expect(countFinding!.metadata?.uniqueContributors).toBe(2);
    });

    it('excludes bare noreply@github.com from domain analysis', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        'alice@example.com\nnoreply@github.com\nbob@example.com\n',
      ));

      const findings = await scanner.run(makeContext());
      const domainFinding = findings.find((f) => f.metadata?.domains !== undefined);
      expect(domainFinding).toBeDefined();
      const domains = domainFinding!.metadata?.domains as Record<string, number>;
      expect(domains['github.com']).toBeUndefined();
      expect(domains['example.com']).toBe(2);
    });
  });

  describe('contributor distribution', () => {
    it('reports healthy distribution with multiple active contributors', async () => {
      const emails = [
        ...Array(50).fill('alice@company.com'),
        ...Array(30).fill('bob@other.com'),
        ...Array(20).fill('charlie@third.com'),
        ...Array(10).fill('dave@fourth.com'),
      ];
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(emails.join('\n') + '\n'));

      const findings = await scanner.run(makeContext());
      const distFinding = findings.find((f) => f.message.includes('contributor'));
      expect(distFinding).toBeDefined();
      expect(distFinding!.metadata?.uniqueContributors).toBe(4);
    });

    it('warns for single contributor (bus factor 1)', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        'solo@example.com\nsolo@example.com\nsolo@example.com\n',
      ));

      const findings = await scanner.run(makeContext());
      const soloFinding = findings.find((f) => f.metadata?.uniqueContributors === 1);
      expect(soloFinding).toBeDefined();
      expect(soloFinding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('domain analysis', () => {
    it('extracts email domains for organizational analysis', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(
        'alice@company.com\nbob@company.com\ncharlie@other.org\n',
      ));

      const findings = await scanner.run(makeContext());
      const domainFinding = findings.find((f) => f.metadata?.domains !== undefined);
      expect(domainFinding).toBeDefined();
      const domains = domainFinding!.metadata?.domains as Record<string, number>;
      expect(domains['company.com']).toBe(2);
      expect(domains['other.org']).toBe(1);
    });
  });

  describe('error handling', () => {
    it('handles git log failure gracefully', async () => {
      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('not a git repo');
      });

      const findings = await scanner.run(makeContext());
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
      expect(findings[0].message).toContain('git log');
    });

    it('handles empty git log output', async () => {
      vi.mocked(execSync).mockReturnValueOnce(Buffer.from(''));

      const findings = await scanner.run(makeContext());
      const emptyFinding = findings.find((f) => f.message.includes('No commits'));
      expect(emptyFinding).toBeDefined();
      expect(emptyFinding!.severity).toBe(Severity.INFO);
    });
  });
});
