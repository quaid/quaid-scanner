import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import { TestCoverageScanner } from '../../../src/scanner/technical/test-coverage.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

vi.mock('node:fs');

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
    repoIdentifier: null,
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: 'abc', branch: 'main', remoteUrl: null },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

const mockedFs = vi.mocked(fs);

describe('TestCoverageScanner', () => {
  let scanner: TestCoverageScanner;

  beforeEach(() => {
    scanner = new TestCoverageScanner();
    vi.resetAllMocks();
  });

  it('has correct metadata', () => {
    expect(scanner.name).toBe('test-coverage');
    expect(scanner.displayName).toBeTruthy();
    expect(scanner.pillar).toBe(Pillar.TECHNICAL);
  });

  it('returns PASS when .codecov.yml is present', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('.codecov.yml'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue('');
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const passes = findings.filter((f) => f.severity === Severity.PASS);
    expect(passes.length).toBeGreaterThan(0);
  });

  it('returns WARNING when no coverage config found and no CI coverage step', async () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(false);
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const actionable = findings.filter((f) => f.severity >= Severity.WARNING);
    expect(actionable.length).toBeGreaterThan(0);
  });

  it('detects jest coverage config in package.json', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('package.json'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      JSON.stringify({ jest: { collectCoverage: true, coverageThreshold: { global: { lines: 80 } } } }),
    );
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const passes = findings.filter((f) => f.severity === Severity.PASS);
    expect(passes.length).toBeGreaterThan(0);
  });

  it('returns findings only for the TECHNICAL pillar', async () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(false);
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    expect(findings.every((f) => f.pillar === Pillar.TECHNICAL)).toBe(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
