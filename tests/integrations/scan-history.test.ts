import { describe, it, expect, vi } from 'vitest';
import { storeScanHistory, queryTrend, mapReportToHistoryRecord } from '../../src/integrations/scan-history.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat, RiskLevel } from '../../src/types/index.js';
import type { ScanReport } from '../../src/types/index.js';
import type { ZeroDBClient } from '../../src/integrations/zerodb-client.js';

function makeMockClient(overrides: Partial<ZeroDBClient> = {}): ZeroDBClient {
  return {
    tableInsert: vi.fn().mockResolvedValue({ row_id: 'r1' }),
    tableQuery: vi.fn().mockResolvedValue([]),
    vectorUpsert: vi.fn().mockResolvedValue(undefined),
    vectorSearch: vi.fn().mockResolvedValue([]),
    tableCreate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ZeroDBClient;
}

function makeReport(overrides: Partial<ScanReport> = {}): ScanReport {
  const base: ScanReport = {
    repo: 'acme/my-project',
    scannedAt: '2026-04-24T00:00:00.000Z',
    version: '1.0.0',
    depth: ScanDepth.STANDARD,
    durationMs: 3000,
    overallScore: 7.5,
    riskLevel: RiskLevel.MEDIUM,
    maturity: MaturityLevel.INCUBATING,
    pillars: {} as ScanReport['pillars'],
    findings: [],
    recommendations: [],
    metadata: {
      commitSha: 'abc123',
      branch: 'main',
      remoteUrl: null,
      primaryLanguage: null,
      linesOfCode: null,
      stars: null,
      forks: null,
      openIssues: null,
    },
  };
  return { ...base, ...overrides };
}

describe('mapReportToHistoryRecord', () => {
  it('maps ScanReport fields to ScanHistoryRecord', () => {
    const report = makeReport();
    const record = mapReportToHistoryRecord(report);
    expect(record.repo).toBe('acme/my-project');
    expect(record.overallScore).toBe(7.5);
    expect(record.commitSha).toBe('abc123');
    expect(record.branch).toBe('main');
    expect(record.version).toBe('1.0.0');
    expect(record.depth).toBe(ScanDepth.STANDARD);
    expect(record.durationMs).toBe(3000);
    expect(record.riskLevel).toBe(RiskLevel.MEDIUM);
  });

  it('populates findingCounts from findings array', () => {
    const findings = [
      { severity: Severity.CRITICAL, id: '1', pillar: Pillar.SECURITY, category: 'x', message: '', file: null, line: null, column: null, suggestion: '' },
      { severity: Severity.CRITICAL, id: '2', pillar: Pillar.SECURITY, category: 'x', message: '', file: null, line: null, column: null, suggestion: '' },
      { severity: Severity.WARNING, id: '3', pillar: Pillar.GOVERNANCE, category: 'x', message: '', file: null, line: null, column: null, suggestion: '' },
      { severity: Severity.PASS, id: '4', pillar: Pillar.GOVERNANCE, category: 'x', message: '', file: null, line: null, column: null, suggestion: '' },
    ];
    const record = mapReportToHistoryRecord(makeReport({ findings }));
    expect(record.findingCounts.critical).toBe(2);
    expect(record.findingCounts.warning).toBe(1);
    expect(record.findingCounts.pass).toBe(1);
    expect(record.findingCounts.info).toBe(0);
  });
});

describe('storeScanHistory', () => {
  it('inserts a record into scan_history table', async () => {
    const client = makeMockClient();
    const report = makeReport();
    await storeScanHistory(report, client);
    expect(client.tableInsert).toHaveBeenCalledWith('scan_history', expect.objectContaining({ repo: 'acme/my-project' }));
  });

  it('does not throw when client.tableInsert rejects', async () => {
    const client = makeMockClient({ tableInsert: vi.fn().mockRejectedValue(new Error('db down')) });
    await expect(storeScanHistory(makeReport(), client)).resolves.not.toThrow();
  });
});

describe('queryTrend', () => {
  const day = 86_400_000;
  const now = Date.now();

  it('returns declining trend when latest score dropped >5%', async () => {
    const rows = [
      { row_data: { scanned_at: new Date(now - 2 * day).toISOString(), overall_score: 8.0, commit_sha: 'a1' } },
      { row_data: { scanned_at: new Date(now - 1 * day).toISOString(), overall_score: 7.0, commit_sha: 'a2' } },
    ];
    const client = makeMockClient({ tableQuery: vi.fn().mockResolvedValue(rows) });
    const trend = await queryTrend('acme/my-project', 7, client);
    expect(trend.trend).toBe('declining');
    expect(trend.dataPoints).toHaveLength(2);
    expect(trend.repo).toBe('acme/my-project');
  });

  it('returns improving trend when score increased', async () => {
    const rows = [
      { row_data: { scanned_at: new Date(now - 2 * day).toISOString(), overall_score: 6.0, commit_sha: 'a1' } },
      { row_data: { scanned_at: new Date(now - 1 * day).toISOString(), overall_score: 8.0, commit_sha: 'a2' } },
    ];
    const client = makeMockClient({ tableQuery: vi.fn().mockResolvedValue(rows) });
    const trend = await queryTrend('acme/my-project', 7, client);
    expect(trend.trend).toBe('improving');
  });

  it('returns stable when change is within 5%', async () => {
    const rows = [
      { row_data: { scanned_at: new Date(now - 2 * day).toISOString(), overall_score: 7.0, commit_sha: 'a1' } },
      { row_data: { scanned_at: new Date(now - 1 * day).toISOString(), overall_score: 7.2, commit_sha: 'a2' } },
    ];
    const client = makeMockClient({ tableQuery: vi.fn().mockResolvedValue(rows) });
    const trend = await queryTrend('acme/my-project', 7, client);
    expect(trend.trend).toBe('stable');
  });

  it('returns empty dataPoints when no history', async () => {
    const client = makeMockClient({ tableQuery: vi.fn().mockResolvedValue([]) });
    const trend = await queryTrend('acme/my-project', 7, client);
    expect(trend.dataPoints).toHaveLength(0);
    expect(trend.trend).toBe('stable');
  });
});
