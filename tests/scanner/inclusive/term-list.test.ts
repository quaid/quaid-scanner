import { describe, it, expect, beforeEach } from 'vitest';
import {
  TermListManager,
  BUNDLED_TERMS,
  type LoadedTermList,
} from '../../../src/scanner/inclusive/term-list.js';
import type { InclusiveConfig } from '../../../src/types/index.js';

function createConfig(overrides: Partial<InclusiveConfig> = {}): InclusiveConfig {
  return {
    termListUrl: null,
    customTerms: {},
    ignoredTerms: [],
    excludePatterns: [],
    ...overrides,
  };
}

describe('TermListManager', () => {
  let manager: TermListManager;

  beforeEach(() => {
    manager = new TermListManager();
  });

  describe('BUNDLED_TERMS', () => {
    it('includes tier 1 terms (replace immediately)', () => {
      const tier1 = BUNDLED_TERMS.filter((t) => t.tier === 1);
      expect(tier1.length).toBeGreaterThan(0);

      const names = tier1.map((t) => t.term);
      expect(names).toContain('master-slave');
      expect(names).toContain('whitelist');
      expect(names).toContain('blacklist');
      expect(names).toContain('slave');
    });

    it('includes tier 2 terms (strongly consider)', () => {
      const tier2 = BUNDLED_TERMS.filter((t) => t.tier === 2);
      expect(tier2.length).toBeGreaterThan(0);

      const names = tier2.map((t) => t.term);
      expect(names).toContain('sanity check');
    });

    it('includes tier 3 terms (recommended)', () => {
      const tier3 = BUNDLED_TERMS.filter((t) => t.tier === 3);
      expect(tier3.length).toBeGreaterThan(0);

      const names = tier3.map((t) => t.term);
      expect(names).toContain('man-hour');
    });

    it('each term has a regex pattern', () => {
      for (const term of BUNDLED_TERMS) {
        expect(term.pattern).toBeDefined();
        expect(term.pattern).toBeInstanceOf(RegExp);
      }
    });

    it('each term has at least one replacement', () => {
      for (const term of BUNDLED_TERMS) {
        expect(term.replacements.length).toBeGreaterThan(0);
      }
    });
  });

  describe('loadTerms()', () => {
    it('loads bundled terms when no remote URL configured', async () => {
      const config = createConfig({ termListUrl: null });
      const result = await manager.loadTerms(config);

      expect(result.terms.length).toBeGreaterThan(0);
      expect(result.source).toBe('bundled');
    });

    it('merges custom terms from config', async () => {
      const config = createConfig({
        customTerms: {
          tier1: [
            {
              term: 'custom-bad-word',
              tier: 1,
              replacements: ['better-word'],
              reason: 'Company policy',
            },
          ],
        },
      });

      const result = await manager.loadTerms(config);
      const customTerm = result.terms.find((t) => t.term === 'custom-bad-word');

      expect(customTerm).toBeDefined();
      expect(customTerm!.tier).toBe(1);
      expect(customTerm!.replacements).toEqual(['better-word']);
    });

    it('excludes ignored terms from the result', async () => {
      const config = createConfig({
        ignoredTerms: ['master-slave', 'whitelist'],
      });

      const result = await manager.loadTerms(config);
      const terms = result.terms.map((t) => t.term);

      expect(terms).not.toContain('master-slave');
      expect(terms).not.toContain('whitelist');
    });

    it('custom terms do not duplicate bundled terms with same name', async () => {
      const config = createConfig({
        customTerms: {
          tier1: [
            {
              term: 'whitelist',
              tier: 1,
              replacements: ['custom-allowlist'],
            },
          ],
        },
      });

      const result = await manager.loadTerms(config);
      const whitelists = result.terms.filter((t) => t.term === 'whitelist');

      // Custom should override bundled
      expect(whitelists).toHaveLength(1);
      expect(whitelists[0].replacements).toEqual(['custom-allowlist']);
    });
  });

  describe('term pattern matching', () => {
    it('tier 1 patterns match correctly', () => {
      const masterSlave = BUNDLED_TERMS.find((t) => t.term === 'master-slave');
      expect(masterSlave).toBeDefined();
      expect(masterSlave!.pattern.test('master-slave architecture')).toBe(true);
      expect(masterSlave!.pattern.test('master/slave replication')).toBe(true);

      const whitelist = BUNDLED_TERMS.find((t) => t.term === 'whitelist');
      expect(whitelist).toBeDefined();
      expect(whitelist!.pattern.test('add to the whitelist')).toBe(true);
      expect(whitelist!.pattern.test('add to the white-list')).toBe(true);
    });

    it('master pattern does not match mastermind or mastery', () => {
      const master = BUNDLED_TERMS.find((t) => t.term === 'master');
      expect(master).toBeDefined();
      expect(master!.pattern.test('the master branch')).toBe(true);
      expect(master!.pattern.test('mastermind')).toBe(false);
      expect(master!.pattern.test('mastery')).toBe(false);
      expect(master!.pattern.test('masterpiece')).toBe(false);
      expect(master!.pattern.test('masterful')).toBe(false);
    });

    it('blacklist pattern matches with and without hyphen', () => {
      const blacklist = BUNDLED_TERMS.find((t) => t.term === 'blacklist');
      expect(blacklist).toBeDefined();
      expect(blacklist!.pattern.test('on the blacklist')).toBe(true);
      expect(blacklist!.pattern.test('black-list the IP')).toBe(true);
    });
  });
});
