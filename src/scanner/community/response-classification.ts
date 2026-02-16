/**
 * Response Time Classification scanner.
 *
 * Calculates median, p90, p99 response times for issues and PRs,
 * classifies health, and flags contributor friction when PR review
 * times significantly exceed issue response times.
 */

import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

const QUERY = `
query ResponseClassification($owner: String!, $name: String!, $since: DateTime!) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, orderBy: {field: CREATED_AT, direction: DESC}, filterBy: {since: $since}) {
      nodes {
        number
        createdAt
        comments(first: 1, orderBy: {field: CREATED_AT, direction: ASC}) {
          nodes { createdAt author { login } }
        }
      }
    }
    pullRequests(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        createdAt
        comments(first: 1, orderBy: {field: CREATED_AT, direction: ASC}) {
          nodes { createdAt author { login } }
        }
      }
    }
  }
}`;

interface GraphQLNode {
  number: number;
  createdAt: string;
  comments: {
    nodes: Array<{ createdAt: string; author: { login: string } }>;
  };
}

interface GraphQLResponse {
  data: {
    repository: {
      issues: { nodes: GraphQLNode[] };
      pullRequests: { nodes: GraphQLNode[] };
    };
  };
}

function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
  return null;
}

function hoursBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function computeStats(values: number[]): { median: number; p90: number; p99: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  return {
    median,
    p90: percentile(sorted, 90),
    p99: percentile(sorted, 99),
  };
}

function classifySeverity(medianHours: number): Severity {
  if (medianHours < 48) return Severity.PASS;
  if (medianHours <= 168) return Severity.WARNING;
  return Severity.CRITICAL;
}

export class ResponseClassificationScanner implements Scanner {
  readonly name = 'response-classification';
  readonly displayName = 'Response Time Classification';
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
        category: 'response-classification',
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
          'Response classification requires a GitHub token',
          'Provide a GitHub token to enable response time classification',
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
          'Response classification only supports GitHub repositories',
          'Push to GitHub to enable analysis',
        ),
      ];
    }

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    let data: GraphQLResponse;
    try {
      const response = await fetch(GITHUB_GRAPHQL, {
        method: 'POST',
        headers: {
          Authorization: `bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: QUERY,
          variables: { owner: parsed.owner, name: parsed.repo, since },
        }),
      });

      if (!response.ok) {
        return [
          makeFinding(
            Severity.WARNING,
            `GitHub API returned HTTP ${response.status}`,
            'Check GitHub token permissions',
          ),
        ];
      }

      data = (await response.json()) as GraphQLResponse;
    } catch (err) {
      return [
        makeFinding(
          Severity.WARNING,
          `Response classification query failed — ${err instanceof Error ? err.message : 'unknown error'}`,
          'Check network connectivity',
        ),
      ];
    }

    const findings: Finding[] = [];
    let issueMedian: number | null = null;
    let prMedian: number | null = null;

    // Issue response times
    const issueNodes = data.data.repository.issues.nodes;
    const issueTimes = this.extractResponseTimes(issueNodes);
    if (issueTimes.length > 0) {
      const stats = computeStats(issueTimes);
      issueMedian = stats.median;
      findings.push(
        makeFinding(
          classifySeverity(stats.median),
          `Issue response time — median: ${stats.median}h, p90: ${stats.p90}h, p99: ${stats.p99}h`,
          stats.median >= 168
            ? 'Issue response times are critically slow'
            : stats.median >= 48
              ? 'Consider improving issue triage times'
              : 'Issue response times are healthy',
          {
            type: 'issues',
            medianHours: stats.median,
            p90Hours: stats.p90,
            p99Hours: stats.p99,
            sampleSize: issueTimes.length,
          },
        ),
      );
    }

    // PR response times
    const prNodes = data.data.repository.pullRequests.nodes;
    const prTimes = this.extractResponseTimes(prNodes);
    if (prTimes.length > 0) {
      const stats = computeStats(prTimes);
      prMedian = stats.median;
      findings.push(
        makeFinding(
          classifySeverity(stats.median),
          `PR response time — median: ${stats.median}h, p90: ${stats.p90}h, p99: ${stats.p99}h`,
          stats.median >= 168
            ? 'PR response times are critically slow — contributors may abandon PRs'
            : stats.median >= 48
              ? 'Consider improving PR review times'
              : 'PR response times are healthy',
          {
            type: 'pullRequests',
            medianHours: stats.median,
            p90Hours: stats.p90,
            p99Hours: stats.p99,
            sampleSize: prTimes.length,
          },
        ),
      );
    }

    // Contributor friction flag: PR response >> Issue response
    if (issueMedian !== null && prMedian !== null && issueMedian > 0) {
      const ratio = prMedian / issueMedian;
      if (ratio > 2) {
        findings.push(
          makeFinding(
            Severity.WARNING,
            `Contributor friction detected: PR response time (${prMedian}h) is ${ratio.toFixed(1)}x slower than issue response (${issueMedian}h)`,
            'Slow PR reviews relative to issue responses discourages contributions — prioritize PR review',
            { prToIssueRatio: Math.round(ratio * 10) / 10 },
          ),
        );
      }
    }

    if (findings.length === 0) {
      findings.push(
        makeFinding(
          Severity.INFO,
          'No response time data available in the last 90 days',
          'Response classification requires recent issues or PRs with comments',
        ),
      );
    }

    return findings;
  }

  private extractResponseTimes(nodes: GraphQLNode[]): number[] {
    const times: number[] = [];
    for (const node of nodes) {
      if (node.comments.nodes.length > 0) {
        times.push(hoursBetween(node.createdAt, node.comments.nodes[0].createdAt));
      }
    }
    return times;
  }
}
