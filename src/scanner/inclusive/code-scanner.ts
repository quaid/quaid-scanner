/**
 * Inclusive naming code scanner.
 *
 * Scans code comments and string literals for non-inclusive
 * terminology, matching against the term list. Only flags
 * terms found in comments and strings, not code identifiers.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { TermListManager } from './term-list.js';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** File extensions to scan. */
const CODE_EXTENSIONS: string[] = [
  '**/*.js',
  '**/*.ts',
  '**/*.py',
  '**/*.go',
  '**/*.java',
  '**/*.rs',
  '**/*.rb',
  '**/*.c',
  '**/*.cpp',
  '**/*.h',
];

/** Directories to exclude from scanning. */
const EXCLUDED_DIRS: string[] = [
  'node_modules/',
  'vendor/',
  '.git/',
  'dist/',
  'build/',
];

/** Languages that use # for single-line comments. */
const HASH_COMMENT_EXTENSIONS = new Set(['.py', '.rb']);

/** Per-line suppression marker. */
const SUPPRESSION_MARKER = 'inclusive-naming-ignore';

/**
 * Map term tiers to finding severities.
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
 * Represents a text region extracted from a line of code.
 */
interface ExtractedRegion {
  text: string;
  startCol: number;
}

/**
 * Extract comment and string literal regions from a single line.
 *
 * This deliberately avoids matching terms in code identifiers
 * by only returning text that is inside comments or string literals.
 */
function extractRegions(line: string, ext: string): ExtractedRegion[] {
  const regions: ExtractedRegion[] = [];
  const usesHash = HASH_COMMENT_EXTENSIONS.has(ext);

  // Track whether we are inside a multi-line comment for the caller.
  // (Multi-line state is tracked externally; this extracts single-line regions.)

  // 1. Check for single-line comment: // or # (for Python/Ruby)
  let singleLineCommentStart = -1;

  // We need to walk the line character by character to avoid matching
  // // or # inside string literals.
  let inString: string | null = null;
  let i = 0;
  const stringRegions: ExtractedRegion[] = [];

  while (i < line.length) {
    const ch = line[i];
    const next = i + 1 < line.length ? line[i + 1] : '';

    if (inString !== null) {
      // Inside a string literal
      if (ch === '\\') {
        // Skip escaped character
        i += 2;
        continue;
      }
      if (ch === inString) {
        // End of string - extract the content between quotes
        // The string started at stringStartIndex (after the quote)
        // and ends here (before the quote).
        // We already recorded the start, so let's just note we are exiting.
        inString = null;
        i++;
        continue;
      }
      i++;
      continue;
    }

    // Not inside a string
    if (ch === '/' && next === '/') {
      // Single-line comment start
      singleLineCommentStart = i;
      break;
    }

    if (usesHash && ch === '#') {
      singleLineCommentStart = i;
      break;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      // Start of string literal - find the end
      const quote = ch;
      const contentStart = i + 1;
      let j = contentStart;
      let content = '';
      while (j < line.length) {
        if (line[j] === '\\') {
          content += line[j] + (j + 1 < line.length ? line[j + 1] : '');
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          break;
        }
        content += line[j];
        j++;
      }
      if (content.length > 0) {
        stringRegions.push({ text: content, startCol: contentStart });
      }
      i = j + 1;
      continue;
    }

    i++;
  }

  // Add string regions
  regions.push(...stringRegions);

  // Add comment region (everything from the comment marker to end of line)
  if (singleLineCommentStart >= 0) {
    const commentText = line.slice(singleLineCommentStart);
    regions.push({ text: commentText, startCol: singleLineCommentStart });
  }

  return regions;
}

/**
 * Scanner that checks code comments and string literals for
 * non-inclusive terminology.
 */
export class InclusiveCodeScanner implements Scanner {
  readonly name = 'inclusive-code-scanner';
  readonly displayName = 'Inclusive Code Scanner';
  readonly pillar = Pillar.INCLUSIVE;

