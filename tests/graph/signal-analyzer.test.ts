import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ZeroDBClient } from '../../src/integrations/zerodb-client.js';
import type { GraphNode } from '../../src/graph/types.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn().mockReturnValue('alice@example.com\nbob@example.com\n'),
}));

import {
  getAuthorEmails,
  computeMaintainerOverlap,
  computeFoundationOverlap,
  analyzeSharedSignals,
} from '../../src/graph/signal-analyzer.js';

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

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    repo: 'acme/test-repo',
    primaryLanguage: 'TypeScript',
    pillarScores: {},
    overallScore: 7.0,
    topics: [],
    ecosystems: [],
    lastScannedAt: '2026-05-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('getAuthorEmails', () => {
  it('returns a Set of lowercase emails parsed from git log output', () => {
    const result = getAuthorEmails('/some/path');

    expect(result).toBeInstanceOf(Set);
    expect(result.has('alice@example.com')).toBe(true);
    expect(result.has('bob@example.com')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('returns an empty Set when execSync throws', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementationOnce(() => { throw new Error('not a git repo'); });

    const result = getAuthorEmails('/invalid/path');

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });
});

describe('computeMaintainerOverlap', () => {
  it('returns correct Jaccard similarity for overlapping sets', () => {
    const a = new Set(['alice@example.com', 'bob@example.com', 'carol@example.com']);
    const b = new Set(['bob@example.com', 'carol@example.com', 'dave@example.com']);

    // intersection: {bob, carol} = 2, union: {alice, bob, carol, dave} = 4
    const result = computeMaintainerOverlap(a, b);

    expect(result).toBeCloseTo(2 / 4);
  });

  it('returns 0 for completely disjoint sets', () => {
    const a = new Set(['alice@example.com']);
    const b = new Set(['bob@example.com']);

    const result = computeMaintainerOverlap(a, b);

    expect(result).toBe(0);
  });

  it('returns 0 when both sets are empty', () => {
    const result = computeMaintainerOverlap(new Set(), new Set());

    expect(result).toBe(0);
  });
});

describe('computeFoundationOverlap', () => {
  it('returns 1.0 for nodes with identical ecosystems arrays', () => {
    const nodeA = makeNode({ ecosystems: ['nodejs', 'github-actions'] });
    const nodeB = makeNode({ ecosystems: ['nodejs', 'github-actions'] });

    const result = computeFoundationOverlap(nodeA, nodeB);

    expect(result).toBe(1.0);
  });

  it('returns 0 when both nodes have empty ecosystems arrays', () => {
    const nodeA = makeNode({ ecosystems: [] });
    const nodeB = makeNode({ ecosystems: [] });

    const result = computeFoundationOverlap(nodeA, nodeB);

    expect(result).toBe(0);
  });
});

describe('analyzeSharedSignals', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates bidirectional co_signal edges when maintainer overlap is > 0', async () => {
    // execSync mock is set at module level: alice + bob for all calls
    // so both repos share both emails → Jaccard = 1.0
    const client = makeMockClient();
    const nodeA = makeNode({ repo: 'acme/repo-a' });
    const nodeB = makeNode({ repo: 'acme/repo-b' });

    const edges = await analyzeSharedSignals(nodeA, '/path/a', nodeB, '/path/b', client);

    expect(edges).toHaveLength(2);
    const fromAtoB = edges.find(e => e.fromRepo === 'acme/repo-a' && e.toRepo === 'acme/repo-b');
    const fromBtoA = edges.find(e => e.fromRepo === 'acme/repo-b' && e.toRepo === 'acme/repo-a');
    expect(fromAtoB).toBeDefined();
    expect(fromBtoA).toBeDefined();
    expect(fromAtoB?.edgeType).toBe('co_signal');
    expect(fromBtoA?.edgeType).toBe('co_signal');
    expect(fromAtoB?.weight).toBeGreaterThan(0);
    expect(fromAtoB?.weight).toBe(fromBtoA?.weight);
  });

  it('inserts two rows into the graph_edges table for a non-zero overlap', async () => {
    const client = makeMockClient();
    const nodeA = makeNode({ repo: 'acme/repo-a' });
    const nodeB = makeNode({ repo: 'acme/repo-b' });

    await analyzeSharedSignals(nodeA, '/path/a', nodeB, '/path/b', client);

    expect(client.tableInsert).toHaveBeenCalledTimes(2);
  });

  it('returns empty array when both maintainer and foundation overlap are 0', async () => {
    const { execSync } = await import('node:child_process');
    // repo-a has alice, repo-b has dave — no overlap
    vi.mocked(execSync)
      .mockReturnValueOnce('alice@example.com\n')
      .mockReturnValueOnce('dave@example.com\n');

    const client = makeMockClient();
    const nodeA = makeNode({ repo: 'acme/repo-a', ecosystems: [] });
    const nodeB = makeNode({ repo: 'acme/repo-b', ecosystems: [] });

    const edges = await analyzeSharedSignals(nodeA, '/path/a', nodeB, '/path/b', client);

    expect(edges).toEqual([]);
    expect(client.tableInsert).not.toHaveBeenCalled();
  });

  it('returns empty array without throwing when client.tableCreate throws', async () => {
    const client = makeMockClient({
      tableCreate: vi.fn().mockRejectedValue(new Error('ZeroDB unavailable')),
    });
    const nodeA = makeNode({ repo: 'acme/repo-a' });
    const nodeB = makeNode({ repo: 'acme/repo-b' });

    const edges = await analyzeSharedSignals(nodeA, '/path/a', nodeB, '/path/b', client);

    expect(edges).toEqual([]);
  });
});
