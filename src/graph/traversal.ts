/**
 * BFS graph traversal up to N hops from a root repository.
 *
 * Queries ZeroDB `graph_edges` and `graph_nodes` tables to discover
 * all nodes and edges reachable from `repo` within the hop limit.
 */

import type { ZeroDBClient } from '../integrations/zerodb-client.js';
import type { GraphNode, GraphEdge, GraphEdgeType, TraversalOptions, GraphTraversalResult } from './types.js';

/**
 * Traverse the OSS social graph starting from `repo` using BFS.
 *
 * @param repo     Root repository slug, e.g. "owner/repo"
 * @param options  Traversal configuration (hops, edgeTypes, minWeight)
 * @param client   ZeroDBClient instance for table queries
 * @returns        Unique nodes and edges reachable within the hop limit
 */
export async function traverseGraph(
  repo: string,
  options: TraversalOptions = {},
  client: ZeroDBClient,
): Promise<GraphTraversalResult> {
  try {
    const hops = Math.min(Math.max(options.hops ?? 1, 1), 3);
    const edgeTypeFilter = options.edgeTypes ?? null;
    const minWeight = options.minWeight ?? 0;

    // Accumulated results
    const nodeMap = new Map<string, GraphNode>();
    const edgeKeySet = new Set<string>();
    const edges: GraphEdge[] = [];

    // BFS state
    const visited = new Set<string>([repo]);
    let frontier = new Set<string>([repo]);

    for (let hop = 0; hop < hops; hop++) {
      if (frontier.size === 0) break;

      // Fetch all edges, then filter locally for frontier membership
      const allEdgeRows = await client.tableQuery('graph_edges', {});

      const relevant = allEdgeRows.filter((row) => {
        const from = String(row.row_data['from_repo']);
        const to = String(row.row_data['to_repo']);
        return frontier.has(from) || frontier.has(to);
      });

      const nextFrontier = new Set<string>();

      for (const row of relevant) {
        const d = row.row_data;
        const fromRepo = String(d['from_repo']);
        const toRepo = String(d['to_repo']);
        const edgeType = String(d['edge_type']) as GraphEdgeType;
        const weight = Number(d['weight'] ?? 0);
        const detectedAt = String(d['detected_at'] ?? '');

        // Apply edge type filter
        if (edgeTypeFilter !== null && !edgeTypeFilter.includes(edgeType)) continue;

        // Apply weight filter
        if (weight < minWeight) continue;

        // Deduplicate edges by composite key
        const edgeKey = `${fromRepo}|${toRepo}|${edgeType}`;
        if (!edgeKeySet.has(edgeKey)) {
          edgeKeySet.add(edgeKey);
          edges.push({ fromRepo, toRepo, edgeType, weight, detectedAt });
        }

        // Discover new repos for next frontier
        for (const r of [fromRepo, toRepo]) {
          if (!visited.has(r)) {
            visited.add(r);
            nextFrontier.add(r);
          }
        }
      }

      // Fetch node data for newly discovered repos
      if (nextFrontier.size > 0) {
        const nodeRows = await client.tableQuery('graph_nodes', {});
        for (const row of nodeRows) {
          const d = row.row_data;
          const nodeRepo = String(d['repo']);
          if (nextFrontier.has(nodeRepo) && !nodeMap.has(nodeRepo)) {
            nodeMap.set(nodeRepo, {
              repo: nodeRepo,
              primaryLanguage: d['primary_language'] != null ? String(d['primary_language']) : null,
              pillarScores: (d['pillar_scores'] as Record<string, number>) ?? {},
              overallScore: Number(d['overall_score'] ?? 0),
              topics: (d['topics'] as string[]) ?? [],
              ecosystems: (d['ecosystems'] as string[]) ?? [],
              lastScannedAt: String(d['last_scanned_at'] ?? ''),
            });
          }
        }
      }

      frontier = nextFrontier;
    }

    // Ensure root node is always present — use stub if not in graph_nodes
    if (!nodeMap.has(repo)) {
      nodeMap.set(repo, {
        repo,
        primaryLanguage: null,
        pillarScores: {},
        overallScore: 0,
        topics: [],
        ecosystems: [],
        lastScannedAt: '',
      });
    }

    const nodes = Array.from(nodeMap.values());
    return { nodes, edges, rootRepo: repo };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[traverseGraph] error during traversal: ${msg}`);
    return { nodes: [], edges: [], rootRepo: repo };
  }
}
