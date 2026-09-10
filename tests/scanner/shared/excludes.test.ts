/**
 * Tests for the shared scan-exclusion baseline (#171).
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_SCAN_EXCLUDES, excludeGlobs } from '../../../src/scanner/shared/excludes.js';
import { SELF_REPORT_GLOBS } from '../../../src/scanner/inclusive/utils/self-report-globs.js';

describe('DEFAULT_SCAN_EXCLUDES', () => {
  it('includes the caches and toolchain dirs that used to drift per-scanner', () => {
    for (const dir of ['node_modules', 'vendor', '.git', 'dist', 'build', '.claude', '.ainative', '__pycache__']) {
      expect(DEFAULT_SCAN_EXCLUDES).toContain(dir);
    }
  });

  it('has no duplicate entries', () => {
    expect(new Set(DEFAULT_SCAN_EXCLUDES).size).toBe(DEFAULT_SCAN_EXCLUDES.length);
  });

  /**
   * Bug #223 — the baseline was JS/TS-centric. It already carried `__pycache__`
   * and `.dvc`, but not the single most common Python directory, so scanning any
   * Python project with a local virtualenv walked the entire installed
   * dependency tree: 701 findings from third-party packages on one LMCache run.
   */
  it('excludes Python virtualenvs and tool caches (#223)', () => {
    for (const dir of [
      '.venv',
      'venv',
      'site-packages',
      '.tox',
      '.mypy_cache',
      '.pytest_cache',
      '.ruff_cache',
    ]) {
      expect(DEFAULT_SCAN_EXCLUDES).toContain(dir);
    }
  });

  it('excludes site-packages, which catches virtualenvs under a non-standard name', () => {
    // `.venv`/`venv` are conventions, not guarantees — `site-packages` is the
    // structural marker that holds however the venv directory is named.
    expect(DEFAULT_SCAN_EXCLUDES).toContain('site-packages');
    expect(excludeGlobs()).toContain('**/site-packages/**');
  });
});

describe('excludeGlobs', () => {
  it('maps every default dir to a **/dir/** ignore glob', () => {
    const globs = excludeGlobs();
    for (const dir of DEFAULT_SCAN_EXCLUDES) {
      expect(globs).toContain(`**/${dir}/**`);
    }
  });

  it("includes quaid-scanner's own report output (self-report globs)", () => {
    const globs = excludeGlobs();
    for (const g of SELF_REPORT_GLOBS) {
      expect(globs).toContain(g);
    }
  });

  it('appends scanner-specific extra patterns at the end', () => {
    const globs = excludeGlobs(['**/*.min.js', '**/custom/**']);
    expect(globs).toContain('**/*.min.js');
    expect(globs).toContain('**/custom/**');
  });

  it('omits baseline dirs listed in options.omit (e.g. binary-artifacts keeps __pycache__ visible)', () => {
    const globs = excludeGlobs([], { omit: ['__pycache__'] });
    expect(globs).not.toContain('**/__pycache__/**');
    // other baseline dirs remain excluded
    expect(globs).toContain('**/node_modules/**');
  });

  it('keeps virtualenvs excluded for binary-artifacts, which only omits __pycache__ (#223)', () => {
    // binary-artifacts deliberately keeps __pycache__ visible so it can flag
    // committed .pyc bytecode. That opt-out must not leak into the virtualenv
    // entries — the bundled pip/setuptools wheels under .venv were the source
    // of the CRITICAL findings in #223.
    const globs = excludeGlobs([], { omit: ['__pycache__'] });
    expect(globs).not.toContain('**/__pycache__/**');
    for (const dir of ['.venv', 'venv', 'site-packages', '.tox']) {
      expect(globs).toContain(`**/${dir}/**`);
    }
  });

  it('returns a fresh array each call (no shared mutable state)', () => {
    const a = excludeGlobs();
    a.push('mutated');
    expect(excludeGlobs()).not.toContain('mutated');
  });
});
