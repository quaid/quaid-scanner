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
import { loadIgnorePatterns } from './ignore-file.js';
import { COMMON_ENGLISH_WORDS } from './data/common-english-words.js';
import { stripCodeFences } from './utils/strip-code-fences.js';
import { isMinifiedContent } from './utils/is-minified.js';

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

/**
 * Common English/Markdown emphasis words and HTTP verbs that look like
 * acronyms but are not undefined technical terms. These are excluded from
 * the undefined-acronym detector to prevent false positives (#151).
 */
const EMPHASIS_WORD_DENYLIST = new Set<string>([
  // Markdown callout / emphasis tokens
  'WARNING', 'WARNINGS', 'ERROR', 'ERRORS', 'IMPORTANT', 'NOTE', 'NOTES',
  'TIP', 'TIPS',
  // Code comment markers
  'TODO', 'FIXME', 'XXX', 'HACK',
  // Common documentation file names used inline
  'README', 'CHANGELOG', 'LICENSE', 'AUTHORS', 'COPYING', 'CONTRIBUTING',
  // Well-known product / tool proper names — not acronyms, not undefined
  'CLAUDE', 'GITHUB', 'GITLAB', 'DOCKER', 'LINUX', 'WINDOWS', 'MACOS',
  // Status / requirement adjectives
  'ESTABLISHED', 'REQUIRED', 'OPTIONAL', 'DEPRECATED', 'OBSOLETE',
  // Boolean / null literals
  'TRUE', 'FALSE', 'NULL', 'NONE', 'YES', 'NO',
  // HTTP verbs — common vocabulary in API docs, not undefined acronyms
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE',
]);

/** Pattern to match prerequisite/requirements section headings. */
const PREREQUISITES_HEADING = /^#{1,3}\s+(prerequisites|requirements)\s*$/im;

/** Pattern to match uppercase acronyms (3+ letters). */
const ACRONYM_PATTERN = /\b[A-Z]{3,}\b/g;

/**
 * Common English word suffixes. A token that ends with one of these is almost
 * certainly a real English word used for emphasis, not a technical initialism.
 *
 * Layer 1 of the layered false-positive suppression heuristic (#192).
 */
const WORD_SUFFIXES = [
  'ED', 'ING', 'ION', 'TION', 'SION', 'ITY', 'NESS',
  'MENT', 'FUL', 'LESS', 'ABLE', 'IBLE', 'LY', 'ER', 'EST',
  'NCE', 'ANCE', 'ENCE', 'ISM', 'IST', 'IVE', 'OUS',
] as const;

/**
 * Tokens longer than this are almost certainly English words used for
 * emphasis, not technical initialisms.
 *
 * Layer 2 of the layered false-positive suppression heuristic (#192).
 */
const MAX_ACRONYM_LENGTH = 5;

/**
 * Returns true when `token` ends with a recognisable English word suffix.
 * Used as layer 1 of the false-positive heuristic.
 */
function hasWordSuffix(token: string): boolean {
  return WORD_SUFFIXES.some((s) => token.endsWith(s));
}

/**
 * Returns the ratio of vowels to total characters in `token`.
 * Real English words tend to have a ratio above ~35%.
 * Used as layer 3 of the false-positive heuristic.
 */
function vowelRatio(token: string): number {
  const vowels = (token.match(/[AEIOU]/g) ?? []).length;
  return vowels / token.length;
}

/**
 * Returns true when `token` is likely a real English word used for emphasis
 * rather than a genuine undefined acronym. Applies three layers:
 *   1. Morphological suffix check (fastest — catches most English words)
 *   2. Length threshold (>5 chars are almost never initialisms)
 *   3. Vowel-ratio check (≥4 chars with >35% vowels read as pronounceable words)
 *
 * The existing `COMMON_ENGLISH_WORDS` dictionary is retained as a fast path
 * that is checked before calling this function.
 */
function isLikelyWord(token: string): boolean {
  return (
    hasWordSuffix(token) ||                              // layer 1
    token.length > MAX_ACRONYM_LENGTH ||                 // layer 2
    (token.length >= 4 && vowelRatio(token) > 0.35)     // layer 3
  );
}

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
    const userPatterns = await loadIgnorePatterns(context.repoPath);
    const configPatterns = context.config.inclusive?.excludePatterns ?? [];
    const allIgnore = [...userPatterns, ...configPatterns];

    for (const relPath of TARGET_FILES) {
      if (allIgnore.some((pat) => relPath.startsWith(pat.replace(/\*\*$/, '').replace(/\*$/, '')))) {
        continue;
      }
      const absPath = path.join(context.repoPath, relPath);
      if (!fs.existsSync(absPath)) {
        continue;
      }

      const content = fs.readFileSync(absPath, 'utf-8');

      // Skip minified/generated content — prose checks don't apply to machine output (#202)
      if (isMinifiedContent(content)) {
        continue;
      }

      const proseContent = stripCodeFences(content);
      const proseLines = proseContent.split('\n');

      findings.push(...this.detectGitOperations(relPath, proseLines));
      findings.push(...this.detectToolAssumptions(relPath, proseLines, proseContent));
      findings.push(...this.detectUndefinedAcronyms(relPath, proseLines));
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
            referenceUrl: 'https://www.writethedocs.org/guide/docs-as-code/',
            dataSource: 'local',
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
            referenceUrl: 'https://www.writethedocs.org/guide/docs-as-code/',
            dataSource: 'local',
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

        // Skip real English words used as ALL-CAPS emphasis (e.g. NEW, NEVER, SECURITY).
        // The dictionary is the fast path; the layered heuristic (#192) catches the long
        // tail without requiring ongoing dictionary maintenance.
        if (COMMON_ENGLISH_WORDS.has(acronym.toLowerCase()) || isLikelyWord(acronym)) {
          continue;
        }

        // Skip common emphasis words and HTTP verbs — not undefined acronyms.
        // Kept as a fallback for non-word tokens (TODO, FIXME, XXX, README, etc.)
        // that are NOT in the general English dictionary.
        if (EMPHASIS_WORD_DENYLIST.has(acronym)) {
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
          referenceUrl: 'https://www.writethedocs.org/guide/docs-as-code/',
          dataSource: 'local',
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
        referenceUrl: 'https://www.writethedocs.org/guide/docs-as-code/',
        dataSource: 'local',
      });
    }

    return findings;
  }
}
