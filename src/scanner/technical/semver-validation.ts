import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

// Strict SemVer: optional v prefix, major.minor.patch, optional pre-release/build
const SEMVER_RE = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+].+)?$/;

const CHANGELOG_NAMES = ['CHANGELOG.md', 'CHANGELOG', 'CHANGELOG.txt', 'CHANGES.md', 'CHANGES', 'HISTORY.md'];

function getGitTags(repoPath: string): string[] {
  try {
    const raw = execSync('git tag', { cwd: repoPath, timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return raw ? raw.split('\n').map((t) => t.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function findChangelog(repoPath: string): string | null {
  for (const name of CHANGELOG_NAMES) {
    const p = path.join(repoPath, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function changelogMentionsVersion(changelogPath: string, version: string): boolean {
  try {
    const content = fs.readFileSync(changelogPath, 'utf-8');
    // Strip leading 'v' for comparison
    const bare = version.replace(/^v/, '');
    return content.includes(version) || content.includes(bare);
  } catch {
    return false;
  }
}

export class SemVerValidationScanner implements Scanner {
  readonly name = 'semver-validation';
  readonly displayName = 'SemVer & Changelog Consistency';
  readonly pillar = Pillar.TECHNICAL;
  readonly dependsOn = ['release-cadence'];

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];
    let counter = 0;

    const make = (severity: Severity, message: string, suggestion: string, metadata?: Record<string, unknown>): Finding => ({
      id: `${this.name}-${++counter}`,
      severity,
      pillar: this.pillar,
      category: 'semver',
      message,
      file: null,
      line: null,
      column: null,
      suggestion,
      metadata,
    });

    const tags = getGitTags(repoPath);

    if (tags.length === 0) {
      findings.push(
        make(Severity.INFO, 'No git tags found — cannot validate SemVer', 'Add versioned git tags (e.g. v1.0.0) to mark releases'),
      );
      return findings;
    }

    const semverTags = tags.filter((t) => SEMVER_RE.test(t));
    const nonSemverTags = tags.filter((t) => !SEMVER_RE.test(t));
    const semverRatio = semverTags.length / tags.length;

    if (semverRatio === 1) {
      findings.push(make(Severity.PASS, `All ${tags.length} tags follow SemVer`, 'No action needed', { tagCount: tags.length }));
    } else if (semverRatio >= 0.7) {
      findings.push(
        make(
          Severity.WARNING,
          `${nonSemverTags.length} of ${tags.length} tags do not follow SemVer (${nonSemverTags.slice(0, 3).join(', ')}${nonSemverTags.length > 3 ? '…' : ''})`,
          'Standardize release tags to SemVer format (e.g. v1.2.3) for compatibility with dependency managers',
          { nonSemverExamples: nonSemverTags.slice(0, 5) },
        ),
      );
    } else {
      findings.push(
        make(
          Severity.CRITICAL,
          `Only ${Math.round(semverRatio * 100)}% of tags follow SemVer (${semverTags.length}/${tags.length})`,
          'Adopt SemVer for all releases — consumers depend on predictable versioning',
          { semverCount: semverTags.length, nonSemverCount: nonSemverTags.length },
        ),
      );
    }

    // CHANGELOG consistency check
    const changelogPath = findChangelog(repoPath);
    if (!changelogPath) {
      if (semverTags.length > 0) {
        findings.push(
          make(
            Severity.WARNING,
            `${semverTags.length} versioned tags found but no CHANGELOG detected`,
            'Add a CHANGELOG.md documenting changes per release (see keepachangelog.com)',
          ),
        );
      }
      return findings;
    }

    // Check that the most recent releases appear in the changelog
    const recentTags = semverTags.slice(-5);
    const missingFromChangelog = recentTags.filter((t) => !changelogMentionsVersion(changelogPath, t));

    if (missingFromChangelog.length === 0) {
      findings.push(
        make(Severity.PASS, `CHANGELOG present and covers recent releases`, 'No action needed'),
      );
    } else {
      findings.push(
        make(
          Severity.WARNING,
          `CHANGELOG missing entries for: ${missingFromChangelog.join(', ')}`,
          'Update CHANGELOG.md to document all releases — automated tools like release-please can help',
          { missingVersions: missingFromChangelog },
        ),
      );
    }

    return findings;
  }
}
