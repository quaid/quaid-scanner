/**
 * Branch protection audit scanner.
 *
 * Queries the GitHub API for branch protection settings on the default
 * branch and reports findings for required reviews, status checks,
 * force push restrictions, deletion protection, and signed commits.
 */

import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** GitHub branch protection API response shape (partial). */
interface BranchProtectionResponse {
  required_pull_request_reviews?: {
    required_approving_review_count?: number;
    dismiss_stale_reviews?: boolean;
    require_code_owner_reviews?: boolean;
  } | null;
  required_status_checks?: {
    strict?: boolean;
    contexts?: string[];
  } | null;
  allow_force_pushes?: { enabled: boolean } | null;
  allow_deletions?: { enabled: boolean } | null;
  required_signatures?: { enabled: boolean } | null;
}

const GITHUB_API_BASE = 'https://api.github.com';

export class BranchProtectionScanner implements Scanner {
  readonly name = 'branch-protection';
  readonly displayName = 'Branch Protection Audit';
  readonly pillar = Pillar.SECURITY;

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
        category: 'branch-protection',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    // Check for GitHub token
    if (!token) {
      return [
        makeFinding(
          Severity.INFO,
          'GitHub token not provided. Cannot check branch protection settings.',
          'Provide a GitHub token via --github-token or GITHUB_TOKEN environment variable to enable branch protection checks.',
        ),
      ];
    }

    // Check for remote URL
    if (!git.remoteUrl) {
      return [
        makeFinding(
          Severity.INFO,
          'No remote URL detected. Cannot check branch protection settings.',
          'Ensure the repository has a configured remote origin pointing to GitHub.',
        ),
      ];
    }

    // Parse GitHub owner/repo from remote URL
    const parsed = parseGitHubUrl(git.remoteUrl);
    if (!parsed) {
      return [
        makeFinding(
          Severity.INFO,
          'Remote URL is not a GitHub repository. Branch protection checks only support GitHub.',
          'Branch protection auditing is currently limited to GitHub-hosted repositories.',
        ),
      ];
    }

    const { owner, repo } = parsed;
    const branch = git.branch ?? 'main';

    // Query GitHub API for branch protection
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${branch}/protection`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'quaid-scanner',
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return [
        makeFinding(
          Severity.WARNING,
          `Failed to query GitHub API for branch protection: ${errorMessage}`,
          'Check network connectivity and GitHub API availability.',
        ),
      ];
    }

    // Handle error status codes
    if (response.status === 404) {
      return [
        makeFinding(
          Severity.CRITICAL,
          `No branch protection configured on branch "${branch}".`,
          'Enable branch protection rules in GitHub repository settings. At minimum, require pull request reviews and status checks before merging.',
          { branch, owner, repo },
        ),
      ];
    }

    if (response.status === 403) {
      return [
        makeFinding(
          Severity.WARNING,
          'Cannot verify branch protection settings (insufficient permissions).',
          'Ensure the GitHub token has admin or read access to branch protection settings. The token needs the "repo" scope.',
          { branch, owner, repo },
        ),
      ];
    }

    if (!response.ok) {
      return [
        makeFinding(
          Severity.WARNING,
          `Unexpected GitHub API response (HTTP ${response.status}) when checking branch protection.`,
          'Check the GitHub token permissions and repository accessibility.',
          { branch, owner, repo, statusCode: response.status },
        ),
      ];
    }

    // Parse the protection settings
    const protection: BranchProtectionResponse = await response.json() as BranchProtectionResponse;
    const findings: Finding[] = [];

    // Check required pull request reviews
    if (protection.required_pull_request_reviews) {
      const reviewCount = protection.required_pull_request_reviews.required_approving_review_count ?? 0;
      findings.push(
        makeFinding(
          Severity.PASS,
          `Required pull request reviews are enabled (${reviewCount} approving review${reviewCount !== 1 ? 's' : ''} required).`,
          'Pull request reviews are properly configured.',
          { branch, requiredReviewCount: reviewCount },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.CRITICAL,
          `Required pull request reviews are not enabled on branch "${branch}".`,
          'Enable required pull request reviews in branch protection settings. Require at least 1 approving review before merging.',
          { branch },
        ),
      );
    }

    // Check required status checks
    if (protection.required_status_checks) {
      const contexts = protection.required_status_checks.contexts ?? [];
      findings.push(
        makeFinding(
          Severity.PASS,
          `Required status checks are enabled (${contexts.length} check${contexts.length !== 1 ? 's' : ''} configured).`,
          'Status checks are properly configured.',
          { branch, statusChecks: contexts },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.WARNING,
          `Required status checks are not enabled on branch "${branch}".`,
          'Enable required status checks in branch protection settings to ensure CI passes before merging.',
          { branch },
        ),
      );
    }

    // Check force push restrictions
    const forcePushEnabled = protection.allow_force_pushes?.enabled ?? false;
    if (!forcePushEnabled) {
      findings.push(
        makeFinding(
          Severity.PASS,
          `Force push is disabled on branch "${branch}".`,
          'Force push protection is properly configured.',
          { branch },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.CRITICAL,
          `Force push is allowed on branch "${branch}".`,
          'Disable force pushes in branch protection settings to prevent history rewriting on the default branch.',
          { branch },
        ),
      );
    }

    // Check deletion restrictions
    const deletionsEnabled = protection.allow_deletions?.enabled ?? false;
    if (!deletionsEnabled) {
      findings.push(
        makeFinding(
          Severity.PASS,
          `Branch deletion is prevented on branch "${branch}".`,
          'Deletion protection is properly configured.',
          { branch },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.WARNING,
          `Branch deletion is allowed on branch "${branch}".`,
          'Disable branch deletions in branch protection settings to prevent accidental loss of the default branch.',
          { branch },
        ),
      );
    }

    // Check signed commits
    const signaturesEnabled = protection.required_signatures?.enabled ?? false;
    if (signaturesEnabled) {
      findings.push(
        makeFinding(
          Severity.PASS,
          `Signed commits are required on branch "${branch}".`,
          'Commit signing is properly enforced.',
          { branch },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.INFO,
          `Signed commits are not required on branch "${branch}".`,
          'Consider enabling required signed commits for additional verification of commit authorship.',
          { branch },
        ),
      );
    }

    return findings;
  }
}

/**
 * Parse a GitHub remote URL to extract owner and repo.
 *
 * Supports formats:
 *   - https://github.com/owner/repo.git
 *   - https://github.com/owner/repo
 *   - git@github.com:owner/repo.git
 *   - git@github.com:owner/repo
 *
 * @returns Parsed owner/repo or null if not a GitHub URL.
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // HTTPS format: https://github.com/owner/repo[.git]
  const httpsMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH format: git@github.com:owner/repo[.git]
  const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}
