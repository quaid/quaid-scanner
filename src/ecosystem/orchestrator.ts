import { ZeroDBClient } from '../integrations/zerodb-client.js';
import { DomainDetector } from './domain-detector.js';
import { FoundationMapper } from './foundation-mapper.js';
import { RivalFinder } from './rival-finder.js';
import { PartnerFinder } from './partner-finder.js';
import { CommunityMapper } from './community-mapper.js';
import { StrategyAdvisor } from './strategy-advisor.js';
import { upsertRepoProfile } from './corpus-builder.js';
import type { EcosystemContext, EcosystemIntelligence, EcosystemDataSource } from './types.js';

const DISCLAIMER =
  'Ecosystem data is generated from static taxonomy and repository analysis. ' +
  'Actor relationships are inferred, not manually verified. ' +
  'Treat recommendations as starting points for your own research.';

export class EcosystemOrchestrator {
  private detector = new DomainDetector();
  private foundationMapper = new FoundationMapper();
  private rivalFinder = new RivalFinder();
  private partnerFinder = new PartnerFinder();
  private communityMapper = new CommunityMapper();
  private strategyAdvisor = new StrategyAdvisor();

  async analyze(context: EcosystemContext): Promise<EcosystemIntelligence> {
    // Stage 1: domain detection (serial — rivals/communities depend on domain)
    const rawProfile = this.detector.detect(context);
    const profile = this.foundationMapper.enrich(rawProfile);

    // Stage 2: ZeroDB client if available
    let zerodbClient: ZeroDBClient | undefined;
    if (context.zerodbAvailable) {
      const cfg = context.config;
      const apiUrl = process.env['ZERODB_API_URL'] ?? 'http://localhost:8100';
      const apiKey = cfg.zerodbApiKey ?? process.env['ZERODB_API_KEY'] ?? '';
      const projectId = cfg.zerodbProjectId ?? process.env['ZERODB_PROJECT_ID'] ?? '';
      if (apiKey && projectId) {
        zerodbClient = new ZeroDBClient(apiUrl, apiKey, projectId);
      }
    }

    // Stage 3: parallel analysis
    const [rivals, communities] = await Promise.all([
      this.rivalFinder.find(profile, context, zerodbClient),
      Promise.resolve(this.communityMapper.map(profile, context)),
    ]);

    const partners = this.partnerFinder.find(context);

    // Stage 4: strategy
    const recommendations = this.strategyAdvisor.recommend(profile, rivals, communities);

    // Stage 5: corpus indexing (fire-and-forget)
    if (zerodbClient) {
      void upsertRepoProfile(context.existingReport as Parameters<typeof upsertRepoProfile>[0], profile, zerodbClient);
    }

    const dataSource = resolveDataSource(context.zerodbAvailable, rivals);

    return {
      generatedAt: new Date().toISOString(),
      profile,
      rivals,
      partners,
      userCommunities: communities,
      recommendations,
      dataSource,
      disclaimer: DISCLAIMER,
    };
  }
}

function resolveDataSource(zerodbAvailable: boolean, rivals: EcosystemIntelligence['rivals']): EcosystemDataSource {
  if (!zerodbAvailable) return 'static';
  const vectorHits = rivals.filter((r) => r.similarityScore !== null).length;
  if (vectorHits >= 10) return 'zerodb-full';
  if (vectorHits > 0) return 'zerodb-assisted';
  return 'static';
}
