import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { EcosystemOrchestrator } from '../../src/ecosystem/orchestrator.js';
import { ScanDepth, MaturityLevel, OutputFormat, RiskLevel } from '../../src/types/index.js';
import type { EcosystemContext } from '../../src/ecosystem/types.js';
import type { ScanReport } from '../../src/types/index.js';

vi.mock('node:fs');
const mockedFs = vi.mocked(fs);

// Mock ZeroDBClient so no real network calls occur
vi.mock('../../src/integrations/zerodb-client.js', () => {
  const ZeroDBClient = vi.fn().mockImplementation(() => ({
    vectorSearch: vi.fn().mockResolvedValue([]),
    vectorUpsert: vi.fn().mockResolvedValue(undefined),
  }));
  return { ZeroDBClient };
});

// Mock corpus builder to track upsertRepoProfile calls
vi.mock('../../src/ecosystem/corpus-builder.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/ecosystem/corpus-builder.js')>();
  return {
    ...original,
    upsertRepoProfile: vi.fn().mockResolvedValue(undefined),
  };
});

import { ZeroDBClient } from '../../src/integrations/zerodb-client.js';
import * as corpusBuilder from '../../src/ecosystem/corpus-builder.js';

function makeReport(): ScanReport {
  return {
    repo: 'acme/scanner',
    scannedAt: '2026-04-24T00:00:00Z',
    version: '1.0.0',
    depth: ScanDepth.STANDARD,
    durationMs: 1000,
    overallScore: 7.0,
    riskLevel: RiskLevel.MEDIUM,
    maturity: MaturityLevel.INCUBATING,
    pillars: {} as ScanReport['pillars'],
    findings: [],
    recommendations: [],
    metadata: { commitSha: 'abc', branch: 'main', remoteUrl: null, primaryLanguage: null, linesOfCode: null, stars: null, forks: null, openIssues: null },
  };
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
    existingReport: makeReport(),
    zerodbAvailable: false,
    ...overrides,
  };
}

