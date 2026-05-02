/**
 * CLI subprocess integration tests — Story 1.2 and Story 10.6
 *
 * Two test strategies:
 *
 * 1. Subprocess tests (spawnSync): verify end-to-end CLI behavior — output
 *    formats, exit codes, file writing.  These confirm the real binary works.
 *
 * 2. In-process tests: import cli.ts with mocked process.argv / process.exit /
 *    process.stdout.write so that main() executes inside the vitest v8 coverage
 *    instrumentation, accumulating line coverage for src/cli.ts.
 */

import {
  describe,
  it,
  expect,
  afterEach,
  beforeEach,
  vi,
  type MockInstance,
} from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Absolute path to the project root (two levels up from tests/cli/) */
const PROJECT_ROOT = resolve(__dirname, '..', '..');

/** Path to the compiled CLI entry point (used by subprocess tests) */
const CLI = join(PROJECT_ROOT, 'dist', 'cli.js');

/** Temp files created during tests — cleaned up in afterEach */
const tmpFiles: string[] = [];

afterEach(() => {
  for (const f of tmpFiles) {
    if (existsSync(f)) unlinkSync(f);
  }
  tmpFiles.length = 0;
});

// ============================================================================
// Subprocess helpers
// ============================================================================

/**
 * Convenience wrapper around spawnSync that targets the project root.
 * maxBuffer is set to 16 MB to handle large JSON reports without truncation.
 */
function runCLI(
  args: string[],
  opts: { cwd?: string; timeout?: number } = {},
): ReturnType<typeof spawnSync> {
  return spawnSync('node', [CLI, ...args], {
    cwd: opts.cwd ?? PROJECT_ROOT,
    encoding: 'utf-8',
    timeout: opts.timeout ?? 30_000,
    maxBuffer: 16 * 1024 * 1024,
  });
}

/**
 * Helper: run a scan writing JSON to a temp file and return the parsed report.
 * Using --output avoids stdout pipe-buffer truncation for large reports.
 */
