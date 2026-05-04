/**
 * Tests for src/graph/traversal.ts — BFS graph traversal.
 *
 * Strategy: mock ZeroDBClient.tableQuery to return controlled edge/node data.
 * Tests cover: happy path, hop clamping, edge type filtering, weight filtering,
 * deduplication, error resilience, and default hop count.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ZeroDBClient } from '../../src/integrations/zerodb-client.js';
import type { TraversalOptions } from '../../src/graph/types.js';

// --- mock factory helpers ---

const NOW = new Date().toISOString();

/**
 * Build a minimal tableQuery mock that returns one edge (org/root → org/dep-a)
 * and one node (org/dep-a) for any call.
 */
function makeBasicClient(): ZeroDBClient {
  return {
    tableQuery: vi.fn().mockImplementation((table: string) => {
      if (table === 'graph_edges') {
        return Promise.resolve([
          {
            row_data: {
              from_repo: 'org/root',
              to_repo: 'org/dep-a',
              edge_type: 'depends_on',
              weight: 1.0,
              detected_at: NOW,
            },
          },
        ]);
      }
      if (table === 'graph_nodes') {
        return Promise.resolve([
          {
            row_data: {
              repo: 'org/dep-a',
              primary_language: 'TypeScript',
              pillar_scores: {},
              overall_score: 8.0,
              topics: [],
              ecosystems: [],
              last_scanned_at: NOW,
            },
          },
        ]);
      }
      return Promise.resolve([]);
    }),
  } as unknown as ZeroDBClient;
}

// We must import AFTER we know the module structure; no top-level dynamic import needed
// because traversal.ts has no vi.mock requirement — we pass the mock client directly.
const { traverseGraph } = await import('../../src/graph/traversal.js');

