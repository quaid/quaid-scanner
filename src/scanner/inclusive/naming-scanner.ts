/**
 * Project naming scanner for inclusive terminology.
 *
 * Checks the project's own name and branding — the package.json `name`
 * field, the README.md H1 title, and the git remote repository slug —
 * against the Inclusive Naming Initiative term list.
 *
 * Sources checked:
 *   1. package.json → `name` field
 *   2. README.md → first line starting with `# ` (the H1 title)
 *   3. git remote URL → repo slug (last path segment before `.git`)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { Pillar, Severity } from '../../types/index.js';
import { TermListManager, type LoadedTerm } from './term-list.js';

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
 * Build a regex with a negative lookbehind for `.` so that property-access
 * patterns (e.g. `obj.whitelist`) are not flagged.
 */
function buildLookbehindPattern(term: LoadedTerm): RegExp {
  const flags = term.pattern.flags.includes('g')
    ? term.pattern.flags
    : term.pattern.flags + 'g';
  const source = `(?<!\\.)${term.pattern.source}`;
  return new RegExp(source, flags);
}

/**
 * Scan a single text string against the term list.
 * Returns matched terms (may be multiple if the text contains several terms).
 */
function matchTerms(text: string, terms: LoadedTerm[]): LoadedTerm[] {
  const matched: LoadedTerm[] = [];
  for (const term of terms) {
    const pattern = buildLookbehindPattern(term);
    if (pattern.test(text)) {
      matched.push(term);
    }
  }
  return matched;
}

/**
 * Scanner that checks the project's own name and branding against the
 * Inclusive Naming Initiative term list.
 */
export class NamingScanner implements Scanner {
  readonly name = 'inclusive-naming-scanner';
  readonly displayName = 'Project Naming Scanner';
  readonly pillar = Pillar.INCLUSIVE;

  private readonly termListManager: TermListManager;

  constructor() {
    this.termListManager = new TermListManager();
  }

