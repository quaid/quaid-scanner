/**
 * Diminishing Language Scanner for quaid-scanner.
 *
 * Detects dismissive and diminishing language patterns in documentation
 * that may discourage newcomers and make content less welcoming.
 *
 * Patterns include: "just [verb]", "simply [verb]", "easy/easily",
 * "obviously", "trivial", "everyone knows", etc.
 */

import { readFileSync } from 'fs';
import { relative } from 'path';
import { glob } from 'glob';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { Pillar, Severity } from '../../types/index.js';

/** A diminishing language pattern definition. */
interface DiminishingPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  suggestion: string;
}

/** All diminishing language patterns to detect. */
const DIMINISHING_PATTERNS: DiminishingPattern[] = [
  {
    name: 'just [verb]',
    pattern: /\bjust\s+(run|do|add|use|change|set|put|make|click|type|enter|install|clone|fork)\b/i,
    severity: Severity.WARNING,
    suggestion:
      'Remove "just" — it implies the task is trivial and can discourage readers who find it difficult.',
  },
  {
    name: 'simply [verb]',
    pattern: /\bsimply\s+(run|do|add|use|change|set|put|make|click|type|enter|install)\b/i,
    severity: Severity.WARNING,
    suggestion:
      'Remove "simply" — it implies the task should be obvious and can make readers feel inadequate.',
  },
  {
    name: 'easy/easily',
    pattern: /\b(easy|easily)\b/i,
    severity: Severity.INFO,
    suggestion:
      'Consider removing "easy/easily" — what is easy for one person may be challenging for another.',
  },
  {
    name: 'obvious/obviously',
    pattern: /\bobvious(ly)?\b/i,
    severity: Severity.WARNING,
    suggestion:
      'Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.',
  },
  {
    name: 'trivial',
    pattern: /\btrivial(ly)?\b/i,
    severity: Severity.INFO,
    suggestion:
      'Consider replacing "trivial" with specific guidance about the expected effort level.',
  },
  {
    name: 'everyone knows',
    pattern: /\beveryone\s+knows\b/i,
    severity: Severity.WARNING,
    suggestion:
      'Remove "everyone knows" — not everyone has the same knowledge. Explain the concept instead.',
  },
  {
    name: 'as you know',
    pattern: /\bas\s+you\s+(probably\s+)?know\b/i,
    severity: Severity.WARNING,
    suggestion:
      'Remove "as you know" — readers may not know. State the information directly.',
  },
  {
    name: 'of course',
    pattern: /\bof\s+course\b/i,
    severity: Severity.INFO,
    suggestion:
      'Consider removing "of course" — it assumes shared knowledge that newcomers may lack.',
  },
  {
    name: 'clearly',
    pattern: /\bclearly\b/i,
    severity: Severity.INFO,
    suggestion:
      'Consider removing "clearly" — if it is clear, the reader will see it without being told.',
  },
  {
    name: 'basically',
    pattern: /\bbasically\b/i,
    severity: Severity.INFO,
    suggestion:
      'Consider removing "basically" — provide the actual explanation instead of a simplification signal.',
  },
];

/** File glob patterns to scan for documentation. */
const SCAN_PATTERNS = ['**/*.md', '**/README*', '**/CONTRIBUTING*', 'docs/**/*'];

/**
 * Determines which line indices are inside code blocks.
 * Handles both fenced code blocks (``` ... ```) and indented code blocks (4+ spaces).
 *
 * @param lines - Array of lines from the file content
 * @returns Set of line indices that are inside code blocks
 */
function getCodeBlockLines(lines: string[]): Set<number> {
  const codeLines = new Set<number>();
  let inFencedBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();

    if (trimmed.startsWith('```')) {
      codeLines.add(i);
      inFencedBlock = !inFencedBlock;
      continue;
    }

    if (inFencedBlock) {
      codeLines.add(i);
      continue;
    }

    // Indented code block: 4+ spaces or a tab at the start
    if (/^(\s{4,}|\t)/.test(lines[i]) && lines[i].trim().length > 0) {
      codeLines.add(i);
    }
  }

  return codeLines;
}

