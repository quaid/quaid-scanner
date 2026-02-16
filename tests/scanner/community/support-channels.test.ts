/**
 * Tests for Support Channel Clarity scanner.
 *
 * Validates SUPPORT.md detection, channel parsing, and community link detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SupportChannelScanner } from '../../../src/scanner/community/support-channels.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: SupportChannelScanner;

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'support-channels-test-'));
  fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
  scanner = new SupportChannelScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('SupportChannelScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('support-channels');
      expect(scanner.displayName).toBe('Support Channel Clarity');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('SUPPORT.md detection', () => {
    it('PASS when SUPPORT.md found at root', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'SUPPORT.md'),
        '# Support\n\nFor bugs, file a GitHub issue.\nFor questions, use Discussions.',
      );

      const findings = await scanner.run(makeContext());
      const supportFinding = findings.find((f) => f.message.includes('SUPPORT.md'));
      expect(supportFinding).toBeDefined();
      expect(supportFinding!.severity).toBe(Severity.PASS);
    });

    it('detects .github/SUPPORT.md', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'SUPPORT.md'),
        '# Support\n\nFile bugs as issues.',
      );

      const findings = await scanner.run(makeContext());
      const supportFinding = findings.find((f) => f.message.includes('SUPPORT'));
      expect(supportFinding).toBeDefined();
    });

    it('WARNING when no SUPPORT.md found', async () => {
      const findings = await scanner.run(makeContext());
      const noSupport = findings.find((f) => f.message.includes('No SUPPORT'));
      expect(noSupport).toBeDefined();
      expect(noSupport!.severity).toBe(Severity.WARNING);
    });
  });

  describe('README support section', () => {
    it('detects Support section in README', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# My Project\n\n## Support\n\nFile bugs as issues. Questions? Use Discussions.',
      );

      const findings = await scanner.run(makeContext());
      const readmeFinding = findings.find((f) => f.message.includes('README'));
      expect(readmeFinding).toBeDefined();
    });

    it('detects Getting Help section', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n## Getting Help\n\nJoin our Discord.',
      );

      const findings = await scanner.run(makeContext());
      const readmeFinding = findings.find(
        (f) => f.message.includes('README') && f.message.includes('support'),
      );
      expect(readmeFinding).toBeDefined();
    });
  });

  describe('community link detection', () => {
    it('detects Discord links', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'SUPPORT.md'),
        '# Support\n\nJoin us on Discord: https://discord.gg/abc123',
      );

      const findings = await scanner.run(makeContext());
      const linkFinding = findings.find((f) => f.metadata?.channels !== undefined);
      expect(linkFinding).toBeDefined();
      const channels = linkFinding!.metadata?.channels as string[];
      expect(channels).toContain('discord');
    });

    it('detects Slack links', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'SUPPORT.md'),
        '# Support\n\nJoin our Slack: https://myproject.slack.com',
      );

      const findings = await scanner.run(makeContext());
      const linkFinding = findings.find((f) => f.metadata?.channels !== undefined);
      expect(linkFinding).toBeDefined();
      const channels = linkFinding!.metadata?.channels as string[];
      expect(channels).toContain('slack');
    });

    it('detects Stack Overflow references', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'SUPPORT.md'),
        '# Support\n\nAsk on Stack Overflow with tag [myproject]',
      );

      const findings = await scanner.run(makeContext());
      const linkFinding = findings.find((f) => f.metadata?.channels !== undefined);
      expect(linkFinding).toBeDefined();
      const channels = linkFinding!.metadata?.channels as string[];
      expect(channels).toContain('stackoverflow');
    });

    it('detects GitHub Discussions reference', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'SUPPORT.md'),
        '# Support\n\nUse GitHub Discussions for questions.',
      );

      const findings = await scanner.run(makeContext());
      const linkFinding = findings.find((f) => f.metadata?.channels !== undefined);
      expect(linkFinding).toBeDefined();
      const channels = linkFinding!.metadata?.channels as string[];
      expect(channels).toContain('discussions');
    });
  });

  describe('channel separation', () => {
    it('PASS when distinct channels for bugs and questions', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'SUPPORT.md'),
        '# Support\n\n- Bugs: GitHub Issues\n- Questions: GitHub Discussions\n- Chat: https://discord.gg/abc',
      );

      const findings = await scanner.run(makeContext());
      const channelFinding = findings.find((f) => f.metadata?.channels !== undefined);
      expect(channelFinding).toBeDefined();
      const channels = channelFinding!.metadata?.channels as string[];
      expect(channels.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('handles missing repo path', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});
