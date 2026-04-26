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
import type { ScanReport, Finding, Recommendation } from '../../src/types/index.js';
import type { OrchestratorResult } from '../../src/scanner/orchestrator.js';

function makePillars() {
  return Object.fromEntries(
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
}

function makeReport(findingsOverride?: Finding[], recommendationsOverride?: Recommendation[]): ScanReport {
  const result: OrchestratorResult = {
    overallScore: 7.5,
    riskLevel: RiskLevel.MEDIUM,
    pillars: makePillars(),
    findings: findingsOverride ?? [
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

  const report = buildScanReport(
    { type: 'local' as const, value: '/tmp/my-repo' },
    result,
    DEFAULT_CONFIG,
    MaturityLevel.INCUBATING,
    '1.0.0',
  );

  if (recommendationsOverride !== undefined) {
    return { ...report, recommendations: recommendationsOverride };
  }
  return report;
}

describe('renderMarkdown', () => {
  // --- existing smoke tests ---

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

  // --- ecosystem section ---

  it('omits ecosystem section when options are not provided', () => {
    const md = renderMarkdown(makeReport());
    expect(md).not.toContain('## Ecosystem');
  });

  it('omits ecosystem section when options object has no ecosystem key', () => {
    const md = renderMarkdown(makeReport(), {});
    expect(md).not.toContain('## Ecosystem');
  });

  it('renders ecosystem section when ecosystem option is provided', () => {
    const md = renderMarkdown(makeReport(), {
      ecosystem: { name: 'npm' },
    });
    expect(md).toContain('## Ecosystem');
    expect(md).toContain('**Name:** npm');
  });

  it('renders ecosystem language when provided', () => {
    const md = renderMarkdown(makeReport(), {
      ecosystem: { name: 'npm', language: 'TypeScript' },
    });
    expect(md).toContain('**Language:** TypeScript');
  });

  it('omits ecosystem language when not provided', () => {
    const md = renderMarkdown(makeReport(), {
      ecosystem: { name: 'npm' },
    });
    expect(md).not.toContain('**Language:**');
  });

  it('renders ecosystem stars when provided', () => {
    const md = renderMarkdown(makeReport(), {
      ecosystem: { name: 'npm', stars: 42 },
    });
    expect(md).toContain('**Stars:** 42');
  });

  it('renders ecosystem stars when value is zero', () => {
    const md = renderMarkdown(makeReport(), {
      ecosystem: { name: 'npm', stars: 0 },
    });
    expect(md).toContain('**Stars:** 0');
  });

  it('omits ecosystem stars when not provided', () => {
    const md = renderMarkdown(makeReport(), {
      ecosystem: { name: 'npm' },
    });
    expect(md).not.toContain('**Stars:**');
  });

  // --- empty findings ---

  it('renders "no findings" section when findings array is empty', () => {
    const md = renderMarkdown(makeReport([]));
    expect(md).toContain('No findings — all checks passed.');
  });

  it('does not render "no findings" section when there are findings', () => {
    const md = renderMarkdown(makeReport());
    expect(md).not.toContain('No findings — all checks passed.');
  });

  // --- critical findings ---

  it('renders critical findings section when criticals exist', () => {
    const findings: Finding[] = [
      {
        id: 'sec-01',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Token has write permissions',
        file: null,
        line: null,
        column: null,
        suggestion: 'Restrict token permissions',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('## Critical Findings');
    expect(md).toContain('sec-01');
    expect(md).toContain('Token has write permissions');
  });

  it('omits critical findings section when no criticals exist', () => {
    const md = renderMarkdown(makeReport());
    expect(md).not.toContain('## Critical Findings');
  });

  it('renders file reference in critical finding when file is set', () => {
    const findings: Finding[] = [
      {
        id: 'sec-02',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Bad config',
        file: '.github/workflows/ci.yml',
        line: 12,
        column: null,
        suggestion: 'Fix it',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('.github/workflows/ci.yml');
    expect(md).toContain(':12');
  });

  it('renders file reference without line when file is set but line is null', () => {
    const findings: Finding[] = [
      {
        id: 'sec-03',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Bad config',
        file: '.github/workflows/ci.yml',
        line: null,
        column: null,
        suggestion: 'Fix it',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('.github/workflows/ci.yml');
    expect(md).not.toContain(':null');
  });

  it('omits file reference in critical finding when file is null', () => {
    const findings: Finding[] = [
      {
        id: 'sec-04',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Token issue',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).not.toContain('> File:');
  });

  it('renders referenceUrl in critical finding when provided', () => {
    const findings: Finding[] = [
      {
        id: 'sec-05',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Token issue',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        referenceUrl: 'https://docs.example.com/security',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('https://docs.example.com/security');
    expect(md).toContain('**Reference:**');
  });

  it('omits referenceUrl line in critical finding when not provided', () => {
    const findings: Finding[] = [
      {
        id: 'sec-06',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Token issue',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).not.toContain('**Reference:**');
  });

  // --- warning findings ---

  it('renders warnings section when warnings exist', () => {
    const findings: Finding[] = [
      {
        id: 'gov-01',
        severity: Severity.WARNING,
        pillar: Pillar.GOVERNANCE,
        category: 'license',
        message: 'No license file',
        file: null,
        line: null,
        column: null,
        suggestion: 'Add a LICENSE file',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('## Warnings');
    expect(md).toContain('gov-01');
  });

  it('omits warnings section when no warnings exist', () => {
    const md = renderMarkdown(makeReport([]));
    expect(md).not.toContain('## Warnings');
  });

  // --- info findings ---

  it('renders info section when info findings exist', () => {
    const findings: Finding[] = [
      {
        id: 'com-01',
        severity: Severity.INFO,
        pillar: Pillar.COMMUNITY,
        category: 'docs',
        message: 'Contributing guide found',
        file: null,
        line: null,
        column: null,
        suggestion: 'Keep it updated',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('## Info');
    expect(md).toContain('com-01');
  });

  it('omits info section when no info findings exist', () => {
    const md = renderMarkdown(makeReport([]));
    expect(md).not.toContain('## Info');
  });

  // --- recommendations ---

  it('renders recommendations section when recommendations exist', () => {
    const recs: Recommendation[] = [
      {
        priority: 1,
        action: 'Add branch protection',
        impact: 'high',
        effort: 'low',
        findingIds: ['sec-01'],
        resources: [],
      },
    ];
    const md = renderMarkdown(makeReport([], recs));
    expect(md).toContain('## Recommendations');
    expect(md).toContain('Add branch protection');
    expect(md).toContain('HIGH impact');
    expect(md).toContain('low effort');
  });

  it('omits recommendations section when recommendations array is empty', () => {
    const md = renderMarkdown(makeReport([], []));
    expect(md).not.toContain('## Recommendations');
  });

  it('renders recommendation resources when provided', () => {
    const recs: Recommendation[] = [
      {
        priority: 1,
        action: 'Enable 2FA',
        impact: 'high',
        effort: 'low',
        findingIds: ['sec-01'],
        resources: ['https://docs.github.com/2fa', 'https://owasp.org/2fa'],
      },
    ];
    const md = renderMarkdown(makeReport([], recs));
    expect(md).toContain('https://docs.github.com/2fa');
    expect(md).toContain('https://owasp.org/2fa');
  });

  it('skips resources block when resources array is empty', () => {
    const recs: Recommendation[] = [
      {
        priority: 1,
        action: 'Enable 2FA',
        impact: 'high',
        effort: 'low',
        findingIds: ['sec-01'],
        resources: [],
      },
    ];
    const md = renderMarkdown(makeReport([], recs));
    expect(md).toContain('Enable 2FA');
    // no resource lines rendered — just the action line
    const actionLineCount = md.split('\n').filter((l) => l.includes('Enable 2FA')).length;
    expect(actionLineCount).toBe(1);
  });

  it('skips resources block when resources is undefined', () => {
    const recs: Recommendation[] = [
      {
        priority: 2,
        action: 'Update docs',
        impact: 'medium',
        effort: 'low',
        findingIds: ['gov-01'],
        // resources intentionally omitted
      },
    ];
    const md = renderMarkdown(makeReport([], recs));
    expect(md).toContain('Update docs');
  });

  // --- metadata footer ---

  it('renders commit SHA in footer when commitSha is set', () => {
    const report = makeReport();
    const reportWithSha: ScanReport = {
      ...report,
      metadata: { ...report.metadata, commitSha: 'abc1234' },
    };
    const md = renderMarkdown(reportWithSha);
    expect(md).toContain('*Commit: abc1234*');
  });

  it('omits commit SHA line in footer when commitSha is null', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).not.toContain('*Commit:');
  });

  // --- pillar score edge cases ---

  it('renders pillar scores with zero counts', () => {
    const pillars = Object.fromEntries(
      Object.values(Pillar).map((p) => [
        p,
        {
          score: 10.0,
          weight: PILLAR_WEIGHTS[p],
          weightedScore: 10.0 * PILLAR_WEIGHTS[p],
          counts: { critical: 0, warning: 0, info: 0, pass: 5 },
          scanners: ['scanner-a'],
        },
      ]),
    ) as OrchestratorResult['pillars'];

    const result: OrchestratorResult = {
      overallScore: 10.0,
      riskLevel: RiskLevel.LOW,
      pillars,
      findings: [],
      thresholdPassed: true,
      durationMs: 500,
    };
    const report = buildScanReport(
      { type: 'local' as const, value: '/tmp/perfect-repo' },
      result,
      DEFAULT_CONFIG,
      MaturityLevel.GRADUATED,
      '2.0.0',
    );
    const md = renderMarkdown(report);
    expect(md).toContain('10.0');
    expect(md).toContain('0C 0W 0I');
  });

  it('renders all risk level emojis correctly', () => {
    const riskLevels: RiskLevel[] = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const emojis = ['🟢', '🟡', '🟠', '🔴'];

    for (let i = 0; i < riskLevels.length; i++) {
      const result: OrchestratorResult = {
        overallScore: 5.0,
        riskLevel: riskLevels[i],
        pillars: makePillars(),
        findings: [],
        thresholdPassed: true,
        durationMs: 100,
      };
      const report = buildScanReport(
        { type: 'local' as const, value: '/tmp/repo' },
        result,
        DEFAULT_CONFIG,
        MaturityLevel.SANDBOX,
        '1.0.0',
      );
      const md = renderMarkdown(report);
      expect(md).toContain(emojis[i]);
    }
  });
});
