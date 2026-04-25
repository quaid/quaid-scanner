import { ScannerRegistry } from './registry.js';

// Security
import { BinaryArtifactScanner } from './security/binary-artifacts.js';
import { BranchProtectionScanner } from './security/branch-protection.js';
import { DepPinningDockerScanner } from './security/dep-pinning-docker.js';
import { DepPinningPackagesScanner } from './security/dep-pinning-packages.js';
import { OpenSSFLocalChecksScanner } from './security/openssf-local-checks.js';
import { OpenSSFScorecardScanner } from './security/openssf-scorecard.js';
import { TokenPermissionsScanner } from './security/token-permissions.js';

// Governance
import { AssetProtectionScanner } from './governance/asset-protection.js';
import { BusFactorScanner } from './governance/bus-factor.js';
import { DepLicenseScanningScanner } from './governance/dep-license-scanning.js';
import { GovernanceClassificationScanner } from './governance/governance-classification.js';
import { GovernanceDetectionScanner } from './governance/governance-detection.js';
import { LicenseCompatibilityScanner } from './governance/license-compatibility.js';
import { LicenseContentValidationScanner } from './governance/license-content-validation.js';
import { LicenseDetectionScanner } from './governance/license-detection.js';
import { LicenseHeaderScanner } from './governance/license-headers.js';
import { VendorNeutralityScanner } from './governance/vendor-neutrality.js';

// Community
import { BurnoutDetectionScanner } from './community/burnout-detection.js';
import { ContributorDataScanner } from './community/contributor-data.js';
import { ContributorFunnelScanner } from './community/contributor-funnel.js';
import { FundingScanner } from './community/funding.js';
import { IssueClosureScanner } from './community/issue-closure.js';
import { PsychSafetyScanner } from './community/psych-safety.js';
import { ResponseClassificationScanner } from './community/response-classification.js';
import { ResponseTimeScanner } from './community/response-time.js';
import { StaleBotScanner } from './community/stale-bot.js';
import { SupportChannelScanner } from './community/support-channels.js';

// AI Readiness
import { AgenticRulesScanner } from './ai-readiness/agentic-rules.js';
import { AIRepoDetectionScanner } from './ai-readiness/ai-repo-detection.js';
import { DatasetProvenanceScanner } from './ai-readiness/dataset-provenance.js';
import { ModelCardDetectionScanner } from './ai-readiness/model-card-detection.js';
import { ModelCardScoringScanner } from './ai-readiness/model-card-scoring.js';

// Inclusive
import { AssumedKnowledgeScanner } from './inclusive/assumed-knowledge-scanner.js';
import { DiminishingLanguageScanner } from './inclusive/diminishing-scanner.js';
import { InclusiveCodeScanner } from './inclusive/code-scanner.js';
import { InclusiveDocScanner } from './inclusive/doc-scanner.js';

// Technical
import { InteractionTemplateScanner } from './technical/interaction-templates.js';
import { ReleaseCadenceScanner } from './technical/release-cadence.js';

export function createDefaultRegistry(): ScannerRegistry {
  const registry = new ScannerRegistry();

  // Security
  registry.register(new BinaryArtifactScanner());
  registry.register(new BranchProtectionScanner());
  registry.register(new DepPinningDockerScanner());
  registry.register(new DepPinningPackagesScanner());
  registry.register(new OpenSSFLocalChecksScanner());
  registry.register(new OpenSSFScorecardScanner());
  registry.register(new TokenPermissionsScanner());

  // Governance
  registry.register(new AssetProtectionScanner());
  registry.register(new BusFactorScanner());
  registry.register(new DepLicenseScanningScanner());
  registry.register(new GovernanceClassificationScanner());
  registry.register(new GovernanceDetectionScanner());
  registry.register(new LicenseCompatibilityScanner());
  registry.register(new LicenseContentValidationScanner());
  registry.register(new LicenseDetectionScanner());
  registry.register(new LicenseHeaderScanner());
  registry.register(new VendorNeutralityScanner());

  // Community
  registry.register(new BurnoutDetectionScanner());
  registry.register(new ContributorDataScanner());
  registry.register(new ContributorFunnelScanner());
  registry.register(new FundingScanner());
  registry.register(new IssueClosureScanner());
  registry.register(new PsychSafetyScanner());
  registry.register(new ResponseClassificationScanner());
  registry.register(new ResponseTimeScanner());
  registry.register(new StaleBotScanner());
  registry.register(new SupportChannelScanner());

  // AI Readiness
  registry.register(new AgenticRulesScanner());
  registry.register(new AIRepoDetectionScanner());
  registry.register(new DatasetProvenanceScanner());
  registry.register(new ModelCardDetectionScanner());
  registry.register(new ModelCardScoringScanner());

  // Inclusive
  registry.register(new AssumedKnowledgeScanner());
  registry.register(new DiminishingLanguageScanner());
  registry.register(new InclusiveCodeScanner());
  registry.register(new InclusiveDocScanner());

  // Technical
  registry.register(new InteractionTemplateScanner());
  registry.register(new ReleaseCadenceScanner());

  return registry;
}
