/**
 * Tests for Funding Infrastructure scanner.
 *
 * Validates FUNDING.yml detection, platform key parsing, and README badge detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FundingScanner } from '../../../src/scanner/community/funding.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: FundingScanner;

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
    repoPath: tmpDir,
    repoIdentifier: 'owner/repo',
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: 'abc', branch: 'main', remoteUrl: null },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'funding-test-'));
  fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
  scanner = new FundingScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('FundingScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('funding');
      expect(scanner.displayName).toBe('Funding Infrastructure');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('FUNDING.yml detection', () => {
    it('detects .github/FUNDING.yml', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'FUNDING.yml'),
        'github: username\nopen_collective: myproject\n',
      );

      const findings = await scanner.run(makeContext());
      const fundingFinding = findings.find((f) => f.message.includes('Funding'));
      expect(fundingFinding).toBeDefined();
      expect(fundingFinding!.severity).toBe(Severity.INFO);
    });

    it('INFO when no funding infrastructure', async () => {
      const findings = await scanner.run(makeContext());
      const noFunding = findings.find((f) => f.message.includes('No funding'));
      expect(noFunding).toBeDefined();
      expect(noFunding!.severity).toBe(Severity.INFO);
    });
  });

  describe('platform key parsing', () => {
    it('parses GitHub Sponsors', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'FUNDING.yml'),
        'github: [user1, user2]\n',
      );

      const findings = await scanner.run(makeContext());
      const platformFinding = findings.find((f) => f.metadata?.platforms !== undefined);
      expect(platformFinding).toBeDefined();
      const platforms = platformFinding!.metadata?.platforms as string[];
      expect(platforms).toContain('github');
    });

    it('parses Open Collective', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'FUNDING.yml'),
        'open_collective: myproject\n',
      );

      const findings = await scanner.run(makeContext());
      const platformFinding = findings.find((f) => f.metadata?.platforms !== undefined);
      const platforms = platformFinding!.metadata?.platforms as string[];
      expect(platforms).toContain('open_collective');
    });

    it('parses Patreon', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'FUNDING.yml'),
        'patreon: creator\n',
      );

      const findings = await scanner.run(makeContext());
      const platformFinding = findings.find((f) => f.metadata?.platforms !== undefined);
      const platforms = platformFinding!.metadata?.platforms as string[];
      expect(platforms).toContain('patreon');
    });

    it('parses multiple platforms', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'FUNDING.yml'),
        'github: user\nopen_collective: proj\nko_fi: myko\ncustom: ["https://donate.example.com"]\n',
      );

      const findings = await scanner.run(makeContext());
      const platformFinding = findings.find((f) => f.metadata?.platforms !== undefined);
      const platforms = platformFinding!.metadata?.platforms as string[];
      expect(platforms.length).toBeGreaterThanOrEqual(3);
    });

    it('parses tidelift and community_bridge', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'FUNDING.yml'),
        'tidelift: npm/mypackage\ncommunity_bridge: myproject\n',
      );

      const findings = await scanner.run(makeContext());
      const platformFinding = findings.find((f) => f.metadata?.platforms !== undefined);
      const platforms = platformFinding!.metadata?.platforms as string[];
      expect(platforms).toContain('tidelift');
      expect(platforms).toContain('community_bridge');
    });
  });

  describe('README sponsor badge detection', () => {
    it('detects sponsor badge in README', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n[![Sponsor](https://img.shields.io/badge/sponsor-open%20collective-blue)](https://opencollective.com/proj)',
      );

      const findings = await scanner.run(makeContext());
      const badgeFinding = findings.find((f) => f.message.includes('badge'));
      expect(badgeFinding).toBeDefined();
    });

    it('detects GitHub Sponsors link in README', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n[Sponsor this project](https://github.com/sponsors/user)',
      );

      const findings = await scanner.run(makeContext());
      const badgeFinding = findings.find(
        (f) => f.message.includes('README') && (f.message.includes('sponsor') || f.message.includes('funding')),
      );
      expect(badgeFinding).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles malformed FUNDING.yml gracefully', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'FUNDING.yml'),
        '{{invalid yaml content',
      );

      const findings = await scanner.run(makeContext());
      // Should not crash
      expect(findings.length).toBeGreaterThan(0);
    });

    it('handles missing repo path', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});
