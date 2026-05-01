/**
 * CLI subprocess integration tests — Story 1.2 and Story 10.6
 *
 * Tests run the compiled dist/cli.js as a real subprocess to verify
 * end-to-end behavior of the main() function, exit codes, and output formats.
 *
 * WIP: Initial red tests — not yet passing.
 */

import { describe, it, expect, afterEach } from 'vitest';
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

/** Path to the compiled CLI entry point */
const CLI = join(PROJECT_ROOT, 'dist', 'cli.js');

/** Temp files created during tests — cleaned up in afterEach */
const tmpFiles: string[] = [];

afterEach(() => {
  for (const f of tmpFiles) {
    if (existsSync(f)) unlinkSync(f);
  }
  tmpFiles.length = 0;
});

/**
 * Convenience wrapper around spawnSync targeting the project root.
 */
function runCLI(
  args: string[],
  opts: { cwd?: string; timeout?: number } = {},
): ReturnType<typeof spawnSync> {
  return spawnSync('node', [CLI, ...args], {
    cwd: opts.cwd ?? PROJECT_ROOT,
    encoding: 'utf-8',
    timeout: opts.timeout ?? 30_000,
  });
}

// ---------------------------------------------------------------------------
// Story 1.2 — Basic scan invocation and output formats
// ---------------------------------------------------------------------------

describe('Story 1.2: CLI subprocess integration', () => {
  it('--format json stdout is valid parseable JSON', () => {
    const result = runCLI(['.', '--depth', 'quick', '--format', 'json', '--quiet']);
    expect([0, 1, 2]).toContain(result.status);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it('--format json output contains overallScore, findings, and repo fields', () => {
    const result = runCLI(['.', '--depth', 'quick', '--format', 'json', '--quiet']);
    expect([0, 1, 2]).toContain(result.status);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(typeof report.overallScore).toBe('number');
    expect(Array.isArray(report.findings)).toBe(true);
    expect(typeof report.repo).toBe('string');
  });

  it('--format markdown stdout contains markdown # headers', () => {
    const result = runCLI(['.', '--depth', 'quick', '--format', 'markdown', '--quiet']);
    expect([0, 1, 2]).toContain(result.status);
    expect(result.stdout).toMatch(/^#{1,3} /m);
  });

  it('--format markdown stdout contains ## section headers', () => {
    const result = runCLI(['.', '--depth', 'quick', '--format', 'markdown', '--quiet']);
    expect([0, 1, 2]).toContain(result.status);
    expect(result.stdout).toMatch(/^## /m);
  });

  it('--output <file> writes the report to the file', () => {
    const outFile = join(tmpdir(), `quaid-test-output-${Date.now()}.json`);
    tmpFiles.push(outFile);

    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--output', outFile, '--quiet',
    ]);
    expect([0, 1, 2]).toContain(result.status);
    expect(existsSync(outFile)).toBe(true);
    expect(() => JSON.parse(readFileSync(outFile, 'utf-8'))).not.toThrow();
  });

  it('--output <file> report has valid overallScore', () => {
    const outFile = join(tmpdir(), `quaid-test-score-${Date.now()}.json`);
    tmpFiles.push(outFile);

    runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--output', outFile, '--quiet',
    ]);
    const report = JSON.parse(readFileSync(outFile, 'utf-8')) as Record<string, unknown>;
    expect(typeof report.overallScore).toBe('number');
  });

  it('--help stdout contains --depth and --format', () => {
    const result = runCLI(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/--depth/);
    expect(result.stdout).toMatch(/--format/);
  });

  it('--help stdout mentions quaid-scanner', () => {
    const result = runCLI(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/quaid-scanner/i);
  });

  it('--version stdout matches semver pattern', () => {
    const result = runCLI(['--version']);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--threshold 0 forces exit code 0', () => {
    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--threshold', '0', '--quiet',
    ]);
    expect(result.status).toBe(0);
  });

  it('--threshold 10 exits 2 when score cannot reach 10', () => {
    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--threshold', '10', '--quiet',
    ]);
    expect([1, 2]).toContain(result.status);
  });

  it('missing target exits non-zero', () => {
    const result = runCLI(['--quiet']);
    expect(result.status).not.toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('invalid path exits non-zero', () => {
    const result = runCLI(['/tmp/__quaid_nonexistent__', '--depth', 'quick', '--quiet']);
    expect(result.status).not.toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Story 10.6 — Ecosystem flag
// ---------------------------------------------------------------------------

describe('Story 10.6: --ecosystem flag', () => {
  it('--ecosystem does not crash; exits with a valid code', () => {
    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--ecosystem', '--quiet',
    ]);
    expect([0, 1, 2]).toContain(result.status);
  });

  it('--ecosystem JSON stdout has overallScore as a number', () => {
    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--ecosystem', '--quiet',
    ]);
    expect([0, 1, 2]).toContain(result.status);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(typeof report.overallScore).toBe('number');
  });

  it('--ecosystem JSON stdout has ecosystem field or valid structure', () => {
    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--ecosystem', '--quiet',
    ]);
    expect([0, 1, 2]).toContain(result.status);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(typeof report.repo).toBe('string');
    expect(Array.isArray(report.findings)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Verbose and progress output
// ---------------------------------------------------------------------------

describe('Verbose and progress output', () => {
  it('--verbose flag does not crash', () => {
    const result = runCLI([
      '.', '--depth', 'quick', '--format', 'json', '--verbose',
    ]);
    expect([0, 1, 2]).toContain(result.status);
  });

  it('non-quiet mode prints Score summary to stderr', () => {
    const result = runCLI(['.', '--depth', 'quick', '--format', 'json']);
    expect([0, 1, 2]).toContain(result.status);
    expect(result.stderr).toMatch(/Score:/);
  });
});
