import { describe, it, expect } from 'vitest';
import { readGitInfo, buildContext } from '../src/context-builder.js';
import { DEFAULT_CONFIG } from '../src/config.js';
import { MaturityLevel, ScanDepth } from '../src/types/index.js';

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

describe('buildContext', () => {
  it('builds a valid ScanContext from a local target', () => {
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const config = { ...DEFAULT_CONFIG, depth: ScanDepth.QUICK };
    const ctx = buildContext(target, config, '1.0.0');

    expect(ctx.repoPath).toBe('/tmp/test-repo');
    expect(ctx.repoIdentifier).toBeNull();
    expect(ctx.depth).toBe(ScanDepth.QUICK);
    expect(ctx.maturity).toBeDefined();
    expect(ctx.config).toBe(config);
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
    expect(typeof ctx.emit).toBe('function');
  });

  it('builds a valid ScanContext from a github target', () => {
    const target = { type: 'github' as const, value: 'owner/repo' };
    const config = { ...DEFAULT_CONFIG };
    const ctx = buildContext(target, config, '1.0.0');

    expect(ctx.repoPath).toBe('');
    expect(ctx.repoIdentifier).toBe('owner/repo');
    expect(ctx.maturity).toBeDefined();
  });

  it('resolves null config maturity to SANDBOX default', () => {
    const target = { type: 'local' as const, value: '/tmp/test-repo' };
    const config = { ...DEFAULT_CONFIG, maturity: null };
    const ctx = buildContext(target, config, '1.0.0');

    expect(Object.values(MaturityLevel)).toContain(ctx.maturity);
  });

  it('emit callback does not throw', () => {
    const target = { type: 'local' as const, value: '/tmp' };
    const ctx = buildContext(target, DEFAULT_CONFIG, '1.0.0');
    expect(() =>
      ctx.emit({ type: 'scan:start', repoPath: '/tmp', depth: ScanDepth.QUICK }),
    ).not.toThrow();
  });
});
