import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { DomainDetector } from '../../src/ecosystem/domain-detector.js';
import { ScanDepth, MaturityLevel, OutputFormat } from '../../src/types/index.js';
import type { EcosystemContext } from '../../src/ecosystem/types.js';
import type { ScanReport } from '../../src/types/index.js';

vi.mock('node:fs');
const mockedFs = vi.mocked(fs);

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

describe('DomainDetector', () => {
  let detector: DomainDetector;

  beforeEach(() => {
    detector = new DomainDetector();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects oss-health domain from README keywords', () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('README.md'),
    );
    mockedFs.readFileSync = vi.fn().mockReturnValue(
      'This tool scans open source health repo scoring project health ossf',
    );
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const profile = detector.detect(makeContext());
    expect(profile.domain).toBe('oss-health');
  });

  it('detects TypeScript as primary language when tsconfig.json exists', () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) => {
      const s = String(p);
      return s.endsWith('tsconfig.json') || s.endsWith('package.json');
    });
    mockedFs.readFileSync = vi.fn().mockReturnValue('{}');
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const profile = detector.detect(makeContext());
    expect(profile.primaryLanguage).toBe('TypeScript');
  });

  it('falls back to general domain when no keywords match', () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(false);
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const profile = detector.detect(makeContext());
    expect(profile.domain).toBe('general');
  });

  it('detects llm-tooling from package.json keywords', () => {
    mockedFs.existsSync = vi.fn().mockImplementation((p: unknown) =>
      String(p).endsWith('package.json'),
    );
    mockedFs.readFileSync = vi.fn().mockImplementation((p: unknown) => {
      if (String(p).endsWith('package.json')) {
        return JSON.stringify({ keywords: ['llm', 'embedding', 'rag', 'prompt'] });
      }
      return '';
    });
    mockedFs.readdirSync = vi.fn().mockReturnValue([]);

    const profile = detector.detect(makeContext());
    expect(profile.domain).toBe('llm-tooling');
  });
});
