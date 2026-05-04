/**
 * Reverse dependency discovery — queries which repos depend on a given repo.
 */

import type { ZeroDBClient } from '../integrations/zerodb-client.js';
import type { ReverseDependencyResult } from './types.js';

const EDGES_TABLE = 'graph_edges';
const NODES_TABLE = 'graph_nodes';

/**
 * Queries ZeroDB for all repos that depend on the given repo.
 *
 * Looks up `graph_edges` for rows where `to_repo === repo` and
 * `edge_type === 'depends_on'`, then resolves each dependent repo's
 * `overall_score` from `graph_nodes` to compute `totalDownstreamScore`.
 *
 * Silently warns and returns an empty result on any error so callers
 * are never blocked by graph query failures.
 *
 * @param repo   - The target repo slug, e.g. "org/my-lib".
 * @param client - An initialised ZeroDBClient instance.
 * @returns Count of unique dependents, their repo slugs, and summed scores.
 */
export async function queryReverseDependencies(
  repo: string,
  client: ZeroDBClient,
): Promise<ReverseDependencyResult> {
  const empty: ReverseDependencyResult = { count: 0, repos: [], totalDownstreamScore: 0 };

  try {
    const edgeRows = await client.tableQuery(EDGES_TABLE, {
      to_repo: repo,
      edge_type: 'depends_on',
    });

    if (edgeRows.length === 0) {
      return empty;
    }

    // Collect unique from_repo values
    const seen = new Set<string>();
    for (const row of edgeRows) {
      const fromRepo = row.row_data['from_repo'];
      if (typeof fromRepo === 'string') {
        seen.add(fromRepo);
      }
    }

    const repos = Array.from(seen);

    // Resolve overall_score for each dependent repo
    let totalDownstreamScore = 0;
    for (const fromRepo of repos) {
      const nodeRows = await client.tableQuery(NODES_TABLE, { repo: fromRepo });
      const node = nodeRows.find((r) => r.row_data['repo'] === fromRepo) ?? nodeRows[0];
      const score = node ? (node.row_data['overall_score'] as number | undefined) ?? 0 : 0;
      totalDownstreamScore += score;
    }

    return {
      count: repos.length,
      repos,
      totalDownstreamScore,
    };
  } catch (err) {
    console.warn(
      '[graph] queryReverseDependencies failed:',
      err instanceof Error ? err.message : err,
    );
    return empty;
  }
}