  /**
   * Run the project naming scan.
   *
   * @param context - The scan context containing repo path and configuration
   * @returns Array of findings for non-inclusive terms found in project naming
   */
  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath, config } = context;
    const termList = await this.termListManager.loadTerms(config.inclusive);
    const terms = termList.terms;

    if (terms.length === 0) {
      return [];
    }

    const findings: Finding[] = [];
    let counter = 0;

    // --- Source 1: package.json name field ---
    const pkgFindings = this.checkPackageJson(repoPath, terms, counter);
    counter += pkgFindings.length;
    findings.push(...pkgFindings);

    // --- Source 2: README.md H1 title ---
    const readmeFindings = this.checkReadme(repoPath, terms, counter);
    counter += readmeFindings.length;
    findings.push(...readmeFindings);

    // --- Source 3: git remote URL slug ---
    const remoteFindings = this.checkGitRemote(repoPath, terms, counter);
    findings.push(...remoteFindings);

    return findings;
  }

  /**
   * Check the `name` field in package.json for non-inclusive terms.
   * Returns an empty array if package.json is missing or unparseable.
   */
  private checkPackageJson(repoPath: string, terms: LoadedTerm[], startCounter: number): Finding[] {
    const pkgPath = path.join(repoPath, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      return [];
    }

    let pkgName: string;
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.name !== 'string' || parsed.name.length === 0) {
        return [];
      }
      pkgName = parsed.name;
    } catch {
      return [];
    }

    const matched = matchTerms(pkgName, terms);
    let counter = startCounter;

    return matched.map((term) => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity: tierToSeverity(term.tier),
        pillar: Pillar.INCLUSIVE,
        category: 'inclusive-naming',
        message: `Project name "${pkgName}" contains non-inclusive term "${term.term}"`,
        file: 'package.json',
        line: null,
        column: null,
        suggestion: `Rename the project using an alternative term per the Inclusive Naming Initiative: ${term.replacements.join(', ')}`,
        referenceUrl: 'https://inclusivenaming.org/word-lists/',
        dataSource: 'local',
        metadata: {
          term: term.term,
          tier: term.tier,
          replacements: term.replacements,
          source: 'package.json',
        },
      };
    });
  }

  /**
   * Check the first H1 heading in README.md for non-inclusive terms.
   * Returns an empty array if README.md is missing or has no H1 line.
   */
  private checkReadme(repoPath: string, terms: LoadedTerm[], startCounter: number): Finding[] {
    const readmePath = path.join(repoPath, 'README.md');

    if (!fs.existsSync(readmePath)) {
      return [];
    }

    let h1Text: string | null = null;
    try {
      const raw = fs.readFileSync(readmePath, 'utf-8');
      const lines = raw.split('\n');
      for (const line of lines) {
        if (line.startsWith('# ')) {
          h1Text = line.slice(2).trim();
          break;
        }
      }
    } catch {
      return [];
    }

    if (h1Text === null || h1Text.length === 0) {
      return [];
    }

    const matched = matchTerms(h1Text, terms);
    let counter = startCounter;

    return matched.map((term) => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity: tierToSeverity(term.tier),
        pillar: Pillar.INCLUSIVE,
        category: 'inclusive-naming',
        message: `README.md title "${h1Text}" contains non-inclusive term "${term.term}"`,
        file: 'README.md',
        line: null,
        column: null,
        suggestion: `Rename the project using an alternative term per the Inclusive Naming Initiative: ${term.replacements.join(', ')}`,
        referenceUrl: 'https://inclusivenaming.org/word-lists/',
        dataSource: 'local',
        metadata: {
          term: term.term,
          tier: term.tier,
          replacements: term.replacements,
          source: 'README.md',
        },
      };
    });
  }

  /**
   * Check the git remote URL's repository slug for non-inclusive terms.
   * Returns an empty array if git is unavailable or no remote is configured.
   */
  private checkGitRemote(repoPath: string, terms: LoadedTerm[], startCounter: number): Finding[] {
    let remoteUrl: string;
    try {
      const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
        cwd: repoPath,
        encoding: 'buffer',
        timeout: 5000,
      });

      if (result.status !== 0) {
        return [];
      }

      remoteUrl = result.stdout.toString('utf-8').trim();
    } catch {
      return [];
    }

    if (remoteUrl.length === 0) {
      return [];
    }

    // Extract the slug: last path component before optional `.git` suffix
    const slug = this.extractSlug(remoteUrl);
    if (slug === null || slug.length === 0) {
      return [];
    }

    const matched = matchTerms(slug, terms);
    let counter = startCounter;

    return matched.map((term) => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity: tierToSeverity(term.tier),
        pillar: Pillar.INCLUSIVE,
        category: 'inclusive-naming',
        message: `Git repository slug "${slug}" contains non-inclusive term "${term.term}"`,
        file: null,
        line: null,
        column: null,
        suggestion: `Rename the project using an alternative term per the Inclusive Naming Initiative: ${term.replacements.join(', ')}`,
        referenceUrl: 'https://inclusivenaming.org/word-lists/',
        dataSource: 'local',
        metadata: {
          term: term.term,
          tier: term.tier,
          replacements: term.replacements,
          source: 'git-remote',
          remoteUrl,
          slug,
        },
      };
    });
  }

  /**
   * Extract the repository slug from a git remote URL.
   *
   * Handles both HTTPS and SSH forms:
   *   - https://github.com/org/my-repo.git → `my-repo`
   *   - git@github.com:org/my-repo.git     → `my-repo`
   */
  private extractSlug(remoteUrl: string): string | null {
    // Strip trailing `.git` if present
    const withoutGit = remoteUrl.endsWith('.git')
      ? remoteUrl.slice(0, -4)
      : remoteUrl;

    // Get the last path segment
    const parts = withoutGit.replace(/:/g, '/').split('/');
    const slug = parts[parts.length - 1];
    return slug && slug.length > 0 ? slug : null;
  }
}
