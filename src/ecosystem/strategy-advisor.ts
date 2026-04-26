import type { EcosystemActor, EcosystemProfile, EcosystemRecommendation, UserCommunity } from './types.js';

const EFFORT_SCORE: Record<string, number> = { low: 3, medium: 2, high: 1 };
const IMPACT_SCORE: Record<string, number> = { high: 3, medium: 2, low: 1 };

function rank(r: EcosystemRecommendation): number {
  return IMPACT_SCORE[r.impact] * EFFORT_SCORE[r.effort];
}

export class StrategyAdvisor {
  recommend(
    profile: EcosystemProfile,
    rivals: EcosystemActor[],
    communities: UserCommunity[],
  ): EcosystemRecommendation[] {
    const recs: EcosystemRecommendation[] = [];

    // Foundation sandbox recommendation
    if (profile.ecosystems.length > 0) {
      recs.push({
        type: 'foundation',
        title: `Apply to ${profile.ecosystems[0]} for project adoption`,
        rationale: `Projects in the ${profile.domain} space commonly align with ${profile.ecosystems[0]}, enabling access to community resources, co-marketing, and discoverability.`,
        effort: 'medium',
        impact: 'high',
        resources: [`https://www.linuxfoundation.org/projects/hosting`],
      });
    }

    // Standards adoption
    if (profile.standards.length > 0) {
      recs.push({
        type: 'standards',
        title: `Adopt and document compliance with ${profile.standards[0]}`,
        rationale: `Users evaluating tools in the ${profile.domain} space will expect compatibility with ${profile.standards.slice(0, 2).join(' and ')}. Publishing conformance data increases adoption.`,
        effort: 'medium',
        impact: 'high',
        resources: [],
      });
    }

    // Differentiation from rivals
    const highSimilarityRivals = rivals.filter((r) => r.similarityScore !== null && r.similarityScore > 0.85);
    if (highSimilarityRivals.length > 0 || rivals.length > 0) {
      const rivalNames = rivals.slice(0, 3).map((r) => r.name).join(', ');
      recs.push({
        type: 'differentiation',
        title: `Publish a clear differentiation narrative vs. ${rivalNames}`,
        rationale: `Your project competes with established tools. A concise comparison page or FAQ reduces evaluation time for users choosing between options.`,
        effort: 'low',
        impact: 'high',
        resources: [],
      });
    }

    // Community presence
    const existingCommunities = communities.filter((c) => c.relevance === 'high');
    if (existingCommunities.length < 2) {
      recs.push({
        type: 'community',
        title: 'Establish a presence in key community channels',
        rationale: `The ${profile.domain} community gathers in specific forums. Participating in these channels increases word-of-mouth and contributor discovery.`,
        effort: 'low',
        impact: 'medium',
        resources: communities.filter((c) => c.relevance === 'high').map((c) => c.url),
      });
    }

    // Partnership / integration opportunity
    recs.push({
      type: 'partnership',
      title: 'Identify 2-3 complementary projects for formal integration announcements',
      rationale: `Co-announcements and joint documentation with complementary tools expand reach to each other's user base at low cost.`,
      effort: 'medium',
      impact: 'medium',
      resources: [],
    });

    return recs.sort((a, b) => rank(b) - rank(a)).slice(0, 8);
  }
}
