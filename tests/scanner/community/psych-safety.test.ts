/**
 * Tests for Psychological Safety Artifacts scanner.
 *
 * Validates Code of Conduct detection, enforcement mechanism checks,
 * and all-contributors recognition.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { PsychSafetyScanner } from '../../../src/scanner/community/psych-safety.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: PsychSafetyScanner;

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'psych-safety-test-'));
  scanner = new PsychSafetyScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('PsychSafetyScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('psych-safety');
      expect(scanner.displayName).toBe('Psychological Safety Artifacts');
      expect(scanner.pillar).toBe(Pillar.COMMUNITY);
    });
  });

  describe('Code of Conduct detection', () => {
    it('CRITICAL when no Code of Conduct found (incubating)', async () => {
      const findings = await scanner.run(makeContext());
      const cocFinding = findings.find((f) => f.message.includes('Code of Conduct'));
      expect(cocFinding).toBeDefined();
      expect(cocFinding!.severity).toBe(Severity.CRITICAL);
    });

    it('WARNING when no Code of Conduct found (sandbox)', async () => {
      const findings = await scanner.run(makeContext({ maturity: MaturityLevel.SANDBOX }));
      const cocFinding = findings.find((f) => f.message.includes('Code of Conduct'));
      expect(cocFinding).toBeDefined();
      expect(cocFinding!.severity).toBe(Severity.WARNING);
    });

    it('detects CODE_OF_CONDUCT.md', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'CODE_OF_CONDUCT.md'),
        '# Code of Conduct\nPlease report issues to conduct@example.com\nEnforcement: warnings and bans',
      );

      const findings = await scanner.run(makeContext());
      const cocFinding = findings.find((f) => f.message.includes('Code of Conduct') && f.severity === Severity.PASS);
      expect(cocFinding).toBeDefined();
    });

    it('detects CODE-OF-CONDUCT.md (hyphenated)', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'CODE-OF-CONDUCT.md'),
        '# CoC\nReport to email@example.com\nConsequences include bans',
      );

      const findings = await scanner.run(makeContext());
      const cocFinding = findings.find((f) => f.message.includes('Code of Conduct') && f.severity === Severity.PASS);
      expect(cocFinding).toBeDefined();
    });
  });

  describe('enforcement mechanism', () => {
    it('WARNING when CoC exists but lacks enforcement', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'CODE_OF_CONDUCT.md'),
        '# Code of Conduct\nBe nice to each other.',
      );

      const findings = await scanner.run(makeContext());
      const enforceFinding = findings.find((f) => f.message.includes('enforcement'));
      expect(enforceFinding).toBeDefined();
      expect(enforceFinding!.severity).toBe(Severity.WARNING);
    });

    it('PASS when CoC has enforcement keywords', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'CODE_OF_CONDUCT.md'),
        '# Code of Conduct\n## Enforcement\nReport violations to conduct@example.com\nConsequences include warnings and bans.',
      );

      const findings = await scanner.run(makeContext());
      const enforceFinding = findings.find(
        (f) => f.message.includes('enforcement') && f.severity === Severity.PASS,
      );
      expect(enforceFinding).toBeDefined();
    });
  });

  describe('all-contributors detection', () => {
    it('INFO when .all-contributorsrc found', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.all-contributorsrc'),
        JSON.stringify({
          projectName: 'test',
          contributors: [],
          contributionTypes: ['code', 'doc', 'design'],
        }),
      );

      const findings = await scanner.run(makeContext());
      const acFinding = findings.find((f) => f.message.includes('non-code contributions'));
      expect(acFinding).toBeDefined();
      expect(acFinding!.severity).toBe(Severity.INFO);
    });

    it('detects non-code contribution types in config', async () => {
      fs.writeFileSync(
        path.join(tmpDir, '.all-contributorsrc'),
        JSON.stringify({
          projectName: 'test',
          contributors: [{ contributions: ['code', 'doc', 'translation'] }],
        }),
      );

      const findings = await scanner.run(makeContext());
      const typeFinding = findings.find((f) => f.metadata?.contributionTypes !== undefined);
      expect(typeFinding).toBeDefined();
    });
  });

  describe('README contributors section', () => {
    it('detects Contributors section in README', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n## Contributors\n\nThanks to all contributors!',
      );

      const findings = await scanner.run(makeContext());
      const readmeFinding = findings.find((f) => f.message.includes('Contributors section'));
      expect(readmeFinding).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles missing repo directory gracefully', async () => {
      const findings = await scanner.run(
        makeContext({ repoPath: '/nonexistent/path' }),
      );
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});