  private readonly termManager = new TermListManager();

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath, config } = context;
    const inclusiveConfig = config.inclusive;

    // Load terms, respecting ignoredTerms config
    const { terms } = await this.termManager.loadTerms(inclusiveConfig);

    if (terms.length === 0) {
      return [];
    }

    // Find all matching code files
    const files = await this.findCodeFiles(repoPath);
    const findings: Finding[] = [];
    let findingCounter = 0;

    for (const filePath of files) {
      const relativePath = path.relative(repoPath, filePath);
      const ext = path.extname(filePath).toLowerCase();

      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      let inMultiLineComment = false;

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const lineNumber = lineIdx + 1;

        // Check for per-line suppression
        if (line.includes(SUPPRESSION_MARKER)) {
          continue;
        }

        const regionsForLine: ExtractedRegion[] = [];

        // Handle multi-line comment state
        if (inMultiLineComment) {
          // Everything on this line until */ is a comment
          const endIdx = line.indexOf('*/');
          if (endIdx >= 0) {
            // Comment ends on this line
            const commentText = line.slice(0, endIdx);
            regionsForLine.push({ text: commentText, startCol: 0 });
            inMultiLineComment = false;

            // The rest of the line after */ may have code/strings/comments
            const restOfLine = line.slice(endIdx + 2);
            if (restOfLine.length > 0) {
              const restRegions = extractRegions(restOfLine, ext);
              for (const r of restRegions) {
                regionsForLine.push({
                  text: r.text,
                  startCol: r.startCol + endIdx + 2,
                });
              }
            }
          } else {
            // Entire line is inside multi-line comment
            regionsForLine.push({ text: line, startCol: 0 });
          }
        } else {
          // Check if a multi-line comment starts on this line
          const mlStart = this.findMultiLineCommentStart(line, ext);
          if (mlStart >= 0) {
            // Extract regions before the multi-line comment
            const beforeComment = line.slice(0, mlStart);
            if (beforeComment.length > 0) {
              const beforeRegions = extractRegions(beforeComment, ext);
              regionsForLine.push(...beforeRegions);
            }

            // Find if the comment ends on the same line
            const afterStart = line.slice(mlStart + 2);
            const endIdx = afterStart.indexOf('*/');
            if (endIdx >= 0) {
              // Multi-line comment opens and closes on same line
              const commentText = afterStart.slice(0, endIdx);
              regionsForLine.push({
                text: commentText,
                startCol: mlStart + 2,
              });

              // Process rest of line after closing */
              const restOfLine = afterStart.slice(endIdx + 2);
              if (restOfLine.length > 0) {
                const restRegions = extractRegions(restOfLine, ext);
                for (const r of restRegions) {
                  regionsForLine.push({
                    text: r.text,
                    startCol: r.startCol + mlStart + 2 + endIdx + 2,
                  });
                }
              }
            } else {
              // Comment continues to next line
              const commentText = afterStart;
              regionsForLine.push({
                text: commentText,
                startCol: mlStart + 2,
              });
              inMultiLineComment = true;
            }
          } else {
            // No multi-line comment start; extract single-line regions
            const lineRegions = extractRegions(line, ext);
            regionsForLine.push(...lineRegions);
          }
        }

        // Match terms against extracted regions
        for (const region of regionsForLine) {
          for (const term of terms) {
            // Reset the regex lastIndex for global patterns
            const pattern = new RegExp(term.pattern.source, term.pattern.flags);
            if (pattern.test(region.text)) {
              findingCounter++;
              findings.push({
                id: `${this.name}-${findingCounter}`,
                severity: tierToSeverity(term.tier),
                pillar: this.pillar,
                category: 'inclusive-naming',
                message: `Non-inclusive term "${term.term}" found in ${this.describeRegionType(region, line)}`,
                file: relativePath,
                line: lineNumber,
                column: region.startCol + 1,
                context: line.trim(),
                suggestion: `Consider using: ${term.replacements.join(', ')}`,
                metadata: {
                  term: term.term,
                  tier: term.tier,
                  replacements: term.replacements,
                },
              });
            }
          }
        }
      }
    }

    return findings;
  }

  /**
   * Find the start index of a /* comment on a line,
   * ensuring it is not inside a string literal.
   */
  private findMultiLineCommentStart(line: string, ext: string): number {
    let inString: string | null = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = i + 1 < line.length ? line[i + 1] : '';

      if (inString !== null) {
        if (ch === '\\') {
          i++;
          continue;
        }
        if (ch === inString) {
          inString = null;
        }
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
        continue;
      }

      // Check for single-line comment first (takes precedence)
      if (ch === '/' && next === '/') {
        return -1; // Single-line comment; no multi-line start
      }

      const usesHash = HASH_COMMENT_EXTENSIONS.has(ext);
      if (usesHash && ch === '#') {
        return -1; // Hash comment; no multi-line start
      }

      if (ch === '/' && next === '*') {
        return i;
      }
    }
    return -1;
  }

  /**
   * Describe whether a region is a comment or string literal
   * for use in finding messages.
   */
  private describeRegionType(region: ExtractedRegion, line: string): string {
    const text = region.text;
    if (
      text.startsWith('//') ||
      text.startsWith('#') ||
      text.startsWith('/*') ||
      text.startsWith('*')
    ) {
      return 'code comment';
    }
    // Check if the character before the region start is a quote
    if (region.startCol > 0) {
      const prevChar = line[region.startCol - 1];
      if (prevChar === '"' || prevChar === "'" || prevChar === '`') {
        return 'string literal';
      }
    }
    return 'code comment';
  }

  /**
   * Find all code files matching the supported extensions,
   * excluding directories like node_modules, dist, etc.
   */
  private async findCodeFiles(repoPath: string): Promise<string[]> {
    const ignore = EXCLUDED_DIRS.map((d) => `**/${d}**`);

    const files = await glob(CODE_EXTENSIONS, {
      cwd: repoPath,
      absolute: true,
      nodir: true,
      ignore,
    });

    return files.sort();
  }
}
