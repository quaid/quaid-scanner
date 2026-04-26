import { randomUUID } from 'node:crypto';
import { Severity } from '../types/index.js';
import type { ScanReport, ScanHistoryRecord, TrendData } from '../types/index.js';
import type { ZeroDBClient } from './zerodb-client.js';

export function mapReportToHistoryRecord(report: ScanReport): ScanHistoryRecord & Record<string, unknown> {
  const critical = report.findings.filter((f) => f.severity === Severity.CRITICAL).length;
  const warning = report.findings.filter((f) => f.severity === Severity.WARNING).length;
  const info = report.findings.filter((f) => f.severity === Severity.INFO).length;
  const pass = report.findings.filter((f) => f.severity === Severity.PASS).length;

  return {
    id: randomUUID(),
    repo: report.repo,
    scannedAt: new Date(report.scannedAt),
    commitSha: report.metadata.commitSha,
    branch: report.metadata.branch,
    overallScore: report.overallScore,
    riskLevel: report.riskLevel,
    pillarScores: Object.fromEntries(
      Object.entries(report.pillars).map(([pillar, ps]) => [pillar, ps.score]),
    ) as ScanHistoryRecord['pillarScores'],
    findingCounts: { critical, warning, info, pass },
    durationMs: report.durationMs,
    version: report.version,
    depth: report.depth,
    // ZeroDB-friendly snake_case fields
    scanned_at: report.scannedAt,
    commit_sha: report.metadata.commitSha,
    overall_score: report.overallScore,
    risk_level: report.riskLevel,
    finding_counts: { critical, warning, info, pass },
    duration_ms: report.durationMs,
  };
}

export async function storeScanHistory(report: ScanReport, client: ZeroDBClient): Promise<void> {
  try {
    const record = mapReportToHistoryRecord(report);
    await client.tableInsert('scan_history', record as Record<string, unknown>);
  } catch {
    // Non-fatal: storage failure should not break the scan result
  }
}

export async function queryTrend(repo: string, days: number, client: ZeroDBClient): Promise<TrendData> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await client.tableQuery('scan_history', { repo });

  const dataPoints = rows
    .map((r) => {
      const d = r.row_data;
      return {
        date: new Date(d['scanned_at'] as string),
        score: d['overall_score'] as number,
        commitSha: (d['commit_sha'] as string | null) ?? null,
      };
    })
    .filter((p) => p.date >= new Date(since))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let trend: TrendData['trend'] = 'stable';
  let changePercent = 0;

  if (dataPoints.length >= 2) {
    const first = dataPoints[0].score;
    const last = dataPoints[dataPoints.length - 1].score;
    changePercent = first > 0 ? ((last - first) / first) * 100 : 0;
    if (changePercent > 5) trend = 'improving';
    else if (changePercent < -5) trend = 'declining';
  }

  return {
    repo,
    period: {
      start: dataPoints[0]?.date ?? new Date(since),
      end: dataPoints[dataPoints.length - 1]?.date ?? new Date(),
      days,
    },
    trend,
    changePercent,
    dataPoints,
    newFindings: [],
    resolvedFindings: [],
  };
}
