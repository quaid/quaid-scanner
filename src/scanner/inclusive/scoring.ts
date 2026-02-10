/**
 * Inclusive language scoring module.
 *
 * Calculates a tiered inclusive language score from findings:
 * Score = 100 - (tier1 * 10 + tier2 * 5 + tier3 * 2), capped at 0.
 *
 * Severity thresholds:
 *   CRITICAL: score < 50
 *   WARNING:  score 50-80
 *   PASS:     score > 80
 */

import { Severity } from '../../types/index.js';
import type { Finding } from '../../types/index.js';

export interface InclusiveScoreResult {
  score: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
}

/**
 * Calculate the inclusive language score from a set of findings.
 *
 * Only findings with `metadata.tier` (1, 2, or 3) are counted.
 * Findings without tier metadata are ignored.
 */
export function calculateInclusiveScore(findings: Finding[]): InclusiveScoreResult {
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;

  for (const finding of findings) {
    const tier = finding.metadata?.tier;
    if (tier === 1) tier1Count++;
    else if (tier === 2) tier2Count++;
    else if (tier === 3) tier3Count++;
  }

  const deductions = tier1Count * 10 + tier2Count * 5 + tier3Count * 2;
  const score = Math.max(0, 100 - deductions);

  return { score, tier1Count, tier2Count, tier3Count };
}

/**
 * Map an inclusive language score to a severity level.
 */
export function scoreToSeverity(score: number): Severity {
  if (score < 50) return Severity.CRITICAL;
  if (score <= 80) return Severity.WARNING;
  return Severity.PASS;
}
