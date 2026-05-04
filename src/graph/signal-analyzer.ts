/**
 * Shared-signal analysis — detects co_signal edges between two repos
 * via shared maintainer emails (git log) and shared foundation ecosystems.
 */

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { ZeroDBClient, TableColumn } from '../integrations/zerodb-client.js';
import type { GraphNode, GraphEdge } from './types.js';

const EDGES_TABLE = 'graph_edges';

const EDGE_COLUMNS: TableColumn[] = [
  { name: 'id', type: 'text', nullable: false },
  { name: 'from_repo', type: 'text', nullable: false },
  { name: 'to_repo', type: 'text', nullable: false },
  { name: 'edge_type', type: 'text', nullable: false },
  { name: 'weight', type: 'real', nullable: false },
  { name: 'detected_at', type: 'timestamp', nullable: false },
];

/**
 * Runs `git log` for the given repo path and returns the unique lowercase
 * author email addresses committed in the last 12 months.
 *
 * @param repoPath - Absolute path to the local git repository.
 * @returns A Set of lowercase email strings, or an empty Set on error.
 */
export function getAuthorEmails(repoPath: string): Set<string> {
  try {
    const output = execSync(
      'git log --since="12 months ago" --format="%ae"',
      { cwd: repoPath, encoding: 'utf8' },
    ) as string;
    const emails = output
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0);
    return new Set(emails);
  } catch {
    return new Set();
  }
}

/**
 * Computes Jaccard similarity between two sets of author emails.
 *
 * @param emailsA - Email set for repo A.
 * @param emailsB - Email set for repo B.
 * @returns Jaccard index in [0, 1], or 0 if both sets are empty.
 */
export function computeMaintainerOverlap(
  emailsA: Set<string>,
  emailsB: Set<string>,
): number {
  if (emailsA.size === 0 && emailsB.size === 0) return 0;

  const intersection = new Set([...emailsA].filter(e => emailsB.has(e)));
  const union = new Set([...emailsA, ...emailsB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Computes the fraction of shared ecosystems between two nodes.
 *
 * Uses `intersection.size / max(A.length, B.length)` so that partial
 * overlap on a smaller array doesn't over-inflate the score.
 *
 * @param nodeA - First graph node.
 * @param nodeB - Second graph node.
 * @returns A value in [0, 1], or 0 if both ecosystem arrays are empty.
 */
export function computeFoundationOverlap(
  nodeA: GraphNode,
  nodeB: GraphNode,
): number {
  if (nodeA.ecosystems.length === 0 && nodeB.ecosystems.length === 0) return 0;

  const setA = new Set(nodeA.ecosystems);
  const setB = new Set(nodeB.ecosystems);
  const intersection = new Set([...setA].filter(e => setB.has(e)));
  const maxLen = Math.max(nodeA.ecosystems.length, nodeB.ecosystems.length);

  if (maxLen === 0) return 0;
  return intersection.size / maxLen;
}

/**
 * Detects shared-signal relationships between two repos and persists
 * bidirectional `co_signal` edges to ZeroDB.
 *
 * Signals checked:
 *  - Shared maintainer emails (Jaccard similarity of git-log authors)
 *  - Shared foundation ecosystems
 *
 * The combined weight is the stronger of the two signals (Math.max).
 *
 * @param nodeA   - Graph node for repo A.
 * @param pathA   - Local filesystem path to repo A's git checkout.
 * @param nodeB   - Graph node for repo B.
 * @param pathB   - Local filesystem path to repo B's git checkout.
 * @param client  - An initialised ZeroDBClient instance.
 * @returns The created GraphEdge array (2 edges, or [] if weight === 0).
 */
export async function analyzeSharedSignals(
  nodeA: GraphNode,
  pathA: string,
  nodeB: GraphNode,
  pathB: string,
  client: ZeroDBClient,
): Promise<GraphEdge[]> {
  try {
    await client.tableCreate(EDGES_TABLE, EDGE_COLUMNS, ['id']);

    const emailsA = getAuthorEmails(pathA);
    const emailsB = getAuthorEmails(pathB);

    const maintainerWeight = computeMaintainerOverlap(emailsA, emailsB);
    const foundationWeight = computeFoundationOverlap(nodeA, nodeB);
    const combinedWeight = Math.max(maintainerWeight, foundationWeight);

    if (combinedWeight === 0) return [];

    const detectedAt = new Date().toISOString();

    const edgeAtoB: GraphEdge = {
      fromRepo: nodeA.repo,
      toRepo: nodeB.repo,
      edgeType: 'co_signal',
      weight: combinedWeight,
      detectedAt,
    };

    const edgeBtoA: GraphEdge = {
      fromRepo: nodeB.repo,
      toRepo: nodeA.repo,
      edgeType: 'co_signal',
      weight: combinedWeight,
      detectedAt,
    };

    await client.tableInsert(EDGES_TABLE, {
      id: randomUUID(),
      from_repo: edgeAtoB.fromRepo,
      to_repo: edgeAtoB.toRepo,
      edge_type: edgeAtoB.edgeType,
      weight: edgeAtoB.weight,
      detected_at: edgeAtoB.detectedAt,
    });

    await client.tableInsert(EDGES_TABLE, {
      id: randomUUID(),
      from_repo: edgeBtoA.fromRepo,
      to_repo: edgeBtoA.toRepo,
      edge_type: edgeBtoA.edgeType,
      weight: edgeBtoA.weight,
      detected_at: edgeBtoA.detectedAt,
    });

    return [edgeAtoB, edgeBtoA];
  } catch (err) {
    console.warn('[graph] analyzeSharedSignals failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
