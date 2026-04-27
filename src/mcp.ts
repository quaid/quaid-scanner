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
  const context = buildContext(validatedTarget, config, version);

  const registry = createDefaultRegistry();
  const orchestrator = new Orchestrator(registry);
  const result = await orchestrator.run(context);

  const report = buildScanReport(validatedTarget, result, config, context.maturity, version);
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
    ok(req.id, { tools: [TOOL_DEF] });
    return;
  }

  if (req.method === 'tools/call') {
    const toolName = (req.params?.['name'] as string) ?? '';
    const toolParams = (req.params?.['arguments'] as Record<string, unknown>) ?? {};

    if (toolName !== 'scan_repository') {
      err(req.id, -32601, `Unknown tool: ${toolName}`);
      return;
    }

    try {
      const result = await executeScanTool(toolParams);
      ok(req.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      err(req.id, -32603, msg);
    }
    return;
  }

  err(req.id, -32601, `Method not found: ${req.method}`);
}
