/**
 * Contributor Funnel Analysis scanner.
 *
 * Classifies contributors into cohorts (casual/regular/core), calculates
 * conversion rates between cohorts, and detects retention issues.
 */

import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { execSync } from 'node:child_process';

interface CohortCounts {
  casual: number;   // 1-5 commits
  regular: number;  // 6-50 commits
  core: number;     // 50+ commits
}

function classifyCohorts(commitCounts: Record<string, number>): CohortCounts {
  const result: CohortCounts = { casual: 0, regular: 0, core: 0 };
  for (const count of Object.values(commitCounts)) {
    if (count > 50) result.core++;
    else if (count >= 6) result.regular++;
    else result.casual++;
  }
  return result;
}

export class ContributorFunnelScanner implements Scanner {
  readonly name = 'contributor-funnel';
  readonly displayName = 'Contributor Funnel Analysis';
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
        category: 'contributor-funnel',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    let output: string;
    try {
      const raw = execSync('git log --since="12 months ago" --format="%ae"', {
        cwd: context.repoPath,
        encoding: 'utf-8',
        timeout: 30000,
      });
      output = String(raw);
    } catch (err) {
      return [
        makeFinding(
          Severity.WARNING,
          `Failed to run git log for funnel analysis — ${err instanceof Error ? err.message : 'unknown error'}`,
          'Ensure the scan target is a valid git repository',
        ),
      ];
    }

    const lines = output
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return [
        makeFinding(
          Severity.INFO,
          'No commits found in the last 12 months',
          'Contributor funnel analysis requires recent commit history',
        ),
      ];
    }

    // Count commits per contributor
    const commitCounts: Record<string, number> = {};
    for (const email of lines) {
      commitCounts[email] = (commitCounts[email] ?? 0) + 1;
    }

    const cohorts = classifyCohorts(commitCounts);
    const total = cohorts.casual + cohorts.regular + cohorts.core;
    const findings: Finding[] = [];

    // Cohort breakdown
    findings.push(
      makeFinding(
        Severity.INFO,
        `Contributor funnel: ${cohorts.core} core, ${cohorts.regular} regular, ${cohorts.casual} casual (${total} total)`,
        'A healthy project has a pipeline of casual contributors growing into regular and core contributors',
        { ...cohorts, total },
      ),
    );

    // Conversion rates
    const casualToRegularPct =
      cohorts.casual > 0 ? Math.round((cohorts.regular / cohorts.casual) * 100) : 0;
    const regularToCorePct =
      cohorts.regular > 0 ? Math.round((cohorts.core / cohorts.regular) * 100) : 0;

    const convSeverity = casualToRegularPct > 10 ? Severity.PASS : Severity.WARNING;
    findings.push(
      makeFinding(
        convSeverity,
        `Conversion rates: casual→regular ${casualToRegularPct}%, regular→core ${regularToCorePct}%`,
        casualToRegularPct <= 10
          ? 'Low casual-to-regular conversion suggests contributor onboarding friction'
          : 'Healthy conversion rates indicate good contributor retention',
        { casualToRegularPct, regularToCorePct },
      ),
    );

    // Revolving door warning: >80% casual
    if (total > 3) {
      const casualPct = Math.round((cohorts.casual / total) * 100);
      if (casualPct > 80) {
        findings.push(
          makeFinding(
            Severity.WARNING,
            `Contributor revolving door: ${casualPct}% of contributors are casual (1-5 commits)`,
            'High casual ratio suggests retention issues — improve contributor onboarding and mentorship',
            { casualPercent: casualPct },
          ),
        );
      }
    }

    return findings;
  }
}
