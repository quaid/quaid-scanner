/**
 * Bus factor and maintainer concentration scanner.
 *
 * Analyzes git log to calculate bus factor and elephant factor,
 * with maturity-aware severity thresholds.
 */

import { execSync } from 'node:child_process';
import { Pillar, Severity, MaturityLevel } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

export interface ContributorAnalysis {
  busFactor: number;
  elephantFactor: number;
  totalContributors: number;
  totalCommits: number;
  contributors: Array<{ email: string; commits: number; percentage: number }>;
}

/**
 * Normalize an email address for contributor analysis.
 * Lowercases, handles GitHub noreply addresses.
 */
export function normalizeEmail(email: string): { normalized: string; domain: string } {
  const lower = email.trim().toLowerCase();

  // Handle noreply@github.com
  if (lower === 'noreply@github.com') {
    return { normalized: lower, domain: 'unknown' };
  }

  // Handle users.noreply.github.com (format: 12345+username@users.noreply.github.com)
  if (lower.endsWith('@users.noreply.github.com')) {
    const local = lower.split('@')[0];
    // Extract username from "12345+username" format
    const plusIdx = local.indexOf('+');
    const username = plusIdx >= 0 ? local.slice(plusIdx + 1) : local;
    return { normalized: `${username}@users.noreply.github.com`, domain: 'unknown' };
  }

  const parts = lower.split('@');
  const domain = parts.length > 1 ? parts[parts.length - 1] : 'unknown';
  return { normalized: lower, domain };
}

/**
 * Analyze a list of commit author emails to calculate bus factor
 * and elephant factor.
 */
export function analyzeContributors(emails: string[]): ContributorAnalysis {
  if (emails.length === 0) {
    return {
      busFactor: 0,
      elephantFactor: 0,
      totalContributors: 0,
      totalCommits: 0,
      contributors: [],
    };
  }

  // Count commits per normalized email
  const commitCounts = new Map<string, number>();
  for (const email of emails) {
    const { normalized } = normalizeEmail(email);
    commitCounts.set(normalized, (commitCounts.get(normalized) ?? 0) + 1);
  }

  const totalCommits = emails.length;
  const totalContributors = commitCounts.size;

  // Sort by commit count descending
  const sorted = Array.from(commitCounts.entries())
    .map(([email, commits]) => ({
      email,
      commits,
      percentage: Math.round((commits / totalCommits) * 100),
    }))
    .sort((a, b) => b.commits - a.commits);

  // Elephant factor: percentage from top contributor
  const elephantFactor = sorted[0]?.percentage ?? 0;

  // Bus factor: minimum contributors needed to account for 50% of commits
  let cumulative = 0;
  let busFactor = 0;
  for (const contributor of sorted) {
    cumulative += contributor.commits;
    busFactor++;
    if (cumulative >= totalCommits * 0.5) break;
  }

  return {
    busFactor,
    elephantFactor,
    totalContributors,
    totalCommits,
    contributors: sorted,
  };
}

export class BusFactorScanner implements Scanner {
  readonly name = 'bus-factor';
  readonly displayName = 'Bus Factor Analysis';
  readonly pillar = Pillar.GOVERNANCE;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath, maturity } = context;

    // Get git log for last 12 months
    let gitOutput: string;
    try {
      gitOutput = execSync(
        'git log --since="12 months ago" --format="%ae"',
        { cwd: repoPath, encoding: 'utf-8', timeout: 30_000 },
      );
    } catch {
      return [{
        id: `${this.name}-1`,
        severity: Severity.WARNING,
        pillar: this.pillar,
        category: 'bus-factor',
        message: 'Unable to analyze git history for bus factor calculation',
        file: null,
        line: null,
        column: null,
        suggestion: 'Ensure this is a git repository with commit history',
      }];
    }

    const emails = gitOutput.trim().split('\n').filter(Boolean);
    if (emails.length === 0) {
      return [{
        id: `${this.name}-1`,
        severity: Severity.INFO,
        pillar: this.pillar,
        category: 'bus-factor',
        message: 'No commits found in the last 12 months',
        file: null,
        line: null,
        column: null,
        suggestion: 'Check if the repository has recent activity',
      }];
    }

    const analysis = analyzeContributors(emails);
    const findings: Finding[] = [];
    let counter = 0;

    // Determine severity based on bus factor and maturity
    let severity: Severity;
    if (analysis.busFactor <= 1) {
      // Bus factor 1 is CRITICAL for non-Sandbox, INFO for Sandbox
      severity = maturity === MaturityLevel.SANDBOX ? Severity.INFO : Severity.CRITICAL;
    } else if (analysis.busFactor <= 2 || analysis.elephantFactor > 50) {
      severity = Severity.WARNING;
    } else {
      severity = Severity.PASS;
    }

    counter++;
    findings.push({
      id: `${this.name}-${counter}`,
      severity,
      pillar: this.pillar,
      category: 'bus-factor',
      message: `Bus factor: ${analysis.busFactor}, Elephant factor: ${analysis.elephantFactor}% (${analysis.totalContributors} contributors, ${analysis.totalCommits} commits in last 12 months)`,
      file: null,
      line: null,
      column: null,
      suggestion: severity === Severity.PASS
        ? 'Contributor distribution is healthy'
        : 'Encourage more contributors and distribute code ownership',
      metadata: {
        busFactor: analysis.busFactor,
        elephantFactor: analysis.elephantFactor,
        totalContributors: analysis.totalContributors,
        totalCommits: analysis.totalCommits,
        topContributors: analysis.contributors.slice(0, 5),
      },
    });

    return findings;
  }
}
