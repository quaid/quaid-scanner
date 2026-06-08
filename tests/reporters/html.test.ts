import { describe, it, expect } from 'vitest';
import { renderHtml } from '../../src/reporters/html.js';
import { buildScanReport } from '../../src/reporters/json.js';
import { DEFAULT_CONFIG } from '../../src/config.js';
import {
  Pillar,
  Severity,
  RiskLevel,
  MaturityLevel,
  PILLAR_WEIGHTS,
} from '../../src/types/index.js';
import type { ScanReport, Finding } from '../../src/types/index.js';
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

function makeReport(findingsOverride?: Finding[]): ScanReport {
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

  return buildScanReport(
    { type: 'local' as const, value: '/tmp/my-repo' },
    result,
    DEFAULT_CONFIG,
    MaturityLevel.INCUBATING,
    '1.0.0',
  );
}

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

describe('renderHtml', () => {
  describe('basic structure', () => {
    it('returns a string starting with <!DOCTYPE html>', () => {
      const html = renderHtml(makeReport());
      expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    });

    it('contains the repo name', () => {
      const html = renderHtml(makeReport());
      expect(html).toContain('my-repo');
    });

    it('contains the overall score', () => {
      const html = renderHtml(makeReport());
      expect(html).toContain('7.5');
    });

    it('contains all six pillar names', () => {
      const html = renderHtml(makeReport());
      expect(html).toContain('Security');
      expect(html).toContain('Governance');
      expect(html).toContain('Community');
      expect(html).toContain('AI Readiness');
      expect(html).toContain('Inclusive');
      expect(html).toContain('Technical');
    });

    it('is a non-empty string', () => {
      const html = renderHtml(makeReport());
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(500);
    });
  });

  describe('self-contained (no external URLs)', () => {
    it('has no external <link> tags', () => {
      const html = renderHtml(makeReport());
      expect(html).not.toMatch(/<link[^>]+href=["']https?:/i);
    });

    it('has no external <script src> tags', () => {
      const html = renderHtml(makeReport());
      expect(html).not.toMatch(/<script[^>]+src=["']https?:/i);
    });
  });

  describe('dark mode', () => {
    it('includes prefers-color-scheme: dark in inline CSS', () => {
      const html = renderHtml(makeReport());
      expect(html).toContain('prefers-color-scheme');
      expect(html).toContain('dark');
    });
  });

  describe('JSON embed', () => {
    it('embeds JSON in a <script id="scan-data"> tag', () => {
      const html = renderHtml(makeReport());
      expect(html).toContain('id="scan-data"');
      expect(html).toContain('type="application/json"');
    });

    it('embedded JSON is valid and parseable', () => {
      const html = renderHtml(makeReport());
      const match = html.match(/<script[^>]+id="scan-data"[^>]*>([\s\S]*?)<\/script>/);
      expect(match).not.toBeNull();
      expect(() => JSON.parse(match![1])).not.toThrow();
    });

    it('embedded JSON contains the repo name', () => {
      const html = renderHtml(makeReport());
      const match = html.match(/<script[^>]+id="scan-data"[^>]*>([\s\S]*?)<\/script>/);
      const data = JSON.parse(match![1]);
      expect(data.repo).toContain('my-repo');
    });
  });

  describe('critical findings', () => {
    it('renders critical findings individually (not grouped)', () => {
      const criticals: Finding[] = Array.from({ length: 3 }, (_, i) => ({
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
      const html = renderHtml(makeReport(criticals), { grouped: true });

      expect(html).toContain('SEC-CRIT-0');
      expect(html).toContain('SEC-CRIT-1');
      expect(html).toContain('SEC-CRIT-2');
    });
  });

  describe('grouped rendering', () => {
    it('collapses repeat-message warnings when grouped: true', () => {
      const findings = makeAbortFindings(11);
      const html = renderHtml(makeReport(findings), { grouped: true });

      const abortMatches = [...html.matchAll(/Non-inclusive term &quot;abort&quot;|Non-inclusive term "abort"/g)];
      expect(abortMatches.length).toBeLessThanOrEqual(2); // at most one in the display, one in the JSON embed
      expect(html).toContain('11 occurrences');
    });

    it('shows "+N more" for groups larger than 5', () => {
      const findings = makeAbortFindings(11);
      const html = renderHtml(makeReport(findings), { grouped: true });
      expect(html).toContain('+6 more');
    });

    it('renders each finding separately when grouped: false', () => {
      const findings = makeAbortFindings(3);
      const html = renderHtml(makeReport(findings), { grouped: false });

      expect(html).toContain('INC-NAMING-abort-src/client.ts:1');
      expect(html).toContain('INC-NAMING-abort-src/client.ts:2');
      expect(html).toContain('INC-NAMING-abort-src/client.ts:3');
    });
  });

  describe('score ring', () => {
    it('contains an SVG element', () => {
      const html = renderHtml(makeReport());
      expect(html).toContain('<svg');
      expect(html).toContain('</svg>');
    });

    it('contains a circle element for the score ring', () => {
      const html = renderHtml(makeReport());
      expect(html).toContain('<circle');
    });
  });

  describe('critical finding card optional fields', () => {
    it('renders file and line when present', () => {
      const f: Finding = {
        id: 'SEC-01', severity: Severity.CRITICAL, pillar: Pillar.SECURITY,
        category: 'secret', message: 'Secret found', file: 'src/auth.ts', line: 42,
        column: 1, suggestion: 'Remove it', referenceUrl: 'https://example.com',
        context: 'const API_KEY = "abc123"',
      };
      const html = renderHtml(makeReport([f]));
      expect(html).toContain('src/auth.ts');
      expect(html).toContain(':42');
      expect(html).toContain('example.com');
      expect(html).toContain('abc123');
    });

    it('renders without optional fields when absent', () => {
      const f: Finding = {
        id: 'SEC-02', severity: Severity.CRITICAL, pillar: Pillar.SECURITY,
        category: 'secret', message: 'Secret found', file: null, line: null,
        column: null, suggestion: 'Remove it',
      };
      const html = renderHtml(makeReport([f]));
      expect(html).toContain('SEC-02');
      expect(html).toContain('Remove it');
    });
  });

  describe('tier badge', () => {
    it('renders tier badge for tier-1 findings', () => {
      const f: Finding = {
        id: 'INC-01', severity: Severity.CRITICAL, pillar: Pillar.INCLUSIVE,
        category: 'non-inclusive-term', message: 'Non-inclusive term "abort" found',
        file: null, line: null, column: null,
        suggestion: 'Replace with: cancel',
        metadata: { tier: 1 as const },
      };
      const html = renderHtml(makeReport([f]));
      expect(html).toContain('tier-badge');
      expect(html).toContain('Tier 1');
    });

    it('renders tier-2 and tier-3 badge labels', () => {
      const f2: Finding = {
        id: 'INC-02', severity: Severity.WARNING, pillar: Pillar.INCLUSIVE,
        category: 'term', message: 'term found', file: null, line: null, column: null,
        suggestion: 'Replace', metadata: { tier: 2 as const },
      };
      const f3: Finding = {
        id: 'INC-03', severity: Severity.WARNING, pillar: Pillar.INCLUSIVE,
        category: 'term', message: 'term found 2', file: null, line: null, column: null,
        suggestion: 'Replace', metadata: { tier: 3 as const },
      };
      const html2 = renderHtml(makeReport([f2]));
      const html3 = renderHtml(makeReport([f3]));
      expect(html2).toContain('Tier 2');
      expect(html3).toContain('Tier 3');
    });
  });

  describe('pillar card score colors', () => {
    function makePillarsWithScore(score: number) {
      return Object.fromEntries(
        Object.values(Pillar).map((p) => [
          p,
          {
            score,
            weight: PILLAR_WEIGHTS[p],
            weightedScore: score * PILLAR_WEIGHTS[p],
            counts: { critical: 1, warning: 1, info: 1, pass: 0 },
            scanners: ['scanner-a'],
          },
        ]),
      ) as OrchestratorResult['pillars'];
    }

    it('shows critical color (var(--critical)) for score < 4', () => {
      const result: OrchestratorResult = {
        overallScore: 3.0, riskLevel: RiskLevel.CRITICAL,
        pillars: makePillarsWithScore(3.0),
        findings: [], thresholdPassed: false, durationMs: 1000,
      };
      const report = buildScanReport(
        { type: 'local' as const, value: '/tmp/low-score-repo' },
        result, DEFAULT_CONFIG, MaturityLevel.INCUBATING, '1.0.0',
      );
      const html = renderHtml(report);
      expect(html).toContain('var(--critical)');
    });

    it('shows warning color (var(--warning)) for score between 4 and 7', () => {
      const result: OrchestratorResult = {
        overallScore: 5.0, riskLevel: RiskLevel.HIGH,
        pillars: makePillarsWithScore(5.0),
        findings: [], thresholdPassed: true, durationMs: 1000,
      };
      const report = buildScanReport(
        { type: 'local' as const, value: '/tmp/mid-score-repo' },
        result, DEFAULT_CONFIG, MaturityLevel.INCUBATING, '1.0.0',
      );
      const html = renderHtml(report);
      expect(html).toContain('var(--warning)');
    });
  });

  describe('info section', () => {
    it('renders info findings ungrouped by default', () => {
      const infos: Finding[] = [
        { id: 'AI-01', severity: Severity.INFO, pillar: Pillar.AI_READINESS,
          category: 'model-card', message: 'No model card found', file: null,
          line: null, column: null, suggestion: 'Add MODEL_CARD.md' },
        { id: 'AI-02', severity: Severity.INFO, pillar: Pillar.AI_READINESS,
          category: 'model-card', message: 'No dataset provenance', file: 'README.md',
          line: 1, column: 1, suggestion: 'Document sources' },
      ];
      const html = renderHtml(makeReport(infos));
      expect(html).toContain('AI-01');
      expect(html).toContain('AI-02');
      expect(html).toContain('README.md');
    });

    it('renders info findings grouped when grouped: true', () => {
      const infos: Finding[] = Array.from({ length: 3 }, (_, i) => ({
        id: `AI-0${i}`, severity: Severity.INFO, pillar: Pillar.AI_READINESS,
        category: 'model-card', message: 'No model card found',
        file: `src/model${i}.ts`, line: 1, column: 1, suggestion: 'Add MODEL_CARD.md',
      }));
      const html = renderHtml(makeReport(infos), { grouped: true });
      expect(html).toContain('occurrences');
    });
  });

  describe('scanner errors section', () => {
    it('shows scanner errors callout when report.partial is true', () => {
      const report = makeReport();
      const partialReport = {
        ...report,
        partial: true,
        failedScanners: [{ name: 'openssf', reason: 'timeout', message: 'API timed out', pillar: 'security' }],
      } as ScanReport;
      const html = renderHtml(partialReport);
      expect(html).toContain('Scanner Errors');
      expect(html).toContain('openssf');
    });

    it('shows scanner error findings when no failedScanners list', () => {
      const errorFinding: Finding = {
        id: 'SCANNER-FAIL-openssf', severity: Severity.WARNING,
        pillar: Pillar.SECURITY, category: 'timeout',
        message: 'OpenSSF scorecard scanner failed', file: null,
        line: null, column: null, suggestion: 'Retry later',
      };
      const report = makeReport([errorFinding]);
      const html = renderHtml(report);
      expect(html).toContain('Scanner Errors');
    });
  });

  describe('empty findings', () => {
    it('shows no-findings callout when findings array is empty', () => {
      const result: OrchestratorResult = {
        overallScore: 9.5, riskLevel: RiskLevel.LOW,
        pillars: Object.fromEntries(
          Object.values(Pillar).map((p) => [p, {
            score: 9.5, weight: PILLAR_WEIGHTS[p], weightedScore: 9.5 * PILLAR_WEIGHTS[p],
            counts: { critical: 0, warning: 0, info: 0, pass: 5 }, scanners: ['scanner-a'],
          }]),
        ) as OrchestratorResult['pillars'],
        findings: [], thresholdPassed: true, durationMs: 500,
      };
      const report = buildScanReport(
        { type: 'local' as const, value: '/tmp/clean-repo' },
        result, DEFAULT_CONFIG, MaturityLevel.GRADUATED, '1.0.0',
      );
      const html = renderHtml(report);
      expect(html).toContain('No findings');
    });
  });

  describe('recommendations section', () => {
    it('renders recommendations when present', () => {
      const report = makeReport();
      const withRecs: ScanReport = {
        ...report,
        recommendations: [
          { action: 'Add a SECURITY.md', impact: 'high', effort: 'low', resources: ['https://example.com/security'] },
          { action: 'Add CI badge', impact: 'medium', effort: 'medium' },
        ],
      };
      const html = renderHtml(withRecs);
      expect(html).toContain('Recommendations');
      expect(html).toContain('Add a SECURITY.md');
      expect(html).toContain('example.com/security');
      expect(html).toContain('high impact');
    });
  });

  describe('metadata fields', () => {
    it('includes branch in header when metadata.branch is set', () => {
      const report = makeReport();
      const withBranch: ScanReport = {
        ...report,
        metadata: { ...report.metadata, branch: 'feat/html-reporter' },
      };
      const html = renderHtml(withBranch);
      expect(html).toContain('feat/html-reporter');
    });

    it('includes commitSha in footer when set', () => {
      const report = makeReport();
      const withSha: ScanReport = {
        ...report,
        metadata: { ...report.metadata, commitSha: 'abc1234' },
      };
      const html = renderHtml(withSha);
      expect(html).toContain('abc1234');
    });

    it('uses custom title when options.title is set', () => {
      const html = renderHtml(makeReport(), { title: 'My Custom Title' });
      expect(html).toContain('<title>My Custom Title</title>');
    });
  });

  describe('single-occurrence grouped row', () => {
    it('renders single occurrence without grouping header', () => {
      const single: Finding = {
        id: 'INC-NAMING-abort-src/one.ts:1',
        severity: Severity.WARNING, pillar: Pillar.INCLUSIVE,
        category: 'non-inclusive-term', message: 'Non-inclusive term "abort" found',
        file: 'src/one.ts', line: 1, column: 1,
        suggestion: 'Replace with: cancel',
      };
      const html = renderHtml(makeReport([single]), { grouped: true });
      expect(html).toContain('src/one.ts');
      expect(html).not.toContain('occurrences');
    });

    it('renders single occurrence without file chip when file is null', () => {
      const single: Finding = {
        id: 'GOV-01', severity: Severity.WARNING, pillar: Pillar.GOVERNANCE,
        category: 'license', message: 'No license found', file: null,
        line: null, column: null, suggestion: 'Add LICENSE',
      };
      const html = renderHtml(makeReport([single]), { grouped: true });
      expect(html).toContain('GOV-01');
    });
  });
});
