/**
 * Shared scan-exclusion baseline (#171).
 *
 * Historically each scanner defined its own `EXCLUDED_DIRS` array, and they
 * drifted — some omitted caches (`__pycache__`), build output (`out`, `.next`),
 * or the toolchain dirs (`.claude`, `.ainative`), which reintroduced the class
 * of bugs fixed in #150 and #169 (scanners walking their own output or caches).
 *
 * This module is the single source of truth. Scanners call `excludeGlobs()`
 * instead of maintaining a local array, and pass scanner-specific additions as
 * the `extra` argument.
 */

import { SELF_REPORT_GLOBS } from '../inclusive/utils/self-report-globs.js';

/**
 * Canonical directory names every scanner should skip. Bare names — callers map
 * them to glob patterns via {@link excludeGlobs}.
 */
export const DEFAULT_SCAN_EXCLUDES: readonly string[] = [
  'node_modules',
  'vendor',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'coverage',
  '.claude',
  '.ainative',
  '__pycache__',
  '.dvc',
  // Python virtualenvs and tool caches (#223). The baseline was JS/TS-centric —
  // it carried `__pycache__` and `.dvc` but not the single most common Python
  // directory, so any project with a local venv had its whole installed
  // dependency tree walked. `site-packages` is the robust entry: `.venv`/`venv`
  // are conventions, but a virtualenv always has a `site-packages` inside it,
  // whatever the outer directory is called.
  '.venv',
  'venv',
  'site-packages',
  '.tox',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
];

/**
 * Returns fast-glob `ignore` patterns covering the default excluded directories
 * plus quaid-scanner's own report output (`quaid-scan-*.{md,json,html}`),
 * optionally extended with scanner-specific patterns.
 *
 * @param extra - Additional glob patterns to append (already in glob form).
 * @param options.omit - Default directory names to exclude from the baseline.
 *   Used by scanners that must still inspect an otherwise-ignored directory —
 *   e.g. the binary-artifacts scanner keeps `__pycache__` visible so it can
 *   flag committed `.pyc` bytecode.
 */
export function excludeGlobs(
  extra: readonly string[] = [],
  options: { omit?: readonly string[] } = {},
): string[] {
  const omit = new Set(options.omit ?? []);
  return [
    ...DEFAULT_SCAN_EXCLUDES.filter((dir) => !omit.has(dir)).map((dir) => `**/${dir}/**`),
    ...SELF_REPORT_GLOBS,
    ...extra,
  ];
}
