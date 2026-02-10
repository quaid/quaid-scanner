/**
 * Documentation language scanner for inclusive terminology.
 *
 * Scans documentation files (.md, .txt, .rst, .adoc, .html) for
 * non-inclusive terms as defined by the Inclusive Naming Initiative
 * and reports findings with severity mapped to term tier.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { Pillar, Severity } from '../../types/index.js';
import { TermListManager, type LoadedTerm } from './term-list.js';

/** File extensions considered documentation files. */
const DOC_EXTENSIONS = ['md', 'txt', 'rst', 'adoc', 'html'];

/** Directories always excluded from scanning. */
const EXCLUDED_DIRS = ['node_modules', 'vendor', '.git'];

/** Inline suppression comment that disables scanning for a line. */
const SUPPRESSION_MARKER = '<!-- inclusive-naming-ignore -->';

/**
 * Map term tier to finding severity.
 * Tier 1 = CRITICAL, Tier 2 = WARNING, Tier 3 = INFO.
 */
function tierToSeverity(tier: 1 | 2 | 3): Severity {
  switch (tier) {
    case 1:
      return Severity.CRITICAL;
    case 2:
      return Severity.WARNING;
    case 3:
      return Severity.INFO;
  }
}

/**
 * Extract a context snippet around a match position in a line.
 * Returns up to 20 characters before and after the matched text.
 */
function extractContext(line: string, matchStart: number, matchLength: number): string {
  const contextRadius = 20;
  const start = Math.max(0, matchStart - contextRadius);
  const end = Math.min(line.length, matchStart + matchLength + contextRadius);
  let snippet = line.slice(start, end);

  if (start > 0) {
    snippet = '...' + snippet;
  }
  if (end < line.length) {
    snippet = snippet + '...';
  }

  return snippet;
}

/**
 * Generate a unique finding ID from scanner name, file path, line, and term.
 */
function generateFindingId(file: string, line: number, term: string): string {
  return `inclusive-doc-scanner:${file}:${line}:${term}`;
}

/**
 * Scanner that checks documentation files for non-inclusive terminology.
 *
 * Uses the TermListManager to load bundled and custom term lists,
 * respects ignored terms from configuration, and supports per-line
 * suppression via inline HTML comments.
 */
export class InclusiveDocScanner implements Scanner {
  readonly name = 'inclusive-doc-scanner';
  readonly displayName = 'Documentation Language Scanner';
  readonly pillar = Pillar.INCLUSIVE;

  private readonly termListManager: TermListManager;

  constructor() {
    this.termListManager = new TermListManager();
  }

  /**
   * Run the documentation language scan.
   *
   * @param context - The scan context containing repo path and configuration
   * @returns Array of findings for non-inclusive terms found in documentation
   */
  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath, config } = context;
    const inclusiveConfig = config.inclusive;

    // Load terms (bundled + custom, minus ignored)
    const termList = await this.termListManager.loadTerms(inclusiveConfig);
    const terms = termList.terms;

    if (terms.length === 0) {
      return [];
    }

    // Find documentation files
    const files = await this.findDocFiles(repoPath);
    const findings: Finding[] = [];

    for (const absolutePath of files) {
      const relativePath = path.relative(repoPath, absolutePath);
      const fileFindings = this.scanFile(absolutePath, relativePath, terms);
      findings.push(...fileFindings);
    }

    return findings;
  }

  /**
   * Find all documentation files in the repository, excluding
   * node_modules, vendor, and .git directories.
   */
  private async findDocFiles(repoPath: string): Promise<string[]> {
    const patterns = DOC_EXTENSIONS.map((ext) => `**/*.${ext}`);
    const ignorePatterns = EXCLUDED_DIRS.map((dir) => `${dir}/**`);

    const files = await glob(patterns, {
      cwd: repoPath,
      absolute: true,
      nodir: true,
      ignore: ignorePatterns,
    });

    return files;
  }

  /**
   * Scan a single file for non-inclusive terms.
   */
  private scanFile(absolutePath: string, relativePath: string, terms: LoadedTerm[]): Finding[] {
    const findings: Finding[] = [];

    let content: string;
    try {
      content = fs.readFileSync(absolutePath, 'utf-8');
    } catch {
      // Skip files that cannot be read
      return [];
    }

    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;

      // Check for per-line suppression
      if (line.includes(SUPPRESSION_MARKER)) {
        continue;
      }

      for (const term of terms) {
        // Use a fresh regex per line to reset lastIndex state.
        // Ensure 'g' flag is present exactly once for exec() iteration.
        const flags = term.pattern.flags.includes('g')
          ? term.pattern.flags
          : term.pattern.flags + 'g';
        const pattern = new RegExp(term.pattern.source, flags);
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const column = match.index;
          const matchedText = match[0];
          const contextSnippet = extractContext(line, column, matchedText.length);

          findings.push({
            id: generateFindingId(relativePath, lineNumber, term.term),
            severity: tierToSeverity(term.tier),
            pillar: Pillar.INCLUSIVE,
            category: 'inclusive-language',
            message: `Non-inclusive term "${term.term}" found. Consider using: ${term.replacements.join(', ')}`,
            file: relativePath,
            line: lineNumber,
            column,
            context: contextSnippet,
            suggestion: `Replace "${matchedText}" with one of: ${term.replacements.join(', ')}`,
            referenceUrl: 'https://inclusivenaming.org/word-lists/',
            metadata: {
              matchedText,
              tier: term.tier,
              replacements: term.replacements,
              reason: term.reason,
            },
          });
        }
      }
    }

    return findings;
  }
}
