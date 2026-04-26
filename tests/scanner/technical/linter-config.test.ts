import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LinterConfigScanner } from '../../../src/scanner/technical/linter-config.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

vi.mock('node:fs');

function makeContext(repoPath = '/tmp/test-repo', overrides: Partial<ScanContext> = {}): ScanContext {
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
    repoPath,
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

describe('LinterConfigScanner', () => {
  let scanner: LinterConfigScanner;

  beforeEach(() => {
    scanner = new LinterConfigScanner();
    vi.resetAllMocks();
  });

  it('has correct metadata', () => {
    expect(scanner.name).toBe('linter-config');
    expect(scanner.displayName).toBeTruthy();
    expect(scanner.pillar).toBe(Pillar.TECHNICAL);
  });

  it('returns PASS when .eslintrc.json is present', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).includes('eslintrc') || String(p).includes('.eslintrc'),
    );
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const passes = findings.filter((f) => f.severity === Severity.PASS);
    expect(passes.length).toBeGreaterThan(0);
  });

  it('returns WARNING when no linter config found', async () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(false);
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const warnings = findings.filter((f) => f.severity >= Severity.WARNING);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('detects pyproject.toml with ruff/flake8 tool section', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('pyproject.toml'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue('[tool.ruff]\nline-length = 88\n');
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
