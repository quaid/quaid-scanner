import type { ScanContext, ScanReport } from '../types/index.js';

export interface EcosystemProfile {
  domain: string;
  ecosystems: string[];
  standards: string[];
  primaryLanguage: string | null;
  detectedTopics: string[];
}

export type ActorRole = 'rival' | 'partner' | 'upstream' | 'downstream' | 'foundation' | 'community';

export interface EcosystemActor {
  name: string;
  repoUrl: string | null;
  role: ActorRole;
  rationale: string;
  similarityScore: number | null;
  tags: string[];
}

export type CommunityType = 'forum' | 'slack' | 'discord' | 'mailing-list' | 'conference' | 'subreddit' | 'stack-overflow' | 'github-discussions';

export interface UserCommunity {
  name: string;
  url: string;
  type: CommunityType;
  relevance: 'high' | 'medium' | 'low';
}

export type EffortLevel = 'low' | 'medium' | 'high';
export type ImpactLevel = 'low' | 'medium' | 'high';

export interface EcosystemRecommendation {
  type: 'foundation' | 'differentiation' | 'standards' | 'community' | 'partnership';
  title: string;
  rationale: string;
  effort: EffortLevel;
  impact: ImpactLevel;
  resources: string[];
}

export type EcosystemDataSource = 'static' | 'zerodb-assisted' | 'zerodb-full';

export interface EcosystemIntelligence {
  generatedAt: string;
  profile: EcosystemProfile;
  rivals: EcosystemActor[];
  partners: EcosystemActor[];
  userCommunities: UserCommunity[];
  recommendations: EcosystemRecommendation[];
  dataSource: EcosystemDataSource;
  disclaimer: string;
}

export interface EcosystemContext extends ScanContext {
  existingReport: Omit<ScanReport, 'ecosystem'>;
  zerodbAvailable: boolean;
}

export interface EcosystemAnalyzer {
  name: string;
  analyze(context: EcosystemContext): Promise<Partial<EcosystemIntelligence>>;
}
