import { describe, it, expect } from 'vitest';
import { isErrorFinding, renderIssueBody } from '../src/issues.js';
import type { Finding, ScanReport } from '../src/types/index.js';
import { Pillar, Severity } from '../src/types/index.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'TEST-01',
    severity: Severity.WARNING,
    pillar: Pillar.SECURITY,
    category: 'test-category',
    message: 'Test finding message',
    file: 'README.md',
    line: 10,
    column: null,
    suggestion: 'Fix the issue by doing X',
    referenceUrl: 'https://example.com/docs',
    dataSource: 'local',
    ...overrides,
  };
}

function makeReport(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    version: '0.1.3',
    repo: 'test-repo',
    scannedAt: '2026-06-02T00:00:00.000Z',
    overallScore: 7.5,
    riskLevel: 'MEDIUM',
    partial: false,
    failedScanners: [],
    maturity: 'sandbox',
    pillars: {} as ScanReport['pillars'],
    findings: [],
    recommendations: [],
    metadata: {
      commitSha: null,
      branch: null,
      remoteUrl: null,
    },
    ...overrides,
  };
}

// ── isErrorFinding ─────────────────────────────────────────────────────────────

describe('isErrorFinding (#139)', () => {
  it('returns true for timeout category', () => {
    expect(isErrorFinding(makeFinding({ category: 'timeout' }))).toBe(true);
  });

  it('returns true for error category', () => {
    expect(isErrorFinding(makeFinding({ category: 'error' }))).toBe(true);
  });

  it('returns false for a normal finding category', () => {
    expect(isErrorFinding(makeFinding({ category: 'missing-license' }))).toBe(false);
  });

  it('returns false for undefined category', () => {
    expect(isErrorFinding(makeFinding({ category: undefined }))).toBe(false);
  });
});

// ── renderIssueBody ────────────────────────────────────────────────────────────

