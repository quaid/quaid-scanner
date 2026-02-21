/**
 * Multi-Model Agentic Rule Detection scanner.
 *
 * Detects AI coding agent configuration files for Claude Code, Cursor,
 * Copilot, Gemini, Cody, Amazon Q, Windsurf, and generic agentic configs.
 * Parses CLAUDE.md for structural quality.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

interface AgentDetection {
  agent: string;
  files: string[];
}

/** CLAUDE.md sections to check for structural quality. */
const CLAUDE_MD_SECTIONS = [
  'Critical Rules',
  'Project Structure',
  'Common Tasks',
  'Available Commands',
  'Environment Variables',
  'Important Rules',
  'Testing',
  'Code Quality',
  'Skills',
  'Commands',
];

export class AgenticRulesScanner implements Scanner {
  readonly name = 'agentic-rules';
  readonly displayName = 'Multi-Model Agentic Rule Detection';
  readonly pillar = Pillar.AI_READINESS;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];
    const detectedAgents: Record<string, AgentDetection> = {};

    try {
      this.detectClaudeCode(repoPath, detectedAgents);
      this.detectCursor(repoPath, detectedAgents);
      this.detectCopilot(repoPath, detectedAgents);
      this.detectGemini(repoPath, detectedAgents);
      this.detectCody(repoPath, detectedAgents);
      this.detectAmazonQ(repoPath, detectedAgents);
      this.detectWindsurf(repoPath, detectedAgents);
      this.detectGeneric(repoPath, detectedAgents);
    } catch {
      // Handle missing repo path
    }

    const agentCount = Object.keys(detectedAgents).length;
    const agentNames = Object.values(detectedAgents).map((a) => a.agent);

    let severity: Severity;
    let message: string;

    if (agentCount >= 2) {
      severity = Severity.PASS;
      message = `${agentCount} AI agent configurations detected: ${agentNames.join(', ')}`;
    } else if (agentCount === 1) {
      severity = Severity.PASS;
      message = `AI agent configuration detected: ${agentNames[0]}`;
    } else {
      severity = Severity.INFO;
      message = 'No AI agent configuration files detected';
    }

    // Build metadata with file lists per agent
    const agentMeta: Record<string, unknown> = {};
    for (const [key, detection] of Object.entries(detectedAgents)) {
      agentMeta[key] = { agent: detection.agent, files: detection.files };
    }

    findings.push({
      id: `${this.name}-1`,
      severity,
      pillar: this.pillar,
      category: 'agentic-rules',
      message,
      file: null,
      line: null,
      column: null,
      suggestion: agentCount > 0
        ? 'Agent configurations are in place for AI-assisted development.'
        : 'Consider adding CLAUDE.md, .cursorrules, or copilot-instructions.md to guide AI coding agents.',
      metadata: {
        agentCount,
        agentNames,
        detectedAgents: agentMeta,
      },
    });

    // CLAUDE.md structure quality check
    const claudeMdFinding = this.checkClaudeMdStructure(repoPath);
    if (claudeMdFinding) {
      findings.push(claudeMdFinding);
    }

    return findings;
  }

  private detectClaudeCode(repoPath: string, agents: Record<string, AgentDetection>): void {
    const files: string[] = [];

    if (this.fileExists(repoPath, 'CLAUDE.md')) files.push('CLAUDE.md');
    if (this.fileExists(repoPath, '.claude/CLAUDE.md')) files.push('.claude/CLAUDE.md');
    if (this.dirExists(repoPath, '.claude/commands')) files.push('.claude/commands/');
    if (this.fileExists(repoPath, '.claude/settings.json')) files.push('.claude/settings.json');
    if (this.dirExists(repoPath, '.claude/skills')) files.push('.claude/skills/');

    if (files.length > 0) {
      agents['claude-code'] = { agent: 'Claude Code', files };
    }
  }

  private detectCursor(repoPath: string, agents: Record<string, AgentDetection>): void {
    const files: string[] = [];

    if (this.fileExists(repoPath, '.cursorrules')) files.push('.cursorrules');
    if (this.fileExists(repoPath, '.cursor/rules')) files.push('.cursor/rules');
    if (this.fileExists(repoPath, '.cursorignore')) files.push('.cursorignore');

    if (files.length > 0) {
      agents['cursor'] = { agent: 'Cursor', files };
    }
  }

  private detectCopilot(repoPath: string, agents: Record<string, AgentDetection>): void {
    const files: string[] = [];

    if (this.fileExists(repoPath, '.github/copilot-instructions.md')) files.push('.github/copilot-instructions.md');
    if (this.fileExists(repoPath, '.copilot-codegeneration.yml')) files.push('.copilot-codegeneration.yml');

    if (files.length > 0) {
      agents['copilot'] = { agent: 'GitHub Copilot', files };
    }
  }

  private detectGemini(repoPath: string, agents: Record<string, AgentDetection>): void {
    if (this.dirExists(repoPath, '.gemini')) {
      agents['gemini'] = { agent: 'Google Gemini', files: ['.gemini/'] };
    }
  }

  private detectCody(repoPath: string, agents: Record<string, AgentDetection>): void {
    if (this.dirExists(repoPath, '.cody')) {
      agents['cody'] = { agent: 'Sourcegraph Cody', files: ['.cody/'] };
    }
  }

  private detectAmazonQ(repoPath: string, agents: Record<string, AgentDetection>): void {
    if (this.dirExists(repoPath, '.amazonq')) {
      agents['amazon-q'] = { agent: 'Amazon Q', files: ['.amazonq/'] };
    }
  }

  private detectWindsurf(repoPath: string, agents: Record<string, AgentDetection>): void {
    const files: string[] = [];

    if (this.dirExists(repoPath, '.windsurf')) files.push('.windsurf/');
    if (this.fileExists(repoPath, '.windsurf/rules')) files.push('.windsurf/rules');
    if (this.dirExists(repoPath, '.codeium')) files.push('.codeium/');

    if (files.length > 0) {
      agents['windsurf'] = { agent: 'Windsurf/Codeium', files };
    }
  }

  private detectGeneric(repoPath: string, agents: Record<string, AgentDetection>): void {
    const files: string[] = [];

    if (this.fileExists(repoPath, 'AGENTS.md')) files.push('AGENTS.md');
    if (this.fileExists(repoPath, 'AI_GUIDELINES.md')) files.push('AI_GUIDELINES.md');
    if (this.dirExists(repoPath, '.ai')) files.push('.ai/');

    if (files.length > 0) {
      agents['generic'] = { agent: 'Generic AI Config', files };
    }
  }

  private checkClaudeMdStructure(repoPath: string): Finding | null {
    let content: string | null = null;
    let source: string | null = null;

    try {
      content = fs.readFileSync(path.join(repoPath, 'CLAUDE.md'), 'utf-8');
      source = 'CLAUDE.md';
    } catch {
      try {
        content = fs.readFileSync(path.join(repoPath, '.claude', 'CLAUDE.md'), 'utf-8');
        source = '.claude/CLAUDE.md';
      } catch {
        return null;
      }
    }

    if (!content) return null;

    const foundSections: string[] = [];
    for (const section of CLAUDE_MD_SECTIONS) {
      const pattern = new RegExp(`^#{1,3}\\s+${section.replace(/\s+/g, '\\s+')}\\b`, 'im');
      if (pattern.test(content)) {
        foundSections.push(section);
      }
    }

    const hasGoodStructure = foundSections.length >= 2;

    return {
      id: `${this.name}-2`,
      severity: hasGoodStructure ? Severity.PASS : Severity.WARNING,
      pillar: this.pillar,
      category: 'claude-md-structure',
      message: hasGoodStructure
        ? `CLAUDE.md has ${foundSections.length} recognized sections: ${foundSections.join(', ')}`
        : 'CLAUDE.md lacks recognized structural sections',
      file: source,
      line: null,
      column: null,
      suggestion: hasGoodStructure
        ? 'CLAUDE.md is well-structured for agent consumption.'
        : 'Add sections like "Critical Rules", "Project Structure", "Common Tasks" to improve agent guidance.',
      metadata: {
        source,
        sections: foundSections,
        sectionCount: foundSections.length,
      },
    };
  }

  private fileExists(repoPath: string, relativePath: string): boolean {
    try {
      return fs.statSync(path.join(repoPath, relativePath)).isFile();
    } catch {
      return false;
    }
  }

  private dirExists(repoPath: string, relativePath: string): boolean {
    try {
      return fs.statSync(path.join(repoPath, relativePath)).isDirectory();
    } catch {
      return false;
    }
  }
}
