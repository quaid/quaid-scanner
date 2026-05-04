import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readGitInfo, buildContext } from '../src/context-builder.js';
import { DEFAULT_CONFIG } from '../src/config.js';
import { MaturityLevel, ScanDepth } from '../src/types/index.js';

// Mock fs and child_process at the module level so ESM named exports are replaceable
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    mkdtempSync: vi.fn(actual.mkdtempSync),
    rmSync: vi.fn(actual.rmSync),
  };
});

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: vi.fn(actual.execSync),
  };
});

// --- readGitInfo tests (unchanged) ---

describe('readGitInfo', () => {
  it('returns an object with the expected shape', () => {
    // Run against this repo's own directory — may or may not have git
    const info = readGitInfo('/Users/karstenwade/Projects/quaid-scanner');
    expect(info).toHaveProperty('commitSha');
    expect(info).toHaveProperty('branch');
    expect(info).toHaveProperty('remoteUrl');
  });

  it('returns null values for a non-git directory', () => {
    const info = readGitInfo('/tmp');
    expect(info.commitSha).toBeNull();
    expect(info.branch).toBeNull();
    expect(info.remoteUrl).toBeNull();
  });
});

// --- buildContext tests ---

describe('buildContext', () => {
  let mkdtempSyncMock: ReturnType<typeof vi.fn>;
  let execSyncMock: ReturnType<typeof vi.fn>;
  let rmSyncMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const fsMod = await import('fs');
    const childMod = await import('child_process');

    mkdtempSyncMock = fsMod.mkdtempSync as ReturnType<typeof vi.fn>;
    execSyncMock = childMod.execSync as ReturnType<typeof vi.fn>;
    rmSyncMock = fsMod.rmSync as ReturnType<typeof vi.fn>;

    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a valid ScanContext from a local target', () => {
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const config = { ...DEFAULT_CONFIG, depth: ScanDepth.QUICK };
    const { context: ctx } = buildContext(target, config, '1.0.0');

    expect(ctx.repoPath).toBe('/tmp/test-repo');
    expect(ctx.repoIdentifier).toBeNull();
    expect(ctx.depth).toBe(ScanDepth.QUICK);
    expect(ctx.maturity).toBeDefined();
    expect(ctx.config).toBe(config);
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
    expect(typeof ctx.emit).toBe('function');
  });

  it('returns a noop cleanup function for a local target', () => {
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const { cleanup } = buildContext(target, DEFAULT_CONFIG, '1.0.0');

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('local target cleanup does not call rmSync', () => {
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const { cleanup } = buildContext(target, DEFAULT_CONFIG, '1.0.0');

    cleanup();

    expect(rmSyncMock).not.toHaveBeenCalled();
  });

  it('builds a valid ScanContext from a github target with a non-empty repoPath', () => {
    mkdtempSyncMock.mockReturnValue('/tmp/quaid-MOCKED');
    execSyncMock.mockReturnValue(Buffer.from(''));

    const target = { type: 'github' as const, value: 'owner/repo' };
    const config = { ...DEFAULT_CONFIG };
    const { context: ctx } = buildContext(target, config, '1.0.0');

    expect(ctx.repoPath).toBe('/tmp/quaid-MOCKED');
    expect(ctx.repoPath).not.toBe('');
    expect(ctx.repoIdentifier).toBe('owner/repo');
    expect(ctx.maturity).toBeDefined();
  });

  it('calls execSync with a git clone command for a github target', () => {
    mkdtempSyncMock.mockReturnValue('/tmp/quaid-MOCKED');
    execSyncMock.mockReturnValue(Buffer.from(''));

    const target = { type: 'github' as const, value: 'owner/repo' };
    buildContext(target, DEFAULT_CONFIG, '1.0.0');

    const cloneCall = execSyncMock.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('git clone'),
    );
    expect(cloneCall).toBeDefined();
    const cloneCmd = cloneCall![0] as string;
    expect(cloneCmd).toContain('https://github.com/owner/repo.git');
    expect(cloneCmd).toContain('/tmp/quaid-MOCKED');
  });

  it('the cleanup function calls rmSync on the temp directory for a github target', () => {
    mkdtempSyncMock.mockReturnValue('/tmp/quaid-MOCKED');
    execSyncMock.mockReturnValue(Buffer.from(''));

    const target = { type: 'github' as const, value: 'owner/repo' };
    const { cleanup } = buildContext(target, DEFAULT_CONFIG, '1.0.0');

    cleanup();

    expect(rmSyncMock).toHaveBeenCalledWith('/tmp/quaid-MOCKED', { recursive: true, force: true });
  });

  it('throws a clear error when git clone fails', () => {
    mkdtempSyncMock.mockReturnValue('/tmp/quaid-MOCKED');
    execSyncMock.mockImplementation(() => {
      throw new Error('git: not found');
    });

    const target = { type: 'github' as const, value: 'owner/repo' };
    expect(() => buildContext(target, DEFAULT_CONFIG, '1.0.0')).toThrow(
      /Failed to clone owner\/repo/,
    );
  });

  it('resolves null config maturity to SANDBOX default', () => {
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const config = { ...DEFAULT_CONFIG, maturity: null };
    const { context: ctx } = buildContext(target, config, '1.0.0');

    expect(Object.values(MaturityLevel)).toContain(ctx.maturity);
  });

  it('emit callback does not throw', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const { context: ctx } = buildContext(target, DEFAULT_CONFIG, '1.0.0');
    expect(() =>
      ctx.emit({ type: 'scan:start', repoPath: '/tmp', depth: ScanDepth.QUICK }),
    ).not.toThrow();
  });
});
