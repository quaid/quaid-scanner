import { describe, it, expect, vi } from 'vitest';
import { RivalFinder } from '../../src/ecosystem/rival-finder.js';
import { ScanDepth, MaturityLevel, OutputFormat } from '../../src/types/index.js';
import type { EcosystemContext, EcosystemProfile } from '../../src/ecosystem/types.js';
import type { ScanReport } from '../../src/types/index.js';
import type { ZeroDBClient } from '../../src/integrations/zerodb-client.js';

function makeProfile(domain: string): EcosystemProfile {
  return { domain, ecosystems: [], standards: [], primaryLanguage: 'TypeScript', detectedTopics: [] };
}

function makeContext(overrides: Partial<EcosystemContext> = {}): EcosystemContext {
  return {
    repoPath: '/tmp/repo',
    repoIdentifier: null,
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config: {
      maturity: null, depth: ScanDepth.STANDARD, format: OutputFormat.JSON,
      output: null, threshold: null, quiet: false, verbose: false, scannerTimeout: 30000,
      githubToken: null, zerodbApiKey: null, zerodbProjectId: null,
      pillars: { disabled: [], weights: {}, disabledScanners: [] },
      bots: { enabled: true, additional: [], exclude: [] },
      inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
    },
    git: { commitSha: 'abc', branch: 'main', remoteUrl: null },
    signal: new AbortController().signal,
    emit: vi.fn(),
    existingReport: {} as ScanReport,
    zerodbAvailable: false,
    ...overrides,
  };
}

describe('RivalFinder', () => {
  const finder = new RivalFinder();

  it('returns static rivals for oss-health domain', async () => {
    const rivals = await finder.find(makeProfile('oss-health'), makeContext());
    expect(rivals.length).toBeGreaterThan(0);
    expect(rivals.every((r) => r.role === 'rival')).toBe(true);
    expect(rivals.some((r) => r.name.includes('Scorecard'))).toBe(true);
  });

  it('returns similarityScore null for static rivals', async () => {
    const rivals = await finder.find(makeProfile('oss-health'), makeContext());
    expect(rivals.every((r) => r.similarityScore === null)).toBe(true);
  });

  it('merges vector results when ZeroDB available', async () => {
    const mockClient = {
      vectorSearch: vi.fn().mockResolvedValue([
        { id: 'some/repo', score: 0.92, metadata: { name: 'VectorRepo', repo: 'some/repo', tags: ['oss'] } },
      ]),
    } as unknown as ZeroDBClient;

    const ctx = makeContext({ zerodbAvailable: true });
    const rivals = await finder.find(makeProfile('oss-health'), ctx, mockClient);
    const vectorRival = rivals.find((r) => r.name === 'VectorRepo');
    expect(vectorRival).toBeDefined();
    expect(vectorRival?.similarityScore).toBe(0.92);
  });

  it('deduplicates by name (case-insensitive)', async () => {
    const mockClient = {
      vectorSearch: vi.fn().mockResolvedValue([
        { id: 'x', score: 0.9, metadata: { name: 'openssf scorecard', repo: 'x', tags: [] } },
      ]),
    } as unknown as ZeroDBClient;

    const ctx = makeContext({ zerodbAvailable: true });
    const rivals = await finder.find(makeProfile('oss-health'), ctx, mockClient);
    const scorecardCount = rivals.filter((r) => r.name.toLowerCase().includes('scorecard')).length;
    expect(scorecardCount).toBeLessThanOrEqual(2);
  });

  it('falls back to static on ZeroDB error', async () => {
    const mockClient = {
      vectorSearch: vi.fn().mockRejectedValue(new Error('network error')),
    } as unknown as ZeroDBClient;

    const ctx = makeContext({ zerodbAvailable: true });
    const rivals = await finder.find(makeProfile('oss-health'), ctx, mockClient);
    expect(rivals.length).toBeGreaterThan(0);
    expect(rivals.every((r) => r.similarityScore === null)).toBe(true);
  });
});
