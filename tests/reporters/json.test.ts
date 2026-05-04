import { describe, it, expect } from 'vitest';
import { buildScanReport, serializeJson } from '../../src/reporters/json.js';
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
});
