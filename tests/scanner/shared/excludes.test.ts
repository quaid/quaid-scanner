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

  it('returns a fresh array each call (no shared mutable state)', () => {
    const a = excludeGlobs();
    a.push('mutated');
    expect(excludeGlobs()).not.toContain('mutated');
  });
});
