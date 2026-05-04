/**
 * Shared types for Epic 11 graph intelligence modules.
 *
 * All other Epic 11 modules depend on this file.
 */

/** A repo registered in the relationship graph. */
export interface GraphNode {
  repo: string;               // e.g. "acme/my-project"
  primaryLanguage: string | null;
  pillarScores: Record<string, number>;  // pillar key -> score 0-10
  overallScore: number;
  topics: string[];
  ecosystems: string[];       // from EcosystemProfile (may be empty)
  lastScannedAt: string;      // ISO datetime
}

/** Directional relationship types between two repos. */
export type GraphEdgeType = 'depends_on' | 'co_signal';

/** A directional relationship between two repos. */
export interface GraphEdge {
  fromRepo: string;
  toRepo: string;
  edgeType: GraphEdgeType;
  weight: number;             // 0.0–1.0
  detectedAt: string;         // ISO datetime
}

/** 6-value classification of the collaboration spectrum between repos. */
export type CollaborationSpectrum =
  | 'upstream_dependency'
  | 'downstream_consumer'
  | 'peer_collaborator'
  | 'adjacent_competitor'
  | 'direct_rival'
  | 'foundation_sibling';

/** Output of scoreRelationship. */
export interface RelationshipScore {
  spectrum: CollaborationSpectrum;
  confidence: number;         // 0.0–1.0
  rationale: string;
}

/** Output of queryReverseDependencies. */
export interface ReverseDependencyResult {
  count: number;
  repos: string[];
  totalDownstreamScore: number;
}

/** Options for traverseGraph. */
export interface TraversalOptions {
  hops?: number;              // 1–3, default 1
  edgeTypes?: GraphEdgeType[];
  minWeight?: number;         // 0.0–1.0, default 0
}

/** Output of traverseGraph. */
export interface GraphTraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootRepo: string;
}

/** 4-category ranked discovery suggestions. */
export interface DiscoveryFeed {
  collaborate: string[];      // peer collaborators and foundation siblings
  depend_on: string[];        // upstream repos not yet a dependency
  watch: string[];            // adjacent competitors and direct rivals
  join: string[];             // foundation/community orgs to join
}

/** Added to ScanReport as report.graph (optional). */
export interface GraphIntelligence {
  generatedAt: string;
  rootRepo: string;
  nodeCount: number;
  edgeCount: number;
  reverseDependents: ReverseDependencyResult;
  discoveryFeed: DiscoveryFeed;
  dataSource: 'zerodb' | 'local';
}
