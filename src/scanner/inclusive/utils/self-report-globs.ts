/**
 * Glob patterns matching quaid-scanner's own dated scan reports.
 *
 * Inclusive scanners must exclude these so they don't ingest their own prior
 * output (#169 for .md, #207 for .html). Centralized here so adding a new
 * report format only touches one file.
 */
export const SELF_REPORT_GLOBS: readonly string[] = [
  '**/quaid-scan-*.md',
  '**/quaid-scan-*.json',
  '**/quaid-scan-*.html',
];
