import type { Finding, ScanReport } from './types/index.js';

/**
 * Returns true when a finding represents a scanner failure (timeout or crash)
 * rather than a real problem in the scanned repo.
 * Filter these out before filing issues or computing aggregate scores.
 */
export function isErrorFinding(f: Finding): boolean {
  return f.category === 'timeout' || f.category === 'error';
}

/**
 * Builds a jq filter expression that selects findings matching this finding.
 *
 * When `category` is a non-empty, non-"unknown" string, uses an exact category
 * match.  Falls back to an ID-prefix `startswith` match so the before/after
 * verify command is always functional even when category is absent.
 */
function buildVerifySelector(finding: Finding): string {
  const cat = finding.category;
  if (cat && cat !== 'unknown') {
    return `select(.category == "${cat}")`;
  }
  // Strip trailing counter (e.g. "inclusive-code-scanner-3" → "inclusive-code-scanner")
  const idPrefix = finding.id.replace(/-\d+$/, '');
  return `select(.id | startswith("${idPrefix}"))`;
}

/** Per-pillar rationale sentences explaining the real-world impact. */
const PILLAR_RATIONALE: Record<string, string> = {
  security: 'Security gaps create exploitable attack surfaces that can compromise the project, its users, and downstream dependents.',
  governance: 'Without clear governance signals (license, code of conduct, security policy), contributors and adopters cannot assess whether the project is safe to use or contribute to.',
  community: 'Community health signals directly affect whether new contributors discover, join, and stay in the project.',
  inclusive: 'Inclusive language and clear terminology lower the barrier for contributors from diverse backgrounds and reduce friction for newcomers.',
  technical: 'Technical hygiene issues (missing tests, linting, CI) compound over time — each unaddressed gap makes the next change riskier.',
  ai_readiness: 'AI-native tooling relies on structured, machine-readable project context; gaps here reduce the quality of AI-assisted development workflows for this project.',
};

/**
 * Returns a one-sentence rationale explaining why a finding in the given pillar
 * matters.  Falls back to a generic message when the pillar is unrecognised.
 */
function pillarRationale(pillar: string): string {
  return PILLAR_RATIONALE[pillar] ?? `This finding affects the **${pillar}** pillar and will continue to appear in every future scan until resolved.`;
}

/**
 * Renders a structured, agent-executable GitHub issue body from a single finding.
 * Produces five sections (What / Why / How to fix / How to verify / Context)
 * with enough specificity that a coding agent can act on the issue alone.
 *
 * @param finding   The scanner finding to render.
 * @param report    The scan report that produced the finding (used for score and date).
 * @param reportUrl Optional URL to the full scan report (e.g. a GitHub Actions summary
 *                  or a hosted HTML report).  When supplied, a **Full report:** link is
 *                  added to the Context section.
 */
export function renderIssueBody(finding: Finding, report: ScanReport, reportUrl?: string): string {
  const severity = typeof finding.severity === 'number'
    ? ['PASS', 'INFO', 'WARNING', 'CRITICAL'][finding.severity] ?? String(finding.severity)
    : String(finding.severity);

  const verifySelector = buildVerifySelector(finding);
  const verifyCmd = `quaid-scanner . --format json | jq '[.findings[] | ${verifySelector}] | length'`;

  const lines: string[] = [
    `<!-- quaid-scanner finding — pillar: ${finding.pillar}, severity: ${severity} -->`,
    ``,
    `## What is wrong`,
    ``,
    finding.message,
    finding.file ? `\nAffected file: \`${finding.file}\`${finding.line != null ? `:${finding.line}` : ''}` : '',
    ``,
    `## Why it matters`,
    ``,
    pillarRationale(finding.pillar),
    ``,
    `## How to fix it`,
    ``,
    finding.suggestion ?? 'See the reference below for remediation guidance.',
    ``,
    finding.referenceUrl ? `Reference: ${finding.referenceUrl}` : '',
    ``,
    `## How to verify the fix (red → green)`,
    ``,
    `**Before (red — confirms the problem exists):**`,
    `- [ ] \`${verifyCmd}\` returns a non-zero number`,
    ``,
    `**After (green — confirms the fix worked):**`,
    `- [ ] \`${verifyCmd}\` returns \`0\``,
    `- [ ] \`quaid-scanner . --format json | jq '.pillars.${finding.pillar}.score'\` has improved`,
    ``,
    `## Context`,
    ``,
    `- **Pillar:** ${finding.pillar} | **Severity:** ${severity} | **Category:** \`${finding.category ?? 'unknown'}\``,
    `- **Data source:** ${finding.dataSource ?? 'local'}`,
    finding.referenceUrl ? `- **Reference:** ${finding.referenceUrl}` : '',
    `- **Scan report:** scored ${report.overallScore.toFixed(1)}/10 on ${report.scannedAt.slice(0, 10)}`,
    reportUrl ? `- **Full report:** ${reportUrl}` : '',
    ``,
    `---`,
    `*Identified by [quaid-scanner](https://github.com/quaid/quaid-scanner) v${report.version} on ${report.scannedAt.slice(0, 10)}.*`,
  ];

  return lines.filter((l) => l !== '').join('\n');
}