describe('renderIssueBody (#143)', () => {
  it('contains all five required sections', () => {
    const body = renderIssueBody(makeFinding(), makeReport());
    expect(body).toMatch(/## What is wrong/);
    expect(body).toMatch(/## Why it matters/);
    expect(body).toMatch(/## How to fix it/);
    expect(body).toMatch(/## How to verify the fix/);
    expect(body).toMatch(/## Context/);
  });

  it('includes the finding message in the body', () => {
    const body = renderIssueBody(makeFinding({ message: 'Secret exposed in env file' }), makeReport());
    expect(body).toContain('Secret exposed in env file');
  });

  it('includes the suggestion', () => {
    const body = renderIssueBody(makeFinding({ suggestion: 'Rotate the secret immediately' }), makeReport());
    expect(body).toContain('Rotate the secret immediately');
  });

  it('includes the affected file and line', () => {
    const body = renderIssueBody(makeFinding({ file: 'src/auth.ts', line: 42 }), makeReport());
    expect(body).toContain('src/auth.ts');
    expect(body).toContain('42');
  });

  it('includes a runnable quaid-scanner verify command', () => {
    const body = renderIssueBody(makeFinding({ category: 'missing-license' }), makeReport());
    expect(body).toMatch(/quaid-scanner \. --format json/);
    expect(body).toContain('missing-license');
  });

  it('includes the overall score from the report', () => {
    const body = renderIssueBody(makeFinding(), makeReport({ overallScore: 4.2 }));
    expect(body).toContain('4.2');
  });

  it('includes the pillar name', () => {
    const body = renderIssueBody(makeFinding({ pillar: Pillar.GOVERNANCE }), makeReport());
    expect(body).toContain(Pillar.GOVERNANCE);
  });

  it('handles a finding with no file gracefully', () => {
    const body = renderIssueBody(makeFinding({ file: null, line: null }), makeReport());
    expect(body).toMatch(/## What is wrong/);
    expect(body).not.toContain('null');
  });

  it('handles a finding with no suggestion gracefully', () => {
    const body = renderIssueBody(makeFinding({ suggestion: undefined }), makeReport());
    expect(body).toMatch(/## How to fix it/);
  });

  it('includes the scanner version footer', () => {
    const body = renderIssueBody(makeFinding(), makeReport({ version: '0.1.3' }));
    expect(body).toContain('0.1.3');
    expect(body).toContain('quaid-scanner');
  });
});

// ── Bug #183 — verify selector falls back when category is null ────────────────

describe('renderIssueBody — verify selector (#183)', () => {
  it('uses category-based selector when category is a real string', () => {
    const body = renderIssueBody(makeFinding({ category: 'code-of-conduct' }), makeReport());
    expect(body).toContain('select(.category == "code-of-conduct")');
  });

  it('does NOT emit "unknown" in the verify command when category is null', () => {
    const finding = makeFinding({ id: 'inclusive-code-scanner-3', category: undefined });
    // Force category to null at runtime (the type says string but runtime may produce null/undefined)
    (finding as unknown as Record<string, unknown>)['category'] = null;
    const body = renderIssueBody(finding, makeReport());
    // The verify command line must not contain the literal word "unknown"
    const verifyLine = body.split('\n').find((l) => l.includes('quaid-scanner') && l.includes('jq'));
    expect(verifyLine).toBeDefined();
    expect(verifyLine).not.toContain('"unknown"');
  });

  it('falls back to ID-prefix startswith selector when category is null', () => {
    const finding = makeFinding({ id: 'inclusive-code-scanner-3', category: undefined });
    (finding as unknown as Record<string, unknown>)['category'] = null;
    const body = renderIssueBody(finding, makeReport());
    expect(body).toContain('startswith("inclusive-code-scanner")');
  });
});

// ── Bug #184 — optional reportUrl in Context section ──────────────────────────

describe('renderIssueBody — report URL (#184)', () => {
  it('includes the report URL in Context when reportUrl is supplied', () => {
    const body = renderIssueBody(
      makeFinding(),
      makeReport(),
      'https://github.com/org/repo/pull/42',
    );
    expect(body).toContain('https://github.com/org/repo/pull/42');
    expect(body).toContain('**Full report:**');
  });

  it('does NOT include a Full report line when reportUrl is omitted', () => {
    const body = renderIssueBody(makeFinding(), makeReport());
    expect(body).not.toContain('**Full report:**');
  });
});

// ── Bug #182 — per-pillar rationale in "Why it matters" ───────────────────────

describe('renderIssueBody — per-pillar rationale (#182)', () => {
  it('uses security-specific rationale for security pillar findings', () => {
    const body = renderIssueBody(makeFinding({ pillar: Pillar.SECURITY }), makeReport());
    expect(body).toMatch(/[Ss]ecurity gaps|attack surface/);
  });

  it('uses governance-specific rationale for governance pillar findings', () => {
    const body = renderIssueBody(makeFinding({ pillar: Pillar.GOVERNANCE }), makeReport());
    expect(body).toMatch(/governance|license|[Cc]ode of [Cc]onduct/);
  });

  it('uses community-specific rationale for community pillar findings', () => {
    const body = renderIssueBody(makeFinding({ pillar: Pillar.COMMUNITY }), makeReport());
    expect(body).toMatch(/[Cc]ommunity health|contributor/i);
  });

  it('uses inclusive-specific rationale for inclusive pillar findings', () => {
    const body = renderIssueBody(makeFinding({ pillar: Pillar.INCLUSIVE }), makeReport());
    expect(body).toMatch(/[Ii]nclusive|barrier|newcomer/i);
  });

  it('uses technical-specific rationale for technical pillar findings', () => {
    const body = renderIssueBody(makeFinding({ pillar: Pillar.TECHNICAL }), makeReport());
    expect(body).toMatch(/[Tt]echnical|hygiene|tests|CI/i);
  });

  it('uses ai_readiness-specific rationale for ai_readiness pillar findings', () => {
    const body = renderIssueBody(makeFinding({ pillar: Pillar.AI_READINESS }), makeReport());
    expect(body).toMatch(/AI|machine-readable|agent/i);
  });

  it('does NOT contain the old generic boilerplate phrase', () => {
    const body = renderIssueBody(makeFinding({ pillar: Pillar.SECURITY }), makeReport());
    expect(body).not.toContain('dragging down the');
  });
});
