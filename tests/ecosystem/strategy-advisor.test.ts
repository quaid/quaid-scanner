import { describe, it, expect } from 'vitest';
import { StrategyAdvisor } from '../../src/ecosystem/strategy-advisor.js';
import type { EcosystemActor, EcosystemProfile, UserCommunity } from '../../src/ecosystem/types.js';

function makeProfile(domain = 'oss-health'): EcosystemProfile {
  return {
    domain,
    ecosystems: ['OpenSSF', 'TODO Group'],
    standards: ['OpenSSF Scorecard', 'CHAOSS metrics'],
    primaryLanguage: 'TypeScript',
    detectedTopics: ['oss-health'],
  };
}

function makeRivals(count = 3): EcosystemActor[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Rival ${i}`,
    repoUrl: null,
    role: 'rival' as const,
    rationale: 'test',
    similarityScore: null,
    tags: [],
  }));
}

function makeCommunities(count = 2): UserCommunity[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Community ${i}`,
    url: `https://example.com/${i}`,
    type: 'forum' as const,
    relevance: 'high' as const,
  }));
}

describe('StrategyAdvisor', () => {
  const advisor = new StrategyAdvisor();

  it('returns at most 8 recommendations', () => {
    const recs = advisor.recommend(makeProfile(), makeRivals(5), makeCommunities(5));
    expect(recs.length).toBeLessThanOrEqual(8);
  });

  it('includes a foundation recommendation when ecosystems available', () => {
    const recs = advisor.recommend(makeProfile(), [], []);
    expect(recs.some((r) => r.type === 'foundation')).toBe(true);
  });

  it('includes a standards recommendation when standards available', () => {
    const recs = advisor.recommend(makeProfile(), [], []);
    expect(recs.some((r) => r.type === 'standards')).toBe(true);
  });

  it('includes differentiation recommendation when rivals exist', () => {
    const recs = advisor.recommend(makeProfile(), makeRivals(2), []);
    expect(recs.some((r) => r.type === 'differentiation')).toBe(true);
  });

  it('recommendations are sorted by impact/effort rank (high-impact-low-effort first)', () => {
    const recs = advisor.recommend(makeProfile(), makeRivals(2), makeCommunities(1));
    for (let i = 0; i < recs.length - 1; i++) {
      const rankA = (recs[i].impact === 'high' ? 3 : recs[i].impact === 'medium' ? 2 : 1) *
                    (recs[i].effort === 'low' ? 3 : recs[i].effort === 'medium' ? 2 : 1);
      const rankB = (recs[i + 1].impact === 'high' ? 3 : recs[i + 1].impact === 'medium' ? 2 : 1) *
                    (recs[i + 1].effort === 'low' ? 3 : recs[i + 1].effort === 'medium' ? 2 : 1);
      expect(rankA).toBeGreaterThanOrEqual(rankB);
    }
  });
});
