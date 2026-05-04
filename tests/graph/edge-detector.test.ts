import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractDependencyNames, detectDependencyEdges } from '../../src/graph/edge-detector.js';
import type { ZeroDBClient } from '../../src/integrations/zerodb-client.js';

function makeMockClient(overrides = {}): ZeroDBClient {
  return {
    tableCreate: vi.fn().mockResolvedValue(undefined),
    tableInsert: vi.fn().mockResolvedValue({ row_id: 'r1' }),
    tableQuery: vi.fn().mockResolvedValue([]),
    vectorUpsert: vi.fn().mockResolvedValue(undefined),
    vectorSearch: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as ZeroDBClient;
}

/** Create a temp directory with the given files written to it. */
function makeRepoDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'edge-detector-test-'));
  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(join(dir, filename), content, 'utf8');
  }
  return dir;
}

describe('extractDependencyNames', () => {
  it('returns dependency names from package.json dependencies and devDependencies', () => {
    const dir = makeRepoDir({
      'package.json': JSON.stringify({
        name: 'my-app',
        dependencies: {
          'express': '^4.18.2',
          '@scope/pkg': '^1.0.0',
        },
        devDependencies: {
          'vitest': '^2.0.0',
        },
      }),
    });

    const names = extractDependencyNames(dir);

    expect(names).toContain('express');
    expect(names).toContain('vitest');
    // scoped package: both scoped form and bare name
    expect(names).toContain('@scope/pkg');
    expect(names).toContain('pkg');
  });

  it('returns package names from requirements.txt stripping version specifiers', () => {
    const dir = makeRepoDir({
      'requirements.txt': [
        '# a comment line',
        '',
        'requests>=2.28.0',
        'Flask==2.3.1',
        'numpy',
        'scipy<=1.11',
      ].join('\n'),
    });

    const names = extractDependencyNames(dir);

    expect(names).toContain('requests');
    expect(names).toContain('flask');
    expect(names).toContain('numpy');
    expect(names).toContain('scipy');
    // comment lines and blank lines must not appear
    expect(names).not.toContain('');
    expect(names).not.toContain('#');
  });

  it('returns module paths from go.mod require block', () => {
    const dir = makeRepoDir({
      'go.mod': [
        'module github.com/myorg/myapp',
        '',
        'go 1.21',
        '',
        'require (',
        '\tgithub.com/owner/repo v1.2.3',
        '\tgolang.org/x/net v0.0.0-20230101',
        ')',
      ].join('\n'),
    });

    const names = extractDependencyNames(dir);

    expect(names).toContain('github.com/owner/repo');
    expect(names).toContain('golang.org/x/net');
  });

  it('returns empty array when no manifests are present', () => {
    const dir = makeRepoDir({});

    const names = extractDependencyNames(dir);

    expect(names).toEqual([]);
  });
});

describe('detectDependencyEdges', () => {
  it('calls tableCreate exactly once to ensure the graph_edges table exists', async () => {
    const dir = makeRepoDir({});
    const client = makeMockClient();

    await detectDependencyEdges('acme/app', dir, client);

    expect(client.tableCreate).toHaveBeenCalledTimes(1);
    expect(client.tableCreate).toHaveBeenCalledWith(
      'graph_edges',
      expect.arrayContaining([
        expect.objectContaining({ name: 'id' }),
        expect.objectContaining({ name: 'from_repo' }),
        expect.objectContaining({ name: 'to_repo' }),
        expect.objectContaining({ name: 'edge_type' }),
        expect.objectContaining({ name: 'weight' }),
        expect.objectContaining({ name: 'detected_at' }),
      ]),
      ['id'],
    );
  });

  it('queries graph_nodes for all known repos', async () => {
    const dir = makeRepoDir({});
    const client = makeMockClient();

    await detectDependencyEdges('acme/app', dir, client);

    expect(client.tableQuery).toHaveBeenCalledWith('graph_nodes', {});
  });

  it('inserts a depends_on edge with weight 1.0 for deps matching a graph node', async () => {
    const dir = makeRepoDir({
      'package.json': JSON.stringify({
        dependencies: { 'known-lib': '^1.0.0' },
      }),
    });
    const client = makeMockClient({
      tableQuery: vi.fn().mockResolvedValue([
        { row_data: { repo: 'known-lib' } },
      ]),
    });

    const edges = await detectDependencyEdges('acme/app', dir, client);

    const matchEdge = edges.find(
      (e) => e.toRepo === 'known-lib' && e.edgeType === 'depends_on',
    );
    expect(matchEdge).toBeDefined();
    expect(matchEdge?.weight).toBe(1.0);
    expect(matchEdge?.fromRepo).toBe('acme/app');

    expect(client.tableInsert).toHaveBeenCalledWith(
      'graph_edges',
      expect.objectContaining({
        from_repo: 'acme/app',
        to_repo: 'known-lib',
        edge_type: 'depends_on',
        weight: 1.0,
      }),
    );
  });

  it('inserts a stub edge with weight 0.0 for deps not in the graph_nodes set', async () => {
    const dir = makeRepoDir({
      'package.json': JSON.stringify({
        dependencies: { 'unknown-lib': '^2.0.0' },
      }),
    });
    // tableQuery returns empty — no known nodes
    const client = makeMockClient();

    const edges = await detectDependencyEdges('acme/app', dir, client);

    const stubEdge = edges.find(
      (e) => e.toRepo === 'unknown-lib' && e.edgeType === 'depends_on',
    );
    expect(stubEdge).toBeDefined();
    expect(stubEdge?.weight).toBe(0.0);

    expect(client.tableInsert).toHaveBeenCalledWith(
      'graph_edges',
      expect.objectContaining({
        from_repo: 'acme/app',
        to_repo: 'unknown-lib',
        edge_type: 'depends_on',
        weight: 0.0,
      }),
    );
  });

  it('returns empty array without throwing when the client throws', async () => {
    const dir = makeRepoDir({
      'package.json': JSON.stringify({ dependencies: { 'somelib': '^1.0.0' } }),
    });
    const client = makeMockClient({
      tableCreate: vi.fn().mockRejectedValue(new Error('ZeroDB unavailable')),
    });

    const result = await detectDependencyEdges('acme/app', dir, client);

    expect(result).toEqual([]);
  });

  it('returns empty array when there are no dependencies to process', async () => {
    const dir = makeRepoDir({});
    const client = makeMockClient();

    const edges = await detectDependencyEdges('acme/app', dir, client);

    expect(edges).toEqual([]);
    expect(client.tableInsert).not.toHaveBeenCalled();
  });
});
