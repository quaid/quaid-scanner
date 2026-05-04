#!/usr/bin/env node
/**
 * MCP server for quaid-scanner.
 * Exposes a `scan_repository` tool that agents can call to scan a repo and get a structured report.
 *
 * Usage: node dist/mcp.js
 * Add to .mcp.json: { "quaid-scanner": { "command": "node", "args": ["dist/mcp.js"] } }
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig, validateTarget } from './config.js';
import { buildContext } from './context-builder.js';
import { createDefaultRegistry } from './scanner/registry-factory.js';
import { Orchestrator } from './scanner/orchestrator.js';
import { buildScanReport, serializeJson } from './reporters/json.js';
import { EcosystemOrchestrator } from './ecosystem/orchestrator.js';
import { OutputFormat, ScanDepth, Severity, type ScannerConfig } from './types/index.js';
import { traverseGraph } from './graph/traversal.js';
import { ZeroDBClient } from './integrations/zerodb-client.js';
import type { GraphEdgeType, TraversalOptions } from './graph/types.js';

// --- MCP protocol helpers ---

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

function send(res: MCPResponse): void {
  process.stdout.write(JSON.stringify(res) + '\n');
}

function ok(id: string | number, result: unknown): void {
  send({ jsonrpc: '2.0', id, result });
}

function err(id: string | number, code: number, message: string): void {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

// --- Tool definition ---

const TOOL_DEF = {
  name: 'scan_repository',
  description:
    'Scan a local OSS repository or GitHub URL for health, quality, and ecosystem signals. ' +
    'Returns a structured JSON report with an overall score (0-10), per-pillar scores, ' +
    'findings (CRITICAL/WARNING/INFO/PASS), and recommendations.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Local filesystem path or GitHub URL (https://github.com/owner/repo)',
      },
      depth: {
        type: 'string',
        enum: ['quick', 'standard', 'thorough'],
        description: 'Scan depth. quick~5s, standard~15s, thorough~60s. Default: standard',
      },
      format: {
        type: 'string',
        enum: ['json', 'summary'],
        description: 'Output format. json = full report, summary = text summary. Default: json',
      },
      ecosystem: {
        type: 'boolean',
        description: 'Include ecosystem intelligence (rivals, partners, communities). Default: false',
      },
      threshold: {
        type: 'number',
        description: 'Minimum acceptable score (0-10). Result includes passed: bool.',
      },
    },
    required: ['path'],
  },
};

// --- graph_query tool definition ---

const GRAPH_QUERY_TOOL_DEF = {
  name: 'graph_query',
  description: 'Query the OSS social graph for a repository. Returns nodes and edges reachable within N hops.',
  inputSchema: {
    type: 'object',
    properties: {
      repo: { type: 'string', description: 'Repository slug, e.g. "owner/repo"' },
      hops: { type: 'number', description: 'Traversal depth 1-3. Default: 1' },
      edgeTypes: {
        type: 'array',
        items: { type: 'string', enum: ['depends_on', 'co_signal'] },
        description: 'Edge type filter. Default: all types',
      },
      minWeight: { type: 'number', description: 'Minimum edge weight 0-1. Default: 0' },
    },
    required: ['repo'],
  },
};

// --- Version helper ---

function getVersion(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  let dir = currentDir;
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf-8')) as Record<string, unknown>;
      if (pkg.name === 'quaid-scanner') return pkg.version as string;
    } catch { }
    dir = resolve(dir, '..');
  }
  return '0.0.0';
}

// --- Tool execution ---

async function executeScanTool(params: Record<string, unknown>): Promise<unknown> {
  const path = String(params['path'] ?? '');
  const depth = String(params['depth'] ?? 'standard');
  const format = String(params['format'] ?? 'json');
  const ecosystem = Boolean(params['ecosystem'] ?? false);
  const threshold = typeof params['threshold'] === 'number' ? params['threshold'] : null;

  const depthMap: Record<string, ScanDepth> = {
    quick: ScanDepth.QUICK,
    standard: ScanDepth.STANDARD,
    thorough: ScanDepth.THOROUGH,
  };

  const config: ScannerConfig = {
    ...buildConfig({}),
    depth: depthMap[depth] ?? ScanDepth.STANDARD,
    format: OutputFormat.JSON,
    output: null,
    threshold,
    quiet: true,
    verbose: false,
    ecosystem,
    ecosystemDepth: 'static',
  };

  const validatedTarget = validateTarget(path);
  const version = getVersion();
  const { context, cleanup } = buildContext(validatedTarget, config, version);

  let result;
  let report;
  try {
    const registry = createDefaultRegistry();
    const orchestrator = new Orchestrator(registry);
    result = await orchestrator.run(context);

    report = buildScanReport(validatedTarget, result, config, context.maturity, version);
    report.metadata.commitSha = context.git.commitSha;
    report.metadata.branch = context.git.branch;
    report.metadata.remoteUrl = context.git.remoteUrl;

    if (ecosystem) {
      const ecoContext = {
        ...context,
        existingReport: report,
        zerodbAvailable: !!(config.zerodbApiKey && config.zerodbProjectId),
      };
      try {
        report.ecosystem = await new EcosystemOrchestrator().analyze(ecoContext);
      } catch {
        // non-fatal
      }
    }
  } finally {
    cleanup();
  }

  if (format === 'summary') {
    const criticals = report.findings.filter((f) => f.severity === Severity.CRITICAL).length;
    const warnings = report.findings.filter((f) => f.severity === Severity.WARNING).length;
    return {
      repo: report.repo,
      score: report.overallScore,
      riskLevel: report.riskLevel,
      findings: `${criticals} critical, ${warnings} warnings`,
      topRecommendations: report.recommendations.slice(0, 3).map((r) => r.action),
      thresholdPassed: result.thresholdPassed,
    };
  }

  return JSON.parse(serializeJson(report));
}

// --- MCP message loop ---

let buffer = '';

process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let req: MCPRequest;
    try {
      req = JSON.parse(trimmed) as MCPRequest;
    } catch {
      continue;
    }

    handleRequest(req).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      err(req.id, -32603, msg);
    });
  }
});

export async function handleRequest(req: MCPRequest): Promise<void> {
  if (req.method === 'initialize') {
    ok(req.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'quaid-scanner', version: getVersion() },
    });
    return;
  }

  if (req.method === 'tools/list') {
    ok(req.id, { tools: [TOOL_DEF, GRAPH_QUERY_TOOL_DEF] });
    return;
  }

  if (req.method === 'tools/call') {
    const toolName = (req.params?.['name'] as string) ?? '';
    const toolParams = (req.params?.['arguments'] as Record<string, unknown>) ?? {};

    if (toolName === 'scan_repository') {
      try {
        const result = await executeScanTool(toolParams);
        ok(req.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        err(req.id, -32603, msg);
      }
      return;
    }

    if (toolName === 'graph_query') {
      const apiUrl = process.env['ZERODB_API_URL'];
      const apiKey = process.env['ZERODB_API_KEY'];
      const projectId = process.env['ZERODB_PROJECT_ID'];

      if (!apiUrl || !apiKey || !projectId) {
        err(req.id, -32603, 'ZeroDB not configured');
        return;
      }

      const repo = String(toolParams['repo'] ?? '');
      const hopsRaw = toolParams['hops'];
      const hops = typeof hopsRaw === 'number' ? hopsRaw : undefined;
      const edgeTypesRaw = toolParams['edgeTypes'];
      const edgeTypes = Array.isArray(edgeTypesRaw) ? (edgeTypesRaw as GraphEdgeType[]) : undefined;
      const minWeightRaw = toolParams['minWeight'];
      const minWeight = typeof minWeightRaw === 'number' ? minWeightRaw : undefined;

      const traversalOptions: TraversalOptions = {};
      if (hops !== undefined) traversalOptions.hops = hops;
      if (edgeTypes !== undefined) traversalOptions.edgeTypes = edgeTypes;
      if (minWeight !== undefined) traversalOptions.minWeight = minWeight;

      const client = new ZeroDBClient(apiUrl, apiKey, projectId);
      const result = await traverseGraph(repo, traversalOptions, client);
      ok(req.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      return;
    }

    err(req.id, -32601, `Unknown tool: ${toolName}`);
    return;
  }

  err(req.id, -32601, `Method not found: ${req.method}`);
}
