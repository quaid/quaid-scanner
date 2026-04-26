import { describe, it, expect, vi } from 'vitest';
import { buildProfileEmbedding, upsertRepoProfile } from '../../src/ecosystem/corpus-builder.js';
import { Pillar, ScanDepth, MaturityLevel, RiskLevel } from '../../src/types/index.js';
import type { ScanReport } from '../../src/types/index.js';
import type { EcosystemProfile } from '../../src/ecosystem/types.js';
import type { ZeroDBClient } from '../../src/integrations/zerodb-client.js';

function makeReport(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    repo: 'acme/scanner',
    scannedAt: '2026-04-24T00:00:00Z',
    version: '1.0.0',
    depth: ScanDepth.STANDARD,
    durationMs: 1000,
    overallScore: 7.0,
    riskLevel: RiskLevel.MEDIUM,
    maturity: MaturityLevel.INCUBATING,
    pillars: {
      [Pillar.SECURITY]: { score: 8.0, weight: 0.25, weightedScore: 2.0, counts: { critical: 0, warning: 1, info: 0, pass: 5 }, scanners: [] },
      [Pillar.GOVERNANCE]: { score: 7.0, weight: 0.2, weightedScore: 1.4, counts: { critical: 0, warning: 2, info: 0, pass: 4 }, scanners: [] },
      [Pillar.COMMUNITY]: { score: 6.0, weight: 0.15, weightedScore: 0.9, counts: { critical: 1, warning: 1, info: 0, pass: 3 }, scanners: [] },
      [Pillar.AI_READINESS]: { score: 5.0, weight: 0.15, weightedScore: 0.75, counts: { critical: 0, warning: 2, info: 1, pass: 2 }, scanners: [] },
      [Pillar.INCLUSIVE]: { score: 9.0, weight: 0.15, weightedScore: 1.35, counts: { critical: 0, warning: 0, info: 0, pass: 6 }, scanners: [] },
      [Pillar.TECHNICAL]: { score: 7.5, weight: 0.1, weightedScore: 0.75, counts: { critical: 0, warning: 1, info: 0, pass: 4 }, scanners: [] },
    },
    findings: [],
    recommendations: [],
    metadata: { commitSha: 'abc', branch: 'main', remoteUrl: null, primaryLanguage: null, linesOfCode: null, stars: null, forks: null, openIssues: null },
    ...overrides,
  };
}

function makeProfile(domain = 'oss-health'): EcosystemProfile {
  return { domain, ecosystems: [], standards: [], primaryLanguage: 'TypeScript', detectedTopics: ['oss-health'] };
}

describe('buildProfileEmbedding', () => {
  it('returns a vector of correct length (6 pillar scores + domain one-hot)', () => {
    const vector = buildProfileEmbedding(makeReport(), makeProfile());
    expect(vector.length).toBeGreaterThan(6);
  });

  it('normalizes pillar scores to 0-1 range', () => {
    const vector = buildProfileEmbedding(makeReport(), makeProfile());
    const pillarSlice = vector.slice(0, 6);
    expect(pillarSlice.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it('sets domain one-hot correctly', () => {
    const vector = buildProfileEmbedding(makeReport(), makeProfile('oss-health'));
    const domainPart = vector.slice(6);
    const hotCount = domainPart.filter((v) => v === 1.0).length;
    expect(hotCount).toBe(1);
  });
});

describe('upsertRepoProfile', () => {
  it('calls vectorUpsert with repo and metadata', async () => {
    const client = {
      vectorUpsert: vi.fn().mockResolvedValue(undefined),
    } as unknown as ZeroDBClient;

    await upsertRepoProfile(makeReport(), makeProfile(), client);
    expect(client.vectorUpsert).toHaveBeenCalledWith(
      'acme/scanner',
      expect.any(Array),
      expect.objectContaining({ domain: 'oss-health', repo: 'acme/scanner' }),
    );
  });

  it('does not throw when vectorUpsert fails', async () => {
    const client = {
      vectorUpsert: vi.fn().mockRejectedValue(new Error('db error')),
    } as unknown as ZeroDBClient;

    await expect(upsertRepoProfile(makeReport(), makeProfile(), client)).resolves.not.toThrow();
  });
});
