/**
 * Issue Closure Metrics scanner.
 *
 * Queries GitHub API for issues and PRs opened/closed in the last 90 days
 * and calculates a closure ratio to assess team capacity.
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

function classifyRatio(ratio: number): Severity {
  if (ratio >= 0.8) return Severity.PASS;
  if (ratio >= 0.5) return Severity.WARNING;
  return Severity.CRITICAL;
}

interface APIItem {
  state: string;
  created_at: string;
  closed_at: string | null;
}

export class IssueClosureScanner implements Scanner {
  readonly name = 'issue-closure';
  readonly displayName = 'Issue Closure Metrics';
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
        category: 'issue-closure',
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
          'Issue closure analysis requires a GitHub token',
          'Provide a GitHub token to enable closure metrics',
        ),
      ];
    }

    const remoteUrl = git.remoteUrl;
    if (!remoteUrl) {
      return [
        makeFinding(Severity.INFO, 'No remote URL available', 'Push to GitHub to enable analysis'),
      ];
    }

    const parsed = parseGitHubRepo(remoteUrl);
    if (!parsed) {
      return [
        makeFinding(
          Severity.INFO,
          'Issue closure analysis only supports GitHub repositories',
          'Push to GitHub to enable closure metrics',
        ),
      ];
    }

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    };

    let issues: APIItem[];
    let prs: APIItem[];

    try {
      const [issueRes, prRes] = await Promise.all([
        fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/issues?state=all&since=${since}&per_page=100`,
          { headers },
        ),
        fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/pulls?state=all&per_page=100`,
          { headers },
        ),
      ]);

      if (!issueRes.ok) {
        return [
          makeFinding(
            Severity.WARNING,
            `GitHub API returned HTTP ${issueRes.status} for issue query`,
            'Check GitHub token permissions',
          ),
        ];
      }

      issues = (await issueRes.json()) as APIItem[];
      prs = prRes.ok ? ((await prRes.json()) as APIItem[]) : [];
    } catch (err) {
      return [
        makeFinding(
          Severity.WARNING,
          `Issue closure query failed — ${err instanceof Error ? err.message : 'unknown error'}`,
          'Check network connectivity',
        ),
      ];
    }

    // Filter issues to exclude PRs (GitHub API returns PRs in issue endpoint)
    const realIssues = issues.filter(
      (i) => !(i as unknown as Record<string, unknown>).pull_request,
    );

    const totalOpened = realIssues.length + prs.length;
    const totalClosed =
      realIssues.filter((i) => i.state === 'closed').length +
      prs.filter((p) => p.state === 'closed').length;

    if (totalOpened === 0) {
      return [
        makeFinding(
          Severity.INFO,
          'No issues or pull requests found in the last 90 days',
          'Closure analysis requires recent activity',
        ),
      ];
    }

    const ratio = Math.round((totalClosed / totalOpened) * 100) / 100;
    const findings: Finding[] = [];

    findings.push(
      makeFinding(
        classifyRatio(ratio),
        `Closure ratio: ${ratio.toFixed(2)} (${totalClosed} closed / ${totalOpened} opened in 90 days)`,
        ratio >= 0.8
          ? 'Team is keeping pace with demand'
          : ratio >= 0.5
            ? 'Backlog growing — consider adding maintainers or triaging more aggressively'
            : 'Team is overwhelmed — intervention needed to prevent maintainer burnout',
        {
          closureRatio: ratio,
          totalOpened,
          totalClosed,
          issuesOpened: realIssues.length,
          issuesClosed: realIssues.filter((i) => i.state === 'closed').length,
          prsOpened: prs.length,
          prsClosed: prs.filter((p) => p.state === 'closed').length,
        },
      ),
    );

    return findings;
  }
}
