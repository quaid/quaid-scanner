import { describe, it, expect } from 'vitest';
import {
  calculateInclusiveScore,
  scoreToSeverity,
  type InclusiveScoreResult,
} from '../../../src/scanner/inclusive/scoring.js';
import { Severity } from '../../../src/types/index.js';
import type { Finding } from '../../../src/types/index.js';
import { Pillar } from '../../../src/types/index.js';

function createFinding(tier: 1 | 2 | 3): Finding {
  const severityMap = { 1: Severity.CRITICAL, 2: Severity.WARNING, 3: Severity.INFO };
  return {
    id: `INC-T${tier}`,
    severity: severityMap[tier],
    pillar: Pillar.INCLUSIVE,
    category: 'inclusive-language',
    message: `Tier ${tier} finding`,
    file: 'README.md',
    line: 1,
    column: 1,
    suggestion: 'Replace with inclusive term',
    metadata: { tier },
  };
}

describe('Inclusive Language Scoring', () => {
  describe('calculateInclusiveScore', () => {
    it('returns 100 for no findings', () => {
      const result = calculateInclusiveScore([]);
      expect(result.score).toBe(100);
      expect(result.tier1Count).toBe(0);
      expect(result.tier2Count).toBe(0);
      expect(result.tier3Count).toBe(0);
    });

    it('deducts 10 points per tier 1 finding', () => {
      const findings = [createFinding(1), createFinding(1)];
      const result = calculateInclusiveScore(findings);
      // 100 - (2 * 10) = 80
      expect(result.score).toBe(80);
      expect(result.tier1Count).toBe(2);
    });

    it('deducts 5 points per tier 2 finding', () => {
      const findings = [createFinding(2), createFinding(2), createFinding(2)];
      const result = calculateInclusiveScore(findings);
      // 100 - (3 * 5) = 85
      expect(result.score).toBe(85);
      expect(result.tier2Count).toBe(3);
    });

    it('deducts 2 points per tier 3 finding', () => {
      const findings = [createFinding(3), createFinding(3), createFinding(3), createFinding(3), createFinding(3)];
      const result = calculateInclusiveScore(findings);
      // 100 - (5 * 2) = 90
      expect(result.score).toBe(90);
      expect(result.tier3Count).toBe(5);
    });

    it('calculates mixed tier deductions correctly', () => {
      const findings = [
        createFinding(1), // -10
        createFinding(2), // -5
        createFinding(3), // -2
      ];
      const result = calculateInclusiveScore(findings);
      // 100 - (10 + 5 + 2) = 83
      expect(result.score).toBe(83);
    });

    it('caps score at 0 (never negative)', () => {
      const findings = Array.from({ length: 15 }, () => createFinding(1));
      const result = calculateInclusiveScore(findings);
      // 100 - (15 * 10) = -50, capped at 0
      expect(result.score).toBe(0);
    });

    it('ignores findings without tier metadata (non-inclusive findings)', () => {
      const genericFinding: Finding = {
        id: 'OTHER-01',
        severity: Severity.WARNING,
        pillar: Pillar.INCLUSIVE,
        category: 'other',
        message: 'Not a term finding',
        file: null,
        line: null,
        column: null,
        suggestion: 'N/A',
      };
      const result = calculateInclusiveScore([genericFinding]);
      // No tier metadata, should not affect score
      expect(result.score).toBe(100);
    });
  });

  describe('scoreToSeverity', () => {
    it('returns CRITICAL for score < 50', () => {
      expect(scoreToSeverity(0)).toBe(Severity.CRITICAL);
      expect(scoreToSeverity(49)).toBe(Severity.CRITICAL);
    });

    it('returns WARNING for score 50-80', () => {
      expect(scoreToSeverity(50)).toBe(Severity.WARNING);
      expect(scoreToSeverity(65)).toBe(Severity.WARNING);
      expect(scoreToSeverity(80)).toBe(Severity.WARNING);
    });

    it('returns PASS for score > 80', () => {
      expect(scoreToSeverity(81)).toBe(Severity.PASS);
      expect(scoreToSeverity(100)).toBe(Severity.PASS);
    });
  });
});
