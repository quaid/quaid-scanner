/**
 * quaid-scanner - Agent-first OSS repository health scanner
 *
 * @module quaid-scanner
 */

export {
  // Enumerations
  Severity,
  Pillar,
  PILLAR_WEIGHTS,
  MaturityLevel,
  RiskLevel,
  ScanDepth,
  OutputFormat,

  // Scanner system
  type ScanContext,
  type Scanner,
  type Finding,
  type ScanEvent,

  // Report output
  type ScanReport,
  type PillarScore,
  type Recommendation,
  type RepoMetadata,

  // Configuration
  type ScannerConfig,
  type PillarConfig,
  type BotFilterConfig,
  type InclusiveConfig,
  type TermDefinition,

  // Storage
  type ScanHistoryRecord,
  type TrendData,
} from './types/index.js';

// Context
export { buildContext, readGitInfo, type GitInfo, type BuildContextResult } from './context-builder.js';

// Scanner plugin system
export { ScannerRegistry } from './scanner/registry.js';
export { Orchestrator, type OrchestratorResult } from './scanner/orchestrator.js';
export { createDefaultRegistry } from './scanner/registry-factory.js';

// Configuration
export { DEFAULT_CONFIG, buildConfig, validateTarget } from './config.js';

// Reporters
export { buildScanReport, serializeJson } from './reporters/json.js';
export { renderMarkdown } from './reporters/markdown.js';
export type { MarkdownReportOptions } from './reporters/markdown.js';
export { renderHtml } from './reporters/html.js';
export type { HtmlReportOptions } from './reporters/html.js';
export { renderTrendAscii, alertOnDrop } from './reporters/trend.js';

// Issue helpers
export { isErrorFinding, renderIssueBody } from './issues.js';

// Persistence
export { ZeroDBClient } from './integrations/zerodb-client.js';
export { storeScanHistory, queryTrend, mapReportToHistoryRecord } from './integrations/scan-history.js';

// Ecosystem Intelligence
export { EcosystemOrchestrator } from './ecosystem/orchestrator.js';
export type {
  EcosystemIntelligence,
  EcosystemProfile,
  EcosystemActor,
  UserCommunity,
  EcosystemRecommendation,
  EcosystemContext,
  EcosystemAnalyzer,
  EcosystemDataSource,
} from './ecosystem/types.js';
