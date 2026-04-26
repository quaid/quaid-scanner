/**
 * Token permission analysis scanner for GitHub Actions.
 *
 * Analyzes workflow files for overly permissive token permissions
 * and GITHUB_TOKEN usage patterns.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

export class TokenPermissionsScanner implements Scanner {
  readonly name = 'token-permissions';
  readonly displayName = 'Token Permission Analysis';
  readonly pillar = Pillar.SECURITY;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const workflowDir = path.join(repoPath, '.github', 'workflows');

    if (!fs.existsSync(workflowDir)) return [];

    const files = await glob('*.yml', {
      cwd: workflowDir,
      absolute: true,
      nodir: true,
    });

    // Also check .yaml extension
    const yamlFiles = await glob('*.yaml', {
      cwd: workflowDir,
      absolute: true,
      nodir: true,
    });
    files.push(...yamlFiles);

    if (files.length === 0) return [];

    const findings: Finding[] = [];
    let counter = 0;

    const makeFinding = (
      severity: Severity,
      message: string,
      file: string,
      line: number | null,
      suggestion: string,
    ): Finding => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity,
        pillar: this.pillar,
        category: 'token-permissions',
        message,
        file,
        line,
        column: null,
        suggestion,
      };
    };

    for (const filePath of files.sort()) {
      const relativePath = path.relative(repoPath, filePath);
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');

      // Check top-level permissions
      const topPerms = this.findTopLevelPermissions(lines);

      if (topPerms === null) {
        // No permissions block → CRITICAL
        findings.push(makeFinding(
          Severity.CRITICAL,
          `Workflow "${relativePath}" has no top-level permissions block (inherits default read-write)`,
          relativePath,
          null,
          'Add a "permissions:" block with minimal required permissions',
        ));
      } else if (topPerms.value === 'write-all') {
        findings.push(makeFinding(
          Severity.CRITICAL,
          `Workflow "${relativePath}" uses "permissions: write-all"`,
          relativePath,
          topPerms.line,
          'Replace with specific minimal permissions (e.g., contents: read)',
        ));
      } else if (topPerms.value === 'read-all' || topPerms.value === '{}') {
        findings.push(makeFinding(
          Severity.PASS,
          `Workflow "${relativePath}" uses minimal permissions (${topPerms.value})`,
          relativePath,
          topPerms.line,
          'Permissions are properly restricted',
        ));
      } else if (topPerms.scopes) {
        // Check individual scopes for write permissions
        for (const [scope, value] of Object.entries(topPerms.scopes)) {
          if (value === 'write') {
            findings.push(makeFinding(
              Severity.WARNING,
              `Workflow "${relativePath}" grants "${scope}: write" permission`,
              relativePath,
              null,
              `Review if "${scope}: write" is necessary. Use "read" if possible`,
            ));
          }
        }
        // If no write permissions found, it's a pass
        const hasWrite = Object.values(topPerms.scopes).some((v) => v === 'write');
        if (!hasWrite) {
          findings.push(makeFinding(
            Severity.PASS,
            `Workflow "${relativePath}" uses read-only permissions`,
            relativePath,
            topPerms.line,
            'Permissions are properly restricted',
          ));
        }
      }

      // Check job-level permissions
      this.checkJobPermissions(lines, relativePath, makeFinding, findings);

      // Check for GITHUB_TOKEN in curl/wget commands
      this.checkTokenInCommands(lines, relativePath, makeFinding, findings);
    }

    return findings;
  }

  private findTopLevelPermissions(lines: string[]): {
    value: string;
    line: number;
    scopes?: Record<string, string>;
  } | null {
    let inJobs = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimEnd();

      // Track if we've entered the jobs section
      if (/^jobs\s*:/.test(trimmed)) {
        inJobs = true;
        continue;
      }

      // Only look for top-level permissions (not indented, before or outside jobs)
      if (inJobs) continue;

      if (/^permissions\s*:/.test(trimmed)) {
        const afterColon = trimmed.split(':').slice(1).join(':').trim();

        if (afterColon === 'write-all' || afterColon === 'read-all') {
          return { value: afterColon, line: i + 1 };
        }

        if (afterColon === '{}') {
          return { value: '{}', line: i + 1 };
        }

        if (!afterColon) {
          // Multi-line permissions block
          const scopes: Record<string, string> = {};
          let j = i + 1;
          while (j < lines.length) {
            const scopeLine = lines[j];
            if (!scopeLine.startsWith('  ') && scopeLine.trim() && !scopeLine.startsWith('#')) break;
            const scopeMatch = scopeLine.match(/^\s+([\w-]+)\s*:\s*(\w+)/);
            if (scopeMatch) {
              scopes[scopeMatch[1]] = scopeMatch[2];
            }
            j++;
          }
          return { value: 'scoped', line: i + 1, scopes };
        }

        return { value: afterColon, line: i + 1 };
      }
    }

    return null;
  }

  private checkJobPermissions(
    lines: string[],
    file: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
    findings: Finding[],
  ): void {
    let currentJob: string | null = null;
    let inJobBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimEnd();

      // Detect job definitions (e.g., "  build:" under "jobs:")
      if (inJobBlock) {
        const jobMatch = trimmed.match(/^(\s{2,})(\w[\w-]*)\s*:/);
        if (jobMatch && jobMatch[1].length === 2) {
          currentJob = jobMatch[2];
        }
      }

      if (/^jobs\s*:/.test(trimmed)) {
        inJobBlock = true;
        continue;
      }

      // Detect job-level permissions
      if (currentJob && inJobBlock) {
        const permMatch = trimmed.match(/^(\s{4,})permissions\s*:/);
        if (permMatch) {
          // Parse job-level permission scopes
          let j = i + 1;
          while (j < lines.length) {
            const scopeLine = lines[j];
            if (!scopeLine.match(/^\s{6,}/)) break;
            const scopeMatch = scopeLine.match(/^\s+([\w-]+)\s*:\s*(\w+)/);
            if (scopeMatch && scopeMatch[2] === 'write') {
              findings.push(makeFinding(
                Severity.WARNING,
                `Job "${currentJob}" in "${file}" overrides "${scopeMatch[1]}: write" at job level`,
                file,
                j + 1,
                `Review if "${scopeMatch[1]}: write" is necessary for job "${currentJob}"`,
              ));
            }
            j++;
          }
        }
      }
    }
  }

  private checkTokenInCommands(
    lines: string[],
    file: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
    findings: Finding[],
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('secrets.GITHUB_TOKEN') && (line.includes('curl') || line.includes('wget'))) {
        findings.push(makeFinding(
          Severity.WARNING,
          `GITHUB_TOKEN used in curl/wget command in "${file}"`,
          file,
          i + 1,
          'Prefer using the GitHub CLI (gh) or official actions instead of raw API calls with tokens',
        ));
      }
    }
  }
}
