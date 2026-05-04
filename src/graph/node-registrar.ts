/**
 * Graph node registration — persists ScanReport data to the graph_nodes table.
 */

import { randomUUID } from 'node:crypto';
import type { ScanReport } from '../types/index.js';
import type { ZeroDBClient, TableColumn } from '../integrations/zerodb-client.js';
import type { GraphNode } from './types.js';

const TABLE = 'graph_nodes';

const COLUMNS: TableColumn[] = [
  { name: 'id', type: 'text', nullable: false },
  { name: 'repo', type: 'text', nullable: false },
  { name: 'primary_language', type: 'text', nullable: true },
  { name: 'pillar_scores', type: 'jsonb', nullable: false },
  { name: 'overall_score', type: 'real', nullable: false },
  { name: 'topics', type: 'jsonb', nullable: false },
  { name: 'ecosystems', type: 'jsonb', nullable: false },
  { name: 'last_scanned_at', type: 'timestamp', nullable: false },
];

/**
 * Maps a ScanReport to a GraphNode for graph storage and traversal.
 *
 * @param report - The completed scan report to convert.
 * @returns A GraphNode representing this repo in the relationship graph.
 */
export function reportToGraphNode(report: ScanReport): GraphNode {
  return {
    repo: report.repo,
    primaryLanguage: report.metadata.primaryLanguage ?? null,
    pillarScores: Object.fromEntries(
      Object.entries(report.pillars).map(([k, v]) => [k, v.score])
    ),
    overallScore: report.overallScore,
    topics: report.ecosystem?.profile?.detectedTopics ?? [],
    ecosystems: report.ecosystem?.profile?.ecosystems ?? [],
    lastScannedAt: report.scannedAt,
  };
}

/**
 * Upserts a graph node record derived from a ScanReport into ZeroDB.
 *
 * Silently warns on failure so scan completion is never blocked by graph storage errors.
 *
 * @param report - The completed scan report to register.
 * @param client - An initialised ZeroDBClient instance.
 */
export async function upsertGraphNode(report: ScanReport, client: ZeroDBClient): Promise<void> {
  try {
    await client.tableCreate(TABLE, COLUMNS, ['id']);
    const node = reportToGraphNode(report);
    await client.tableInsert(TABLE, {
      id: randomUUID(),
      repo: node.repo,
      primary_language: node.primaryLanguage,
      pillar_scores: node.pillarScores,
      overall_score: node.overallScore,
      topics: node.topics,
      ecosystems: node.ecosystems,
      last_scanned_at: node.lastScannedAt,
    });
  } catch (err) {
    console.warn('[graph] upsertGraphNode failed:', err instanceof Error ? err.message : err);
  }
}