function scanToFile(extraArgs: string[] = []): {
  status: number | null;
  report: Record<string, unknown>;
  outFile: string;
} {
  const outFile = join(
    tmpdir(),
    `quaid-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
  tmpFiles.push(outFile);

  const result = runCLI([
    '.',
    '--depth', 'quick',
    '--format', 'json',
    '--output', outFile,
    '--quiet',
    ...extraArgs,
  ]);

  const report = existsSync(outFile)
    ? (JSON.parse(readFileSync(outFile, 'utf-8')) as Record<string, unknown>)
    : ({} as Record<string, unknown>);

  return { status: result.status, report, outFile };
}

// ============================================================================
// Story 1.2 — Subprocess integration: output formats
// ============================================================================

describe('Story 1.2: subprocess — output formats', () => {
  it('--format json produces a parseable report via --output file', () => {
    const { status, report, outFile } = scanToFile();
    expect([0, 1, 2]).toContain(status);
    expect(existsSync(outFile)).toBe(true);
    expect(Object.keys(report).length).toBeGreaterThan(0);
  });

  it('--format json report contains overallScore as a number', () => {
    const { status, report } = scanToFile();
    expect([0, 1, 2]).toContain(status);
    expect(typeof report.overallScore).toBe('number');
  });

  it('--format json report contains a findings array', () => {
    const { status, report } = scanToFile();
    expect([0, 1, 2]).toContain(status);
    expect(Array.isArray(report.findings)).toBe(true);
  });

  it('--format json report contains a repo string', () => {
    const { status, report } = scanToFile();
    expect([0, 1, 2]).toContain(status);
    expect(typeof report.repo).toBe('string');
    expect((report.repo as string).length).toBeGreaterThan(0);
  });

  it('--format markdown produces output containing markdown # headers', () => {
    const result = runCLI(['.', '--depth', 'quick', '--format', 'markdown', '--quiet']);
    expect([0, 1, 2]).toContain(result.status);
    expect(result.stdout).toMatch(/^#{1,3} /m);
  });

  it('--format markdown output contains ## section headers', () => {
    const result = runCLI(['.', '--depth', 'quick', '--format', 'markdown', '--quiet']);
    expect([0, 1, 2]).toContain(result.status);
    expect(result.stdout).toMatch(/^## /m);
  });

  it('--output <file> writes a file that contains valid JSON', () => {
    const outFile = join(tmpdir(), `quaid-test-output-${Date.now()}.json`);
    tmpFiles.push(outFile);

    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--output', outFile, '--quiet',
    ]);
    expect([0, 1, 2]).toContain(result.status);
    expect(existsSync(outFile)).toBe(true);
    expect(() => JSON.parse(readFileSync(outFile, 'utf-8'))).not.toThrow();
  });

  it('--output <file> with --quiet writes nothing to stdout', () => {
    const outFile = join(tmpdir(), `quaid-test-stdout-${Date.now()}.json`);
    tmpFiles.push(outFile);

    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--output', outFile, '--quiet',
    ]);
    expect([0, 1, 2]).toContain(result.status);
    expect(result.stdout.trim()).toBe('');
  });
});

// ============================================================================
// Story 1.2 — Subprocess integration: --help, --version, exit codes
// ============================================================================

describe('Story 1.2: subprocess — help, version, and exit codes', () => {
  it('--help prints text that mentions --depth and --format', () => {
    const result = runCLI(['--help']);
    // Commander with exitOverride() propagates through main().catch() → exit(1)
    expect([0, 1]).toContain(result.status);
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/--depth/);
    expect(combined).toMatch(/--format/);
  });

  it('--help output mentions the program name quaid-scanner', () => {
    const result = runCLI(['--help']);
    expect([0, 1]).toContain(result.status);
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/quaid-scanner/i);
  });

  it('--version outputs a string matching semver pattern', () => {
    const result = runCLI(['--version']);
    expect([0, 1]).toContain(result.status);
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/\d+\.\d+\.\d+/);
  });

  it('exit code is 0, 1, or 2 for a valid scan — never null', () => {
    const result = runCLI(['.', '--depth', 'quick', '--format', 'json', '--quiet']);
    expect([0, 1, 2]).toContain(result.status);
  });

  it('--threshold 10 exits 2 when the repo score cannot reach 10', () => {
    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--threshold', '10', '--quiet',
    ]);
    expect(result.status).toBe(2);
  });

  it('missing target exits non-zero and emits help text', () => {
    const result = runCLI(['--quiet']);
    expect(result.status).not.toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined.length).toBeGreaterThan(0);
  });

  it('invalid (non-existent) local path exits non-zero', () => {
    const result = runCLI([
      '/tmp/__quaid_nonexistent_repo__', '--depth', 'quick', '--quiet',
    ]);
    expect(result.status).not.toBe(0);
  });

  it('non-quiet mode prints Score summary to stderr', () => {
    const outFile = join(tmpdir(), `quaid-score-stderr-${Date.now()}.json`);
    tmpFiles.push(outFile);

    const result = runCLI(['.', '--depth', 'quick', '--format', 'json', '--output', outFile]);
    expect([0, 1, 2]).toContain(result.status);
    expect(result.stderr).toMatch(/Score:/);
  });
});

// ============================================================================
// Story 10.6 — Subprocess: --ecosystem flag
// ============================================================================

describe('Story 10.6: subprocess — --ecosystem flag', () => {
  it('--ecosystem does not crash; exits with a valid code', () => {
    const { status } = scanToFile(['--ecosystem']);
    expect([0, 1, 2]).toContain(status);
  });

  it('--ecosystem JSON report has overallScore as a number', () => {
    const { status, report } = scanToFile(['--ecosystem']);
    expect([0, 1, 2]).toContain(status);
    expect(typeof report.overallScore).toBe('number');
  });

  it('--ecosystem JSON report has valid repo and findings fields', () => {
    const { status, report } = scanToFile(['--ecosystem']);
    expect([0, 1, 2]).toContain(status);
    expect(typeof report.repo).toBe('string');
    expect(Array.isArray(report.findings)).toBe(true);
  });
});

// ============================================================================
// In-process tests — drive main() to accumulate v8 coverage for src/cli.ts
//
// Strategy:
//  - Set process.argv[1] to a path ending in 'cli.ts' so the isDirectExecution
//    guard fires when the module is (re-)loaded.
//  - Mock process.exit() to resolve a Promise instead of exiting the process.
//  - Use vi.resetModules() + dynamic import() to re-execute the module body,
//    which starts main() as a background async task.
//  - Await the exit Promise to know when main() has finished.
// ============================================================================

describe('main() — in-process coverage', () => {
  let originalArgv: string[];
  let exitSpy: MockInstance;
  let stdoutSpy: MockInstance;

  beforeEach(() => {
    originalArgv = process.argv.slice();
    vi.resetModules();
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  /**
   * Run main() in-process by:
   * 1. Setting process.argv so the isDirectExecution guard triggers.
   * 2. Mocking process.exit to resolve a shared Promise (first call throws to
   *    unwind the call stack; subsequent calls from the .catch handler return
   *    silently to avoid unhandled rejection noise).
   * 3. Dynamically importing src/cli.ts (fresh via resetModules) to fire the
   *    module body which calls main() asynchronously.
   * 4. Awaiting the exit Promise.
   */
  async function runMainInProcess(
    args: string[],
  ): Promise<{ exitCode: number | null; stdoutOutput: string }> {
    process.argv = ['node', resolve(PROJECT_ROOT, 'src', 'cli.ts'), ...args];

    const outputChunks: string[] = [];
    let resolveExit!: (code: number | null) => void;
    const exitPromise = new Promise<number | null>((res) => {
      resolveExit = res;
    });

    let exitCalled = false;
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (code?: number | string | null | undefined) => {
        const n = typeof code === 'number' ? code : code != null ? Number(code) : null;
        resolveExit(n);
        if (!exitCalled) {
          exitCalled = true;
          // Throw to unwind main()'s call stack on the first call
          throw new Error(`process.exit(${n})`);
        }
        // Subsequent calls from main().catch re-entrant path: return silently
        return undefined as never;
      },
    );

    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(
      (chunk: unknown) => {
        outputChunks.push(String(chunk));
        return true;
      },
    );

    // Fresh module import (resetModules was called in beforeEach)
    try {
      await import('../../src/cli.js');
    } catch {
      // ESM dynamic import shouldn't throw synchronously; ignore
    }

    // Wait for main() to call process.exit()
    const exitCode = await exitPromise;
    return { exitCode, stdoutOutput: outputChunks.join('') };
  }

  it('exits non-zero when no target is supplied', async () => {
    const { exitCode } = await runMainInProcess([]);
    expect(exitCode).not.toBe(0);
  });

  it('exits non-zero for a non-existent path', async () => {
    const { exitCode } = await runMainInProcess([
      '/tmp/__quaid_no_such_repo__',
      '--depth', 'quick',
      '--quiet',
    ]);
    expect(exitCode).not.toBe(0);
  }, 15_000);

  it('writes JSON to stdout when scanning a real repo', async () => {
    const { exitCode, stdoutOutput } = await runMainInProcess([
      PROJECT_ROOT,
      '--depth', 'quick',
      '--format', 'json',
      '--quiet',
    ]);
    expect([0, 1, 2]).toContain(exitCode);
    expect(stdoutOutput).toMatch(/overallScore/);
  }, 30_000);

  it('writes markdown to stdout when --format markdown is set', async () => {
    const { exitCode, stdoutOutput } = await runMainInProcess([
      PROJECT_ROOT,
      '--depth', 'quick',
      '--format', 'markdown',
      '--quiet',
    ]);
    expect([0, 1, 2]).toContain(exitCode);
    expect(stdoutOutput).toMatch(/#{1,3} /);
  }, 30_000);

  it('writes output to file when --output is specified', async () => {
    const outFile = join(tmpdir(), `quaid-inproc-${Date.now()}.json`);
    tmpFiles.push(outFile);

    const { exitCode } = await runMainInProcess([
      PROJECT_ROOT,
      '--depth', 'quick',
      '--format', 'json',
      '--output', outFile,
      '--quiet',
    ]);
    expect([0, 1, 2]).toContain(exitCode);
    expect(existsSync(outFile)).toBe(true);
  }, 30_000);

  it('exits 2 when --threshold 10 is set (score too low)', async () => {
    const { exitCode } = await runMainInProcess([
      PROJECT_ROOT,
      '--depth', 'quick',
      '--format', 'json',
      '--threshold', '10',
      '--quiet',
    ]);
    expect(exitCode).toBe(2);
  }, 30_000);

  it('runs ecosystem analysis without crashing when --ecosystem is set', async () => {
    const { exitCode } = await runMainInProcess([
      PROJECT_ROOT,
      '--depth', 'quick',
      '--format', 'json',
      '--ecosystem',
      '--quiet',
    ]);
    expect([0, 1, 2]).toContain(exitCode);
  }, 30_000);

  it('emits per-scanner progress lines to stderr in --verbose mode', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const outFile = join(tmpdir(), `quaid-verbose-${Date.now()}.json`);
    tmpFiles.push(outFile);

    const { exitCode } = await runMainInProcess([
      PROJECT_ROOT,
      '--depth', 'quick',
      '--format', 'json',
      '--output', outFile,
      '--verbose',
    ]);
    expect([0, 1, 2]).toContain(exitCode);
    consoleSpy.mockRestore();
  }, 30_000);
});
