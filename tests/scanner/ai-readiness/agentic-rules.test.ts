/**
 * Tests for Multi-Model Agentic Rule Detection scanner.
 *
 * Validates detection of agent config files for Claude Code, Cursor,
 * Copilot, Gemini, and other AI coding agents. Checks CLAUDE.md
 * structure quality and overall AI-readiness scoring.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AgenticRulesScanner } from '../../../src/scanner/ai-readiness/agentic-rules.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: AgenticRulesScanner;

function makeContext(overrides: Partial<ScanContext> = {}): ScanContext {
  const config: ScannerConfig = {
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    format: OutputFormat.JSON,
    output: null,
    threshold: null,
    quiet: false,
    verbose: false,
    scannerTimeout: 30000,
    githubToken: null,
    zerodbApiKey: null,
    zerodbProjectId: null,
    pillars: { disabled: [], weights: {}, disabledScanners: [] },
    bots: { enabled: true, additional: [], exclude: [] },
    inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
  };

  return {
    repoPath: tmpDir,
    repoIdentifier: 'owner/repo',
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: 'abc', branch: 'main', remoteUrl: null },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentic-rules-test-'));
  scanner = new AgenticRulesScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('AgenticRulesScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('agentic-rules');
      expect(scanner.displayName).toBe('Multi-Model Agentic Rule Detection');
      expect(scanner.pillar).toBe(Pillar.AI_READINESS);
    });
  });

  describe('no agent configs', () => {
    it('INFO when no agent configuration files found', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.js'), 'console.log("hello")');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'agentic-rules');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.INFO);
      expect(finding!.metadata?.agentCount).toBe(0);
    });
  });

  describe('Claude Code detection', () => {
    it('detects CLAUDE.md at root', async () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Project Rules\n\n## Critical Rules\nNo AI attribution.');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'agentic-rules');
      expect(finding).toBeDefined();
      const agents = finding!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['claude-code']).toBeDefined();
    });

    it('detects .claude/CLAUDE.md', async () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.claude', 'CLAUDE.md'), '# Rules');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['claude-code']).toBeDefined();
    });

    it('detects .claude/commands/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '.claude', 'commands'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.claude', 'commands', 'scan.md'), '# Scan command');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['claude-code']).toBeDefined();
    });

    it('detects .claude/settings.json', async () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), '{"model": "opus"}');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['claude-code']).toBeDefined();
    });

    it('detects .claude/skills/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '.claude', 'skills'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.claude', 'skills', 'review.md'), '# Code review skill');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['claude-code']).toBeDefined();
    });
  });

  describe('CLAUDE.md structure quality', () => {
    it('reports sections found in CLAUDE.md', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'CLAUDE.md'),
        `# Project Memory

## Critical Rules
No AI attribution in commits.

## Project Structure
src/ for source, tests/ for tests.

## Common Tasks
Run npm test to test.
`,
      );

      const findings = await scanner.run(makeContext());
      const structureFinding = findings.find((f) => f.category === 'claude-md-structure');
      expect(structureFinding).toBeDefined();
      expect(structureFinding!.severity).toBe(Severity.PASS);
      const sections = structureFinding!.metadata?.sections as string[];
      expect(sections).toContain('Critical Rules');
      expect(sections).toContain('Project Structure');
      expect(sections).toContain('Common Tasks');
    });

    it('WARNING when CLAUDE.md has no recognized sections', async () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Notes\nSome random notes.');

      const findings = await scanner.run(makeContext());
      const structureFinding = findings.find((f) => f.category === 'claude-md-structure');
      expect(structureFinding).toBeDefined();
      expect(structureFinding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('Cursor IDE detection', () => {
    it('detects .cursorrules', async () => {
      fs.writeFileSync(path.join(tmpDir, '.cursorrules'), 'Use TypeScript strict mode.');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['cursor']).toBeDefined();
    });

    it('detects .cursor/rules', async () => {
      fs.mkdirSync(path.join(tmpDir, '.cursor'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.cursor', 'rules'), 'Always use const.');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['cursor']).toBeDefined();
    });

    it('detects .cursorignore', async () => {
      fs.writeFileSync(path.join(tmpDir, '.cursorignore'), 'node_modules\ndist');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['cursor']).toBeDefined();
    });
  });

  describe('GitHub Copilot detection', () => {
    it('detects .github/copilot-instructions.md', async () => {
      fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), '# Copilot Instructions');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['copilot']).toBeDefined();
    });
  });

  describe('other agent detection', () => {
    it('detects .gemini/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '.gemini'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.gemini', 'config'), '{}');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['gemini']).toBeDefined();
    });

    it('detects .cody/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '.cody'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.cody', 'config.json'), '{}');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['cody']).toBeDefined();
    });

    it('detects .amazonq/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '.amazonq'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.amazonq', 'rules'), 'rules');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['amazon-q']).toBeDefined();
    });

    it('detects .windsurf/rules', async () => {
      fs.mkdirSync(path.join(tmpDir, '.windsurf'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.windsurf', 'rules'), 'coding rules');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['windsurf']).toBeDefined();
    });
  });

  describe('OpenClaw detection', () => {
    it('detects SOUL.md', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'SOUL.md'),
        '# Identity\nI am a helpful assistant.\n\n## Communication Style\nFriendly and direct.',
      );

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['openclaw']).toBeDefined();
    });

    it('detects HEARTBEAT.md', async () => {
      fs.writeFileSync(path.join(tmpDir, 'HEARTBEAT.md'), '# Heartbeat Checklist\n- [ ] Check logs');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['openclaw']).toBeDefined();
    });

    it('detects .openclaw/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '.openclaw'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.openclaw', 'openclaw.json'), '{"model": "opus"}');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['openclaw']).toBeDefined();
    });

    it('lists all OpenClaw files detected', async () => {
      fs.writeFileSync(path.join(tmpDir, 'SOUL.md'), '# Identity\nAssistant.');
      fs.writeFileSync(path.join(tmpDir, 'HEARTBEAT.md'), '# Checklist');
      fs.mkdirSync(path.join(tmpDir, '.openclaw'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.openclaw', 'openclaw.json'), '{}');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      const openclaw = agents['openclaw'] as { files: string[] };
      expect(openclaw.files).toContain('SOUL.md');
      expect(openclaw.files).toContain('HEARTBEAT.md');
      expect(openclaw.files).toContain('.openclaw/');
    });
  });

  describe('AINative detection', () => {
    it('detects .ainative/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '.ainative'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ainative', 'config.yaml'), 'version: 1');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['ainative']).toBeDefined();
    });

    it('detects .ainative/skills/', async () => {
      fs.mkdirSync(path.join(tmpDir, '.ainative', 'skills'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ainative', 'skills', 'review.md'), '# Code Review');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['ainative']).toBeDefined();
    });

    it('detects .ainative/rules/', async () => {
      fs.mkdirSync(path.join(tmpDir, '.ainative', 'rules'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ainative', 'rules', 'git.md'), '# Git Rules');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['ainative']).toBeDefined();
    });

    it('detects .ainative/commands/', async () => {
      fs.mkdirSync(path.join(tmpDir, '.ainative', 'commands'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ainative', 'commands', 'deploy.md'), '# Deploy');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['ainative']).toBeDefined();
    });

    it('lists all AINative files detected', async () => {
      fs.mkdirSync(path.join(tmpDir, '.ainative', 'skills'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '.ainative', 'rules'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '.ainative', 'commands'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ainative', 'skills', 'review.md'), '# review');
      fs.writeFileSync(path.join(tmpDir, '.ainative', 'rules', 'git.md'), '# git');
      fs.writeFileSync(path.join(tmpDir, '.ainative', 'commands', 'deploy.md'), '# deploy');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      const ainative = agents['ainative'] as { files: string[] };
      expect(ainative.files).toContain('.ainative/');
      expect(ainative.files).toContain('.ainative/skills/');
      expect(ainative.files).toContain('.ainative/rules/');
      expect(ainative.files).toContain('.ainative/commands/');
    });
  });

  describe('.agents/ spec detection', () => {
    it('detects .agents/ directory with manifest.yaml', async () => {
      fs.mkdirSync(path.join(tmpDir, '.agents'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.agents', 'manifest.yaml'), 'version: "1.0"');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['agents-spec']).toBeDefined();
    });

    it('detects .agents/prompts/ and .agents/policies/', async () => {
      fs.mkdirSync(path.join(tmpDir, '.agents', 'prompts'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '.agents', 'policies'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.agents', 'prompts', 'base.md'), '# Base prompt');
      fs.writeFileSync(path.join(tmpDir, '.agents', 'policies', 'safety.yaml'), 'deny: []');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      const spec = agents['agents-spec'] as { files: string[] };
      expect(spec.files).toContain('.agents/');
      expect(spec.files).toContain('.agents/prompts/');
      expect(spec.files).toContain('.agents/policies/');
    });
  });

  describe('generic agentic files', () => {
    it('detects AGENTS.md', async () => {
      fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# Agent Guidelines');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['generic']).toBeDefined();
    });

    it('detects AI_GUIDELINES.md', async () => {
      fs.writeFileSync(path.join(tmpDir, 'AI_GUIDELINES.md'), '# AI Guidelines');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['generic']).toBeDefined();
    });

    it('detects .ai/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, '.ai'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ai', 'config.yaml'), 'rules: true');

      const findings = await scanner.run(makeContext());
      const agents = findings.find((f) => f.category === 'agentic-rules')!.metadata?.detectedAgents as Record<string, unknown>;
      expect(agents['generic']).toBeDefined();
    });
  });

  describe('severity based on agent count', () => {
    it('PASS when 2+ agent configs detected', async () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Rules');
      fs.writeFileSync(path.join(tmpDir, '.cursorrules'), 'Use TS');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'agentic-rules');
      expect(finding!.severity).toBe(Severity.PASS);
      expect(finding!.metadata?.agentCount).toBe(2);
    });

    it('PASS when 1 agent config detected', async () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Rules');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'agentic-rules');
      expect(finding!.severity).toBe(Severity.PASS);
      expect(finding!.metadata?.agentCount).toBe(1);
    });
  });

  describe('multiple agents', () => {
    it('reports all detected agents', async () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Rules');
      fs.writeFileSync(path.join(tmpDir, '.cursorrules'), 'rules');
      fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), '# Copilot');

      const findings = await scanner.run(makeContext());
      const finding = findings.find((f) => f.category === 'agentic-rules');
      expect(finding!.metadata?.agentCount).toBe(3);
      const agents = finding!.metadata?.detectedAgents as Record<string, unknown>;
      expect(Object.keys(agents)).toContain('claude-code');
      expect(Object.keys(agents)).toContain('cursor');
      expect(Object.keys(agents)).toContain('copilot');
    });
  });

  describe('edge cases', () => {
    it('handles missing repo path', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});
