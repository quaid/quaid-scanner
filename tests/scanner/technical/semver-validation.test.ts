import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import { SemVerValidationScanner } from '../../../src/scanner/technical/semver-validation.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

vi.mock('node:child_process');
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

const mockedExec = vi.mocked(childProcess);
const mockedFs = vi.mocked(fs);

describe('SemVerValidationScanner', () => {
  let scanner: SemVerValidationScanner;

  beforeEach(() => {
    scanner = new SemVerValidationScanner();
    vi.resetAllMocks();
  });

  it('has correct metadata', () => {
    expect(scanner.name).toBe('semver-validation');
    expect(scanner.displayName).toBeTruthy();
    expect(scanner.pillar).toBe(Pillar.TECHNICAL);
    expect(scanner.dependsOn).toContain('release-cadence');
  });

  it('returns INFO when no tags exist', async () => {
    mockedExec.execSync = vi.fn().mockReturnValue('');
    mockedFs.existsSync = vi.fn().mockReturnValue(false);

    const findings = await scanner.run(makeContext());
    expect(findings.length).toBeGreaterThan(0);
    // No tags = info-level note, not critical
    expect(findings.every((f) => f.severity <= Severity.WARNING)).toBe(true);
  });

  it('returns PASS when all tags are valid SemVer', async () => {
    mockedExec.execSync = vi.fn().mockReturnValue('v1.0.0\nv1.1.0\nv2.0.0\n');
    mockedFs.existsSync = vi.fn().mockReturnValue(false);

    const findings = await scanner.run(makeContext());
    const passes = findings.filter((f) => f.severity === Severity.PASS);
    expect(passes.length).toBeGreaterThan(0);
  });

  it('returns WARNING when non-SemVer tags exist', async () => {
    mockedExec.execSync = vi.fn().mockReturnValue('v1.0.0\nbuild-20240101\nrelease-jan\n');
    mockedFs.existsSync = vi.fn().mockReturnValue(false);

    const findings = await scanner.run(makeContext());
    const warnings = findings.filter((f) => f.severity >= Severity.WARNING);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('returns PASS when CHANGELOG.md exists alongside releases', async () => {
    mockedExec.execSync = vi.fn().mockReturnValue('v1.0.0\nv1.1.0\n');
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).toUpperCase().includes('CHANGELOG'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue('## v1.0.0\n## v1.1.0\n');

    const findings = await scanner.run(makeContext());
    const criticals = findings.filter((f) => f.severity === Severity.CRITICAL);
    expect(criticals.length).toBe(0);
  });

  it('returns findings only for TECHNICAL pillar', async () => {
    mockedExec.execSync = vi.fn().mockReturnValue('');
    mockedFs.existsSync = vi.fn().mockReturnValue(false);

    const findings = await scanner.run(makeContext());
    expect(findings.every((f) => f.pillar === Pillar.TECHNICAL)).toBe(true);
  });

  it('returns empty array and INFO when execSync throws', async () => {
    mockedExec.execSync = vi.fn().mockImplementation(() => { throw new Error('git not found'); });
    mockedFs.existsSync = vi.fn().mockReturnValue(false);

    const findings = await scanner.run(makeContext());
    // getGitTags returns [] on error, so we get the no-tags INFO finding
    expect(findings.length).toBeGreaterThan(0);
    const infoFindings = findings.filter((f) => f.severity === Severity.INFO);
    expect(infoFindings.length).toBeGreaterThan(0);
  });

  it('returns WARNING when 70-99% of tags follow SemVer', async () => {
    // 3 valid semver tags + 1 non-semver = 75% ratio, hits the >= 0.7 WARNING branch
    mockedExec.execSync = vi.fn().mockReturnValue('v1.0.0\nv1.1.0\nv2.0.0\nbad-tag\n');
    mockedFs.existsSync = vi.fn().mockReturnValue(false);

    const findings = await scanner.run(makeContext());
    const warnings = findings.filter((f) => f.severity === Severity.WARNING);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toMatch(/do not follow SemVer/);
  });

  it('returns WARNING when CHANGELOG exists but is missing entries for recent tags', async () => {
    // All tags are valid SemVer, CHANGELOG exists but does NOT contain the version strings
    mockedExec.execSync = vi.fn().mockReturnValue('v1.0.0\nv1.1.0\n');
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).toUpperCase().includes('CHANGELOG'),
    );
    // CHANGELOG content has no version headers — only "## Unreleased"
    mockedFs.readFileSync = vi.fn().mockReturnValue('## Unreleased\n\n- Some unreleased change\n');

    const findings = await scanner.run(makeContext());
    const warnings = findings.filter((f) => f.severity === Severity.WARNING);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toMatch(/CHANGELOG missing entries for/);
    expect(warnings[0].metadata).toHaveProperty('missingVersions');
  });

  it('returns false from changelogMentionsVersion when readFileSync throws', async () => {
    // Trigger the catch block in changelogMentionsVersion by having readFileSync throw
    mockedExec.execSync = vi.fn().mockReturnValue('v1.0.0\n');
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).toUpperCase().includes('CHANGELOG'),
    );
    mockedFs.readFileSync = vi.fn().mockImplementation(() => { throw new Error('permission denied'); });

    const findings = await scanner.run(makeContext());
    // readFileSync throws → changelogMentionsVersion returns false → all tags missing from changelog
    const warnings = findings.filter((f) => f.severity === Severity.WARNING);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toMatch(/CHANGELOG missing entries for/);
  });

  it('counts version by bare string when prefixed v tag matches bare form in changelog', async () => {
    // content.includes(version) is false but content.includes(bare) is true
    // e.g., tag is "v1.0.0", changelog contains "1.0.0" but not "v1.0.0"
    mockedExec.execSync = vi.fn().mockReturnValue('v1.0.0\n');
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).toUpperCase().includes('CHANGELOG'),
    );
    // Only the bare "1.0.0" form — not "v1.0.0"
    mockedFs.readFileSync = vi.fn().mockReturnValue('## 1.0.0\n\n- Initial release\n');

    const findings = await scanner.run(makeContext());
    // Changelog covers the release via bare version, so no missing-entry warning
    const passes = findings.filter((f) => f.severity === Severity.PASS);
    expect(passes.some((f) => f.message.includes('CHANGELOG'))).toBe(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