/**
 * Checks if a line has the inclusive-ok suppression comment.
 *
 * @param line - A single line of text
 * @returns true if the line contains the suppression marker
 */
function isSuppressed(line: string): boolean {
  return line.includes('<!-- inclusive-ok -->');
}

/**
 * Diminishing Language Scanner implementation.
 *
 * Scans documentation files for dismissive or diminishing language
 * that may make content less welcoming to newcomers.
 */
export class DiminishingLanguageScanner implements Scanner {
  readonly name = 'diminishing-language-scanner';
  readonly displayName = 'Diminishing Language Scanner';
  readonly pillar = Pillar.INCLUSIVE;

  /**
   * Run the scanner against documentation files in the repository.
   *
   * @param context - The scan context with repo path and configuration
   * @returns Array of findings including per-match findings and a summary
   */
  async run(context: ScanContext): Promise<Finding[]> {
    const files = await this.findFiles(context.repoPath);
    const findings: Finding[] = [];
    const fileGroups: Record<string, number> = {};

    let warningCount = 0;
    let infoCount = 0;

    for (const filePath of files) {
      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      const codeBlockLines = getCodeBlockLines(lines);
      const relPath = relative(context.repoPath, filePath);
      let fileMatchCount = 0;

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];

        // Skip code block lines
        if (codeBlockLines.has(lineIdx)) {
          continue;
        }

        // Skip suppressed lines
        if (isSuppressed(line)) {
          continue;
        }

        for (const dp of DIMINISHING_PATTERNS) {
          const match = dp.pattern.exec(line);
          if (match) {
            const matchedText = match[0].toLowerCase();
            const lineNumber = lineIdx + 1;

            findings.push({
              id: `DIMINISH-${relPath}:${lineNumber}:${dp.name}`,
              severity: dp.severity,
              pillar: Pillar.INCLUSIVE,
              category: 'diminishing-language',
              message: `Found diminishing language "${matchedText}" in documentation`,
              file: relPath,
              line: lineNumber,
              column: match.index + 1,
              context: line.trim(),
              suggestion: dp.suggestion,
            });

            fileMatchCount++;

            if (dp.severity === Severity.WARNING) {
              warningCount++;
            } else if (dp.severity === Severity.INFO) {
              infoCount++;
            }
          }
        }
      }

      if (fileMatchCount > 0) {
        fileGroups[relPath] = fileMatchCount;
      }
    }

    // Calculate welcoming score: 100 - (warning_count * 3 + info_count * 1), minimum 0
    const welcomingScore = Math.max(0, 100 - (warningCount * 3 + infoCount * 1));

    // Determine severity based on thresholds
    let summarySeverity: Severity;
    if (welcomingScore > 85) {
      summarySeverity = Severity.PASS;
    } else if (welcomingScore >= 60) {
      summarySeverity = Severity.WARNING;
    } else {
      summarySeverity = Severity.CRITICAL;
    }

    // Add summary finding
    findings.push({
      id: 'DIMINISH-SUMMARY',
      severity: summarySeverity,
      pillar: Pillar.INCLUSIVE,
      category: 'welcoming-score',
      message: `Welcoming score: ${welcomingScore}/100 (${warningCount} warnings, ${infoCount} info)`,
      file: null,
      line: null,
      column: null,
      suggestion:
        welcomingScore > 85
          ? 'Documentation language is welcoming. Keep it up!'
          : 'Review flagged diminishing language to make documentation more welcoming to all skill levels.',
      metadata: {
        welcomingScore,
        warningCount,
        infoCount,
        fileGroups,
      },
    });

    return findings;
  }

  /**
   * Find all documentation files to scan.
   *
   * @param repoPath - Root path of the repository
   * @returns Array of absolute file paths to scan
   */
  private async findFiles(repoPath: string): Promise<string[]> {
    const fileSet = new Set<string>();

    for (const pattern of SCAN_PATTERNS) {
      const matched = await glob(pattern, {
        cwd: repoPath,
        absolute: true,
        nodir: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      });
      for (const f of matched) {
        fileSet.add(f);
      }
    }

    return Array.from(fileSet).sort();
  }
}
