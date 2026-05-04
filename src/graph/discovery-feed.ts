/**
 * Pure ranking function that builds a 4-category discovery feed from a
 * pre-loaded in-memory graph.
 *
 * No async, no I/O — all inputs are passed in as plain data.
 */

import type { GraphNode, GraphEdge, DiscoveryFeed } from './types.js';
import { scoreRelationship } from './collaboration-scorer.js';

/**
 * Build a DiscoveryFeed from a repo's graph neighbourhood.
 *
 * @param repo   - The root repo slug (e.g. "org/my-project").
 * @param nodes  - All GraphNode entries in the in-memory graph.
 * @param edges  - All GraphEdge entries in the in-memory graph.
 * @returns A DiscoveryFeed with four ranked lists, each capped at 10 items.
 *          If the root repo is not found in `nodes`, all lists are empty.
 */
export function buildDiscoveryFeed(
  repo: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): DiscoveryFeed {
  const empty: DiscoveryFeed = { collaborate: [], depend_on: [], watch: [], join: [] };

  const rootNode = nodes.find((n) => n.repo === repo);
  if (rootNode === undefined) {
    return empty;
  }

  const otherNodes = nodes.filter((n) => n.repo !== repo);

  // ── collaborate ──────────────────────────────────────────────────────────
  // Peer collaborators and foundation siblings, sorted by confidence desc.
  const collaborateCandidates: Array<{ repo: string; confidence: number }> = [];

  for (const node of otherNodes) {
    const relevantEdges = edges.filter(
      (e) =>
        (e.fromRepo === repo && e.toRepo === node.repo) ||
        (e.fromRepo === node.repo && e.toRepo === repo),
    );
    const score = scoreRelationship(rootNode, node, relevantEdges);
    if (score.spectrum === 'peer_collaborator' || score.spectrum === 'foundation_sibling') {
      collaborateCandidates.push({ repo: node.repo, confidence: score.confidence });
    }
  }

  collaborateCandidates.sort((a, b) => b.confidence - a.confidence);
  const collaborate = collaborateCandidates.slice(0, 10).map((c) => c.repo);

  // ── depend_on ─────────────────────────────────────────────────────────────
  // Upstream repos the root does not already depend on.
  // Rank by how many other nodes in the graph depend on each candidate.
  const rootDirectDeps = new Set(
    edges
      .filter((e) => e.edgeType === 'depends_on' && e.fromRepo === repo)
      .map((e) => e.toRepo),
  );

  const dependOnCandidates: Array<{ repo: string; consumerCount: number }> = [];

  for (const node of otherNodes) {
    if (rootDirectDeps.has(node.repo)) {
      continue; // root already depends on this one
    }
    const consumerCount = edges.filter(
      (e) => e.edgeType === 'depends_on' && e.toRepo === node.repo,
    ).length;
    dependOnCandidates.push({ repo: node.repo, consumerCount });
  }

  dependOnCandidates.sort((a, b) => b.consumerCount - a.consumerCount);
  const depend_on = dependOnCandidates.slice(0, 10).map((c) => c.repo);

  // ── watch ─────────────────────────────────────────────────────────────────
  // Adjacent competitors and direct rivals, sorted by confidence desc.
  const watchCandidates: Array<{ repo: string; confidence: number }> = [];

  for (const node of otherNodes) {
    const relevantEdges = edges.filter(
      (e) =>
        (e.fromRepo === repo && e.toRepo === node.repo) ||
        (e.fromRepo === node.repo && e.toRepo === repo),
    );
    const score = scoreRelationship(rootNode, node, relevantEdges);
    if (score.spectrum === 'adjacent_competitor' || score.spectrum === 'direct_rival') {
      watchCandidates.push({ repo: node.repo, confidence: score.confidence });
    }
  }

  watchCandidates.sort((a, b) => b.confidence - a.confidence);
  const watch = watchCandidates.slice(0, 10).map((c) => c.repo);

  // ── join ──────────────────────────────────────────────────────────────────
  // Ecosystem / foundation names present in adjacent nodes but absent from root.
  const rootEcosystems = new Set(rootNode.ecosystems);
  const allAdjacentEcosystems = otherNodes.flatMap((n) => n.ecosystems);
  const uniqueNewEcosystems = [...new Set(allAdjacentEcosystems)].filter(
    (eco) => !rootEcosystems.has(eco),
  );
  const join = uniqueNewEcosystems.slice(0, 10);

  return { collaborate, depend_on, watch, join };
}
