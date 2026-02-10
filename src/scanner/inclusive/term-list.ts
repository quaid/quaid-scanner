/**
 * Inclusive Naming term list manager.
 *
 * Loads, caches, and merges term lists from bundled data,
 * remote sources, and user configuration.
 */

import type { InclusiveConfig, TermDefinition } from '../../types/index.js';

export interface LoadedTerm {
  term: string;
  tier: 1 | 2 | 3;
  pattern: RegExp;
  replacements: string[];
  reason?: string;
}

export interface LoadedTermList {
  terms: LoadedTerm[];
  source: 'bundled' | 'remote' | 'cached';
}

/**
 * Bundled tier 1 terms (replace immediately) per INI and PRD.
 */
const TIER_1_TERMS: LoadedTerm[] = [
  {
    term: 'master-slave',
    tier: 1,
    pattern: /\bmaster[/-]slave\b/i,
    replacements: ['primary-secondary', 'leader-follower', 'controller-worker'],
  },
  {
    term: 'master',
    tier: 1,
    pattern: /\bmaster\b(?!mind|y|piece|ful)/i,
    replacements: ['main', 'primary', 'source', 'original'],
  },
  {
    term: 'slave',
    tier: 1,
    pattern: /\bslave\b/i,
    replacements: ['secondary', 'replica', 'follower', 'worker'],
  },
  {
    term: 'whitelist',
    tier: 1,
    pattern: /\bwhite[-]?list\b/i,
    replacements: ['allowlist', 'approved list', 'safe list'],
  },
  {
    term: 'blacklist',
    tier: 1,
    pattern: /\bblack[-]?list\b/i,
    replacements: ['blocklist', 'denylist', 'banned list'],
  },
  {
    term: 'blackhat',
    tier: 1,
    pattern: /\bblack[-]?hat\b/i,
    replacements: ['malicious', 'attacker'],
  },
  {
    term: 'whitehat',
    tier: 1,
    pattern: /\bwhite[-]?hat\b/i,
    replacements: ['ethical', 'defender'],
  },
  {
    term: 'grandfathered',
    tier: 1,
    pattern: /\bgrandfather(?:ed|ing)?\b/i,
    replacements: ['legacy', 'exempted', 'preapproved'],
  },
  {
    term: 'cripple',
    tier: 1,
    pattern: /\bcripple[ds]?\b/i,
    replacements: ['disable', 'degrade', 'impair', 'limit'],
  },
  {
    term: 'tribe',
    tier: 1,
    pattern: /\btribe[s]?\b/i,
    replacements: ['team', 'group', 'squad', 'community'],
  },
  {
    term: 'abort',
    tier: 1,
    pattern: /\babort(?:ed|ing|s)?\b/i,
    replacements: ['cancel', 'terminate', 'stop', 'halt'],
  },
];

/**
 * Bundled tier 2 terms (strongly consider) per PRD.
 */
const TIER_2_TERMS: LoadedTerm[] = [
  {
    term: 'sanity check',
    tier: 2,
    pattern: /\bsanity[- ]?check\b/i,
    replacements: ['confidence check', 'validity check', 'coherence check'],
  },
];

/**
 * Bundled tier 3 terms (recommended) per PRD.
 */
const TIER_3_TERMS: LoadedTerm[] = [
  {
    term: 'man-hour',
    tier: 3,
    pattern: /\bman[- ]?hours?\b/i,
    replacements: ['person-hour', 'work-hour', 'staff-hour'],
  },
  {
    term: 'man-in-the-middle',
    tier: 3,
    pattern: /\bman[- ]?in[- ]?the[- ]?middle\b/i,
    replacements: ['machine-in-the-middle', 'on-path attack'],
  },
  {
    term: 'end-of-life',
    tier: 3,
    pattern: /\bend[- ]?of[- ]?life\b/i,
    replacements: ['deprecated', 'sunset', 'end of support'],
  },
  {
    term: 'evangelist',
    tier: 3,
    pattern: /\bevangelist[s]?\b/i,
    replacements: ['advocate', 'champion', 'ambassador'],
  },
  {
    term: 'hallucinate',
    tier: 3,
    pattern: /\bhallucinate[ds]?\b/i,
    replacements: ['generate inaccurate', 'confabulate'],
  },
  {
    term: 'segregate',
    tier: 3,
    pattern: /\bsegregate[ds]?\b/i,
    replacements: ['separate', 'segment', 'isolate'],
  },
  {
    term: 'totem pole',
    tier: 3,
    pattern: /\btotem[- ]?pole\b/i,
    replacements: ['hierarchy', 'ranking'],
  },
  {
    term: 'blast radius',
    tier: 3,
    pattern: /\bblast[- ]?radius\b/i,
    replacements: ['impact scope', 'affected area'],
  },
];

/**
 * All bundled terms combined.
 */
export const BUNDLED_TERMS: LoadedTerm[] = [
  ...TIER_1_TERMS,
  ...TIER_2_TERMS,
  ...TIER_3_TERMS,
];

/**
 * Manages loading, caching, and merging of inclusive naming term lists.
 */
export class TermListManager {
  /**
   * Load the term list based on configuration.
   *
   * Priority: remote URL > bundled fallback, then merge custom terms,
   * then filter out ignored terms.
   */
  async loadTerms(config: InclusiveConfig): Promise<LoadedTermList> {
    let baseterms: LoadedTerm[];
    let source: LoadedTermList['source'];

    if (config.termListUrl) {
      // Future: fetch from remote URL with caching
      // For now, fall back to bundled
      baseterms = [...BUNDLED_TERMS];
      source = 'bundled';
    } else {
      baseterms = [...BUNDLED_TERMS];
      source = 'bundled';
    }

    // Build a map for merging (custom overrides bundled)
    const termMap = new Map<string, LoadedTerm>();
    for (const term of baseterms) {
      termMap.set(term.term, term);
    }

    // Merge custom terms from config
    for (const [tierKey, definitions] of Object.entries(config.customTerms)) {
      for (const def of definitions) {
        const tier = def.tier ?? this.parseTierFromKey(tierKey);
        termMap.set(def.term, {
          term: def.term,
          tier,
          pattern: this.buildPattern(def.term),
          replacements: def.replacements,
          reason: def.reason,
        });
      }
    }

    // Filter out ignored terms
    for (const ignored of config.ignoredTerms) {
      termMap.delete(ignored);
    }

    return {
      terms: Array.from(termMap.values()),
      source,
    };
  }

  private parseTierFromKey(key: string): 1 | 2 | 3 {
    if (key === 'tier1') return 1;
    if (key === 'tier2') return 2;
    return 3;
  }

  private buildPattern(term: string): RegExp {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }
}
