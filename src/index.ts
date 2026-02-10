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

// Scanner plugin system
export { ScannerRegistry } from './scanner/registry.js';
export { Orchestrator, type OrchestratorResult } from './scanner/orchestrator.js';

// Configuration
export { DEFAULT_CONFIG, buildConfig, validateTarget } from './config.js';
