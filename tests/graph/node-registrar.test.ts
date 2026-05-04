import { describe, it, expect, vi } from 'vitest';
import { reportToGraphNode, upsertGraphNode } from '../../src/graph/node-registrar.js';
import { ScanDepth, RiskLevel, MaturityLevel, Pillar } from '../../src/types/index.js';
import type { ScanReport } from '../../src/types/index.js';
import type { ZeroDBClient, TableColumn } from '../../src/integrations/zerodb-client.js';

function makeMockClient(overrides: Partial<ZeroDBClient> = {}): ZeroDBClient {
  return {
    tableCreate: vi.fn().mockResolvedValue(undefined),
    tableInsert: vi.fn().mockResolvedValue({ row_id: 'r1' }),
    tableQuery: vi.fn().mockResolvedValue([]),
    vectorUpsert: vi.fn().mockResolvedValue(undefined),
    vectorSearch: vi.fn().mockResolvedValue([]),
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
    pillars: {
      [Pillar.SECURITY]: { score: 8.0, weight: 0.25, weightedScore: 2.0, counts: { critical: 0, warning: 1, info: 0, pass: 5 }, scanners: ['security-scanner'] },
      [Pillar.GOVERNANCE]: { score: 6.5, weight: 0.20, weightedScore: 1.3, counts: { critical: 0, warning: 2, info: 1, pass: 3 }, scanners: ['governance-scanner'] },
      [Pillar.COMMUNITY]: { score: 7.0, weight: 0.15, weightedScore: 1.05, counts: { critical: 0, warning: 1, info: 0, pass: 4 }, scanners: ['community-scanner'] },
      [Pillar.AI_READINESS]: { score: 9.0, weight: 0.15, weightedScore: 1.35, counts: { critical: 0, warning: 0, info: 0, pass: 6 }, scanners: ['ai-readiness-scanner'] },
      [Pillar.INCLUSIVE]: { score: 5.0, weight: 0.15, weightedScore: 0.75, counts: { critical: 1, warning: 0, info: 0, pass: 2 }, scanners: ['inclusive-scanner'] },
      [Pillar.TECHNICAL]: { score: 8.5, weight: 0.10, weightedScore: 0.85, counts: { critical: 0, warning: 0, info: 1, pass: 7 }, scanners: ['technical-scanner'] },
    },
    findings: [],
    recommendations: [],
    metadata: {
      commitSha: 'abc123',
      branch: 'main',
      remoteUrl: null,
      primaryLanguage: 'TypeScript',
      linesOfCode: 5000,
      stars: 42,
      forks: 7,
      openIssues: 3,
    },
  };
  return { ...base, ...overrides };
}

