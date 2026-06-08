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
});
