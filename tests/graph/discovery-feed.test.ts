import { describe, it, expect } from 'vitest';
import { buildDiscoveryFeed } from '../../src/graph/discovery-feed.js';
import type { GraphNode, GraphEdge } from '../../src/graph/types.js';

function makeNode(repo: string, overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    repo,
    primaryLanguage: 'TypeScript',
    pillarScores: {},
    overallScore: 7.0,
    topics: [],
    ecosystems: [],
    lastScannedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEdge(
  from: string,
  to: string,
  type: 'depends_on' | 'co_signal' = 'depends_on',
  weight = 1.0,
): GraphEdge {
  return {
    fromRepo: from,
    toRepo: to,
    edgeType: type,
    weight,
    detectedAt: new Date().toISOString(),
  };
}

describe('buildDiscoveryFeed', () => {
  // ── collaborate ──────────────────────────────────────────────────────────

  describe('collaborate — peer_collaborator spectrum', () => {
    it('includes repos classified as peer_collaborator in the collaborate list', () => {
      // co_signal edge with no shared ecosystem → peer_collaborator
      const root = makeNode('org/root', { ecosystems: ['nodejs'] });
      const peer = makeNode('org/peer', { ecosystems: ['pypi'] });
      const nodes = [root, peer];
      const edges = [makeEdge('org/root', 'org/peer', 'co_signal', 0.7)];

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.collaborate).toContain('org/peer');
    });
  });

  describe('collaborate — foundation_sibling spectrum', () => {
    it('includes repos classified as foundation_sibling in the collaborate list', () => {
      // co_signal + shared ecosystem → foundation_sibling
      const root = makeNode('org/root', { ecosystems: ['nodejs'] });
      const sibling = makeNode('org/sibling', { ecosystems: ['nodejs'] });
      const nodes = [root, sibling];
      const edges = [makeEdge('org/root', 'org/sibling', 'co_signal', 0.8)];

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.collaborate).toContain('org/sibling');
    });
  });

  describe('collaborate — sorted by confidence descending', () => {
    it('returns collaborate repos sorted by confidence descending', () => {
      const root = makeNode('org/root', { ecosystems: [] });
      // peer A: co_signal weight 0.9 → confidence 0.9
      const peerA = makeNode('org/peer-a', { ecosystems: [] });
      // peer B: co_signal weight 0.5 → confidence 0.5
      const peerB = makeNode('org/peer-b', { ecosystems: [] });
      // peer C: co_signal weight 0.7 → confidence 0.7
      const peerC = makeNode('org/peer-c', { ecosystems: [] });
      const nodes = [root, peerA, peerB, peerC];
      const edges = [
        makeEdge('org/root', 'org/peer-a', 'co_signal', 0.9),
        makeEdge('org/root', 'org/peer-b', 'co_signal', 0.5),
        makeEdge('org/root', 'org/peer-c', 'co_signal', 0.7),
      ];

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.collaborate[0]).toBe('org/peer-a');
      expect(feed.collaborate[1]).toBe('org/peer-c');
      expect(feed.collaborate[2]).toBe('org/peer-b');
    });
  });

  describe('collaborate — excludes root repo', () => {
    it('does not include root repo in the collaborate list', () => {
      const root = makeNode('org/root', { ecosystems: ['nodejs'] });
      const peer = makeNode('org/peer', { ecosystems: ['nodejs'] });
      const nodes = [root, peer];
      const edges = [makeEdge('org/root', 'org/peer', 'co_signal', 0.8)];

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.collaborate).not.toContain('org/root');
    });
  });

  // ── depend_on ─────────────────────────────────────────────────────────────

  describe('depend_on — upstream repos not yet a direct dependency', () => {
    it('includes upstream repos that root does not already depend on, sorted by consumer count', () => {
      const root = makeNode('org/root');
      const upstream = makeNode('org/upstream');
      // three nodes that all depend on upstream — making it popular
      const consumer1 = makeNode('org/consumer1');
      const consumer2 = makeNode('org/consumer2');
      const consumer3 = makeNode('org/consumer3');
      const nodes = [root, upstream, consumer1, consumer2, consumer3];
      const edges = [
        // root does NOT depend on upstream
        makeEdge('org/consumer1', 'org/upstream', 'depends_on'),
        makeEdge('org/consumer2', 'org/upstream', 'depends_on'),
        makeEdge('org/consumer3', 'org/upstream', 'depends_on'),
      ];

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.depend_on).toContain('org/upstream');
    });

    it('sorts depend_on repos by consumer count descending', () => {
      const root = makeNode('org/root');
      const upstreamA = makeNode('org/upstream-a'); // 3 consumers
      const upstreamB = makeNode('org/upstream-b'); // 1 consumer
      const consumer1 = makeNode('org/c1');
      const consumer2 = makeNode('org/c2');
      const consumer3 = makeNode('org/c3');
      const nodes = [root, upstreamA, upstreamB, consumer1, consumer2, consumer3];
      const edges = [
        makeEdge('org/c1', 'org/upstream-a', 'depends_on'),
        makeEdge('org/c2', 'org/upstream-a', 'depends_on'),
        makeEdge('org/c3', 'org/upstream-a', 'depends_on'),
        makeEdge('org/c1', 'org/upstream-b', 'depends_on'),
      ];

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.depend_on[0]).toBe('org/upstream-a');
      expect(feed.depend_on[1]).toBe('org/upstream-b');
    });
  });

  describe('depend_on — excludes repos root already depends on', () => {
    it('does not include a repo root already has a depends_on edge to', () => {
      const root = makeNode('org/root');
      const alreadyDep = makeNode('org/already-dep');
      const other = makeNode('org/other');
      const nodes = [root, alreadyDep, other];
      const edges = [
        // root already depends on alreadyDep
        makeEdge('org/root', 'org/already-dep', 'depends_on'),
        // other nodes also consume alreadyDep
        makeEdge('org/other', 'org/already-dep', 'depends_on'),
      ];

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.depend_on).not.toContain('org/already-dep');
    });
  });

  // ── watch ─────────────────────────────────────────────────────────────────

  describe('watch — adjacent_competitor spectrum', () => {
    it('includes repos classified as adjacent_competitor in the watch list', () => {
      // similarity ≥ 0.5 and < 0.85 → adjacent_competitor; no edges
      // similarity = 1 - |7.0 - 3.5| / 10 = 0.65
      const root = makeNode('org/root', { overallScore: 7.0 });
      const competitor = makeNode('org/competitor', { overallScore: 3.5 });
      const nodes = [root, competitor];

      const feed = buildDiscoveryFeed('org/root', nodes, []);

      expect(feed.watch).toContain('org/competitor');
    });
  });

  describe('watch — direct_rival spectrum', () => {
    it('includes repos classified as direct_rival in the watch list', () => {
      // similarity ≥ 0.85 → direct_rival; no edges
      // similarity = 1 - |7.0 - 8.5| / 10 = 0.85
      const root = makeNode('org/root', { overallScore: 7.0 });
      const rival = makeNode('org/rival', { overallScore: 8.5 });
      const nodes = [root, rival];

      const feed = buildDiscoveryFeed('org/root', nodes, []);

      expect(feed.watch).toContain('org/rival');
    });
  });

  describe('watch — sorted by confidence descending', () => {
    it('returns watch repos sorted by confidence descending', () => {
      const root = makeNode('org/root', { overallScore: 7.0 });
      // rivalA: similarity = 1 - |7.0 - 7.5| / 10 = 0.95
      const rivalA = makeNode('org/rival-a', { overallScore: 7.5 });
      // rivalB: similarity = 1 - |7.0 - 7.2| / 10 = 0.98
      const rivalB = makeNode('org/rival-b', { overallScore: 7.2 });
      const nodes = [root, rivalA, rivalB];

      const feed = buildDiscoveryFeed('org/root', nodes, []);

      const idxA = feed.watch.indexOf('org/rival-a');
      const idxB = feed.watch.indexOf('org/rival-b');
      expect(idxB).toBeLessThan(idxA);
    });
  });

  // ── join ──────────────────────────────────────────────────────────────────

  describe('join — ecosystems from adjacent nodes absent from root', () => {
    it('includes ecosystem names present in adjacent nodes but absent from root', () => {
      const root = makeNode('org/root', { ecosystems: ['nodejs'] });
      const other = makeNode('org/other', { ecosystems: ['cncf', 'openssf'] });
      const nodes = [root, other];

      const feed = buildDiscoveryFeed('org/root', nodes, []);

      expect(feed.join).toContain('cncf');
      expect(feed.join).toContain('openssf');
    });
  });

  describe('join — excludes ecosystems already in root node', () => {
    it('does not include ecosystems already present in root node', () => {
      const root = makeNode('org/root', { ecosystems: ['nodejs', 'npm'] });
      const other = makeNode('org/other', { ecosystems: ['nodejs', 'cncf'] });
      const nodes = [root, other];

      const feed = buildDiscoveryFeed('org/root', nodes, []);

      expect(feed.join).not.toContain('nodejs');
      expect(feed.join).not.toContain('npm');
      expect(feed.join).toContain('cncf');
    });
  });

  // ── cap at 10 ─────────────────────────────────────────────────────────────

  describe('all lists capped at 10 items', () => {
    it('caps collaborate at 10 items when more than 10 candidates exist', () => {
      const root = makeNode('org/root', { ecosystems: [] });
      // 12 peer collaborator candidates (all co_signal, no shared ecosystem)
      const peers = Array.from({ length: 12 }, (_, i) =>
        makeNode(`org/peer-${i}`, { ecosystems: [`eco-${i}`] }),
      );
      const nodes = [root, ...peers];
      const edges = peers.map((p, i) =>
        makeEdge('org/root', p.repo, 'co_signal', 0.5 + i * 0.01),
      );

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.collaborate.length).toBeLessThanOrEqual(10);
    });

    it('caps depend_on at 10 items when more than 10 candidates exist', () => {
      const root = makeNode('org/root');
      const upstreams = Array.from({ length: 12 }, (_, i) =>
        makeNode(`org/upstream-${i}`),
      );
      const consumer = makeNode('org/consumer');
      const nodes = [root, consumer, ...upstreams];
      // consumer depends on all 12 upstreams (so they are known in graph)
      const edges = upstreams.map((u) => makeEdge('org/consumer', u.repo, 'depends_on'));

      const feed = buildDiscoveryFeed('org/root', nodes, edges);

      expect(feed.depend_on.length).toBeLessThanOrEqual(10);
    });

    it('caps watch at 10 items when more than 10 candidates exist', () => {
      const root = makeNode('org/root', { overallScore: 7.0 });
      // 12 direct rivals (scores within 15%)
      const rivals = Array.from({ length: 12 }, (_, i) =>
        makeNode(`org/rival-${i}`, { overallScore: 7.0 + i * 0.1 }),
      );
      const nodes = [root, ...rivals];

      const feed = buildDiscoveryFeed('org/root', nodes, []);

      expect(feed.watch.length).toBeLessThanOrEqual(10);
    });

    it('caps join at 10 items when more than 10 unique ecosystems exist in adjacent nodes', () => {
      const root = makeNode('org/root', { ecosystems: [] });
      // 12 nodes, each carrying a unique ecosystem root doesn't have
      const others = Array.from({ length: 12 }, (_, i) =>
        makeNode(`org/other-${i}`, { ecosystems: [`eco-${i}`] }),
      );
      const nodes = [root, ...others];

      const feed = buildDiscoveryFeed('org/root', nodes, []);

      expect(feed.join.length).toBeLessThanOrEqual(10);
    });
  });

  // ── edge cases ────────────────────────────────────────────────────────────

  describe('returns all-empty feed when root repo not in nodes array', () => {
    it('returns empty collaborate when root is absent from nodes', () => {
      const other = makeNode('org/other');
      const feed = buildDiscoveryFeed('org/root', [other], []);
      expect(feed.collaborate).toEqual([]);
    });

    it('returns empty depend_on when root is absent from nodes', () => {
      const other = makeNode('org/other');
      const feed = buildDiscoveryFeed('org/root', [other], []);
      expect(feed.depend_on).toEqual([]);
    });

    it('returns empty watch when root is absent from nodes', () => {
      const other = makeNode('org/other');
      const feed = buildDiscoveryFeed('org/root', [other], []);
      expect(feed.watch).toEqual([]);
    });

    it('returns empty join when root is absent from nodes', () => {
      const other = makeNode('org/other');
      const feed = buildDiscoveryFeed('org/root', [other], []);
      expect(feed.join).toEqual([]);
    });
  });

  describe('returns all-empty lists when no edges or relevant nodes', () => {
    it('returns empty collaborate when nodes array contains only root', () => {
      const root = makeNode('org/root');
      const feed = buildDiscoveryFeed('org/root', [root], []);
      expect(feed.collaborate).toEqual([]);
    });

    it('returns empty depend_on when nodes array contains only root', () => {
      const root = makeNode('org/root');
      const feed = buildDiscoveryFeed('org/root', [root], []);
      expect(feed.depend_on).toEqual([]);
    });

    it('returns empty watch when nodes array contains only root with distinct score', () => {
      // overallScore 0.0 → similarity to itself would be 1.0 but only one node exists
      const root = makeNode('org/root', { overallScore: 0.0 });
      const feed = buildDiscoveryFeed('org/root', [root], []);
      expect(feed.watch).toEqual([]);
    });

    it('returns empty join when no adjacent nodes carry any ecosystems', () => {
      const root = makeNode('org/root', { ecosystems: [] });
      const other = makeNode('org/other', { ecosystems: [] });
      const feed = buildDiscoveryFeed('org/root', [root, other], []);
      expect(feed.join).toEqual([]);
    });
  });
});
