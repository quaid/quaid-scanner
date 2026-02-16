/**
 * Maintainer Burnout Detection scanner.
 *
 * Combines multiple signals — open issue age, closure ratio, and release
 * recency — to detect maintainer burnout risk and zombie projects.
 */

import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const GITHUB_API = 'https://api.github.com';

function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
  return null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

interface APIIssue {
  state: string;
  created_at: string;
  closed_at: string | null;
  pull_request?: unknown;
}

interface APIRelease {
  tag_name: string;
  published_at: string;
}

export class BurnoutDetectionScanner implements Scanner {
  readonly name = 'burnout-detection';
  readonly displayName = 'Maintainer Burnout Detection';
  readonly pillar = Pillar.COMMUNITY;

  async run(context: ScanContext): Promise<Finding[]> {
    const { config, git } = context;
    const token = config.githubToken;
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
        category: 'burnout-detection',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    if (!token) {
      return [
        makeFinding(
          Severity.INFO,
          'Burnout detection requires a GitHub token',
          'Provide a GitHub token to enable burnout analysis',
        ),
      ];
    }

    const remoteUrl = git.remoteUrl;
    if (!remoteUrl) {
      return [
        makeFinding(Severity.INFO, 'No remote URL available', 'Push to GitHub'),
      ];
    }

    const parsed = parseGitHubRepo(remoteUrl);
    if (!parsed) {
      return [
        makeFinding(Severity.INFO, 'Burnout detection only supports GitHub', 'Push to GitHub'),
      ];
    }

    const headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    };

    let issues: APIIssue[];
    let releases: APIRelease[];

    try {
      const [issueRes, releaseRes] = await Promise.all([
        fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/issues?state=all&per_page=100`,
          { headers },
        ),
        fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/releases?per_page=5`,
          { headers },
        ),
      ]);

      if (!issueRes.ok) {
        return [
          makeFinding(Severity.WARNING, `GitHub API HTTP ${issueRes.status}`, 'Check token permissions'),
        ];
      }

      issues = (await issueRes.json()) as APIIssue[];
      releases = releaseRes.ok ? ((await releaseRes.json()) as APIRelease[]) : [];
    } catch (err) {
      return [
        makeFinding(
          Severity.WARNING,
          `Burnout detection failed — ${err instanceof Error ? err.message : 'unknown error'}`,
          'Check network connectivity',
        ),
      ];
    }

    // Filter out PRs from issue endpoint
    const realIssues = issues.filter((i) => !i.pull_request);
    const openIssues = realIssues.filter((i) => i.state === 'open');
    const closedIssues = realIssues.filter((i) => i.state === 'closed');

    const findings: Finding[] = [];
    const now = Date.now();

    // Open issue age analysis
    if (openIssues.length > 0) {
      const ages = openIssues.map((i) =>
        Math.round((now - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      );
      const medianAge = median(ages);

      const ageSeverity =
        medianAge > 90 ? Severity.WARNING : medianAge > 30 ? Severity.INFO : Severity.PASS;

      findings.push(
        makeFinding(
          ageSeverity,
          `Median open issue age: ${medianAge} days (${openIssues.length} open issues)`,
          medianAge > 90
            ? 'Open issues are aging — maintainers may be struggling to keep up'
            : 'Open issue age is within healthy range',
          { medianAgeDays: medianAge, openCount: openIssues.length },
        ),
      );
    }

    // Closure ratio
    const total = realIssues.length;
    if (total > 0) {
      const ratio = Math.round((closedIssues.length / total) * 100) / 100;
      findings.push(
        makeFinding(
          ratio < 0.5 ? Severity.WARNING : Severity.INFO,
          `Issue closure ratio: ${ratio.toFixed(2)} (${closedIssues.length}/${total})`,
          ratio < 0.5 ? 'Low closure ratio indicates capacity issues' : 'Closure ratio is acceptable',
          { closureRatio: ratio },
        ),
      );
    }

    // Release recency and zombie detection
    const latestRelease = releases[0];
    const daysSinceRelease = latestRelease
      ? Math.round((now - new Date(latestRelease.published_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceRelease !== null && daysSinceRelease > 180) {
      const closureRatio = total > 0 ? closedIssues.length / total : 1;
      if (closureRatio < 0.5) {
        findings.push(
          makeFinding(
            Severity.CRITICAL,
            `Potential zombie project: no release in ${daysSinceRelease} days and low closure ratio (${closureRatio.toFixed(2)})`,
            'Project shows signs of abandonment — consider reaching out to maintainers or forking',
            { daysSinceRelease, closureRatio: Math.round(closureRatio * 100) / 100 },
          ),
        );
      }
    }

    if (findings.length === 0) {
      findings.push(
        makeFinding(Severity.INFO, 'No burnout signals detected', 'No action needed'),
      );
    }

    return findings;
  }
}
