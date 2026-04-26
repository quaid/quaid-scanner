import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../src/reporters/markdown.js';
import { buildScanReport } from '../../src/reporters/json.js';
import { DEFAULT_CONFIG } from '../../src/config.js';
import {
  Pillar,
  Severity,
  RiskLevel,
  MaturityLevel,
  ScanDepth,
  PILLAR_WEIGHTS,
} from '../../src/types/index.js';
import type { OrchestratorResult } from '../../src/scanner/orchestrator.js';

function makeReport() {
  const pillars = Object.fromEntries(
    Object.values(Pillar).map((p) => [
      p,
      {
        score: 7.5,
        weight: PILLAR_WEIGHTS[p],
        weightedScore: 7.5 * PILLAR_WEIGHTS[p],
        counts: { critical: 0, warning: 1, info: 0, pass: 2 },
        scanners: ['scanner-a'],
      },
    ]),
  ) as OrchestratorResult['pillars'];

  const result: OrchestratorResult = {
    overallScore: 7.5,
    riskLevel: RiskLevel.MEDIUM,
    pillars,
    findings: [
      {
        id: 'gov-01',
        severity: Severity.WARNING,
        pillar: Pillar.GOVERNANCE,
        category: 'license',
        message: 'No license file found',
        file: null,
        line: null,
        column: null,
        suggestion: 'Add a LICENSE file',
      },
    ],
    thresholdPassed: true,
    durationMs: 2000,
  };

  return buildScanReport(
    { type: 'local' as const, value: '/tmp/my-repo' },
    result,
    DEFAULT_CONFIG,
    MaturityLevel.INCUBATING,
    '1.0.0',
  );
}

describe('renderMarkdown', () => {
  it('returns a non-empty string', () => {
    const md = renderMarkdown(makeReport());
    expect(typeof md).toBe('string');
    expect(md.length).toBeGreaterThan(0);
  });

  it('includes the overall score', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toContain('7.5');
  });

  it('includes all pillar names', () => {
    const md = renderMarkdown(makeReport());
    expect(md.toLowerCase()).toContain('security');
    expect(md.toLowerCase()).toContain('governance');
    expect(md.toLowerCase()).toContain('community');
  });

  it('includes findings section', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toContain('No license file found');
  });

  it('includes repo identifier', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toContain('my-repo');
  });

  it('is valid markdown (has at least one heading)', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toMatch(/^#+ /m);
  });
});
