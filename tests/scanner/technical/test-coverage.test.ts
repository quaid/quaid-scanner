/**
 * Tests for Test Coverage scanner.
 *
 * Validates CI badge detection, coverage config parsing, threshold severity
 * levels, and test-file presence detection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { vi } from 'vitest';
import { TestCoverageScanner } from '../../../src/scanner/technical/test-coverage.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: TestCoverageScanner;

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

/** Create a `tests/` directory with a placeholder test file. */
function createTestDir(): void {
  fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'tests', 'example.test.ts'), '// placeholder');
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-coverage-scanner-'));
  scanner = new TestCoverageScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('TestCoverageScanner', () => {
  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('test-coverage');
      expect(scanner.displayName).toBe('Test Coverage');
      expect(scanner.pillar).toBe(Pillar.TECHNICAL);
    });
  });

  // ---------------------------------------------------------------------------
  // Test-file detection
  // ---------------------------------------------------------------------------
  describe('test file detection', () => {
    it('CRITICAL when no test files found and returns early', async () => {
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('No test files'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
      expect(f!.metadata?.testFilesFound).toBe(false);
      // Should return early — no config or badge findings
      expect(findings).toHaveLength(1);
    });

    it('PASS when tests/ directory exists at root', async () => {
      createTestDir();
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Test files detected'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.PASS);
      expect(f!.metadata?.testFilesFound).toBe(true);
    });

    it('detects test/ directory (singular)', async () => {
      fs.mkdirSync(path.join(tmpDir, 'test'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'test', 'foo.test.js'), '// test');
      const findings = await scanner.run(makeContext());
      expect(findings.find((x) => x.message.includes('Test files detected'))).toBeDefined();
    });

    it('detects __tests__ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '__tests__', 'app.spec.ts'), '// test');
      const findings = await scanner.run(makeContext());
      expect(findings.find((x) => x.message.includes('Test files detected'))).toBeDefined();
    });

    it('detects spec/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, 'spec'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'spec', 'app_spec.rb'), '// test');
      const findings = await scanner.run(makeContext());
      expect(findings.find((x) => x.message.includes('Test files detected'))).toBeDefined();
    });

    it('detects specs/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'specs', 'app.spec.ts'), '// test');
      const findings = await scanner.run(makeContext());
      expect(findings.find((x) => x.message.includes('Test files detected'))).toBeDefined();
    });

    it('detects .spec. files inside src/', async () => {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'app.spec.ts'), '// test');
      const findings = await scanner.run(makeContext());
      expect(findings.find((x) => x.message.includes('Test files detected'))).toBeDefined();
    });

    it('detects .test. files inside src/', async () => {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'util.test.js'), '// test');
      const findings = await scanner.run(makeContext());
      expect(findings.find((x) => x.message.includes('Test files detected'))).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Coverage configuration detection
  // ---------------------------------------------------------------------------
  describe('coverage config detection', () => {
    it('WARNING when no coverage config found', async () => {
      createTestDir();
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('No coverage configuration'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
      expect(f!.metadata?.configFound).toBe(false);
    });

    it('detects .nycrc config and extracts threshold', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, '.nycrc'),
        JSON.stringify({ lines: 85, branches: 80, statements: 80, functions: 80 }),
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.metadata?.configFile === '.nycrc');
      expect(f).toBeDefined();
      expect(f!.metadata?.threshold).toBe(85);
    });

    it('detects .nycrc.json config and extracts threshold', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, '.nycrc.json'),
        JSON.stringify({ branches: 75 }),
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.metadata?.configFile === '.nycrc.json');
      expect(f).toBeDefined();
      expect(f!.metadata?.threshold).toBe(75);
    });

    it('detects jest.config.js with coverageThreshold', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'jest.config.js'),
        `module.exports = {
  coverageThreshold: {
    global: {
      branches: 90,
      lines: 90,
    },
  },
};`,
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.metadata?.configFile === 'jest.config.js');
      expect(f).toBeDefined();
      expect(f!.metadata?.threshold).toBe(90);
    });

    it('detects vitest.config.ts with coverage thresholds', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'vitest.config.ts'),
        `import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        branches: 80,
        lines: 80,
      },
    },
  },
});`,
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.metadata?.configFile === 'vitest.config.ts');
      expect(f).toBeDefined();
      expect(f!.metadata?.threshold).toBe(80);
    });

    it('detects codecov.yml with target threshold', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'codecov.yml'),
        `coverage:\n  status:\n    project:\n      default:\n        target: 80\n`,
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.metadata?.configFile === 'codecov.yml');
      expect(f).toBeDefined();
    });

    it('INFO when config exists but no numeric threshold found', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'jest.config.js'),
        `module.exports = { collectCoverage: true };`,
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage configuration found'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.INFO);
      expect(f!.metadata?.threshold).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Threshold severity levels
  // ---------------------------------------------------------------------------
  describe('threshold severity levels', () => {
    it('PASS when threshold >= 80%', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, '.nycrc'),
        JSON.stringify({ lines: 80 }),
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage threshold configured at 80%'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.PASS);
    });

    it('PASS when threshold > 80% (e.g. 95%)', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, '.nycrc'),
        JSON.stringify({ lines: 95 }),
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage threshold configured at 95%'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.PASS);
    });

    it('WARNING when threshold is between 50% and 79%', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, '.nycrc'),
        JSON.stringify({ lines: 65 }),
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage threshold configured at 65%'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
      expect(f!.suggestion).toContain('below the recommended 80%');
    });

    it('CRITICAL when threshold is below 50%', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, '.nycrc'),
        JSON.stringify({ lines: 30 }),
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage threshold configured at 30%'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
      expect(f!.suggestion).toContain('critically low');
    });

    it('boundary: threshold exactly 50% is WARNING', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, '.nycrc'),
        JSON.stringify({ lines: 50 }),
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage threshold configured at 50%'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
    });
  });

  // ---------------------------------------------------------------------------
  // CI badge detection
  // ---------------------------------------------------------------------------
  describe('CI badge detection', () => {
    it('INFO when no badge in README', async () => {
      createTestDir();
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# My Project\n\nNo badges here.\n');
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('No coverage badge'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.INFO);
      expect(f!.metadata?.badges).toEqual([]);
    });

    it('PASS when Codecov badge present in README', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n[![codecov](https://codecov.io/gh/owner/repo/badge.svg)](https://codecov.io/gh/owner/repo)\n',
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage badge'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.PASS);
      expect(f!.metadata?.badges).toContain('codecov');
    });

    it('PASS when Coveralls badge present in README', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n[![Coverage Status](https://coveralls.io/repos/github/owner/repo/badge.svg)](https://coveralls.io/github/owner/repo)\n',
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage badge'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.PASS);
      expect(f!.metadata?.badges).toContain('coveralls');
    });

    it('PASS when GitHub Actions coverage badge present in README', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n[![coverage](https://github.com/owner/repo/actions/workflows/coverage.yml/badge.svg)](https://github.com/owner/repo/actions)\n',
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage badge'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.PASS);
      expect(f!.metadata?.badges).toContain('github-actions');
    });

    it('detects multiple badges in same README', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        `# Project

[![codecov](https://codecov.io/gh/owner/repo/badge.svg)](https://codecov.io/gh/owner/repo)
[![Coverage Status](https://coveralls.io/repos/github/owner/repo/badge.svg)](https://coveralls.io)
`,
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage badge'));
      expect(f).toBeDefined();
      expect(f!.metadata?.badges).toContain('codecov');
      expect(f!.metadata?.badges).toContain('coveralls');
    });

    it('detects ![coverage] alt text as GitHub Actions coverage badge', async () => {
      createTestDir();
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Proj\n\n![coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)\n',
      );
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('Coverage badge'));
      expect(f).toBeDefined();
      expect(f!.metadata?.badges).toContain('github-actions');
    });

    it('INFO when README exists but has no badges', async () => {
      createTestDir();
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Project\n\nSome text.\n');
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('No coverage badge'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.INFO);
    });

    it('INFO when no README exists at all', async () => {
      createTestDir();
      // No README — badge sources are absent
      const findings = await scanner.run(makeContext());
      const f = findings.find((x) => x.message.includes('No coverage badge'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.INFO);
    });
  });

  // ---------------------------------------------------------------------------
  // Full scenario: well-configured project
  // ---------------------------------------------------------------------------
  describe('well-configured project', () => {
    it('produces PASS findings for project with tests, config, and badge', async () => {
      createTestDir();

      fs.writeFileSync(
        path.join(tmpDir, '.nycrc'),
        JSON.stringify({ lines: 85, branches: 80 }),
      );

      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# My Project\n\n[![codecov](https://codecov.io/gh/owner/repo/badge.svg)](https://codecov.io/gh/owner/repo)\n',
      );

      const findings = await scanner.run(makeContext());
      const severities = findings.map((f) => f.severity);
      expect(severities).not.toContain(Severity.CRITICAL);
      expect(severities).not.toContain(Severity.WARNING);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles nonexistent repoPath gracefully', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].severity).toBe(Severity.CRITICAL);
    });

    it('handles unreadable config file gracefully', async () => {
      createTestDir();
      const cfgPath = path.join(tmpDir, '.nycrc');
      fs.writeFileSync(cfgPath, '{}');
      fs.chmodSync(cfgPath, 0o000);

      try {
        const findings = await scanner.run(makeContext());
        // Should not throw; falls back gracefully to "no config found" or INFO
        expect(findings.length).toBeGreaterThan(0);
      } finally {
        fs.chmodSync(cfgPath, 0o644);
      }
    });

    it('generates unique finding IDs within a single run', async () => {
      createTestDir();
      fs.writeFileSync(path.join(tmpDir, '.nycrc'), JSON.stringify({ lines: 80 }));
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '[![codecov](https://codecov.io/gh/owner/repo/badge.svg)](https://codecov.io)\n',
      );

      const findings = await scanner.run(makeContext());
      const ids = findings.map((f) => f.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('all findings belong to TECHNICAL pillar', async () => {
      createTestDir();
      const findings = await scanner.run(makeContext());
      for (const f of findings) {
        expect(f.pillar).toBe(Pillar.TECHNICAL);
      }
    });
  });
});
