/**
 * Core type definitions for quaid-scanner
 *
 * All enumerations, interfaces, and types used across the scanner system.
 */

// --- Core Enumerations ---

export enum Severity {
  PASS = -1,
  INFO = 0,
  WARNING = 1,
  CRITICAL = 2,
}

export enum Pillar {
  SECURITY = 'security',
  GOVERNANCE = 'governance',
  COMMUNITY = 'community',
  AI_READINESS = 'ai_readiness',
  INCLUSIVE = 'inclusive',
  TECHNICAL = 'technical',
}

export const PILLAR_WEIGHTS: Record<Pillar, number> = {
  [Pillar.SECURITY]: 0.25,
  [Pillar.GOVERNANCE]: 0.20,
  [Pillar.COMMUNITY]: 0.15,
  [Pillar.AI_READINESS]: 0.15,
  [Pillar.INCLUSIVE]: 0.15,
  [Pillar.TECHNICAL]: 0.10,
};

export enum MaturityLevel {
  SANDBOX = 'sandbox',
  INCUBATING = 'incubating',
  GRADUATED = 'graduated',
  ARCHIVED = 'archived',
}

export enum RiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ScanDepth {
  QUICK = 'quick',
  STANDARD = 'standard',
  THOROUGH = 'thorough',
}

export enum OutputFormat {
  JSON = 'json',
  MARKDOWN = 'markdown',
}

// --- Scanner System Types ---

export interface ScanContext {
  repoPath: string;
  repoIdentifier: string | null;
  maturity: MaturityLevel;
  depth: ScanDepth;
  config: ScannerConfig;
  git: {
    commitSha: string | null;
    branch: string | null;
    remoteUrl: string | null;
  };
  signal: AbortSignal;
  emit: (event: ScanEvent) => void;
}

export interface Scanner {
  name: string;
  displayName: string;
  pillar: Pillar;
  dependsOn?: string[];
  run(context: ScanContext): Promise<Finding[]>;
}

export interface Finding {
  id: string;
  severity: Severity;
  pillar: Pillar;
  category: string;
  message: string;
  file: string | null;
  line: number | null;
  column: number | null;
  context?: string;
  suggestion: string;
  referenceUrl?: string;
  metadata?: Record<string, unknown>;
}

export type ScanEvent =
  | { type: 'scan:start'; repoPath: string; depth: ScanDepth }
  | { type: 'scanner:start'; scanner: string; pillar: Pillar }
  | { type: 'scanner:complete'; scanner: string; findingCount: number; durationMs: number }
  | { type: 'scan:complete'; totalFindings: number; durationMs: number }
  | { type: 'ecosystem:start' }
  | { type: 'ecosystem:complete'; dataSource: string };

// --- Report Output Types ---

export interface ScanReport {
  repo: string;
  scannedAt: string;
  version: string;
  depth: ScanDepth;
  durationMs: number;
  overallScore: number;
  riskLevel: RiskLevel;
  maturity: MaturityLevel;
  pillars: Record<Pillar, PillarScore>;
  findings: Finding[];
  recommendations: Recommendation[];
  metadata: RepoMetadata;
  ecosystem?: import('../ecosystem/types.js').EcosystemIntelligence;
}

export interface PillarScore {
  score: number;
  weight: number;
  weightedScore: number;
  counts: {
    critical: number;
    warning: number;
    info: number;
    pass: number;
  };
  scanners: string[];
}

export interface Recommendation {
  priority: number;
  action: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  findingIds: string[];
  resources?: string[];
}

export interface RepoMetadata {
  commitSha: string | null;
  branch: string | null;
  remoteUrl: string | null;
  primaryLanguage: string | null;
  linesOfCode: number | null;
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
}

// --- Configuration Types ---

export interface ScannerConfig {
  maturity: MaturityLevel | null;
  depth: ScanDepth;
  format: OutputFormat;
  output: string | null;
  threshold: number | null;
  quiet: boolean;
  verbose: boolean;
  scannerTimeout: number;
  githubToken: string | null;
  zerodbApiKey: string | null;
  zerodbProjectId: string | null;
  ecosystem: boolean;
  ecosystemDepth: 'static' | 'assisted';
  pillars: PillarConfig;
  bots: BotFilterConfig;
  inclusive: InclusiveConfig;
}

export interface PillarConfig {
  disabled: Pillar[];
  weights: Partial<Record<Pillar, number>>;
  disabledScanners: string[];
}

export interface BotFilterConfig {
  enabled: boolean;
  additional: string[];
  exclude: string[];
}

export interface InclusiveConfig {
  termListUrl: string | null;
  customTerms: Record<string, TermDefinition[]>;
  ignoredTerms: string[];
  excludePatterns: string[];
}

export interface TermDefinition {
  term: string;
  tier: 1 | 2 | 3;
  replacements: string[];
  reason?: string;
}

// --- Storage Types ---

export interface ScanHistoryRecord {
  id: string;
  repo: string;
  scannedAt: Date;
  commitSha: string | null;
  branch: string | null;
  overallScore: number;
  riskLevel: RiskLevel;
  pillarScores: Record<Pillar, number>;
  findingCounts: {
    critical: number;
    warning: number;
    info: number;
    pass: number;
  };
  durationMs: number;
  version: string;
  depth: ScanDepth;
}

export interface TrendData {
  repo: string;
  period: {
    start: Date;
    end: Date;
    days: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  changePercent: number;
  dataPoints: Array<{
    date: Date;
    score: number;
    commitSha: string | null;
  }>;
  newFindings: Finding[];
  resolvedFindings: Finding[];
}
