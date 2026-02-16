/**
 * Contributor Data Collection scanner.
 *
 * Parses git log for the last 12 months to extract contributor emails,
 * normalize identities, count commits per contributor, and analyze
 * domain distribution.
 */

import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { execSync } from 'node:child_process';

/** Normalize an email address for consistent counting. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Extract domain from email, excluding noreply@github.com. */
function extractDomain(email: string): string | null {
  if (email === 'noreply@github.com') return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : null;
}

export class ContributorDataScanner implements Scanner {
  readonly name = 'contributor-data';
  readonly displayName = 'Contributor Data Collection';
  readonly pillar = Pillar.COMMUNITY;

  async run(context: ScanContext): Promise<Finding[]> {
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
        category: 'contributor-data',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    // Run git log to get contributor emails for last 12 months
    let output: string;
    try {
      const raw = execSync('git log --since="12 months ago" --format="%ae"', {
        cwd: context.repoPath,
        encoding: 'utf-8',
        timeout: 30000,
      });
      output = typeof raw === 'string' ? raw : raw.toString('utf-8');
    } catch (err) {
      return [
        makeFinding(
          Severity.WARNING,
          `Failed to run git log for contributor data — ${err instanceof Error ? err.message : 'unknown error'}`,
          'Ensure the scan target is a valid git repository',
        ),
      ];
    }

    const lines = output
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return [
        makeFinding(
          Severity.INFO,
          'No commits found in the last 12 months',
          'Contributor analysis requires recent commit history',
        ),
      ];
    }

    // Normalize and count
    const commitCounts: Record<string, number> = {};
    for (const raw of lines) {
      const email = normalizeEmail(raw);
      commitCounts[email] = (commitCounts[email] ?? 0) + 1;
    }

    const uniqueContributors = Object.keys(commitCounts).length;
    const totalCommits = lines.length;

    // Domain analysis (exclude noreply@github.com)
    const domains: Record<string, number> = {};
    for (const [email, count] of Object.entries(commitCounts)) {
      const domain = extractDomain(email);
      if (domain) {
        domains[domain] = (domains[domain] ?? 0) + count;
      }
    }

    const findings: Finding[] = [];

    // Contributor count finding
    const severity =
      uniqueContributors === 1
        ? Severity.WARNING
        : uniqueContributors <= 2
          ? Severity.INFO
          : Severity.PASS;

    findings.push(
      makeFinding(
        severity,
        `${uniqueContributors} unique contributor${uniqueContributors === 1 ? '' : 's'} with ${totalCommits} commits in the last 12 months`,
        uniqueContributors === 1
          ? 'Single contributor detected — consider recruiting additional maintainers'
          : uniqueContributors <= 2
            ? 'Few contributors — consider growing the contributor base'
            : 'Healthy contributor base',
        { uniqueContributors, totalCommits, commitCounts },
      ),
    );

    // Domain distribution finding
    findings.push(
      makeFinding(
        Severity.INFO,
        `Contributor emails span ${Object.keys(domains).length} domain${Object.keys(domains).length === 1 ? '' : 's'}`,
        'Domain diversity indicates organizational breadth of contributions',
        { domains },
      ),
    );

    return findings;
  }
}
