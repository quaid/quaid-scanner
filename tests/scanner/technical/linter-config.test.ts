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

  // --- detectPyprojectLinter ---

  it('returns false for pyproject.toml when readFileSync throws', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('pyproject.toml'),
    );
    mockedFs.readFileSync = vi.fn().mockImplementation(() => {
      throw new Error('Permission denied');
    });
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    // Should not throw; pyproject linter detection falls back to false
    const findings = await scanner.run(makeContext());
    // No linter detected (only pyproject candidate, which throws), so WARNING
    const warnings = findings.filter((f) => f.severity === Severity.WARNING);
    expect(warnings.length).toBeGreaterThan(0);
  });

  // --- detectPackageJsonLinter ---

  it('detects eslintConfig inline in package.json', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('package.json'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      JSON.stringify({ eslintConfig: { rules: {} } }),
    );
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const linterPasses = findings.filter(
      (f) => f.severity === Severity.PASS && f.message.includes('eslint'),
    );
    expect(linterPasses.length).toBeGreaterThan(0);
  });

  it('detects prettier inline in package.json', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('package.json'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      JSON.stringify({ prettier: { semi: false } }),
    );
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const linterPasses = findings.filter(
      (f) => f.severity === Severity.PASS && f.message.includes('prettier'),
    );
    expect(linterPasses.length).toBeGreaterThan(0);
  });

  it('detects eslint via lint script in package.json scripts', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('package.json'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      JSON.stringify({ scripts: { lint: 'eslint src/' } }),
    );
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const linterPasses = findings.filter(
      (f) => f.severity === Severity.PASS && f.message.includes('lint script'),
    );
    expect(linterPasses.length).toBeGreaterThan(0);
  });

  it('detects biome via script in package.json scripts', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('package.json'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      JSON.stringify({ scripts: { check: 'biome check .' } }),
    );
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const linterPasses = findings.filter(
      (f) => f.severity === Severity.PASS && f.message.includes('lint script'),
    );
    expect(linterPasses.length).toBeGreaterThan(0);
  });

  it('ignores malformed package.json gracefully', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('package.json'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue('{ not valid json !!');
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    // Should not throw; package.json is silently ignored
    const findings = await scanner.run(makeContext());
    const warnings = findings.filter((f) => f.severity === Severity.WARNING);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('returns null for package.json detection when no linter fields present', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('package.json'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      JSON.stringify({ name: 'my-pkg', scripts: { build: 'tsc' } }),
    );
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    // No linter detected → WARNING
    const warnings = findings.filter((f) => f.severity === Severity.WARNING);
    expect(warnings.length).toBeGreaterThan(0);
  });

  // --- detectCiLintStep ---

  it('detects lint step in CI workflow YAML file', async () => {
    const repoPath = '/tmp/test-repo';
    const workflowDir = `${repoPath}/.github/workflows`;

    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) => {
      const s = String(p);
      return s === workflowDir || s.endsWith('.eslintrc.json');
    });
    mockedFs.readdirSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p) === workflowDir) return ['ci.yml'] as unknown as fs.Dirent[];
      return [] as unknown as fs.Dirent[];
    });
    mockedFs.readFileSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p).endsWith('ci.yml')) return 'steps:\n  - run: npm run lint\n';
      return '';
    });

    const findings = await scanner.run(makeContext(repoPath));
    const ciPass = findings.filter(
      (f) => f.severity === Severity.PASS && f.message.includes('CI'),
    );
    expect(ciPass.length).toBeGreaterThan(0);
  });

  it('returns INFO when linter detected but no CI lint step', async () => {
    const repoPath = '/tmp/test-repo';
    const workflowDir = `${repoPath}/.github/workflows`;

    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) => {
      const s = String(p);
      return s === workflowDir || s.endsWith('.eslintrc.json');
    });
    mockedFs.readdirSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p) === workflowDir) return ['deploy.yml'] as unknown as fs.Dirent[];
      return [] as unknown as fs.Dirent[];
    });
    mockedFs.readFileSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p).endsWith('deploy.yml')) return 'steps:\n  - run: npm run build\n';
      return '';
    });

    const findings = await scanner.run(makeContext(repoPath));
    const infoFindings = findings.filter(
      (f) => f.severity === Severity.INFO && f.message.includes('no lint step'),
    );
    expect(infoFindings.length).toBeGreaterThan(0);
  });

  it('handles readFileSync error in CI workflow file gracefully', async () => {
    const repoPath = '/tmp/test-repo';
    const workflowDir = `${repoPath}/.github/workflows`;

    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) => {
      const s = String(p);
      return s === workflowDir || s.endsWith('.eslintrc.json');
    });
    mockedFs.readdirSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p) === workflowDir) return ['bad.yml'] as unknown as fs.Dirent[];
      return [] as unknown as fs.Dirent[];
    });
    mockedFs.readFileSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p).endsWith('bad.yml')) throw new Error('Permission denied');
      return '';
    });

    // Should not throw; the unreadable workflow file yields false for CI lint
    const findings = await scanner.run(makeContext(repoPath));
    // Linter is still detected via .eslintrc.json — should have a PASS + INFO
    const infoFindings = findings.filter((f) => f.severity === Severity.INFO);
    expect(infoFindings.length).toBeGreaterThan(0);
  });

  it('handles readdirSync error in CI workflow dir gracefully', async () => {
    const repoPath = '/tmp/test-repo';
    const workflowDir = `${repoPath}/.github/workflows`;

    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) => {
      const s = String(p);
      return s === workflowDir || s.endsWith('.eslintrc.json');
    });
    mockedFs.readdirSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p) === workflowDir) throw new Error('EACCES');
      return [] as unknown as fs.Dirent[];
    });

    // Should not throw; readdirSync error → detectCiLintStep returns false
    const findings = await scanner.run(makeContext(repoPath));
    expect(findings.length).toBeGreaterThan(0);
  });

  it('produces two PASS findings when linter found and CI lint step present', async () => {
    const repoPath = '/tmp/test-repo';
    const workflowDir = `${repoPath}/.github/workflows`;

    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) => {
      const s = String(p);
      return s === workflowDir || s.endsWith('biome.json');
    });
    mockedFs.readdirSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p) === workflowDir) return ['ci.yml'] as unknown as fs.Dirent[];
      return [] as unknown as fs.Dirent[];
    });
    mockedFs.readFileSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p).endsWith('ci.yml')) return 'run: biome check .\n';
      return '';
    });

    const findings = await scanner.run(makeContext(repoPath));
    const passes = findings.filter((f) => f.severity === Severity.PASS);
    expect(passes.length).toBe(2);
  });

  it('detects multiple linters (eslint + prettier config files)', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) => {
      const s = String(p);
      return s.endsWith('.eslintrc.json') || s.endsWith('.prettierrc');
    });
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const findings = await scanner.run(makeContext());
    const linterPass = findings.find(
      (f) => f.severity === Severity.PASS && f.message.includes('eslint') && f.message.includes('prettier'),
    );
    expect(linterPass).toBeTruthy();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
