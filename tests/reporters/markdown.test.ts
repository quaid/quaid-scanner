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

  // --- dataSource rendering (issue #104) ---

  it('renders "(source: external API)" label when dataSource is "api"', () => {
    const findings: Finding[] = [
      {
        id: 'sec-ds-01',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'API-sourced finding',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        dataSource: 'api',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('(source: external API)');
  });

  it('renders "(source: local file check)" label when dataSource is "local"', () => {
    const findings: Finding[] = [
      {
        id: 'sec-ds-02',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Local-sourced finding',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        dataSource: 'local',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('(source: local file check)');
  });

  it('renders "(source: computed heuristic)" label when dataSource is "heuristic"', () => {
    const findings: Finding[] = [
      {
        id: 'sec-ds-03',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Heuristic-sourced finding',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        dataSource: 'heuristic',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('(source: computed heuristic)');
  });

  it('omits dataSource label when dataSource is not set on a critical finding', () => {
    const findings: Finding[] = [
      {
        id: 'sec-ds-04',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding without dataSource',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).not.toContain('(source:');
  });

  // --- context rendering (issue #104) ---

  it('renders fenced code block with context value when context is set on a critical finding', () => {
    const findings: Finding[] = [
      {
        id: 'sec-ctx-01',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding with context',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        context: 'write-all: true',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('**Context:**');
    expect(md).toContain('```');
    expect(md).toContain('write-all: true');
  });

  it('omits context block when context is not set on a critical finding', () => {
    const findings: Finding[] = [
      {
        id: 'sec-ctx-02',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding without context',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).not.toContain('**Context:**');
  });

  // --- metadata rendering (issue #104) ---

  it('renders "Check: {name} — {score}/10" when checkName and checkScore are in metadata', () => {
    const findings: Finding[] = [
      {
        id: 'sec-meta-01',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding with check metadata',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        metadata: { checkName: 'Token-Permissions', checkScore: 3 },
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('Check: Token-Permissions — 3/10');
  });

  it('renders "Branch: {branch}" when branch is in metadata', () => {
    const findings: Finding[] = [
      {
        id: 'sec-meta-02',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding with branch metadata',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        metadata: { branch: 'main' },
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('Branch: main');
  });

  it('renders "Overall score: {score}" when overallScore is in metadata', () => {
    const findings: Finding[] = [
      {
        id: 'sec-meta-03',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding with overallScore metadata',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        metadata: { overallScore: 6.2 },
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('Overall score: 6.2');
  });

  it('renders Details block when at least one known metadata key is present', () => {
    const findings: Finding[] = [
      {
        id: 'sec-meta-04',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding with metadata',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        metadata: { branch: 'develop' },
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('**Details:**');
  });

  it('omits Details block when metadata is undefined', () => {
    const findings: Finding[] = [
      {
        id: 'sec-meta-05',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding without metadata',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).not.toContain('**Details:**');
  });

  it('omits Details block when metadata has no known keys', () => {
    const findings: Finding[] = [
      {
        id: 'sec-meta-06',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding with unknown metadata only',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        metadata: { unknownKey: 'value', anotherUnknown: 42 },
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).not.toContain('**Details:**');
  });

  it('renders all known metadata fields together when all are present', () => {
    const findings: Finding[] = [
      {
        id: 'sec-meta-07',
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'permissions',
        message: 'Finding with full metadata',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
        dataSource: 'api',
        context: 'permissions: write-all',
        metadata: { checkName: 'Branch-Protection', checkScore: 5, branch: 'main', overallScore: 7.8 },
      },
    ];
    const md = renderMarkdown(makeReport(findings));
    expect(md).toContain('(source: external API)');
    expect(md).toContain('**Context:**');
    expect(md).toContain('permissions: write-all');
    expect(md).toContain('**Details:**');
    expect(md).toContain('Check: Branch-Protection — 5/10');
    expect(md).toContain('Branch: main');
    expect(md).toContain('Overall score: 7.8');
    // suggestion must still be present
    expect(md).toContain('**Suggestion:** Fix it');
  });

  // --- Score Rationale section (issue #106) ---

  it('renders "## Score Rationale" heading', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toContain('## Score Rationale');
  });

  it('renders the intro sentence about weighted sum', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toContain('Overall score is a weighted sum of six pillar scores');
  });

  it('renders all six pillar display names in the rationale table', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toContain('Security');
    expect(md).toContain('Governance');
    expect(md).toContain('Community');
    expect(md).toContain('AI Readiness');
    expect(md).toContain('Inclusive Language');
    expect(md).toContain('Technical Rigor');
  });

  it('renders pillar weights as percentages in the rationale table', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toContain('25%');
    expect(md).toContain('20%');
    // Community, AI Readiness, and Inclusive all share 15%
    expect(md).toContain('15%');
    expect(md).toContain('10%');
  });

  it('renders correct raw score for each pillar (1 decimal place)', () => {
    // makeReport() sets score = 7.5 for all pillars
    const md = renderMarkdown(makeReport());
    // There should be multiple occurrences of 7.5 (one per pillar in rationale)
    const matches = md.match(/\|\s*7\.5\s*\|/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(6);
  });

  it('renders correct contribution (weightedScore) for each pillar (2 decimal places)', () => {
    // weightedScore for Security pillar: 7.5 * 0.25 = 1.875 → rounds to 1.88
    const md = renderMarkdown(makeReport());
    expect(md).toContain('1.88');
    // Governance: 7.5 * 0.20 = 1.5 → 1.50
    expect(md).toContain('1.50');
    // Community: 7.5 * 0.15 = 1.125 → 1.13 (or 1.12 depending on rounding)
    // AI Readiness: 7.5 * 0.15 = 1.125
    // Inclusive: 7.5 * 0.15 = 1.125
    // Technical: 7.5 * 0.10 = 0.75 → 0.75
    expect(md).toContain('0.75');
  });

  it('renders a bold Overall row with the final score', () => {
    const md = renderMarkdown(makeReport());
    // The overall row should be bold and contain 100%
    expect(md).toContain('**Overall**');
    expect(md).toContain('**100%**');
  });

  it('renders the overall score in the Overall row to 2 decimal places', () => {
    // makeReport() sets overallScore = 7.5 → "7.50"
    const md = renderMarkdown(makeReport());
    expect(md).toContain('**7.50**');
  });

  it('renders Score Rationale section after the recommendations section', () => {
    const recs: Recommendation[] = [
      {
        priority: 1,
        action: 'Add branch protection',
        impact: 'high',
        effort: 'low',
        findingIds: [],
        resources: [],
      },
    ];
    const md = renderMarkdown(makeReport([], recs));
    const rationale_pos = md.indexOf('## Score Rationale');
    const recommendations_pos = md.indexOf('## Recommendations');
    expect(rationale_pos).toBeGreaterThan(recommendations_pos);
  });

  it('renders Score Rationale section before the metadata footer', () => {
    const md = renderMarkdown(makeReport());
    const rationalePos = md.indexOf('## Score Rationale');
    // The footer separator is a standalone "---" line (not a table alignment row)
    const footerPos = md.indexOf('\n---\n');
    expect(rationalePos).toBeGreaterThan(0);
    expect(footerPos).toBeGreaterThan(0);
    expect(rationalePos).toBeLessThan(footerPos);
  });

  it('renders the rationale table header row with correct columns', () => {
    const md = renderMarkdown(makeReport());
    expect(md).toContain('| Pillar | Weight | Raw Score | Contribution |');
  });

  // --- INI tier label rendering (#165) ---

  describe('INI tier label (#165)', () => {
    it('prefixes warning finding line with "[Tier 1 — Replace Immediately]" when metadata.tier is 1', () => {
      const findings: Finding[] = [
        {
          id: 'ini-tier-01',
          severity: Severity.WARNING,
          pillar: Pillar.INCLUSIVE,
          category: 'inclusive-naming',
          message: 'Project name contains non-inclusive term "whitelist"',
          file: 'package.json',
          line: null,
          column: null,
          suggestion: 'Rename using allowlist',
          metadata: { tier: 1, term: 'whitelist', replacements: ['allowlist'] },
        },
      ];
      const md = renderMarkdown(makeReport(findings));
      expect(md).toContain('Tier 1');
      expect(md).toContain('Replace Immediately');
    });

    it('prefixes warning finding line with "[Tier 2 — Strongly Consider]" when metadata.tier is 2', () => {
      const findings: Finding[] = [
        {
          id: 'ini-tier-02',
          severity: Severity.WARNING,
          pillar: Pillar.INCLUSIVE,
          category: 'inclusive-naming',
          message: 'Project name contains non-inclusive term "blacklist"',
          file: null,
          line: null,
          column: null,
          suggestion: 'Rename using blocklist',
          metadata: { tier: 2, term: 'blacklist', replacements: ['blocklist'] },
        },
      ];
      const md = renderMarkdown(makeReport(findings));
      expect(md).toContain('Tier 2');
      expect(md).toContain('Strongly Consider');
    });

    it('prefixes info finding line with "[Tier 3 — Recommended]" when metadata.tier is 3', () => {
      const findings: Finding[] = [
        {
          id: 'ini-tier-03',
          severity: Severity.INFO,
          pillar: Pillar.INCLUSIVE,
          category: 'inclusive-naming',
          message: 'Project name contains non-inclusive term "master"',
          file: null,
          line: null,
          column: null,
          suggestion: 'Rename using main',
          metadata: { tier: 3, term: 'master', replacements: ['main'] },
        },
      ];
      const md = renderMarkdown(makeReport(findings));
      expect(md).toContain('Tier 3');
      expect(md).toContain('Recommended');
    });

    it('does not add tier prefix to findings without metadata.tier', () => {
      const findings: Finding[] = [
        {
          id: 'gov-no-tier',
          severity: Severity.WARNING,
          pillar: Pillar.GOVERNANCE,
          category: 'license',
          message: 'No license file found',
          file: null,
          line: null,
          column: null,
          suggestion: 'Add a LICENSE file',
        },
      ];
      const md = renderMarkdown(makeReport(findings));
      expect(md).not.toContain('[Tier');
    });
  });

  // --- scanner errors section (issue #154) ---

  describe('scanner errors section (#154)', () => {
    it('puts timeout finding under ## Scanner Errors and real warning under ## Warnings, not under ## Scanner Errors', () => {
      const findings: Finding[] = [
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
        {
          id: 'scanner-timeout-01',
          severity: Severity.WARNING,
          pillar: Pillar.SECURITY,
          category: 'timeout',
          message: 'scorecard scanner timed out after 30s',
          file: null,
          line: null,
          column: null,
          suggestion: 'Increase scanner timeout or check network',
        },
      ];
      const report = makeReport(findings);
      const md = renderMarkdown(report);

      // Scanner Errors section must exist and contain the timeout finding message
      expect(md).toContain('## Scanner Errors');
      expect(md).toContain('scorecard scanner timed out after 30s');

      // The real warning must appear in the ## Warnings section
      expect(md).toContain('## Warnings');
      expect(md).toContain('No license file found');

      // The timeout finding message must NOT appear in the ## Warnings section
      const warnStart = md.indexOf('## Warnings');
      const errStart = md.indexOf('## Scanner Errors');
      // ## Warnings appears before ## Scanner Errors
      expect(warnStart).toBeLessThan(errStart);
      const warnSection = md.slice(warnStart, errStart);
      expect(warnSection).not.toContain('scorecard scanner timed out after 30s');
    });

    it('does not render ## Scanner Errors section when partial is false and there are no error/timeout findings', () => {
      const findings: Finding[] = [
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
      ];
      const report = makeReport(findings);
      // Ensure partial is false
      const nonPartialReport: ScanReport = { ...report, partial: false, failedScanners: [] };
      const md = renderMarkdown(nonPartialReport);
      expect(md).not.toContain('## Scanner Errors');
    });

    it('shows scanner name from failedScanners in ## Scanner Errors section when partial is true', () => {
      const report = makeReport([]);
      const partialReport: ScanReport = {
        ...report,
        partial: true,
        failedScanners: [
          {
            name: 'scorecard',
            pillar: 'security',
            reason: 'timeout',
            message: 'scorecard timed out after 30s',
          },
        ],
      };
      const md = renderMarkdown(partialReport);
      expect(md).toContain('## Scanner Errors');
      expect(md).toContain('scorecard');
    });
  });

  describe('grouped rendering (#196)', () => {
    function makeAbortFindings(count: number): Finding[] {
      return Array.from({ length: count }, (_, i) => ({
        id: `INC-NAMING-abort-src/client.ts:${i + 1}`,
        severity: Severity.WARNING,
        pillar: Pillar.INCLUSIVE,
        category: 'non-inclusive-term',
        message: `Non-inclusive term "abort" found in string literal`,
        file: `src/client.ts`,
        line: i + 1,
        column: 1,
        suggestion: 'Replace with: cancel, terminate, stop, halt',
        referenceUrl: 'https://inclusivenaming.org/word-lists/tier-1/abort/',
        dataSource: 'local' as const,
        metadata: { tier: 1 as const },
      }));
    }

    it('collapses repeat-message warnings into one grouped entry when grouped: true', () => {
      const findings = makeAbortFindings(11);
      const report = makeReport(findings);
      const md = renderMarkdown(report, { grouped: true });

      // Should be one grouped entry for abort, not 11 separate bullets
      const abortMatches = [...md.matchAll(/Non-inclusive term "abort"/g)];
      expect(abortMatches.length).toBe(1);
      expect(md).toContain('11 occurrences');
    });

    it('shows up to 5 file:line refs then "+N more" for large groups', () => {
      const findings = makeAbortFindings(11);
      const report = makeReport(findings);
      const md = renderMarkdown(report, { grouped: true });

      expect(md).toContain('+6 more');
    });

    it('renders single-occurrence findings unchanged', () => {
      const findings: Finding[] = [
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
      ];
      const report = makeReport(findings);
      const md = renderMarkdown(report, { grouped: true });

      // Single finding renders normally (no "occurrences" count)
      expect(md).toContain('No license file found');
      expect(md).not.toContain('occurrences');
    });

    it('groups devDependency pin findings under a canonical key', () => {
      const devDepFindings: Finding[] = [
        '@changesets/cli', '@types/node', 'vitest',
      ].map((pkg, i) => ({
        id: `SEC-DEP-PIN-${pkg}`,
        severity: Severity.INFO,
        pillar: Pillar.SECURITY,
        category: 'dep-pinning',
        message: `Loosely pinned dependency "${pkg}": "^2.${i}.0" uses ^ prefix in devDependencies`,
        file: 'package.json',
        line: 10 + i,
        column: 1,
        suggestion: 'Pin to exact version',
        dataSource: 'local' as const,
      }));
      const report = makeReport(devDepFindings);
      const md = renderMarkdown(report, { grouped: true });

      expect(md).toContain('3 occurrences');
      // Should not show all 3 package names as separate bullets
      const pkgMatches = [...md.matchAll(/Loosely pinned/g)];
      expect(pkgMatches.length).toBe(1);
    });

    it('does NOT group critical findings — they keep full-detail rendering', () => {
      const findings: Finding[] = Array.from({ length: 3 }, (_, i) => ({
        id: `SEC-CRIT-${i}`,
        severity: Severity.CRITICAL,
        pillar: Pillar.SECURITY,
        category: 'secret-exposure',
        message: 'Hardcoded secret detected',
        file: `src/file${i}.ts`,
        line: 1,
        column: 1,
        suggestion: 'Remove and rotate this secret',
      }));
      const report = makeReport(findings);
      const md = renderMarkdown(report, { grouped: true });

      // All 3 criticals render individually under ## Critical Findings
      expect(md).toContain('SEC-CRIT-0');
      expect(md).toContain('SEC-CRIT-1');
      expect(md).toContain('SEC-CRIT-2');
      expect(md).not.toContain('3 occurrences');
    });

    it('ungrouped mode (grouped: false or omitted) renders same as before', () => {
      const findings = makeAbortFindings(3);
      const report = makeReport(findings);
      const ungrouped = renderMarkdown(report);
      const explicit = renderMarkdown(report, { grouped: false });

      expect(ungrouped).toBe(explicit);
      // All 3 findings have their own ID bullets
      expect([...ungrouped.matchAll(/INC-NAMING-abort/g)].length).toBe(3);
    });

    it('includes the suggestion and referenceUrl in the grouped entry', () => {
      const findings = makeAbortFindings(3);
      const report = makeReport(findings);
      const md = renderMarkdown(report, { grouped: true });

      expect(md).toContain('Replace with: cancel, terminate, stop, halt');
      expect(md).toContain('https://inclusivenaming.org/word-lists/tier-1/abort/');
    });

    // Regression: #201 — grouped renderer was emitting raw `context` field with no
    // length cap. A single matched line inside a minified bundle could be 89 KB,
    // blowing up the report to hundreds of KB of unreadable noise.
    it('caps very long context excerpts in grouped file refs (#201)', () => {
      const minifiedLine = 'function abort(){throw new Error("aborted")}'.repeat(2000); // ~90 KB
      const findings: Finding[] = Array.from({ length: 3 }, (_, i) => ({
        id: `INC-NAMING-abort-html/assets/index-9agQl9q3.js:${i + 1}`,
        severity: Severity.WARNING,
        pillar: Pillar.INCLUSIVE,
        category: 'non-inclusive-term',
        message: `Non-inclusive term "abort" found in string literal`,
        file: `html/assets/index-9agQl9q3.js`,
        line: i + 1,
        column: 1,
        context: minifiedLine,
        suggestion: 'Consider using: cancel, terminate, stop, halt',
        dataSource: 'local' as const,
      }));
      const report = makeReport(findings);
      const md = renderMarkdown(report, { grouped: true });

      // No single line in the rendered output should be tens of KB long
      const longestLine = md.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
      expect(longestLine).toBeLessThan(500);
      // The context truncation marker should be present
      expect(md).toContain('…');
    });

    // Regression: #203 — grouped renderer was hardcoding "Replace with: " in front
    // of suggestions that already carried their own lead-in ("Consider using:",
    // "Remove ...", "Consider removing ..."), producing doubled phrasing.
    it('does not prepend "Replace with:" when the suggestion already carries a lead-in', () => {
      const findings: Finding[] = Array.from({ length: 3 }, (_, i) => ({
        id: `INC-NAMING-abort-src/client.ts:${i + 1}`,
        severity: Severity.WARNING,
        pillar: Pillar.INCLUSIVE,
        category: 'non-inclusive-term',
        message: `Non-inclusive term "abort" found in string literal`,
        file: `src/client.ts`,
        line: i + 1,
        column: 1,
        suggestion: 'Consider using: cancel, terminate, stop, halt',
        dataSource: 'local' as const,
      }));
      const report = makeReport(findings);
      const md = renderMarkdown(report, { grouped: true });

      expect(md).not.toMatch(/Replace with: Consider/);
      expect(md).not.toMatch(/Replace with: Remove/);
      expect(md).toContain('Consider using: cancel, terminate, stop, halt');
    });
  });
});