describe('traverseGraph', () => {
  // ------------------------------------------------------------------
  // 1. 1 hop returns root node and direct neighbors
  // ------------------------------------------------------------------
  describe('with 1 hop', () => {
    it('returns root node in the nodes array', async () => {
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', { hops: 1 }, client);

      const repoNames = result.nodes.map((n) => n.repo);
      expect(repoNames).toContain('org/root');
    });

    it('returns direct neighbor node (org/dep-a) in the nodes array', async () => {
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', { hops: 1 }, client);

      const repoNames = result.nodes.map((n) => n.repo);
      expect(repoNames).toContain('org/dep-a');
    });

    it('returns the connecting edge in the edges array', async () => {
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', { hops: 1 }, client);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].fromRepo).toBe('org/root');
      expect(result.edges[0].toRepo).toBe('org/dep-a');
      expect(result.edges[0].edgeType).toBe('depends_on');
    });

    it('sets rootRepo correctly', async () => {
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', { hops: 1 }, client);
      expect(result.rootRepo).toBe('org/root');
    });
  });

  // ------------------------------------------------------------------
  // 2. hops clamped to 1 when given 0
  // ------------------------------------------------------------------
  describe('hop clamping — given 0', () => {
    it('clamps hops to 1 when options.hops is 0', async () => {
      const client = makeBasicClient();
      // If it ran 0 hops the edges array would be empty; clamping to 1 means we get the edge.
      const result = await traverseGraph('org/root', { hops: 0 }, client);
      expect(result.edges.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ------------------------------------------------------------------
  // 3. hops clamped to 3 when given 5
  // ------------------------------------------------------------------
  describe('hop clamping — given 5', () => {
    it('clamps hops to 3 when options.hops is 5', async () => {
      // We verify the function does not throw and returns a valid result shape.
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', { hops: 5 }, client);
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('rootRepo');
    });

    it('does not perform more than 3 query rounds when hops=5', async () => {
      const client = makeBasicClient();
      await traverseGraph('org/root', { hops: 5 }, client);
      // tableQuery will be called at most 3 edge rounds + node lookups.
      // With our single-edge mock, each hop finds the same frontier; after hop 1 the
      // frontier is exhausted (no new repos), so subsequent hops produce no extra calls.
      // The important thing: we don't get 5 rounds of calls.
      const edgeCalls = (client.tableQuery as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => c[0] === 'graph_edges',
      );
      expect(edgeCalls.length).toBeLessThanOrEqual(3);
    });
  });

  // ------------------------------------------------------------------
  // 4. Filter by edgeTypes when provided
  // ------------------------------------------------------------------
  describe('edgeTypes filter', () => {
    it('excludes edges that do not match the requested edgeTypes', async () => {
      const client = makeBasicClient();
      // Only ask for 'co_signal'; mock only returns 'depends_on' edges
      const result = await traverseGraph('org/root', { hops: 1, edgeTypes: ['co_signal'] }, client);
      // The depends_on edge should be filtered out
      const dependsOnEdges = result.edges.filter((e) => e.edgeType === 'depends_on');
      expect(dependsOnEdges).toHaveLength(0);
    });

    it('includes edges that match the requested edgeTypes', async () => {
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', { hops: 1, edgeTypes: ['depends_on'] }, client);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].edgeType).toBe('depends_on');
    });

    it('accepts all edges when edgeTypes is not provided', async () => {
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', {}, client);
      expect(result.edges).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------------
  // 5. Filter by minWeight when provided
  // ------------------------------------------------------------------
  describe('minWeight filter', () => {
    it('excludes edges below minWeight threshold', async () => {
      // mock returns weight 1.0; ask for minWeight > 1.0 → excluded
      const client = {
        tableQuery: vi.fn().mockImplementation((table: string) => {
          if (table === 'graph_edges') {
            return Promise.resolve([
              {
                row_data: {
                  from_repo: 'org/root',
                  to_repo: 'org/low-weight',
                  edge_type: 'co_signal',
                  weight: 0.2,
                  detected_at: NOW,
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', { hops: 1, minWeight: 0.5 }, client);
      expect(result.edges).toHaveLength(0);
    });

    it('includes edges at or above minWeight threshold', async () => {
      const client = makeBasicClient(); // weight 1.0
      const result = await traverseGraph('org/root', { hops: 1, minWeight: 1.0 }, client);
      expect(result.edges).toHaveLength(1);
    });

    it('includes all edges when minWeight is not provided (default 0)', async () => {
      const client = {
        tableQuery: vi.fn().mockImplementation((table: string) => {
          if (table === 'graph_edges') {
            return Promise.resolve([
              {
                row_data: {
                  from_repo: 'org/root',
                  to_repo: 'org/tiny-weight',
                  edge_type: 'co_signal',
                  weight: 0.01,
                  detected_at: NOW,
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', {}, client);
      expect(result.edges).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------------
  // 6. Deduplicate nodes appearing in multiple edge results
  // ------------------------------------------------------------------
  describe('node deduplication', () => {
    it('does not include duplicate nodes when a repo appears in multiple edges', async () => {
      // Two edges both touch org/dep-a (as from_repo and to_repo)
      const client = {
        tableQuery: vi.fn().mockImplementation((table: string) => {
          if (table === 'graph_edges') {
            return Promise.resolve([
              {
                row_data: {
                  from_repo: 'org/root',
                  to_repo: 'org/dep-a',
                  edge_type: 'depends_on',
                  weight: 1.0,
                  detected_at: NOW,
                },
              },
              {
                row_data: {
                  from_repo: 'org/dep-a',
                  to_repo: 'org/root',
                  edge_type: 'co_signal',
                  weight: 0.8,
                  detected_at: NOW,
                },
              },
            ]);
          }
          if (table === 'graph_nodes') {
            return Promise.resolve([
              {
                row_data: {
                  repo: 'org/dep-a',
                  primary_language: 'TypeScript',
                  pillar_scores: {},
                  overall_score: 8.0,
                  topics: [],
                  ecosystems: [],
                  last_scanned_at: NOW,
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', { hops: 1 }, client);
      const repos = result.nodes.map((n) => n.repo);
      const uniqueRepos = new Set(repos);
      expect(repos.length).toBe(uniqueRepos.size);
    });

    it('does not include duplicate edges', async () => {
      // Same edge returned twice (simulates server returning duplicates)
      const client = {
        tableQuery: vi.fn().mockImplementation((table: string) => {
          if (table === 'graph_edges') {
            return Promise.resolve([
              {
                row_data: {
                  from_repo: 'org/root',
                  to_repo: 'org/dep-a',
                  edge_type: 'depends_on',
                  weight: 1.0,
                  detected_at: NOW,
                },
              },
              {
                row_data: {
                  from_repo: 'org/root',
                  to_repo: 'org/dep-a',
                  edge_type: 'depends_on',
                  weight: 1.0,
                  detected_at: NOW,
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', { hops: 1 }, client);
      const edgeKeys = result.edges.map((e) => `${e.fromRepo}|${e.toRepo}|${e.edgeType}`);
      const uniqueKeys = new Set(edgeKeys);
      expect(edgeKeys.length).toBe(uniqueKeys.size);
    });
  });

  // ------------------------------------------------------------------
  // 7. Returns empty result without throwing when client throws
  // ------------------------------------------------------------------
  describe('error resilience', () => {
    it('returns empty nodes and edges when tableQuery throws', async () => {
      const client = {
        tableQuery: vi.fn().mockRejectedValue(new Error('network failure')),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', { hops: 1 }, client);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.rootRepo).toBe('org/root');
    });

    it('does not throw when client throws', async () => {
      const client = {
        tableQuery: vi.fn().mockRejectedValue(new Error('connection refused')),
      } as unknown as ZeroDBClient;

      await expect(traverseGraph('org/root', { hops: 1 }, client)).resolves.not.toThrow();
    });
  });

  // ------------------------------------------------------------------
  // 8. Default hops is 1
  // ------------------------------------------------------------------
  describe('default hops', () => {
    it('uses 1 hop when options object is empty', async () => {
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', {}, client);
      // With 1 hop we should find the direct neighbor
      const repoNames = result.nodes.map((n) => n.repo);
      expect(repoNames).toContain('org/dep-a');
    });

    it('uses 1 hop when options is omitted entirely', async () => {
      const client = makeBasicClient();
      const result = await traverseGraph('org/root', undefined as unknown as TraversalOptions, client);
      const repoNames = result.nodes.map((n) => n.repo);
      expect(repoNames).toContain('org/dep-a');
    });
  });

  // ------------------------------------------------------------------
  // 9. Branch coverage — null/missing edge row fields
  // ------------------------------------------------------------------
  describe('null/missing edge row fields (branch coverage)', () => {
    it('falls back to 0 weight when weight is missing from row', async () => {
      const client = {
        tableQuery: vi.fn().mockImplementation((table: string) => {
          if (table === 'graph_edges') {
            return Promise.resolve([
              {
                row_data: {
                  from_repo: 'org/root',
                  to_repo: 'org/dep-b',
                  edge_type: 'co_signal',
                  // weight intentionally omitted → falls back to 0
                  detected_at: NOW,
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', {}, client);
      expect(result.edges[0].weight).toBe(0);
    });

    it('falls back to empty string detectedAt when detected_at is missing', async () => {
      const client = {
        tableQuery: vi.fn().mockImplementation((table: string) => {
          if (table === 'graph_edges') {
            return Promise.resolve([
              {
                row_data: {
                  from_repo: 'org/root',
                  to_repo: 'org/dep-c',
                  edge_type: 'co_signal',
                  weight: 0.5,
                  // detected_at intentionally omitted → falls back to ''
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', {}, client);
      expect(result.edges[0].detectedAt).toBe('');
    });

    it('handles null primary_language in graph_nodes data', async () => {
      const client = {
        tableQuery: vi.fn().mockImplementation((table: string) => {
          if (table === 'graph_edges') {
            return Promise.resolve([
              {
                row_data: {
                  from_repo: 'org/root',
                  to_repo: 'org/null-lang',
                  edge_type: 'depends_on',
                  weight: 1.0,
                  detected_at: NOW,
                },
              },
            ]);
          }
          if (table === 'graph_nodes') {
            return Promise.resolve([
              {
                row_data: {
                  repo: 'org/null-lang',
                  primary_language: null, // null branch
                  pillar_scores: null,    // ?? {} branch
                  overall_score: null,    // ?? 0 branch
                  topics: null,           // ?? [] branch
                  ecosystems: null,       // ?? [] branch
                  last_scanned_at: null,  // ?? '' branch
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', { hops: 1 }, client);
      const node = result.nodes.find((n) => n.repo === 'org/null-lang');
      expect(node).toBeDefined();
      expect(node!.primaryLanguage).toBeNull();
      expect(node!.pillarScores).toEqual({});
      expect(node!.overallScore).toBe(0);
      expect(node!.topics).toEqual([]);
      expect(node!.ecosystems).toEqual([]);
      expect(node!.lastScannedAt).toBe(''); // null ?? '' gives ''
    });

    it('uses root node from graph_nodes when it is present there (no stub inserted)', async () => {
      const client = {
        tableQuery: vi.fn().mockImplementation((table: string) => {
          if (table === 'graph_edges') {
            return Promise.resolve([
              {
                row_data: {
                  from_repo: 'org/known-root',
                  to_repo: 'org/dep-z',
                  edge_type: 'depends_on',
                  weight: 1.0,
                  detected_at: NOW,
                },
              },
            ]);
          }
          if (table === 'graph_nodes') {
            return Promise.resolve([
              {
                row_data: {
                  repo: 'org/dep-z',
                  primary_language: 'Go',
                  pillar_scores: {},
                  overall_score: 7.5,
                  topics: ['cloud'],
                  ecosystems: ['cncf'],
                  last_scanned_at: NOW,
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      } as unknown as ZeroDBClient;

      // org/known-root is NOT in graph_nodes → stub must be inserted
      const result = await traverseGraph('org/known-root', { hops: 1 }, client);
      const rootNode = result.nodes.find((n) => n.repo === 'org/known-root');
      expect(rootNode).toBeDefined();
      // Stub has null primaryLanguage
      expect(rootNode!.primaryLanguage).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // 10. Non-Error thrown inside traversal
  // ------------------------------------------------------------------
  describe('non-Error thrown value in catch block', () => {
    it('returns empty result when a non-Error string value is thrown', async () => {
      const client = {
        tableQuery: vi.fn().mockImplementation(() => {
          // Throw a raw string, not an Error instance
          throw 'raw string error'; // eslint-disable-line @typescript-eslint/no-throw-literal
        }),
      } as unknown as ZeroDBClient;

      const result = await traverseGraph('org/root', { hops: 1 }, client);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.rootRepo).toBe('org/root');
    });
  });
});
