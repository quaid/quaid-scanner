/**
 * Release Cadence & Project Vitality scanner.
 *
 * Queries GitHub Releases API and git tags to assess release recency,
 * SemVer hygiene, and project vitality classification.
 */

import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { execSync } from 'node:child_process';

const GITHUB_API = 'https://api.github.com';
const SEMVER_PATTERN = /^v?\d+\.\d+\.\d+/;

function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
  return null;
}

function classifyVitality(days: number): {
  severity: Severity;
  label: string;
} {
  if (days < 90) return { severity: Severity.PASS, label: 'active' };
  if (days < 365) return { severity: Severity.INFO, label: 'stable' };
  if (days < 730) return { severity: Severity.WARNING, label: 'potentially-dormant' };
  return { severity: Severity.CRITICAL, label: 'likely-abandoned' };
}

interface APIRelease {
  tag_name: string;
  published_at: string;
  prerelease: boolean;
}

export class ReleaseCadenceScanner implements Scanner {
  readonly name = 'release-cadence';
  readonly displayName = 'Release Cadence & Vitality';
  readonly pillar = Pillar.TECHNICAL;

  async run(context: ScanContext): Promise<Finding[]> {
    const { config, git, repoPath } = context;
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
        category: 'release-cadence',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const findings: Finding[] = [];

    // Get releases from GitHub API if available
    let apiReleases: APIRelease[] = [];
    const parsed = git.remoteUrl ? parseGitHubRepo(git.remoteUrl) : null;
    if (parsed && config.githubToken) {
      try {
        const response = await fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/releases?per_page=20`,
          {
            headers: {
              Authorization: `token ${config.githubToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        );
        if (response.ok) {
          apiReleases = (await response.json()) as APIRelease[];
        }
      } catch {
        // Fall through to git tags
      }
    }

    // Get tags from git
    let gitTags: string[] = [];
    try {
      const raw = execSync('git tag --sort=-creatordate', {
        cwd: repoPath,
        encoding: 'utf-8',
        timeout: 10000,
      });
      gitTags = String(raw)
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    } catch {
      // No tags or not a git repo
    }

    // Determine latest release
    const latestRelease = apiReleases[0];
    const now = Date.now();

    if (!latestRelease && gitTags.length === 0) {
      findings.push(
        makeFinding(
          Severity.INFO,
          'No releases or version tags found',
          'Consider creating tagged releases to communicate stability',
        ),
      );
      return findings;
    }

    // Vitality classification from API release
    if (latestRelease) {
      const daysSince = Math.round(
        (now - new Date(latestRelease.published_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      const { severity, label } = classifyVitality(daysSince);

      findings.push(
        makeFinding(
          severity,
          `Latest release: ${latestRelease.tag_name} (${daysSince} days ago) — ${label}`,
          daysSince >= 730
            ? 'Project appears abandoned — no release in 2+ years'
            : daysSince >= 365
              ? 'No release in over a year — project may be dormant'
              : daysSince >= 90
                ? 'Project is stable but not actively releasing'
                : 'Active release cadence',
          { daysSinceRelease: daysSince, vitality: label, latestTag: latestRelease.tag_name },
        ),
      );

      // Pre-release detection
      const stableReleases = apiReleases.filter((r) => !r.prerelease);
      if (stableReleases.length === 0 && apiReleases.length > 0) {
        findings.push(
          makeFinding(
            Severity.WARNING,
            'Only pre-release versions available — no stable release',
            'Publish a stable release to signal production readiness',
            { prereleaseCount: apiReleases.length },
          ),
        );
      }
    }

    // SemVer hygiene from git tags
    const allTags = gitTags.length > 0 ? gitTags : apiReleases.map((r) => r.tag_name);
    if (allTags.length > 0) {
      const semverTags = allTags.filter((t) => SEMVER_PATTERN.test(t));
      const ratio = semverTags.length / allTags.length;

      findings.push(
        makeFinding(
          ratio >= 0.8 ? Severity.PASS : Severity.WARNING,
          `SemVer compliance: ${semverTags.length}/${allTags.length} tags follow semantic versioning (${Math.round(ratio * 100)}%)`,
          ratio < 0.8
            ? 'Use semantic version tags (e.g., v1.2.3) for consistent release communication'
            : 'Tags follow semantic versioning conventions',
          { semverTags: semverTags.length, totalTags: allTags.length, semverRatio: Math.round(ratio * 100) },
        ),
      );
    }

    return findings;
  }
}
