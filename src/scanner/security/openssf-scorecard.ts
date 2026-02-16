/**
 * OpenSSF Scorecard scanner.
 *
 * Queries the OpenSSF Scorecard API to assess supply chain security
 * for GitHub repositories. Maps scorecard check scores to findings.
 */

import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const SCORECARD_API = 'https://api.securityscorecards.dev/projects';

interface ScorecardCheck {
  name: string;
  score: number;
  reason: string;
}

interface ScorecardResponse {
  date: string;
  repo: { name: string };
  scorecard: { version: string };
  score: number;
  checks: ScorecardCheck[];
}

/** Map a numeric score to a severity level. */
function scoreSeverity(score: number): Severity {
  if (score >= 8) return Severity.PASS;
  if (score >= 5) return Severity.WARNING;
  return Severity.CRITICAL;
}

/**
 * Parse owner/repo from a GitHub remote URL.
 * Supports: https://github.com/owner/repo[.git], git@github.com:owner/repo[.git]
 * Returns null if not a GitHub URL.
 */
function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string } | null {
  // SSH format
  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  // HTTPS format
  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  return null;
}

export class OpenSSFScorecardScanner implements Scanner {
  readonly name = 'openssf-scorecard';
  readonly displayName = 'OpenSSF Scorecard';
  readonly pillar = Pillar.SECURITY;

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
        category: 'openssf-scorecard',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const remoteUrl = context.git.remoteUrl;

    if (!remoteUrl) {
      return [
        makeFinding(
          Severity.INFO,
          'OpenSSF Scorecard requires a remote URL — no remote URL available',
          'Push to a GitHub remote to enable Scorecard analysis',
        ),
      ];
    }

    const parsed = parseGitHubRepo(remoteUrl);
    if (!parsed) {
      return [
        makeFinding(
          Severity.INFO,
          'OpenSSF Scorecard only supports GitHub repositories',
          'Push to GitHub to enable Scorecard analysis',
        ),
      ];
    }

    // Query the Scorecard API
    const apiUrl = `${SCORECARD_API}/github.com/${parsed.owner}/${parsed.repo}`;

    let data: ScorecardResponse;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        return [
          makeFinding(
            Severity.WARNING,
            `OpenSSF Scorecard unavailable for ${parsed.owner}/${parsed.repo} (HTTP ${response.status})`,
            'Ensure the repository is public and indexed by the Scorecard project',
            { scorecard_source: 'api', error: response.statusText },
          ),
        ];
      }
      data = (await response.json()) as ScorecardResponse;
    } catch (err) {
      return [
        makeFinding(
          Severity.WARNING,
          `OpenSSF Scorecard unavailable — ${err instanceof Error ? err.message : 'unknown error'}`,
          'Check network connectivity or try again later',
          { scorecard_source: 'api' },
        ),
      ];
    }

    const findings: Finding[] = [];

    // Overall score finding
    findings.push(
      makeFinding(
        scoreSeverity(data.score),
        `Overall OpenSSF Scorecard score: ${data.score}/10 for ${parsed.owner}/${parsed.repo}`,
        data.score < 5
          ? 'Address critical security issues to improve the scorecard score'
          : data.score < 8
            ? 'Review scorecard checks with low scores for improvement opportunities'
            : 'Scorecard score is healthy',
        {
          scorecard_source: 'api',
          scorecardVersion: data.scorecard.version,
          overallScore: data.score,
          date: data.date,
        },
      ),
    );

    // Per-check findings
    for (const check of data.checks) {
      findings.push(
        makeFinding(
          scoreSeverity(check.score),
          `Scorecard check "${check.name}": ${check.score}/10 — ${check.reason}`,
          check.score < 5
            ? `Improve the "${check.name}" check to strengthen supply chain security`
            : check.score < 8
              ? `Consider improving "${check.name}" for better security posture`
              : `"${check.name}" check is healthy`,
          {
            scorecard_source: 'api',
            checkName: check.name,
            checkScore: check.score,
          },
        ),
      );
    }

    return findings;
  }
}
