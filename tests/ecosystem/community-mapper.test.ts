import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { CommunityMapper } from '../../src/ecosystem/community-mapper.js';
import { ScanDepth, MaturityLevel, OutputFormat } from '../../src/types/index.js';
import type { EcosystemContext, EcosystemProfile } from '../../src/ecosystem/types.js';
import type { ScanReport } from '../../src/types/index.js';

vi.mock('node:fs');
const mockedFs = vi.mocked(fs);

function makeProfile(domain: string): EcosystemProfile {
  return { domain, ecosystems: [], standards: [], primaryLanguage: null, detectedTopics: [] };
}

function makeContext(): EcosystemContext {
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
  };
}

describe('CommunityMapper', () => {
  let mapper: CommunityMapper;

  beforeEach(() => {
    mapper = new CommunityMapper();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns static communities for oss-health domain', () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(false);

    const result = mapper.map(makeProfile('oss-health'), makeContext());
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((c) => c.name.includes('CHAOSS') || c.name.includes('OpenSSF'))).toBe(true);
  });

  it('detects Discord links in README', () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('README.md'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      'Join us at https://discord.gg/my-server for community chat',
    );

    const result = mapper.map(makeProfile('general'), makeContext());
    const discord = result.find((c) => c.type === 'discord');
    expect(discord).toBeDefined();
    expect(discord?.url).toContain('discord.gg');
  });

  it('does not duplicate URLs found in README and static taxonomy', () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('README.md'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      'See https://openssf.slack.com for OpenSSF Slack',
    );

    const result = mapper.map(makeProfile('oss-health'), makeContext());
    const slackEntries = result.filter((c) => c.url === 'https://openssf.slack.com');
    expect(slackEntries.length).toBeLessThanOrEqual(1);
  });
});
