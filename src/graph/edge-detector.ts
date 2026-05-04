/**
 * Dependency edge detection — reads dependency manifests from a repo path and
 * creates `depends_on` edges in ZeroDB `graph_edges` for each dependency whose
 * name matches (or does not match) an existing node in `graph_nodes`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ZeroDBClient, TableColumn } from '../integrations/zerodb-client.js';
import type { GraphEdge } from './types.js';

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
 * Reads standard dependency manifests from a repo path and returns a
 * deduplicated, lowercased flat list of dependency identifiers.
 *
 * Supported manifests (in order of precedence):
 *   - `package.json` — `dependencies` + `devDependencies`
 *   - `requirements.txt` — Python packages (version specifiers stripped)
 *   - `go.mod` — Go module paths from the `require (...)` block
 *
 * @param repoPath - Absolute or relative path to the repository root.
 * @returns Deduplicated lowercase list of dependency names/paths.
 */
export function extractDependencyNames(repoPath: string): string[] {
  const names = new Set<string>();

  // --- package.json ---
  const pkgPath = resolve(repoPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
      const allDeps = {
        ...(pkg['dependencies'] as Record<string, string> | undefined ?? {}),
        ...(pkg['devDependencies'] as Record<string, string> | undefined ?? {}),
      };
      for (const rawName of Object.keys(allDeps)) {
        const lower = rawName.toLowerCase();
        names.add(lower);
        // For scoped packages (@scope/pkg), also add the bare package name
        if (lower.startsWith('@') && lower.includes('/')) {
          const bare = lower.slice(lower.indexOf('/') + 1);
          names.add(bare);
        }
      }
    } catch {
      // skip malformed manifest
    }
  }

  // --- requirements.txt ---
  const reqPath = resolve(repoPath, 'requirements.txt');
  if (existsSync(reqPath)) {
    const lines = readFileSync(reqPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      // Strip version specifiers: >=, ==, <=, !=, ~=, >, <
      const pkgName = trimmed.split(/[><=!~]/)[0].trim().toLowerCase();
      if (pkgName) names.add(pkgName);
    }
  }

  // --- go.mod ---
  const goModPath = resolve(repoPath, 'go.mod');
  if (existsSync(goModPath)) {
    const content = readFileSync(goModPath, 'utf8');
    let inRequireBlock = false;
    for (const line of content.split('\n')) {
      if (/^require\s*\(/.test(line)) {
        inRequireBlock = true;
        continue;
      }
      if (inRequireBlock) {
        if (line.trim() === ')') {
          inRequireBlock = false;
          continue;
        }
        // Lines inside require(...) start with a tab
        if (line.startsWith('\t')) {
          const modulePath = line.trim().split(/\s+/)[0].toLowerCase();
          if (modulePath) names.add(modulePath);
        }
      }
    }
  }

  return Array.from(names);
}

/**
 * Detects dependency edges for a given repo by reading its dependency manifests
 * and cross-referencing them against registered nodes in `graph_nodes`.
 *
 * - Deps matching a known node get `weight: 1.0`.
 * - Deps not in the graph get stub edges with `weight: 0.0`.
 * - Errors are caught and warned; an empty array is returned on failure.
 *
 * @param fromRepo - The slug of the repo whose dependencies we are scanning (e.g. `"acme/app"`).
 * @param repoPath - Filesystem path to the repository root.
 * @param client   - An initialised ZeroDBClient.
 * @returns List of GraphEdge objects created during this run.
 */
export async function detectDependencyEdges(
  fromRepo: string,
  repoPath: string,
  client: ZeroDBClient,
): Promise<GraphEdge[]> {
  try {
    await client.tableCreate(EDGES_TABLE, EDGE_COLUMNS, ['id']);

    const depNames = extractDependencyNames(repoPath);

    const rows = await client.tableQuery('graph_nodes', {});

    if (depNames.length === 0) return [];
    const knownRepos = new Set(rows.map((r) => String(r.row_data['repo']).toLowerCase()));

    const edges: GraphEdge[] = [];
    const detectedAt = new Date().toISOString();

    for (const dep of depNames) {
      const weight = knownRepos.has(dep) ? 1.0 : 0.0;
      const edge: GraphEdge = {
        fromRepo,
        toRepo: dep,
        edgeType: 'depends_on',
        weight,
        detectedAt,
      };

      await client.tableInsert(EDGES_TABLE, {
        id: randomUUID(),
        from_repo: fromRepo,
        to_repo: dep,
        edge_type: 'depends_on',
        weight,
        detected_at: detectedAt,
      });

      edges.push(edge);
    }

    return edges;
  } catch (err) {
    console.warn('[graph] detectDependencyEdges failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
