import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildScanReport, serializeJson, localISOString } from '../../src/reporters/json.js';
import { DEFAULT_CONFIG } from '../../src/config.js';
import {
  Pillar,
  Severity,
  RiskLevel,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
  PILLAR_WEIGHTS,
} from '../../src/types/index.js';
import type { OrchestratorResult } from '../../src/scanner/orchestrator.js';

function makeResult(overrides: Partial<OrchestratorResult> = {}): OrchestratorResult {
  const pillars = Object.fromEntries(
    Object.values(Pillar).map((p) => [
      p,
      {
        score: 8.0,
        weight: PILLAR_WEIGHTS[p],
        weightedScore: 8.0 * PILLAR_WEIGHTS[p],
        counts: { critical: 0, warning: 0, info: 0, pass: 1 },
        scanners: [],
      },
    ]),
  ) as OrchestratorResult['pillars'];

  return {
    overallScore: 8.0,
    riskLevel: RiskLevel.LOW,
    pillars,
    findings: [],
    thresholdPassed: true,
    durationMs: 1234,
    partial: false,
    failedScanners: [],
    ...overrides,
  };
}

describe('buildScanReport', () => {
  const target = { type: 'local' as const, value: '/tmp/test-repo' };
  const config = { ...DEFAULT_CONFIG };

  it('builds a report with all required fields', () => {
    const report = buildScanReport(target, makeResult(), config, MaturityLevel.SANDBOX, '1.2.3');
    expect(report.repo).toBe('/tmp/test-repo');
    expect(report.version).toBe('1.2.3');
    expect(report.overallScore).toBe(8.0);
    expect(report.riskLevel).toBe(RiskLevel.LOW);
    expect(report.durationMs).toBe(1234);
    expect(report.depth).toBe(ScanDepth.STANDARD);
    expect(report.maturity).toBe(MaturityLevel.SANDBOX);
    expect(report.scannedAt).toBeTruthy();
    expect(report.findings).toEqual([]);
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('uses github identifier as repo when type is github', () => {
    const ghTarget = { type: 'github' as const, value: 'owner/repo' };
    const report = buildScanReport(ghTarget, makeResult(), config, MaturityLevel.INCUBATING, '1.0.0');
    expect(report.repo).toBe('owner/repo');
  });

  it('generates recommendations from critical findings', () => {
    const result = makeResult({
      findings: [
        {
          id: 'sec-01',
          severity: Severity.CRITICAL,
          pillar: Pillar.SECURITY,
          category: 'supply-chain',
          message: 'Critical issue',
          file: null,
          line: null,
          column: null,
          suggestion: 'Fix this now',
        },
      ],
    });
    const report = buildScanReport(target, result, config, MaturityLevel.SANDBOX, '1.0.0');
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations[0].findingIds).toContain('sec-01');
  });

  it('populates pillars from orchestrator result', () => {
    const report = buildScanReport(target, makeResult(), config, MaturityLevel.SANDBOX, '1.0.0');
    for (const pillar of Object.values(Pillar)) {
      expect(report.pillars[pillar]).toBeDefined();
      expect(report.pillars[pillar].score).toBe(8.0);
    }
  });
});

describe('serializeJson', () => {
  it('produces valid JSON', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const report = buildScanReport(target, makeResult(), DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0');
    const json = serializeJson(report);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('round-trips cleanly', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const report = buildScanReport(target, makeResult(), DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0');
    const parsed = JSON.parse(serializeJson(report));
    expect(parsed.overallScore).toBe(8.0);
    expect(parsed.version).toBe('1.0.0');
  });

  it('serializes CRITICAL severity as string "CRITICAL" not integer 2', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const result = makeResult({
      findings: [
        {
          id: 'f-crit',
          severity: Severity.CRITICAL,
          pillar: Pillar.SECURITY,
          category: 'test',
          message: 'Critical finding',
          file: null,
          line: null,
          column: null,
          suggestion: 'Fix it',
        },
      ],
    });
    const parsed = JSON.parse(serializeJson(buildScanReport(target, result, DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0')));
    expect(parsed.findings[0].severity).toBe('CRITICAL');
  });

  it('serializes WARNING severity as string "WARNING" not integer 1', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const result = makeResult({
      findings: [
        {
          id: 'f-warn',
          severity: Severity.WARNING,
          pillar: Pillar.SECURITY,
          category: 'test',
          message: 'Warning finding',
          file: null,
          line: null,
          column: null,
          suggestion: 'Fix it',
        },
      ],
    });
    const parsed = JSON.parse(serializeJson(buildScanReport(target, result, DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0')));
    expect(parsed.findings[0].severity).toBe('WARNING');
  });

  it('serializes INFO severity as string "INFO" not integer 0', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const result = makeResult({
      findings: [
        {
          id: 'f-info',
          severity: Severity.INFO,
          pillar: Pillar.SECURITY,
          category: 'test',
          message: 'Info finding',
          file: null,
          line: null,
          column: null,
          suggestion: 'Note it',
        },
      ],
    });
    const parsed = JSON.parse(serializeJson(buildScanReport(target, result, DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0')));
    expect(parsed.findings[0].severity).toBe('INFO');
  });

  it('serializes PASS severity as string "PASS" not integer -1', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const result = makeResult({
      findings: [
        {
          id: 'f-pass',
          severity: Severity.PASS,
          pillar: Pillar.SECURITY,
          category: 'test',
          message: 'Pass finding',
          file: null,
          line: null,
          column: null,
          suggestion: 'Keep it up',
        },
      ],
    });
    const parsed = JSON.parse(serializeJson(buildScanReport(target, result, DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0')));
    expect(parsed.findings[0].severity).toBe('PASS');
  });

  it('propagates partial=true and failedScanners from orchestrator result (#138)', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const result = makeResult({
      partial: true,
      failedScanners: [
        { name: 'slow-scanner', pillar: 'security', reason: 'timeout', message: 'timed out after 90000ms' },
      ],
    });
    const report = buildScanReport(target, result, DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0');
    expect(report.partial).toBe(true);
    expect(report.failedScanners).toHaveLength(1);
    expect(report.failedScanners[0].name).toBe('slow-scanner');
    expect(report.failedScanners[0].reason).toBe('timeout');
  });

  it('propagates partial=false and empty failedScanners for a clean scan (#138)', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const report = buildScanReport(target, makeResult(), DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0');
    expect(report.partial).toBe(false);
    expect(report.failedScanners).toHaveLength(0);
  });
});

describe('localISOString (#188)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not end in Z (UTC marker) for a fixed UTC instant', () => {
    // 2026-06-05T23:30:00Z is a known UTC instant
    const d = new Date('2026-06-05T23:30:00Z');
    const result = localISOString(d);
    expect(result.endsWith('Z')).toBe(false);
  });

  it('contains a timezone offset sign (+ or -)', () => {
    const d = new Date('2026-06-05T23:30:00Z');
    const result = localISOString(d);
    // Must contain an offset like +00:00, -07:00, +05:30, etc.
    expect(result).toMatch(/[+-]\d{2}:\d{2}$/);
  });

  it('produces a string matching ISO 8601 with offset format', () => {
    const d = new Date('2026-06-05T12:00:00Z');
    const result = localISOString(d);
    // e.g. 2026-06-05T05:00:00-07:00  or  2026-06-05T12:00:00+00:00
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('uses the local date portion relative to the Date object, not UTC', () => {
    // Construct a Date at exactly midnight UTC, which is the previous local day
    // for any timezone behind UTC (e.g. Americas).
    // We verify the format is correct regardless of host TZ, by computing
    // expected values from the Date object itself.
    const d = new Date('2026-06-06T00:00:00Z');
    const result = localISOString(d);
    const expectedYear = String(d.getFullYear());
    const expectedMonth = String(d.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(d.getDate()).padStart(2, '0');
    expect(result.startsWith(`${expectedYear}-${expectedMonth}-${expectedDay}T`)).toBe(true);
  });

  it('produces correct offset string for a positive UTC offset', () => {
    // Simulate +05:30 (India) by overriding getTimezoneOffset
    const d = new Date('2026-06-05T12:00:00Z');
    const originalGetTimezoneOffset = d.getTimezoneOffset.bind(d);
    d.getTimezoneOffset = () => -330; // -330 minutes = +05:30
    const result = localISOString(d);
    expect(result.endsWith('+05:30')).toBe(true);
    d.getTimezoneOffset = originalGetTimezoneOffset;
  });

  it('produces correct offset string for a negative UTC offset', () => {
    // Simulate -07:00 (Pacific) by overriding getTimezoneOffset
    const d = new Date('2026-06-05T23:30:00Z');
    d.getTimezoneOffset = () => 420; // 420 minutes = -07:00
    const result = localISOString(d);
    expect(result.endsWith('-07:00')).toBe(true);
  });

  it('produces UTC+00:00 offset for a zero-offset date', () => {
    const d = new Date('2026-06-05T10:00:00Z');
    d.getTimezoneOffset = () => 0;
    const result = localISOString(d);
    expect(result.endsWith('+00:00')).toBe(true);
  });
});

describe('buildScanReport scannedAt timezone (#188)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('scannedAt does not end with Z', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T23:30:00Z'));
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const report = buildScanReport(target, makeResult(), DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0');
    expect(report.scannedAt.endsWith('Z')).toBe(false);
  });

  it('scannedAt contains a timezone offset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T23:30:00Z'));
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const report = buildScanReport(target, makeResult(), DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0');
    expect(report.scannedAt).toMatch(/[+-]\d{2}:\d{2}$/);
  });

  it('scannedAt matches ISO 8601 with offset format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'));
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const report = buildScanReport(target, makeResult(), DEFAULT_CONFIG, MaturityLevel.SANDBOX, '1.0.0');
    expect(report.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});
