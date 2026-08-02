import { Severity, MaturityLevel } from '../types/index.js';
import type { ScanReport, Recommendation, Finding, ScannerConfig } from '../types/index.js';
import type { OrchestratorResult } from '../scanner/orchestrator.js';

/**
 * Returns an ISO 8601 string with the local timezone offset instead of UTC Z.
 * Example: "2026-06-05T16:30:00-07:00" for a Pacific time run at 23:30 UTC.
 *
 * @param d - The Date to format. Defaults to the current time.
 */
export function localISOString(d: Date = new Date()): string {
  const offset = -d.getTimezoneOffset(); // minutes ahead of UTC
  const sign = offset >= 0 ? '+' : '-';
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const hh = Math.floor(Math.abs(offset) / 60);
  const mm = Math.abs(offset) % 60;
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(hh)}:${pad(mm)}`
  );
}

const SEVERITY_LABELS: Record<number, string> = {
  [Severity.PASS]: 'PASS',
  [Severity.INFO]: 'INFO',
  [Severity.WARNING]: 'WARNING',
  [Severity.CRITICAL]: 'CRITICAL',
};

type ValidatedTarget = { type: 'local' | 'github'; value: string };

function buildRecommendations(findings: Finding[]): Recommendation[] {
  const critical = findings.filter((f) => f.severity === Severity.CRITICAL);
  const warnings = findings.filter((f) => f.severity === Severity.WARNING);

  const recs: Recommendation[] = [];

  // One recommendation per critical finding (highest priority)
  for (const f of critical) {
    recs.push({
      priority: 1,
      action: f.suggestion,
      impact: 'high',
      effort: 'medium',
      findingIds: [f.id],
      resources: f.referenceUrl ? [f.referenceUrl] : [],
    });
  }

  // Group warnings by category into one recommendation each
  const byCategory = new Map<string, Finding[]>();
  for (const f of warnings) {
    const key = `${f.pillar}:${f.category}`;
    const group = byCategory.get(key) ?? [];
    group.push(f);
    byCategory.set(key, group);
  }
  for (const group of byCategory.values()) {
    const first = group[0];
    recs.push({
      priority: 2,
      action: first.suggestion,
      impact: 'medium',
      effort: 'low',
      findingIds: group.map((f) => f.id),
    });
  }

  return recs.sort((a, b) => a.priority - b.priority);
}

export function buildScanReport(
  target: ValidatedTarget,
  result: OrchestratorResult,
  config: ScannerConfig,
  maturity: MaturityLevel,
  version: string,
): ScanReport {
  return {
    repo: target.value,
    scannedAt: localISOString(),
    version,
    depth: config.depth,
    durationMs: result.durationMs,
    overallScore: result.overallScore,
    riskLevel: result.riskLevel,
    maturity,
    pillars: result.pillars,
    findings: result.findings,
    recommendations: buildRecommendations(result.findings),
    partial: result.partial,
    failedScanners: result.failedScanners,
    metadata: {
      commitSha: null,
      branch: null,
      remoteUrl: null,
      primaryLanguage: null,
      linesOfCode: null,
      stars: null,
      forks: null,
      openIssues: null,
    },
    // Opt-in provenance: carried through only when supplied (e.g. via
    // --provenance-file). Omitted entirely otherwise. See PRD Story 8.7a/8.7c.
    ...(config.provenance ? { provenance: config.provenance } : {}),
  };
}

export function serializeJson(report: ScanReport): string {
  return JSON.stringify(
    report,
    (key, value: unknown) => {
      if (key === 'severity' && typeof value === 'number') {
        return SEVERITY_LABELS[value] ?? String(value);
      }
      return value;
    },
    2,
  );
}
