/**
 * Pure function to classify the collaboration spectrum between two graph nodes.
 *
 * No I/O, no async. Classification precedence:
 *   1. depends_on A→B  → upstream_dependency
 *   2. depends_on B→A  → downstream_consumer
 *   3. co_signal + shared ecosystem → foundation_sibling
 *   4. co_signal only  → peer_collaborator
 *   5. similarity ≥ 0.85, no depends_on → direct_rival
 *   6. similarity ≥ 0.50, no depends_on → adjacent_competitor
 *   7. default         → peer_collaborator (confidence 0.1)
 */

import type { GraphNode, GraphEdge, RelationshipScore } from './types.js';

/**
 * Score the relationship between two graph nodes given the edges between them.
 *
 * @param nodeA - The first node (treated as the "source" for dependency direction).
 * @param nodeB - The second node.
 * @param edges - All relevant edges between the two nodes (any direction, any type).
 * @returns A RelationshipScore containing spectrum, confidence, and human-readable rationale.
 */
export function scoreRelationship(
  nodeA: GraphNode,
  nodeB: GraphNode,
  edges: GraphEdge[],
): RelationshipScore {
  // Rule 1: depends_on A→B
  const aToB = edges.find(
    (e) => e.edgeType === 'depends_on' && e.fromRepo === nodeA.repo,
  );
  if (aToB !== undefined) {
    return {
      spectrum: 'upstream_dependency',
      confidence: 1.0,
      rationale: `${nodeA.repo} depends on ${nodeB.repo} via package manifest`,
    };
  }

  // Rule 2: depends_on B→A
  const bToA = edges.find(
    (e) => e.edgeType === 'depends_on' && e.fromRepo === nodeB.repo,
  );
  if (bToA !== undefined) {
    return {
      spectrum: 'downstream_consumer',
      confidence: 1.0,
      rationale: `${nodeB.repo} depends on ${nodeA.repo} via package manifest`,
    };
  }

  // co_signal edges (used in rules 3 and 4)
  const coSignalEdges = edges.filter((e) => e.edgeType === 'co_signal');
  if (coSignalEdges.length > 0) {
    const maxWeight = Math.max(...coSignalEdges.map((e) => e.weight));
    const sharedEcosystem = nodeA.ecosystems.some((e) => nodeB.ecosystems.includes(e));

    // Rule 3: co_signal + shared ecosystem
    if (sharedEcosystem) {
      const shared = nodeA.ecosystems.filter((e) => nodeB.ecosystems.includes(e));
      return {
        spectrum: 'foundation_sibling',
        confidence: maxWeight,
        rationale: `${nodeA.repo} and ${nodeB.repo} share ecosystem(s) [${shared.join(', ')}] with a co-signal relationship`,
      };
    }

    // Rule 4: co_signal only, no shared ecosystem
    return {
      spectrum: 'peer_collaborator',
      confidence: maxWeight,
      rationale: `${nodeA.repo} and ${nodeB.repo} have a co-signal relationship with no shared ecosystem`,
    };
  }

  // Similarity-based rules (no depends_on edges exist at this point)
  const similarity = 1 - Math.abs(nodeA.overallScore - nodeB.overallScore) / 10;

  // Rule 5: similarity ≥ 0.85 → direct_rival
  if (similarity >= 0.85) {
    return {
      spectrum: 'direct_rival',
      confidence: similarity,
      rationale: `Scores within 15% (${nodeA.overallScore} vs ${nodeB.overallScore}) — likely direct competitors`,
    };
  }

  // Rule 6: similarity ≥ 0.50 → adjacent_competitor
  if (similarity >= 0.5) {
    return {
      spectrum: 'adjacent_competitor',
      confidence: similarity,
      rationale: `Scores within 50% (${nodeA.overallScore} vs ${nodeB.overallScore}) — adjacent market competitors`,
    };
  }

  // Rule 7: default
  return {
    spectrum: 'peer_collaborator',
    confidence: 0.1,
    rationale: `No dependency or signal relationship found between ${nodeA.repo} and ${nodeB.repo}; defaulting to loose peer collaboration`,
  };
}
