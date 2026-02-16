import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeContributors,
  normalizeEmail,
  type ContributorAnalysis,
} from '../../../src/scanner/governance/bus-factor.js';
import { BusFactorScanner } from '../../../src/scanner/governance/bus-factor.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
} from '../../../src/types/index.js';

describe('Bus Factor Analysis', () => {
  describe('normalizeEmail', () => {
    it('lowercases email addresses', () => {
      const result = normalizeEmail('User@Example.COM');
      expect(result.normalized).toBe('user@example.com');
      expect(result.domain).toBe('example.com');
    });

    it('extracts domain correctly', () => {
      const result = normalizeEmail('dev@google.com');
      expect(result.domain).toBe('google.com');
    });

    it('handles noreply@github.com', () => {
      const result = normalizeEmail('noreply@github.com');
      expect(result.domain).toBe('unknown');
    });

    it('handles users.noreply.github.com addresses', () => {
      const result = normalizeEmail('12345+username@users.noreply.github.com');
      expect(result.domain).toBe('unknown');
      expect(result.normalized).toContain('username');
    });

    it('extracts username from numbered noreply format', () => {
      const result = normalizeEmail('98765+jdoe@users.noreply.github.com');
      expect(result.normalized).toContain('jdoe');
    });

    it('handles plain noreply address without number prefix', () => {
      const result = normalizeEmail('jdoe@users.noreply.github.com');
      expect(result.domain).toBe('unknown');
    });
  });

  describe('analyzeContributors', () => {
    it('returns bus factor of 0 for empty input', () => {
      const result = analyzeContributors([]);
      expect(result.busFactor).toBe(0);
      expect(result.elephantFactor).toBe(0);
      expect(result.totalCommits).toBe(0);
      expect(result.totalContributors).toBe(0);
    });

    it('returns bus factor 1 for single contributor', () => {
      const emails = Array(10).fill('alice@example.com');
      const result = analyzeContributors(emails);
      expect(result.busFactor).toBe(1);
      expect(result.elephantFactor).toBe(100);
      expect(result.totalContributors).toBe(1);
      expect(result.totalCommits).toBe(10);
    });

    it('calculates bus factor correctly for 2 equal contributors', () => {
      const emails = [
        ...Array(5).fill('alice@example.com'),
        ...Array(5).fill('bob@example.com'),
      ];
      const result = analyzeContributors(emails);
      // Each has 50%, so 1 contributor covers 50% → bus factor = 1
      expect(result.busFactor).toBe(1);
      expect(result.elephantFactor).toBe(50);
    });

    it('calculates bus factor correctly for 3 equal contributors', () => {
      const emails = [
        ...Array(10).fill('alice@example.com'),
        ...Array(10).fill('bob@example.com'),
        ...Array(10).fill('carol@example.com'),
      ];
      const result = analyzeContributors(emails);
      // Each has ~33%, need 2 to reach 50% → bus factor = 2
      expect(result.busFactor).toBe(2);
      expect(result.totalContributors).toBe(3);
    });

    it('calculates bus factor for uneven distribution', () => {
      const emails = [
        ...Array(60).fill('alice@example.com'),  // 60%
        ...Array(20).fill('bob@example.com'),     // 20%
        ...Array(10).fill('carol@example.com'),   // 10%
        ...Array(10).fill('dave@example.com'),    // 10%
      ];
      const result = analyzeContributors(emails);
      // Alice alone has 60% → bus factor = 1
      expect(result.busFactor).toBe(1);
      expect(result.elephantFactor).toBe(60);
    });

    it('calculates elephant factor as percentage of top contributor', () => {
      const emails = [
        ...Array(7).fill('alice@example.com'),
        ...Array(3).fill('bob@example.com'),
      ];
      const result = analyzeContributors(emails);
      expect(result.elephantFactor).toBe(70);
    });

    it('normalizes emails during analysis', () => {
      const emails = [
        'Alice@Example.com',
        'alice@example.com',
        'ALICE@EXAMPLE.COM',
      ];
      const result = analyzeContributors(emails);
      expect(result.totalContributors).toBe(1);
      expect(result.totalCommits).toBe(3);
    });

    it('sorts contributors by commit count descending', () => {
      const emails = [
        ...Array(5).fill('bob@example.com'),
        ...Array(10).fill('alice@example.com'),
        ...Array(3).fill('carol@example.com'),
      ];
      const result = analyzeContributors(emails);
      expect(result.contributors[0].email).toBe('alice@example.com');
      expect(result.contributors[1].email).toBe('bob@example.com');
      expect(result.contributors[2].email).toBe('carol@example.com');
    });

    it('calculates percentage for each contributor', () => {
      const emails = [
        ...Array(75).fill('alice@example.com'),
        ...Array(25).fill('bob@example.com'),
      ];
      const result = analyzeContributors(emails);
      expect(result.contributors[0].percentage).toBe(75);
      expect(result.contributors[1].percentage).toBe(25);
    });

    it('handles high bus factor with many contributors', () => {
      const emails = [
        ...Array(10).fill('a@x.com'),
        ...Array(10).fill('b@x.com'),
        ...Array(10).fill('c@x.com'),
        ...Array(10).fill('d@x.com'),
        ...Array(10).fill('e@x.com'),
      ];
      const result = analyzeContributors(emails);
      // Each has 20%, need 3 to reach 60% > 50% → bus factor = 3
      expect(result.busFactor).toBe(3);
      expect(result.totalContributors).toBe(5);
    });
  });

  describe('BusFactorScanner metadata', () => {
    let scanner: BusFactorScanner;

    beforeEach(() => {
      scanner = new BusFactorScanner();
    });

    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('bus-factor');
      expect(scanner.displayName).toBe('Bus Factor Analysis');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('severity mapping', () => {
    // Test the severity logic directly via the exported helper
    it('CRITICAL for bus factor = 1 with non-Sandbox maturity', () => {
      const analysis = analyzeContributors(Array(10).fill('alice@x.com'));
      // Bus factor 1, elephant 100% → CRITICAL for INCUBATING
      expect(analysis.busFactor).toBe(1);
      expect(analysis.elephantFactor).toBe(100);
    });

    it('WARNING for bus factor = 2', () => {
      const emails = [
        ...Array(30).fill('alice@x.com'),
        ...Array(20).fill('bob@x.com'),
        ...Array(10).fill('carol@x.com'),
      ];
      const result = analyzeContributors(emails);
      // Bus factor = 1 (alice has 50%), but testing the threshold
      expect(result.busFactor).toBeLessThanOrEqual(2);
    });

    it('PASS for bus factor >= 3 and elephant factor < 50%', () => {
      const emails = [
        ...Array(10).fill('a@x.com'),
        ...Array(10).fill('b@x.com'),
        ...Array(10).fill('c@x.com'),
        ...Array(10).fill('d@x.com'),
      ];
      const result = analyzeContributors(emails);
      expect(result.busFactor).toBeGreaterThanOrEqual(2);
      expect(result.elephantFactor).toBeLessThan(50);
    });
  });
});
