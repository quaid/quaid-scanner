import { describe, it, expect } from 'vitest';
import { scoreRelationship } from '../../src/graph/collaboration-scorer.js';
import type { GraphNode, GraphEdge } from '../../src/graph/types.js';

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    repo: 'org/project',
    primaryLanguage: 'TypeScript',
    pillarScores: {},
    overallScore: 7.0,
    topics: [],
    ecosystems: [],
    lastScannedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEdge(overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    fromRepo: 'org/a',
    toRepo: 'org/b',
    edgeType: 'depends_on',
    weight: 1.0,
    detectedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('scoreRelationship', () => {
  describe('upstream_dependency — depends_on A→B', () => {
    it('classifies as upstream_dependency when a depends_on edge goes from nodeA to nodeB', () => {
      const nodeA = makeNode({ repo: 'org/a' });
      const nodeB = makeNode({ repo: 'org/b' });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'depends_on' })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.spectrum).toBe('upstream_dependency');
    });

    it('returns confidence 1.0 for upstream_dependency', () => {
      const nodeA = makeNode({ repo: 'org/a' });
      const nodeB = makeNode({ repo: 'org/b' });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'depends_on' })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.confidence).toBe(1.0);
    });
  });

  describe('downstream_consumer — depends_on B→A', () => {
    it('classifies as downstream_consumer when a depends_on edge goes from nodeB to nodeA', () => {
      const nodeA = makeNode({ repo: 'org/a' });
      const nodeB = makeNode({ repo: 'org/b' });
      const edges = [makeEdge({ fromRepo: 'org/b', toRepo: 'org/a', edgeType: 'depends_on' })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.spectrum).toBe('downstream_consumer');
    });

    it('returns confidence 1.0 for downstream_consumer', () => {
      const nodeA = makeNode({ repo: 'org/a' });
      const nodeB = makeNode({ repo: 'org/b' });
      const edges = [makeEdge({ fromRepo: 'org/b', toRepo: 'org/a', edgeType: 'depends_on' })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.confidence).toBe(1.0);
    });
  });

  describe('foundation_sibling — co_signal with shared ecosystem', () => {
    it('classifies as foundation_sibling when co_signal edge exists and ecosystems overlap', () => {
      const nodeA = makeNode({ repo: 'org/a', ecosystems: ['nodejs', 'npm'] });
      const nodeB = makeNode({ repo: 'org/b', ecosystems: ['nodejs', 'pypi'] });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'co_signal', weight: 0.8 })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.spectrum).toBe('foundation_sibling');
    });

    it('returns confidence equal to max co_signal weight for foundation_sibling', () => {
      const nodeA = makeNode({ repo: 'org/a', ecosystems: ['nodejs'] });
      const nodeB = makeNode({ repo: 'org/b', ecosystems: ['nodejs'] });
      const edges = [
        makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'co_signal', weight: 0.6 }),
        makeEdge({ fromRepo: 'org/b', toRepo: 'org/a', edgeType: 'co_signal', weight: 0.9 }),
      ];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.confidence).toBe(0.9);
    });
  });

  describe('peer_collaborator — co_signal without shared ecosystem', () => {
    it('classifies as peer_collaborator when co_signal edge exists but no ecosystems overlap', () => {
      const nodeA = makeNode({ repo: 'org/a', ecosystems: ['nodejs'] });
      const nodeB = makeNode({ repo: 'org/b', ecosystems: ['pypi'] });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'co_signal', weight: 0.7 })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.spectrum).toBe('peer_collaborator');
    });

    it('returns confidence equal to max co_signal weight for peer_collaborator via co_signal', () => {
      const nodeA = makeNode({ repo: 'org/a', ecosystems: [] });
      const nodeB = makeNode({ repo: 'org/b', ecosystems: [] });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'co_signal', weight: 0.55 })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.confidence).toBe(0.55);
    });
  });

  describe('direct_rival — no edges, scores within 15%', () => {
    it('classifies as direct_rival when no edges exist and scores are within 15% similarity', () => {
      // similarity = 1 - |7.0 - 8.5| / 10 = 1 - 0.15 = 0.85 (exactly at threshold)
      const nodeA = makeNode({ repo: 'org/a', overallScore: 7.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 8.5 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.spectrum).toBe('direct_rival');
    });

    it('returns confidence equal to similarity score for direct_rival', () => {
      const nodeA = makeNode({ repo: 'org/a', overallScore: 8.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 9.0 });
      // similarity = 1 - |8.0 - 9.0| / 10 = 1 - 0.1 = 0.9

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.confidence).toBe(0.9);
    });
  });

  describe('adjacent_competitor — no edges, scores within 50% but not 85%', () => {
    it('classifies as adjacent_competitor when no edges exist and similarity is >= 0.5 but < 0.85', () => {
      // similarity = 1 - |7.0 - 3.5| / 10 = 1 - 0.35 = 0.65
      const nodeA = makeNode({ repo: 'org/a', overallScore: 7.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 3.5 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.spectrum).toBe('adjacent_competitor');
    });

    it('returns confidence equal to similarity score for adjacent_competitor', () => {
      const nodeA = makeNode({ repo: 'org/a', overallScore: 7.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 3.5 });
      // similarity = 1 - 3.5/10 = 0.65

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.confidence).toBeCloseTo(0.65);
    });
  });

  describe('default peer_collaborator — no edges, very different scores', () => {
    it('classifies as peer_collaborator by default when no edges and scores differ significantly', () => {
      // similarity = 1 - |1.0 - 9.0| / 10 = 1 - 0.8 = 0.2 (< 0.5)
      const nodeA = makeNode({ repo: 'org/a', overallScore: 1.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 9.0 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.spectrum).toBe('peer_collaborator');
    });

    it('returns low confidence (0.1) for default peer_collaborator', () => {
      const nodeA = makeNode({ repo: 'org/a', overallScore: 1.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 9.0 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.confidence).toBe(0.1);
    });
  });

  describe('precedence — depends_on overrides score-based classification', () => {
    it('does not classify as direct_rival when depends_on edge exists even if scores are close', () => {
      // Scores within 15% would normally → direct_rival
      const nodeA = makeNode({ repo: 'org/a', overallScore: 8.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 8.5 });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'depends_on' })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.spectrum).not.toBe('direct_rival');
      expect(result.spectrum).toBe('upstream_dependency');
    });
  });

  describe('rationale', () => {
    it('returns a non-empty rationale string for upstream_dependency', () => {
      const nodeA = makeNode({ repo: 'org/a' });
      const nodeB = makeNode({ repo: 'org/b' });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'depends_on' })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.rationale).toBeTruthy();
      expect(typeof result.rationale).toBe('string');
      expect(result.rationale.length).toBeGreaterThan(0);
    });

    it('returns a non-empty rationale string for downstream_consumer', () => {
      const nodeA = makeNode({ repo: 'org/a' });
      const nodeB = makeNode({ repo: 'org/b' });
      const edges = [makeEdge({ fromRepo: 'org/b', toRepo: 'org/a', edgeType: 'depends_on' })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.rationale).toBeTruthy();
    });

    it('returns a non-empty rationale string for foundation_sibling', () => {
      const nodeA = makeNode({ repo: 'org/a', ecosystems: ['nodejs'] });
      const nodeB = makeNode({ repo: 'org/b', ecosystems: ['nodejs'] });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'co_signal', weight: 0.8 })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.rationale).toBeTruthy();
    });

    it('returns a non-empty rationale string for direct_rival', () => {
      const nodeA = makeNode({ repo: 'org/a', overallScore: 8.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 8.5 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.rationale).toBeTruthy();
    });

    it('returns a non-empty rationale string for adjacent_competitor', () => {
      const nodeA = makeNode({ repo: 'org/a', overallScore: 7.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 3.5 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.rationale).toBeTruthy();
    });

    it('returns a non-empty rationale string for default peer_collaborator', () => {
      const nodeA = makeNode({ repo: 'org/a', overallScore: 1.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 9.0 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.rationale).toBeTruthy();
    });
  });

  describe('confidence bounds', () => {
    it('confidence is between 0 and 1 for upstream_dependency', () => {
      const nodeA = makeNode({ repo: 'org/a' });
      const nodeB = makeNode({ repo: 'org/b' });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'depends_on' })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('confidence is between 0 and 1 for foundation_sibling', () => {
      const nodeA = makeNode({ repo: 'org/a', ecosystems: ['nodejs'] });
      const nodeB = makeNode({ repo: 'org/b', ecosystems: ['nodejs'] });
      const edges = [makeEdge({ fromRepo: 'org/a', toRepo: 'org/b', edgeType: 'co_signal', weight: 0.75 })];

      const result = scoreRelationship(nodeA, nodeB, edges);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('confidence is between 0 and 1 for direct_rival', () => {
      const nodeA = makeNode({ repo: 'org/a', overallScore: 7.5 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 8.0 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('confidence is between 0 and 1 for default peer_collaborator', () => {
      const nodeA = makeNode({ repo: 'org/a', overallScore: 1.0 });
      const nodeB = makeNode({ repo: 'org/b', overallScore: 9.0 });

      const result = scoreRelationship(nodeA, nodeB, []);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
