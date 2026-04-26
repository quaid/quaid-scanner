import { DOMAIN_TO_RIVALS } from './domain-taxonomy.js';
import type { EcosystemActor, EcosystemContext, EcosystemProfile } from './types.js';
import type { ZeroDBClient } from '../integrations/zerodb-client.js';

export class RivalFinder {
  async find(
    profile: EcosystemProfile,
    context: EcosystemContext,
    zerodbClient?: ZeroDBClient,
  ): Promise<EcosystemActor[]> {
    const staticRivals = (DOMAIN_TO_RIVALS[profile.domain] ?? []).map((r): EcosystemActor => ({
      name: r.name,
      repoUrl: r.repoUrl,
      role: 'rival',
      rationale: r.rationale,
      similarityScore: null,
      tags: r.tags,
    }));

    if (!zerodbClient || !context.zerodbAvailable) {
      return staticRivals;
    }

    try {
      const embedding = buildDomainVector(profile);
      const hits = await zerodbClient.vectorSearch(embedding, 10, 0.75);
      const vectorRivals: EcosystemActor[] = hits
        .filter((h) => h.metadata['repo'] !== context.repoPath)
        .map((h): EcosystemActor => ({
          name: String(h.metadata['name'] ?? h.id),
          repoUrl: (h.metadata['repoUrl'] as string | null) ?? null,
          role: 'rival',
          rationale: `Semantically similar project (score: ${h.score.toFixed(2)})`,
          similarityScore: h.score,
          tags: (h.metadata['tags'] as string[] | undefined) ?? [],
        }));

      const combined = mergeActors(staticRivals, vectorRivals);
      return combined;
    } catch {
      return staticRivals;
    }
  }
}

function buildDomainVector(profile: EcosystemProfile): number[] {
  const KNOWN_DOMAINS = Object.keys(DOMAIN_TO_RIVALS);
  const domainIdx = KNOWN_DOMAINS.indexOf(profile.domain);
  return KNOWN_DOMAINS.map((_, i) => (i === domainIdx ? 1.0 : 0.0));
}

function mergeActors(a: EcosystemActor[], b: EcosystemActor[]): EcosystemActor[] {
  const seen = new Set(a.map((r) => r.name.toLowerCase()));
  const extras = b.filter((r) => !seen.has(r.name.toLowerCase()));
  return [...a, ...extras];
}
