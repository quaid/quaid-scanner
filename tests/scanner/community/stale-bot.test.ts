/**
 * Tests for Stale Bot Aggression Check scanner.
 *
 * Validates detection and classification of stale bot configurations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { StaleBotScanner } from '../../../src/scanner/community/stale-bot.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: StaleBotScanner;

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-bot-test-'));
  fs.mkdirSync(path.join(tmpDir, '.github', 'workflows'), { recursive: true });
  scanner = new StaleBotScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('StaleBotScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('stale-bot');
      expect(scanner.displayName).toBe('Stale Bot Aggression Check');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('stale bot detection', () => {
    it('detects .github/stale.yml config', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'stale.yml'),
        'daysUntilStale: 60\ndaysUntilClose: 7\n',
      );

      const findings = await scanner.run(makeContext());
      const staleFinding = findings.find((f) => f.message.includes('Stale bot'));
      expect(staleFinding).toBeDefined();
    });

    it('detects stale action in workflow YAML', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'workflows', 'stale.yml'),
        `name: Stale
on:
  schedule:
    - cron: '0 0 * * *'
jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          days-before-close: 14
          days-before-stale: 30
`,
      );

      const findings = await scanner.run(makeContext());
      const staleFinding = findings.find((f) => f.message.includes('Stale'));
      expect(staleFinding).toBeDefined();
    });

    it('INFO when no stale bot configured', async () => {
      const findings = await scanner.run(makeContext());
      const noStale = findings.find((f) => f.message.includes('No stale bot'));
      expect(noStale).toBeDefined();
      expect(noStale!.severity).toBe(Severity.INFO);
    });
  });

  describe('aggression classification', () => {
    it('CRITICAL for hostile close threshold (< 14 days)', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'stale.yml'),
        'daysUntilStale: 30\ndaysUntilClose: 7\n',
      );

      const findings = await scanner.run(makeContext());
      const aggressionFinding = findings.find((f) => f.metadata?.closeThresholdDays !== undefined);
      expect(aggressionFinding).toBeDefined();
      expect(aggressionFinding!.severity).toBe(Severity.CRITICAL);
    });

    it('WARNING for aggressive close threshold (14-29 days)', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'stale.yml'),
        'daysUntilStale: 60\ndaysUntilClose: 20\n',
      );

      const findings = await scanner.run(makeContext());
      const aggressionFinding = findings.find((f) => f.metadata?.closeThresholdDays !== undefined);
      expect(aggressionFinding).toBeDefined();
      expect(aggressionFinding!.severity).toBe(Severity.WARNING);
    });

    it('PASS for reasonable close threshold (30-60 days)', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'stale.yml'),
        'daysUntilStale: 60\ndaysUntilClose: 45\n',
      );

      const findings = await scanner.run(makeContext());
      const aggressionFinding = findings.find((f) => f.metadata?.closeThresholdDays !== undefined);
      expect(aggressionFinding).toBeDefined();
      expect(aggressionFinding!.severity).toBe(Severity.PASS);
    });

    it('PASS for lenient close threshold (> 60 days)', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'stale.yml'),
        'daysUntilStale: 90\ndaysUntilClose: 90\n',
      );

      const findings = await scanner.run(makeContext());
      const aggressionFinding = findings.find((f) => f.metadata?.closeThresholdDays !== undefined);
      expect(aggressionFinding!.severity).toBe(Severity.PASS);
    });
  });

  describe('exempt label checking', () => {
    it('WARNING when config lacks exempt labels', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'stale.yml'),
        'daysUntilStale: 60\ndaysUntilClose: 30\n',
      );

      const findings = await scanner.run(makeContext());
      const exemptFinding = findings.find((f) => f.message.includes('exempt'));
      expect(exemptFinding).toBeDefined();
      expect(exemptFinding!.severity).toBe(Severity.WARNING);
    });

    it('PASS when config has exempt labels', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'stale.yml'),
        'daysUntilStale: 60\ndaysUntilClose: 30\nexemptLabels:\n  - security\n  - bug\n  - pinned\n',
      );

      const findings = await scanner.run(makeContext());
      const exemptFinding = findings.find(
        (f) => f.message.includes('exempt') && f.severity === Severity.PASS,
      );
      expect(exemptFinding).toBeDefined();
    });
  });

  describe('workflow action parsing', () => {
    it('extracts days-before-close from actions/stale workflow', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'workflows', 'stale.yml'),
        `name: Stale
on:
  schedule:
    - cron: '0 0 * * *'
jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          days-before-close: 10
          days-before-stale: 30
          exempt-issue-labels: security,bug
`,
      );

      const findings = await scanner.run(makeContext());
      const aggressionFinding = findings.find((f) => f.metadata?.closeThresholdDays !== undefined);
      expect(aggressionFinding).toBeDefined();
      expect(aggressionFinding!.metadata?.closeThresholdDays).toBe(10);
    });
  });
});
