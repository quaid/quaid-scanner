/**
 * Assumed Knowledge Scanner for quaid-scanner.
 *
 * Detects assumed prerequisite knowledge in documentation files,
 * including unexplained git operations, tool assumptions without
 * prerequisites sections, and undefined acronyms.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** Files to scan for assumed knowledge. */
const TARGET_FILES: string[] = [
  'README.md',
  'CONTRIBUTING.md',
  'INSTALL.md',
  'docs/getting-started.md',
];

/** Git operation patterns and their labels. */
const GIT_OPERATIONS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'fork', pattern: /fork\s+(the|this)?\s*repo/i },
  { label: 'clone', pattern: /(git\s+)?clone\s+/i },
  { label: 'branch', pattern: /git\s+(checkout|branch|switch)\s+-?b?\s*/i },
  { label: 'rebase', pattern: /\brebase\b/i },
  { label: 'cherry-pick', pattern: /cherry[- ]?pick/i },
];

/** Tool command patterns and the prerequisite they require. */
const TOOL_PATTERNS: Array<{ label: string; pattern: RegExp; prerequisite: string }> = [
  { label: 'npm', pattern: /npm\s+(install|run|test|start)/i, prerequisite: 'Node.js' },
  { label: 'pip', pattern: /pip\s+install/i, prerequisite: 'Python' },
  { label: 'cargo', pattern: /cargo\s+(build|run|test)/i, prerequisite: 'Rust' },
  { label: 'make', pattern: /make\s+\w+/i, prerequisite: 'build tools' },
  { label: 'docker', pattern: /docker\s+(run|build|compose)/i, prerequisite: 'Docker' },
];

/** Well-known acronyms that do not need definition. */
const KNOWN_ACRONYMS = new Set<string>([
  'API', 'URL', 'HTML', 'CSS', 'JSON', 'YAML', 'HTTP', 'HTTPS',
  'REST', 'CLI', 'GUI', 'IDE', 'OS', 'SDK', 'SQL', 'SSH', 'SSL',
  'TLS', 'DOM', 'DNS', 'IP', 'TCP', 'UDP', 'AWS', 'GCP', 'CI',
  'CD', 'PR', 'NPM', 'MIT',
]);

/** Pattern to match prerequisite/requirements section headings. */
const PREREQUISITES_HEADING = /^#{1,3}\s+(prerequisites|requirements)\s*$/im;

/** Pattern to match uppercase acronyms (3+ letters). */
const ACRONYM_PATTERN = /\b[A-Z]{3,}\b/g;

/**
 * Scanner that detects assumed prerequisite knowledge in documentation.
 *
 * Checks for:
 * - Unexplained git operations (fork, clone, rebase, etc.)
 * - Tool usage without a prerequisites section (npm, pip, docker, etc.)
 * - Undefined acronyms that may confuse newcomers
 * - Missing prerequisites/requirements section in README
 */
export class AssumedKnowledgeScanner implements Scanner {
  readonly name = 'assumed-knowledge-scanner';
  readonly displayName = 'Assumed Knowledge Detector';
  readonly pillar = Pillar.INCLUSIVE;

  /**
   * Scan documentation files for assumed prerequisite knowledge.
   */
  async run(context: ScanContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const relPath of TARGET_FILES) {
      const absPath = path.join(context.repoPath, relPath);
      if (!fs.existsSync(absPath)) {
        continue;
      }

      const content = fs.readFileSync(absPath, 'utf-8');
      const lines = content.split('\n');

      findings.push(...this.detectGitOperations(relPath, lines));
      findings.push(...this.detectToolAssumptions(relPath, lines, content));
      findings.push(...this.detectUndefinedAcronyms(relPath, lines));
    }

    // Check README.md for missing prerequisites section
    findings.push(...this.checkMissingPrerequisites(context.repoPath, findings));

