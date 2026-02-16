/**
 * Vendor neutrality analysis scanner.
 *
 * Analyzes committer email domains to assess single-vendor concentration
 * risk and checks for succession planning documentation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** Threshold percentages for vendor concentration severity levels. */
const CRITICAL_THRESHOLD = 90;
const WARNING_THRESHOLD = 70;

/** Files to scan for succession planning keywords. */
const SUCCESSION_DOC_PATHS = [
  'GOVERNANCE.md',
  'CONTRIBUTING.md',
  'README.md',
];

/** Keywords indicating succession or continuity planning. */
const SUCCESSION_KEYWORDS = [
  'succession',
  'bus factor',
  'maintainer transition',
  'emeritus',
];

interface DomainStats {
  domain: string;
  count: number;
  pct: number;
}

/**
 * Normalize an email domain for grouping purposes.
 *
 * Groups GitHub noreply addresses under a single "github-noreply" domain.
 */
function normalizeDomain(domain: string): string {
  const lower = domain.toLowerCase();
  if (lower === 'noreply.github.com' || lower === 'users.noreply.github.com') {
    return 'github-noreply';
  }
  return lower;
}

/**
 * Extract the domain portion from an email address.
 * Returns "unknown" for malformed addresses.
 */
function extractDomain(email: string): string {
  const atIndex = email.lastIndexOf('@');
  if (atIndex < 0 || atIndex === email.length - 1) {
    return 'unknown';
  }
  return normalizeDomain(email.substring(atIndex + 1).trim());
}

/**
 * Calculate per-domain commit statistics from a list of emails.
 */
