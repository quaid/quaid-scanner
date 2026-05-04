import { Severity, MaturityLevel } from '../types/index.js';
import type { ScanReport, Recommendation, Finding, ScannerConfig } from '../types/index.js';
import type { OrchestratorResult } from '../scanner/orchestrator.js';

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
    scannedAt: new Date().toISOString(),
    version,
    depth: config.depth,
    durationMs: result.durationMs,
    overallScore: result.overallScore,
    riskLevel: result.riskLevel,
    maturity,
    pillars: result.pillars,
    findings: result.findings,
    recommendations: buildRecommendations(result.findings),
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