    return findings;
  }

  /**
   * Detect unexplained git operations in documentation lines.
   */
  private detectGitOperations(file: string, lines: string[]): Finding[] {
    const findings: Finding[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const op of GIT_OPERATIONS) {
        if (op.pattern.test(line)) {
          findings.push({
            id: `AK-GIT-${op.label.toUpperCase()}-${file}:${i + 1}`,
            severity: Severity.INFO,
            pillar: Pillar.INCLUSIVE,
            category: 'assumed-knowledge',
            message: `Assumed knowledge: "${op.label}" operation used without explanation`,
            file,
            line: i + 1,
            column: null,
            suggestion: `Consider explaining what "${op.label}" means or linking to a beginner-friendly guide`,
          });
          break; // Only report one git operation per line
        }
      }
    }

    return findings;
  }

  /**
   * Detect tool commands that assume prerequisite software is installed.
   * Only flags findings if the file has no Prerequisites/Requirements section.
   */
  private detectToolAssumptions(
    file: string,
    lines: string[],
    content: string,
  ): Finding[] {
    const findings: Finding[] = [];
    const hasPrerequisites = PREREQUISITES_HEADING.test(content);

    if (hasPrerequisites) {
      return findings;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const tool of TOOL_PATTERNS) {
        if (tool.pattern.test(line)) {
          findings.push({
            id: `AK-TOOL-${tool.label.toUpperCase()}-${file}:${i + 1}`,
            severity: Severity.INFO,
            pillar: Pillar.INCLUSIVE,
            category: 'assumed-knowledge',
            message: `Assumed knowledge: "${tool.label}" command used without ${tool.prerequisite} listed as prerequisite`,
            file,
            line: i + 1,
            column: null,
            suggestion: `Add ${tool.prerequisite} to a Prerequisites section so newcomers know what to install`,
          });
          break; // Only report one tool per line
        }
      }
    }

    return findings;
  }

  /**
   * Detect undefined acronyms (uppercase 3+ chars) not in the known allowlist.
   *
   * Only flags the first occurrence of each unknown acronym per file.
   * Checks whether the acronym is defined within 500 characters before its usage.
   */
  private detectUndefinedAcronyms(
    file: string,
    lines: string[],
  ): Finding[] {
    const findings: Finding[] = [];
    const seenAcronyms = new Set<string>();
    const fullContent = lines.join('\n');
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const acronymRegex = new RegExp(ACRONYM_PATTERN.source, 'g');
      let match: RegExpExecArray | null;

      while ((match = acronymRegex.exec(line)) !== null) {
        const acronym = match[0];

        // Skip known acronyms
        if (KNOWN_ACRONYMS.has(acronym)) {
          continue;
        }

        // Skip if already flagged in this file
        if (seenAcronyms.has(acronym)) {
          continue;
        }

        // Check if acronym is defined within 500 chars before this occurrence
        const posInContent = charOffset + match.index;
        const lookbackStart = Math.max(0, posInContent - 500);
        const precedingText = fullContent.substring(lookbackStart, posInContent);

        const definitionPattern = new RegExp(
          `${acronym}\\s*\\(|\\(\\s*${acronym}\\s*\\)`,
          'i',
        );
        if (definitionPattern.test(precedingText)) {
          seenAcronyms.add(acronym);
          continue;
        }

        seenAcronyms.add(acronym);
        findings.push({
          id: `AK-ACRONYM-${acronym}-${file}:${i + 1}`,
          severity: Severity.INFO,
          pillar: Pillar.INCLUSIVE,
          category: 'undefined-acronym',
          message: `Undefined acronym "${acronym}" may confuse newcomers`,
          file,
          line: i + 1,
          column: match.index + 1,
          suggestion: `Define "${acronym}" on first use, e.g., "${acronym} (Full Name)"`,
        });
      }

      charOffset += line.length + 1; // +1 for the newline character
    }

    return findings;
  }

  /**
   * Check if README.md has tool commands but no Prerequisites/Requirements section.
   * Emits a WARNING finding if commands are present without a prerequisites section.
   */
  private checkMissingPrerequisites(
    repoPath: string,
    existingFindings: Finding[],
  ): Finding[] {
    const findings: Finding[] = [];
    const readmePath = path.join(repoPath, 'README.md');

    if (!fs.existsSync(readmePath)) {
      return findings;
    }

    const content = fs.readFileSync(readmePath, 'utf-8');

    // Check if there is a prerequisites or requirements section
    if (PREREQUISITES_HEADING.test(content)) {
      return findings;
    }

    // Check if there are any tool command findings from README.md
    const hasToolFindings = existingFindings.some(
      (f) =>
        f.file === 'README.md' &&
        f.category === 'assumed-knowledge' &&
        f.id.startsWith('AK-TOOL-'),
    );

    if (hasToolFindings) {
      findings.push({
        id: 'AK-PREREQ-MISSING-README.md',
        severity: Severity.WARNING,
        pillar: Pillar.INCLUSIVE,
        category: 'missing-prerequisites',
        message: 'README.md contains tool commands but no Prerequisites or Requirements section',
        file: 'README.md',
        line: null,
        column: null,
        suggestion: 'Consider adding a Prerequisites section listing required tools and versions',
      });
    }

    return findings;
  }
}
