import { Pillar } from '../types/index.js';
import type { ScanReport } from '../types/index.js';
import type { ZeroDBClient } from '../integrations/zerodb-client.js';
import type { EcosystemProfile } from './types.js';
import { DOMAIN_TO_RIVALS } from './domain-taxonomy.js';

const KNOWN_DOMAINS = Object.keys(DOMAIN_TO_RIVALS);

const PILLAR_ORDER: Pillar[] = [
  Pillar.SECURITY,
  Pillar.GOVERNANCE,
  Pillar.COMMUNITY,
  Pillar.AI_READINESS,
  Pillar.INCLUSIVE,
  Pillar.TECHNICAL,
];

export function buildProfileEmbedding(report: ScanReport, profile: EcosystemProfile): number[] {
  const pillarScores = PILLAR_ORDER.map((p) => {
    const ps = report.pillars[p];
    return ps ? ps.score / 10 : 0;
  });

  const domainOneHot = KNOWN_DOMAINS.map((d) => (d === profile.domain ? 1.0 : 0.0));

  return [...pillarScores, ...domainOneHot];
}

export async function upsertRepoProfile(
  report: ScanReport,
  profile: EcosystemProfile,
  client: ZeroDBClient,
): Promise<void> {
  try {
    const vector = buildProfileEmbedding(report, profile);
    const metadata = {
      repo: report.repo,
      name: report.repo.split('/').pop() || report.repo,
      domain: profile.domain,
      overallScore: report.overallScore,
      primaryLanguage: profile.primaryLanguage,
      ecosystems: profile.ecosystems,
      tags: profile.detectedTopics,
      repoUrl: report.metadata.remoteUrl,
      indexedAt: new Date().toISOString(),
    };
    await client.vectorUpsert(report.repo, vector, metadata);
  } catch {
    // Non-fatal: corpus indexing failures should not break scan output
  }
}
