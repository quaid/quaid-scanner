/**
 * Issue/PR Response Time Collection scanner.
 *
 * Queries GitHub GraphQL API for issues and pull requests created in the
 * last 90 days, calculates time-to-first-comment, and classifies response
 * time health.
 */

import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

const QUERY = `
query ResponseTimes($owner: String!, $name: String!, $since: DateTime!) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, orderBy: {field: CREATED_AT, direction: DESC}, filterBy: {since: $since}) {
      nodes {
        number
        createdAt
        comments(first: 1, orderBy: {field: CREATED_AT, direction: ASC}) {
          nodes {
            createdAt
            author { login }
          }
        }
      }
    }
    pullRequests(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        createdAt
        comments(first: 1, orderBy: {field: CREATED_AT, direction: ASC}) {
          nodes {
            createdAt
            author { login }
          }
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

/** Parse owner/repo from a GitHub remote URL. */
function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  return null;
}

/** Calculate median of a sorted numeric array. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/** Calculate hours between two ISO date strings. */
function hoursBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60));
}

/** Classify response time into severity. */
function classifyResponseTime(medianHours: number): Severity {
  if (medianHours < 48) return Severity.PASS;
  if (medianHours <= 168) return Severity.WARNING; // 7 days = 168 hours
  return Severity.CRITICAL;
}

export class ResponseTimeScanner implements Scanner {
  readonly name = 'response-time';
  readonly displayName = 'Issue/PR Response Time';
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
        category: 'response-time',
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
          'Response time analysis requires a GitHub token',
          'Provide a GitHub token via --github-token or GITHUB_TOKEN to enable response time metrics',
        ),
      ];
    }

    const remoteUrl = git.remoteUrl;
    if (!remoteUrl) {
      return [
        makeFinding(
          Severity.INFO,
          'Response time analysis requires a remote URL',
          'Push to a GitHub remote to enable response time analysis',
        ),
      ];
    }

    const parsed = parseGitHubRepo(remoteUrl);
    if (!parsed) {
      return [
        makeFinding(
          Severity.INFO,
          'Response time analysis only supports GitHub repositories',
          'Push to GitHub to enable response time metrics',
        ),
      ];
    }

    // Query GitHub GraphQL API
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
            `GitHub API returned HTTP ${response.status} for response time query`,
            'Check GitHub token permissions (requires repo read access)',
            { error: response.statusText },
          ),
        ];
      }

      data = (await response.json()) as GraphQLResponse;
    } catch (err) {
      return [
        makeFinding(
          Severity.WARNING,
          `Response time query failed — ${err instanceof Error ? err.message : 'unknown error'}`,
          'Check network connectivity or try again later',
        ),
      ];
    }

    const issues = data.data.repository.issues.nodes;
    const pullRequests = data.data.repository.pullRequests.nodes;

    if (issues.length === 0 && pullRequests.length === 0) {
      return [
        makeFinding(
          Severity.INFO,
          'No issues or pull requests found in the last 90 days',
          'Response time analysis requires recent issue or PR activity',
        ),
      ];
    }

    const findings: Finding[] = [];

    // Process issues
    if (issues.length > 0) {
      const responseTimes = this.extractResponseTimes(issues);
      const unanswered = issues.length - responseTimes.length;

      if (responseTimes.length > 0) {
        const med = median(responseTimes);
        findings.push(
          makeFinding(
            classifyResponseTime(med),
            `Issue median response time: ${med} hours (${responseTimes.length} of ${issues.length} with responses)`,
            med >= 168
              ? 'Issue response times are critically slow — consider adding maintainers or triaging automation'
              : med >= 48
                ? 'Issue response times are above the 48-hour healthy threshold'
                : 'Issue response time is healthy',
            { medianHours: med, sampleSize: responseTimes.length, totalIssues: issues.length },
          ),
        );
      }

      if (unanswered > 0) {
        const ratio = Math.round((unanswered / issues.length) * 100);
        findings.push(
          makeFinding(
            ratio > 50 ? Severity.WARNING : Severity.INFO,
            `${unanswered} of ${issues.length} issues (${ratio}%) have no response`,
            'Consider triaging unanswered issues to improve community engagement',
            { unansweredCount: unanswered, unansweredPercent: ratio },
          ),
        );
      }
    }

    // Process pull requests
    if (pullRequests.length > 0) {
      const responseTimes = this.extractResponseTimes(pullRequests);
      const unanswered = pullRequests.length - responseTimes.length;

      if (responseTimes.length > 0) {
        const med = median(responseTimes);
        findings.push(
          makeFinding(
            classifyResponseTime(med),
            `Pull request median response time: ${med} hours (${responseTimes.length} of ${pullRequests.length} with responses)`,
            med >= 168
              ? 'PR response times are critically slow — contributors may lose interest'
              : med >= 48
                ? 'PR response times are above the 48-hour healthy threshold'
                : 'PR response time is healthy',
            { medianHours: med, sampleSize: responseTimes.length, totalPRs: pullRequests.length },
          ),
        );
      }

      if (unanswered > 0) {
        const ratio = Math.round((unanswered / pullRequests.length) * 100);
        findings.push(
          makeFinding(
            ratio > 50 ? Severity.WARNING : Severity.INFO,
            `${unanswered} of ${pullRequests.length} pull requests (${ratio}%) have no response`,
            'Unanswered PRs discourage future contributions — prioritize PR review',
            { unansweredCount: unanswered, unansweredPercent: ratio },
          ),
        );
      }
    }

    return findings;
  }

  /** Extract response times in hours from GraphQL nodes. */
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