describe('EcosystemOrchestrator', () => {
  let orchestrator: EcosystemOrchestrator;

  beforeEach(() => {
    orchestrator = new EcosystemOrchestrator();
    vi.resetAllMocks();
    mockedFs.existsSync = vi.fn().mockReturnValue(false);
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);
    mockedFs.readFileSync = vi.fn().mockReturnValue('');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns EcosystemIntelligence with all required fields', async () => {
    const intel = await orchestrator.analyze(makeContext());
    expect(intel).toMatchObject({
      generatedAt: expect.any(String),
      profile: expect.objectContaining({ domain: expect.any(String) }),
      rivals: expect.any(Array),
      partners: expect.any(Array),
      userCommunities: expect.any(Array),
      recommendations: expect.any(Array),
      dataSource: 'static',
      disclaimer: expect.any(String),
    });
  });

  it('uses static dataSource when zerodbAvailable is false', async () => {
    const intel = await orchestrator.analyze(makeContext({ zerodbAvailable: false }));
    expect(intel.dataSource).toBe('static');
  });

  it('detects oss-health domain from README keywords', async () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('README.md'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      'open source health repo scoring project health ossf community metrics',
    );
    const intel = await orchestrator.analyze(makeContext());
    expect(intel.profile.domain).toBe('oss-health');
    expect(intel.rivals.some((r) => r.name.includes('Scorecard'))).toBe(true);
  });

  it('recommendations are non-empty', async () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(false);
    const intel = await orchestrator.analyze(makeContext());
    expect(intel.recommendations.length).toBeGreaterThan(0);
  });

  it('disclaimer is present and non-empty', async () => {
    const intel = await orchestrator.analyze(makeContext());
    expect(intel.disclaimer.length).toBeGreaterThan(20);
  });

  describe('zerodbAvailable=true branch', () => {
    function makeZerodbContext(overrides: Partial<EcosystemContext> = {}): EcosystemContext {
      return makeContext({
        zerodbAvailable: true,
        config: {
          maturity: null, depth: ScanDepth.STANDARD, format: OutputFormat.JSON,
          output: null, threshold: null, quiet: false, verbose: false, scannerTimeout: 30000,
          githubToken: null,
          zerodbApiKey: 'test-api-key',
          zerodbProjectId: 'test-project-id',
          pillars: { disabled: [], weights: {}, disabledScanners: [] },
          bots: { enabled: true, additional: [], exclude: [] },
          inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
        },
        ...overrides,
      });
    }

    beforeEach(() => {
      vi.mocked(ZeroDBClient).mockClear();
      vi.mocked(corpusBuilder.upsertRepoProfile).mockClear();
    });

    it('constructs ZeroDBClient when zerodbAvailable=true with valid key and projectId', async () => {
      await orchestrator.analyze(makeZerodbContext());
      expect(vi.mocked(ZeroDBClient)).toHaveBeenCalledOnce();
      expect(vi.mocked(ZeroDBClient)).toHaveBeenCalledWith(
        expect.any(String),
        'test-api-key',
        'test-project-id',
      );
    });

    it('does not construct ZeroDBClient when apiKey is missing', async () => {
      const ctx = makeContext({
        zerodbAvailable: true,
        config: {
          maturity: null, depth: ScanDepth.STANDARD, format: OutputFormat.JSON,
          output: null, threshold: null, quiet: false, verbose: false, scannerTimeout: 30000,
          githubToken: null,
          zerodbApiKey: null,
          zerodbProjectId: 'test-project-id',
          pillars: { disabled: [], weights: {}, disabledScanners: [] },
          bots: { enabled: true, additional: [], exclude: [] },
          inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
        },
      });
      await orchestrator.analyze(ctx);
      expect(vi.mocked(ZeroDBClient)).not.toHaveBeenCalled();
    });

    it('does not construct ZeroDBClient when projectId is missing', async () => {
      const ctx = makeContext({
        zerodbAvailable: true,
        config: {
          maturity: null, depth: ScanDepth.STANDARD, format: OutputFormat.JSON,
          output: null, threshold: null, quiet: false, verbose: false, scannerTimeout: 30000,
          githubToken: null,
          zerodbApiKey: 'test-api-key',
          zerodbProjectId: null,
          pillars: { disabled: [], weights: {}, disabledScanners: [] },
          bots: { enabled: true, additional: [], exclude: [] },
          inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
        },
      });
      await orchestrator.analyze(ctx);
      expect(vi.mocked(ZeroDBClient)).not.toHaveBeenCalled();
    });

    it('calls upsertRepoProfile when ZeroDBClient is constructed', async () => {
      await orchestrator.analyze(makeZerodbContext());
      // upsertRepoProfile is fire-and-forget; allow microtasks to flush
      await Promise.resolve();
      expect(vi.mocked(corpusBuilder.upsertRepoProfile)).toHaveBeenCalledOnce();
    });

    it('returns static dataSource when zerodbAvailable=true but no vector hits', async () => {
      // vectorSearch returns [] by default — zero hits → static
      const intel = await orchestrator.analyze(makeZerodbContext());
      expect(intel.dataSource).toBe('static');
    });

    it('returns zerodb-assisted when 1–9 rivals have a non-null similarityScore', async () => {
      // Make vectorSearch return a single hit so one rival gets a non-null score
      vi.mocked(ZeroDBClient).mockImplementationOnce(() => ({
        vectorSearch: vi.fn().mockResolvedValue([
          { id: 'other/repo', score: 0.9, metadata: { name: 'Other Repo', repo: 'other/repo', repoUrl: null, tags: [] } },
        ]),
        vectorUpsert: vi.fn().mockResolvedValue(undefined),
      }));
      orchestrator = new EcosystemOrchestrator();
      const intel = await orchestrator.analyze(makeZerodbContext());
      expect(intel.dataSource).toBe('zerodb-assisted');
    });

    it('returns zerodb-full when 10+ rivals have a non-null similarityScore', async () => {
      const hits = Array.from({ length: 10 }, (_, i) => ({
        id: `org/repo-${i}`,
        score: 0.85,
        metadata: { name: `Repo ${i}`, repo: `org/repo-${i}`, repoUrl: null, tags: [] },
      }));
      vi.mocked(ZeroDBClient).mockImplementationOnce(() => ({
        vectorSearch: vi.fn().mockResolvedValue(hits),
        vectorUpsert: vi.fn().mockResolvedValue(undefined),
      }));
      orchestrator = new EcosystemOrchestrator();
      const intel = await orchestrator.analyze(makeZerodbContext());
      expect(intel.dataSource).toBe('zerodb-full');
    });
  });
});
