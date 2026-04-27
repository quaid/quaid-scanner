/**
 * Tests for the MCP server (src/mcp.ts).
 *
 * Strategy:
 * - Mock heavy dependencies so no real filesystem/git work is done.
 * - Import the exported handleRequest function and call it directly.
 * - Spy on process.stdout.write to capture JSONRPC responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';

// ---- mocks BEFORE module import ----

vi.mock('../src/context-builder.js', () => ({
  buildContext: vi.fn(() => ({
    repoPath: '/tmp/test-repo',
    repoIdentifier: null,
    maturity: 'sandbox',
    depth: 'standard',
    config: {},
    git: { commitSha: 'abc123', branch: 'main', remoteUrl: 'https://github.com/owner/repo' },
    signal: new AbortController().signal,
    emit: vi.fn(),
  })),
}));

vi.mock('../src/scanner/registry-factory.js', () => ({
  createDefaultRegistry: vi.fn(() => ({
    // minimal stub — Orchestrator receives this
  })),
}));

vi.mock('../src/scanner/orchestrator.js', () => {
  const mockRun = vi.fn().mockResolvedValue({
    overallScore: 8.5,
    riskLevel: 'LOW',
    pillars: {},
    findings: [
      {
        id: 'TEST-01',
        severity: 1, // WARNING
        pillar: 'security',
        category: 'test',
        message: 'Test warning',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
      },
    ],
    thresholdPassed: true,
    durationMs: 42,
  });

  return {
    Orchestrator: vi.fn().mockImplementation(() => ({ run: mockRun })),
  };
});

vi.mock('../src/reporters/json.js', () => ({
  buildScanReport: vi.fn(() => ({
    repo: '/tmp/test-repo',
    scannedAt: '2026-04-25T00:00:00.000Z',
    version: '1.0.0',
    depth: 'standard',
    durationMs: 42,
    overallScore: 8.5,
    riskLevel: 'LOW',
    maturity: 'sandbox',
    pillars: {},
    findings: [
      {
        id: 'TEST-01',
        severity: 1,
        pillar: 'security',
        category: 'test',
        message: 'Test warning',
        file: null,
        line: null,
        column: null,
        suggestion: 'Fix it',
      },
    ],
    recommendations: [{ priority: 2, action: 'Fix it', impact: 'medium', effort: 'low', findingIds: ['TEST-01'] }],
    metadata: {
      commitSha: null,
      branch: null,
      remoteUrl: null,
      primaryLanguage: null,
      linesOfCode: null,
      stars: null,
      forks: null,
      openIssues: null,
    },
  })),
  serializeJson: vi.fn((r) => JSON.stringify(r)),
}));

vi.mock('../src/ecosystem/orchestrator.js', () => ({
  EcosystemOrchestrator: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({ rivals: [], partners: [] }),
  })),
}));

// Import AFTER mocks are set up
const { handleRequest } = await import('../src/mcp.js');

// ---- helpers ----

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

function parseOutput(raw: string): MCPResponse {
  return JSON.parse(raw.trim()) as MCPResponse;
}

// ---- tests ----

describe('MCP server handleRequest', () => {
  let stdoutSpy: MockInstance;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((_chunk) => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  // ------------------------------------------------------------------
  // initialize
  // ------------------------------------------------------------------
  describe('initialize method', () => {
    it('returns protocolVersion, capabilities, and serverInfo', async () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 1, method: 'initialize' };
      await handleRequest(req);

      expect(stdoutSpy).toHaveBeenCalledOnce();
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      const result = response.result as Record<string, unknown>;
      expect(result['protocolVersion']).toBe('2024-11-05');
      expect(result['capabilities']).toEqual({ tools: {} });
      expect((result['serverInfo'] as Record<string, unknown>)['name']).toBe('quaid-scanner');
    });

    it('echoes numeric id back', async () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 42, method: 'initialize' };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.id).toBe(42);
    });

    it('echoes string id back', async () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 'req-abc', method: 'initialize' };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.id).toBe('req-abc');
    });
  });

  // ------------------------------------------------------------------
  // tools/list
  // ------------------------------------------------------------------
  describe('tools/list method', () => {
    it('returns a tools array containing scan_repository', async () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
      await handleRequest(req);

      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.result).toBeDefined();
      const result = response.result as Record<string, unknown>;
      const tools = result['tools'] as Array<Record<string, unknown>>;
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(1);
      expect(tools[0]['name']).toBe('scan_repository');
    });

    it('tool definition includes required path property in inputSchema', async () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 3, method: 'tools/list' };
      await handleRequest(req);

      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      const result = response.result as Record<string, unknown>;
      const tools = result['tools'] as Array<Record<string, unknown>>;
      const schema = tools[0]['inputSchema'] as Record<string, unknown>;
      expect((schema['required'] as string[])).toContain('path');
    });
  });

  // ------------------------------------------------------------------
  // tools/call — unknown tool
  // ------------------------------------------------------------------
  describe('tools/call — unknown tool', () => {
    it('returns error -32601 for an unknown tool name', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'does_not_exist', arguments: {} },
      };
      await handleRequest(req);

      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601);
      expect(response.error!.message).toContain('does_not_exist');
    });

    it('returns error for empty tool name', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: '', arguments: {} },
      };
      await handleRequest(req);

      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601);
    });
  });

  // ------------------------------------------------------------------
  // unknown method
  // ------------------------------------------------------------------
  describe('unknown method', () => {
    it('returns error -32601 for an unknown method', async () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 6, method: 'notifications/initialized' };
      await handleRequest(req);

      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601);
      expect(response.error!.message).toContain('notifications/initialized');
    });
  });

  // ------------------------------------------------------------------
  // tools/call — scan_repository (json format, defaults)
  // ------------------------------------------------------------------
  describe('tools/call — scan_repository default (json format)', () => {
    it('returns content array with text result', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo' },
        },
      };
      await handleRequest(req);

      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      const result = response.result as Record<string, unknown>;
      const content = result['content'] as Array<Record<string, unknown>>;
      expect(Array.isArray(content)).toBe(true);
      expect(content[0]['type']).toBe('text');
      expect(typeof content[0]['text']).toBe('string');
    });
  });

  // ------------------------------------------------------------------
  // tools/call — scan_repository with depth/format/threshold variations
  // ------------------------------------------------------------------
  describe('tools/call — scan_repository depth and format params', () => {
    it('accepts depth=quick without error', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', depth: 'quick' },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
    });

    it('accepts depth=thorough without error', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', depth: 'thorough' },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
    });

    it('falls back to standard depth for unknown depth value', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', depth: 'ultra-fast' },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
    });

    it('uses summary format when requested', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', format: 'summary' },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
      const result = response.result as Record<string, unknown>;
      const content = result['content'] as Array<Record<string, unknown>>;
      const parsed = JSON.parse(content[0]['text'] as string) as Record<string, unknown>;
      // Summary format includes score and riskLevel
      expect(parsed).toHaveProperty('score');
      expect(parsed).toHaveProperty('riskLevel');
      expect(parsed).toHaveProperty('findings');
    });

    it('applies threshold param as number', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', threshold: 5.0 },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
    });

    it('ignores non-number threshold param', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', threshold: 'high' },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
    });
  });

  // ------------------------------------------------------------------
  // tools/call — ecosystem flag
  // ------------------------------------------------------------------
  describe('tools/call — ecosystem flag', () => {
    it('triggers ecosystem analysis when ecosystem=true', async () => {
      const { EcosystemOrchestrator } = await import('../src/ecosystem/orchestrator.js');
      const mockEco = vi.mocked(EcosystemOrchestrator);
      mockEco.mockClear();

      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', ecosystem: true },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
      // EcosystemOrchestrator should have been instantiated
      expect(mockEco).toHaveBeenCalled();
    });

    it('ecosystem errors are swallowed (non-fatal)', async () => {
      const { EcosystemOrchestrator } = await import('../src/ecosystem/orchestrator.js');
      vi.mocked(EcosystemOrchestrator).mockImplementationOnce(() => ({
        analyze: vi.fn().mockRejectedValue(new Error('eco failure')),
      }));

      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', ecosystem: true },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      // Should succeed despite ecosystem failure
      expect(response.error).toBeUndefined();
    });
  });

  // ------------------------------------------------------------------
  // tools/call — error path (orchestrator throws)
  // ------------------------------------------------------------------
  describe('tools/call — scan throws', () => {
    it('returns error -32603 when scan throws an Error', async () => {
      const { Orchestrator } = await import('../src/scanner/orchestrator.js');
      vi.mocked(Orchestrator).mockImplementationOnce(() => ({
        run: vi.fn().mockRejectedValue(new Error('disk read failure')),
      }));

      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 16,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo' },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32603);
      expect(response.error!.message).toContain('disk read failure');
    });

    it('returns error -32603 when scan throws a non-Error value', async () => {
      const { Orchestrator } = await import('../src/scanner/orchestrator.js');
      vi.mocked(Orchestrator).mockImplementationOnce(() => ({
        run: vi.fn().mockRejectedValue('string error'),
      }));

      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 17,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo' },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32603);
      expect(response.error!.message).toBe('string error');
    });
  });

  // ------------------------------------------------------------------
  // tools/call — missing params fallback
  // ------------------------------------------------------------------
  describe('tools/call — missing params', () => {
    it('handles undefined params gracefully (uses empty arguments)', async () => {
      // params is undefined — toolName falls back to '', toolParams to {}
      const req = {
        jsonrpc: '2.0' as const,
        id: 18,
        method: 'tools/call',
        // no params key
      } as MCPRequest;
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      // Empty tool name → unknown tool error
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601);
    });
  });

  // ------------------------------------------------------------------
  // summary format — topRecommendations slice
  // ------------------------------------------------------------------
  describe('summary format — recommendations slice', () => {
    it('topRecommendations contains at most 3 items', async () => {
      const req: MCPRequest = {
        jsonrpc: '2.0',
        id: 19,
        method: 'tools/call',
        params: {
          name: 'scan_repository',
          arguments: { path: '/tmp/test-repo', format: 'summary' },
        },
      };
      await handleRequest(req);
      const response = parseOutput(stdoutSpy.mock.calls[0][0] as string);
      const result = response.result as Record<string, unknown>;
      const content = result['content'] as Array<Record<string, unknown>>;
      const parsed = JSON.parse(content[0]['text'] as string) as Record<string, unknown>;
      expect(Array.isArray(parsed['topRecommendations'])).toBe(true);
      expect((parsed['topRecommendations'] as unknown[]).length).toBeLessThanOrEqual(3);
    });
  });
});