describe('reportToGraphNode', () => {
  it('maps repo, overallScore, and lastScannedAt fields correctly', () => {
    const report = makeReport();
    const node = reportToGraphNode(report);

    expect(node.repo).toBe('acme/my-project');
    expect(node.overallScore).toBe(7.5);
    expect(node.lastScannedAt).toBe('2026-04-24T00:00:00.000Z');
  });

  it('maps pillarScores from pillars record', () => {
    const report = makeReport();
    const node = reportToGraphNode(report);

    expect(node.pillarScores[Pillar.SECURITY]).toBe(8.0);
    expect(node.pillarScores[Pillar.GOVERNANCE]).toBe(6.5);
    expect(node.pillarScores[Pillar.COMMUNITY]).toBe(7.0);
    expect(node.pillarScores[Pillar.AI_READINESS]).toBe(9.0);
    expect(node.pillarScores[Pillar.INCLUSIVE]).toBe(5.0);
    expect(node.pillarScores[Pillar.TECHNICAL]).toBe(8.5);
  });

  it('maps primaryLanguage from metadata', () => {
    const report = makeReport();
    const node = reportToGraphNode(report);

    expect(node.primaryLanguage).toBe('TypeScript');
  });

  it('maps topics and ecosystems from ecosystem profile', () => {
    const report = makeReport({
      ecosystem: {
        generatedAt: '2026-04-24T00:00:00.000Z',
        profile: {
          domain: 'devtools',
          detectedTopics: ['ci-cd', 'testing'],
          ecosystems: ['nodejs', 'github-actions'],
          standards: [],
          primaryLanguage: 'TypeScript',
        },
        rivals: [],
        partners: [],
        userCommunities: [],
        recommendations: [],
        dataSource: 'static',
        disclaimer: '',
      },
    });
    const node = reportToGraphNode(report);

    expect(node.topics).toEqual(['ci-cd', 'testing']);
    expect(node.ecosystems).toEqual(['nodejs', 'github-actions']);
  });

  it('returns empty topics and ecosystems arrays when ecosystem is missing', () => {
    const report = makeReport({ ecosystem: undefined });
    const node = reportToGraphNode(report);

    expect(node.topics).toEqual([]);
    expect(node.ecosystems).toEqual([]);
  });

  it('returns null for primaryLanguage when metadata has no primaryLanguage', () => {
    const report = makeReport({
      metadata: {
        commitSha: null,
        branch: null,
        remoteUrl: null,
        primaryLanguage: null,
        linesOfCode: null,
        stars: null,
        forks: null,
        openIssues: null,
      },
    });
    const node = reportToGraphNode(report);

    expect(node.primaryLanguage).toBeNull();
  });
});

describe('upsertGraphNode', () => {
  it('calls tableCreate with TABLE name and COLUMNS', async () => {
    const client = makeMockClient();
    const report = makeReport();

    await upsertGraphNode(report, client);

    expect(client.tableCreate).toHaveBeenCalledWith(
      'graph_nodes',
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', type: 'text', nullable: false }),
        expect.objectContaining({ name: 'repo', type: 'text', nullable: false }),
        expect.objectContaining({ name: 'primary_language', type: 'text', nullable: true }),
        expect.objectContaining({ name: 'pillar_scores', type: 'jsonb', nullable: false }),
        expect.objectContaining({ name: 'overall_score', type: 'real', nullable: false }),
        expect.objectContaining({ name: 'topics', type: 'jsonb', nullable: false }),
        expect.objectContaining({ name: 'ecosystems', type: 'jsonb', nullable: false }),
        expect.objectContaining({ name: 'last_scanned_at', type: 'timestamp', nullable: false }),
      ]),
      ['id'],
    );
  });

  it('calls tableInsert with correct snake_case field names', async () => {
    const client = makeMockClient();
    const report = makeReport();

    await upsertGraphNode(report, client);

    expect(client.tableInsert).toHaveBeenCalledWith(
      'graph_nodes',
      expect.objectContaining({
        repo: 'acme/my-project',
        primary_language: 'TypeScript',
        overall_score: 7.5,
        last_scanned_at: '2026-04-24T00:00:00.000Z',
        pillar_scores: expect.objectContaining({ [Pillar.SECURITY]: 8.0 }),
        topics: [],
        ecosystems: [],
      }),
    );
  });

  it('resolves without throwing when tableCreate rejects (ZeroDB unavailable)', async () => {
    const client = makeMockClient({
      tableCreate: vi.fn().mockRejectedValue(new Error('ZeroDB unavailable')),
    });

    await expect(upsertGraphNode(makeReport(), client)).resolves.not.toThrow();
  });

  it('resolves without throwing when tableInsert rejects', async () => {
    const client = makeMockClient({
      tableInsert: vi.fn().mockRejectedValue(new Error('insert failed')),
    });

    await expect(upsertGraphNode(makeReport(), client)).resolves.not.toThrow();
  });

  it('resolves without throwing when a non-Error value is thrown', async () => {
    const client = makeMockClient({
      tableCreate: vi.fn().mockRejectedValue('raw string error'),
    });

    await expect(upsertGraphNode(makeReport(), client)).resolves.not.toThrow();
  });
});