function calculateDomainStats(emails: string[]): {
  totalCommits: number;
  uniqueDomains: number;
  topDomains: DomainStats[];
  dominantDomain: DomainStats | null;
} {
  const domainCounts = new Map<string, number>();

  for (const email of emails) {
    const domain = extractDomain(email);
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }

  const totalCommits = emails.length;
  const topDomains: DomainStats[] = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({
      domain,
      count,
      pct: Math.round((count / totalCommits) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCommits,
    uniqueDomains: domainCounts.size,
    topDomains,
    dominantDomain: topDomains.length > 0 ? topDomains[0] : null,
  };
}

/**
 * Check documentation files for succession planning keywords.
 */
function checkSuccessionPlanning(repoPath: string): {
  found: boolean;
  file: string | null;
  keyword: string | null;
} {
  for (const docPath of SUCCESSION_DOC_PATHS) {
    const fullPath = path.join(repoPath, docPath);
    let content: string;
    try {
      if (!fs.existsSync(fullPath)) continue;
      content = fs.readFileSync(fullPath, 'utf-8').toLowerCase();
    } catch {
      continue;
    }

    for (const keyword of SUCCESSION_KEYWORDS) {
      if (content.includes(keyword.toLowerCase())) {
        return { found: true, file: docPath, keyword };
      }
    }
  }

  return { found: false, file: null, keyword: null };
}

/**
 * Scanner that analyzes committer email domains for vendor concentration
 * and checks for succession planning documentation.
 */
export class VendorNeutralityScanner implements Scanner {
  readonly name = 'vendor-neutrality';
  readonly displayName = 'Vendor Neutrality Analysis';
  readonly pillar = Pillar.GOVERNANCE;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];

    // Retrieve git log emails
    let emailOutput: string;
    try {
      emailOutput = execSync(
        'git log --since="12 months ago" --format="%ae"',
        { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch {
      findings.push({
        id: `${this.name}-no-git`,
        severity: Severity.INFO,
        pillar: this.pillar,
        category: 'vendor-neutrality',
        message: 'Could not analyze vendor neutrality: git history unavailable',
        file: null,
        line: null,
        column: null,
        suggestion: 'Ensure the repository has git history for vendor analysis',
      });
      return findings;
    }

    // Parse emails from output
    const emails = emailOutput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (emails.length === 0) {
      findings.push({
        id: `${this.name}-no-history`,
        severity: Severity.INFO,
        pillar: this.pillar,
        category: 'vendor-neutrality',
        message: 'No git commit history found in the last 12 months',
        file: null,
        line: null,
        column: null,
        suggestion: 'Vendor neutrality analysis requires commit history',
      });
      return findings;
    }

    // Calculate domain statistics
    const stats = calculateDomainStats(emails);
    const { dominantDomain } = stats;

    // Vendor concentration finding
    if (dominantDomain && dominantDomain.pct > CRITICAL_THRESHOLD) {
      findings.push({
        id: `${this.name}-critical-concentration`,
        severity: Severity.CRITICAL,
        pillar: this.pillar,
        category: 'vendor-neutrality',
        message: `Project is dominated by ${dominantDomain.domain} (${dominantDomain.pct}% of commits)`,
        file: null,
        line: null,
        column: null,
        suggestion: 'Diversify contributors across multiple organizations to reduce single-vendor risk',
        referenceUrl: 'https://chaoss.community/metric-organizational-diversity/',
        metadata: {
          totalCommits: stats.totalCommits,
          uniqueDomains: stats.uniqueDomains,
          topDomains: stats.topDomains,
        },
      });
    } else if (dominantDomain && dominantDomain.pct > WARNING_THRESHOLD) {
      findings.push({
        id: `${this.name}-high-concentration`,
        severity: Severity.WARNING,
        pillar: this.pillar,
        category: 'vendor-neutrality',
        message: `High vendor concentration: ${dominantDomain.domain} (${dominantDomain.pct}% of commits)`,
        file: null,
        line: null,
        column: null,
        suggestion: 'Encourage contributions from additional organizations to improve vendor diversity',
        referenceUrl: 'https://chaoss.community/metric-organizational-diversity/',
        metadata: {
          totalCommits: stats.totalCommits,
          uniqueDomains: stats.uniqueDomains,
          topDomains: stats.topDomains,
        },
      });
    } else {
      findings.push({
        id: `${this.name}-healthy`,
        severity: Severity.PASS,
        pillar: this.pillar,
        category: 'vendor-neutrality',
        message: 'Healthy vendor diversity across contributors',
        file: null,
        line: null,
        column: null,
        suggestion: 'Vendor diversity is healthy. Continue encouraging multi-organization contributions.',
        referenceUrl: 'https://chaoss.community/metric-organizational-diversity/',
        metadata: {
          totalCommits: stats.totalCommits,
          uniqueDomains: stats.uniqueDomains,
          topDomains: stats.topDomains,
        },
      });
    }

    // Domain count info finding
    findings.push({
      id: `${this.name}-domain-count`,
      severity: Severity.INFO,
      pillar: this.pillar,
      category: 'vendor-neutrality',
      message: `Found ${stats.uniqueDomains} unique email domain(s) across ${stats.totalCommits} commits`,
      file: null,
      line: null,
      column: null,
      suggestion: 'More unique domains indicates broader organizational participation',
      metadata: {
        totalCommits: stats.totalCommits,
        uniqueDomains: stats.uniqueDomains,
        topDomains: stats.topDomains,
      },
    });

    // Succession planning check
    const succession = checkSuccessionPlanning(repoPath);
    if (succession.found) {
      findings.push({
        id: `${this.name}-succession-found`,
        severity: Severity.PASS,
        pillar: this.pillar,
        category: 'vendor-neutrality',
        message: `Succession planning documentation found in ${succession.file}`,
        file: succession.file,
        line: null,
        column: null,
        suggestion: 'Succession planning documentation is present',
        metadata: {
          successionPlanFound: true,
          successionFile: succession.file,
          successionKeyword: succession.keyword,
        },
      });
    } else {
      findings.push({
        id: `${this.name}-no-succession`,
        severity: Severity.INFO,
        pillar: this.pillar,
        category: 'vendor-neutrality',
        message: 'No succession planning documentation found',
        file: null,
        line: null,
        column: null,
        suggestion: 'Add succession planning keywords (succession, bus factor, maintainer transition, emeritus) to GOVERNANCE.md or CONTRIBUTING.md',
      });
    }

    return findings;
  }
}
