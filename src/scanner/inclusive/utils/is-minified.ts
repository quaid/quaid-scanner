/**
 * Heuristic detection of minified/generated content (#202).
 *
 * Triggers on:
 *   - Any single line longer than `LONG_LINE_THRESHOLD` (default 2000 chars)
 *   - Average line length above `AVG_LINE_THRESHOLD` (default 500 chars)
 *
 * Both signals are strong indicators of machine-generated single-bundle output
 * (Vite/Webpack/Rollup minified JS, vendored single-file libraries, etc.).
 *
 * Returns false for content under `MIN_SIZE_BYTES` (default 2000 bytes) — too
 * small for the heuristics to apply meaningfully.
 *
 * Used by the inclusive scanners to skip files whose flagged terms come from
 * machine-generated code maintainers cannot act on.
 */

const MIN_SIZE_BYTES = 2000;
const LONG_LINE_THRESHOLD = 2000;
const AVG_LINE_THRESHOLD = 500;

export function isMinifiedContent(content: string): boolean {
  if (content.length < MIN_SIZE_BYTES) return false;

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.length > LONG_LINE_THRESHOLD) return true;
  }

  const avg = content.length / lines.length;
  if (avg > AVG_LINE_THRESHOLD) return true;

  return false;
}
