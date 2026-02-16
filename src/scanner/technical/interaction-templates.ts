/**
 * Interaction Template Validation scanner.
 *
 * Detects issue and PR templates, validates YAML front matter,
 * checks for required fields, and assesses guidance quality.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const ISSUE_TEMPLATE_DIR = '.github/ISSUE_TEMPLATE';
const LEGACY_ISSUE_TEMPLATE = '.github/ISSUE_TEMPLATE.md';
const PR_TEMPLATE_PATHS = [
  '.github/pull_request_template.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'pull_request_template.md',
];
const PR_TEMPLATE_DIR = '.github/PULL_REQUEST_TEMPLATE';

/** Extract YAML front matter between --- markers. */
function extractFrontMatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  // Simple key-value parsing (avoids YAML dependency)
  const result: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (kv) {
      const val = kv[2].trim();
      // Parse array notation
      if (val.startsWith('[') && val.endsWith(']')) {
        result[kv[1]] = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim());
      } else {
        result[kv[1]] = val;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function detectTemplateType(name: string, content: string): string | null {
  const lower = (name + ' ' + content).toLowerCase();
  if (/bug/i.test(lower)) return 'bug';
  if (/feature/i.test(lower)) return 'feature';
  if (/security/i.test(lower)) return 'security';
  if (/question/i.test(lower)) return 'question';
  return null;
}

export class InteractionTemplateScanner implements Scanner {
  readonly name = 'interaction-templates';
  readonly displayName = 'Interaction Template Validation';
  readonly pillar = Pillar.TECHNICAL;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    let counter = 0;

    const makeFinding = (
      severity: Severity,
      message: string,
      suggestion: string,
      metadata?: Record<string, unknown>,
    ): Finding => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity,
        pillar: this.pillar,
        category: 'interaction-templates',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const findings: Finding[] = [];

    // --- Issue Templates ---
    const issueTemplateDir = path.join(repoPath, ISSUE_TEMPLATE_DIR);
    const legacyIssueTemplate = path.join(repoPath, LEGACY_ISSUE_TEMPLATE);
    const issueTemplates: Array<{ name: string; content: string }> = [];

    if (fs.existsSync(issueTemplateDir)) {
      try {
        const files = fs.readdirSync(issueTemplateDir);
        for (const file of files) {
          if (file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.md')) {
            const content = fs.readFileSync(path.join(issueTemplateDir, file), 'utf-8');
            issueTemplates.push({ name: file, content });
          }
        }
      } catch {
        // skip
      }
    }

    if (issueTemplates.length === 0 && fs.existsSync(legacyIssueTemplate)) {
      try {
        const content = fs.readFileSync(legacyIssueTemplate, 'utf-8');
        issueTemplates.push({ name: 'ISSUE_TEMPLATE.md', content });
      } catch {
        // skip
      }
    }

    if (issueTemplates.length === 0) {
      findings.push(
        makeFinding(
          Severity.WARNING,
          'No issue templates configured',
          'Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates',
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.INFO,
          `${issueTemplates.length} issue template${issueTemplates.length === 1 ? '' : 's'} found`,
          'Issue templates help standardize bug reports and feature requests',
          { templateCount: issueTemplates.length },
        ),
      );

      // Validate YAML and check fields
      let allValid = true;
      let allHaveLabels = true;
      const templateTypes = new Set<string>();

      for (const template of issueTemplates) {
        const frontMatter = extractFrontMatter(template.content);
        if (frontMatter) {
          if (!frontMatter.labels) {
            allHaveLabels = false;
          }
          const type = detectTemplateType(
            (frontMatter.name as string) ?? template.name,
            template.content,
          );
          if (type) templateTypes.add(type);
        } else if (template.name.endsWith('.yml') || template.name.endsWith('.yaml')) {
          allValid = false;
        }

        // Also detect type from filename
        const filenameType = detectTemplateType(template.name, '');
        if (filenameType) templateTypes.add(filenameType);
      }

      if (allValid) {
        findings.push(
          makeFinding(
            Severity.PASS,
            'Issue template YAML front matter is valid',
            'Templates have well-formed front matter',
          ),
        );
      }

      if (!allHaveLabels) {
        findings.push(
          makeFinding(
            Severity.WARNING,
            'Some issue templates are missing labels field in YAML front matter',
            'Add labels to templates for automatic issue triage',
          ),
        );
      }

      // Template types coverage
      const hasBug = templateTypes.has('bug');
      const hasFeature = templateTypes.has('feature');
      if (hasBug && hasFeature) {
        findings.push(
          makeFinding(
            Severity.PASS,
            `Issue templates cover bug and feature types (${[...templateTypes].join(', ')})`,
            'Good template coverage for common issue types',
            { types: [...templateTypes] },
          ),
        );
      }
    }

    // --- PR Templates ---
    let prTemplateContent: string | null = null;
    let prTemplateFile: string | null = null;

    for (const prPath of PR_TEMPLATE_PATHS) {
      const fullPath = path.join(repoPath, prPath);
      if (fs.existsSync(fullPath)) {
        try {
          prTemplateContent = fs.readFileSync(fullPath, 'utf-8');
          prTemplateFile = prPath;
        } catch {
          // skip
        }
        break;
      }
    }

    if (!prTemplateContent) {
      const prDirPath = path.join(repoPath, PR_TEMPLATE_DIR);
      if (fs.existsSync(prDirPath)) {
        try {
          const files = fs.readdirSync(prDirPath);
          if (files.length > 0) {
            prTemplateContent = fs.readFileSync(path.join(prDirPath, files[0]), 'utf-8');
            prTemplateFile = `${PR_TEMPLATE_DIR}/${files[0]}`;
          }
        } catch {
          // skip
        }
      }
    }

    if (prTemplateContent && prTemplateFile) {
      const hasCheckboxes = /- \[ \]/.test(prTemplateContent);
      findings.push(
        makeFinding(
          Severity.PASS,
          `PR template found: ${prTemplateFile}`,
          'PR templates help maintain contribution quality',
          { file: prTemplateFile, hasCheckboxes },
        ),
      );
    }

    return findings;
  }
}
