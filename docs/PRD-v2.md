# OSS Repository Health Scanner - PRD v2

## Executive Summary

**Product:** `oss-repo-check` - A Strategic Repository Health Orchestrator

**Vision:** Transform from a basic documentation linter into a comprehensive OSS health auditor that evaluates security, legal compliance, community health, AI-readiness, and inclusive practices. Designed for Open Source Program Offices (OSPOs), engineering managers, and AI agents evaluating tool safety.

**Platform:** Node.js package with Claude Code skills integration, leveraging AINative services for semantic analysis, persistent storage, and intelligent reporting.

---

## Problem Statement

Modern open source risk management extends beyond code quality:

| Risk Category | Problem | Impact |
|--------------|---------|--------|
| **Supply Chain** | Unpinned dependencies, unprotected branches | Security vulnerabilities |
| **Legal** | License incompatibilities in dependency trees | Legal liability |
| **Sustainability** | Single maintainer, zombie projects | Long-term maintenance risk |
| **AI Safety** | Missing Model Cards, no agentic rules | Unpredictable AI behavior |
| **Inclusion** | Exclusionary language, assumed knowledge | Contributor barriers |

---

## Strategic Pillars

### Pillar A: Security & Supply Chain Integrity
### Pillar B: Governance & Legal Compliance
### Pillar C: Community Health (CHAOSS Metrics)
### Pillar D: AI-Native & Agentic Readiness
### Pillar E: Inclusive Language & Accessibility
### Pillar F: Technical Rigor & Automation

---

## AINative Services Integration

| Service | Use Case | Benefit |
|---------|----------|---------|
| **ZeroDB Vector Search** | Semantic license matching, governance classification | AI-powered content analysis |
| **ZeroDB PostgreSQL** | Store scan results, track historical trends | Persistent audit trail |
| **ZeroDB File Storage** | Cache reports, store badge assets | Fast retrieval |
| **ZeroDB Tables** | NoSQL storage for scan metadata | Flexible schema |
| **AINative API** | Semantic analysis of documentation quality | Intelligent scoring |

---

## Epic 1: Core Infrastructure

### Story 1.1: Project Initialization
**As a** developer
**I want** a well-structured TypeScript project
**So that** I can build maintainable, type-safe code

**Acceptance Criteria:**
- [ ] package.json with proper metadata and scripts
- [ ] tsconfig.json with strict TypeScript settings
- [ ] ESLint and Prettier configuration
- [ ] Vitest test framework configured
- [ ] 80%+ code coverage requirement enforced

**Story Points:** 2

---

### Story 1.2: CLI Interface
**As a** user
**I want** a command-line interface
**So that** I can scan repositories from my terminal

**Acceptance Criteria:**
- [ ] `oss-repo-check <path|url>` scans a repository
- [ ] `--depth quick|standard|thorough` controls scan depth
- [ ] `--format markdown|json` selects output format
- [ ] `--output <file>` writes report to file
- [ ] `--config <file>` loads custom configuration
- [ ] Exit codes: 0 (pass), 1 (warnings), 2 (critical issues)

**Story Points:** 3

---

### Story 1.3: Scanner Orchestrator
**As a** developer
**I want** a modular scanner architecture
**So that** I can easily add new check categories

**Acceptance Criteria:**
- [ ] Plugin-based scanner registration
- [ ] Parallel execution of independent checks
- [ ] Unified findings collection
- [ ] Configurable severity thresholds
- [ ] Progress reporting for long scans

**Story Points:** 5

---

## Epic 2: Security & Supply Chain (Pillar A)

### Story 2.1: OpenSSF Scorecard Integration (SEC-01)
**As an** OSPO manager
**I want** OpenSSF Scorecard metrics
**So that** I can assess supply chain security

**Acceptance Criteria:**
- [ ] Integrate with OpenSSF Scorecard API or reimplement 18-point checks
- [ ] Provide Trust Score (0-10) based on industry consensus
- [ ] Cache results in **ZeroDB PostgreSQL** for trending
- [ ] Store detailed findings in **ZeroDB Tables**

**AINative Integration:** Store historical scores in ZeroDB PostgreSQL for trend analysis

**Story Points:** 8

---

### Story 2.2: Branch Protection Audit (SEC-02)
**As a** security engineer
**I want** branch protection verification
**So that** I can ensure code review requirements

**Acceptance Criteria:**
- [ ] Check via GitHub API if default branch requires PR reviews
- [ ] Verify status checks are required before merge
- [ ] Confirm force pushes are prevented
- [ ] Flag unprotected branches as "Critical Risk"

**Story Points:** 3

---

### Story 2.3: Dependency Pinning Scan (SEC-03)
**As a** DevSecOps engineer
**I want** dependency pinning validation
**So that** I can prevent supply chain attacks

**Acceptance Criteria:**
- [ ] Detect unpinned npm dependencies (`@latest`, `^`, `~`)
- [ ] Flag mutable Docker tags (`:latest`, no digest)
- [ ] Check GitHub Actions for unpinned action versions
- [ ] 100% detection rate for mutable references

**Story Points:** 5

---

### Story 2.4: Binary Artifact Detection (SEC-04)
**As a** security auditor
**I want** binary file detection
**So that** I can identify potential malware vectors

**Acceptance Criteria:**
- [ ] Scan source tree for binaries (.exe, .jar, .dll, .so)
- [ ] Flag binaries > 1MB committed to source
- [ ] Exclude expected binaries (icons, fonts) via config
- [ ] Report file hashes for verification

**Story Points:** 3

---

### Story 2.5: Token Permission Analysis (SEC-05)
**As a** security engineer
**I want** GitHub Actions permission analysis
**So that** I can enforce least privilege

**Acceptance Criteria:**
- [ ] Parse workflow YAML files for `permissions:` blocks
- [ ] Flag workflows with default read/write permissions
- [ ] Identify overly permissive `GITHUB_TOKEN` usage
- [ ] Recommend minimal permission sets

**Story Points:** 3

---

## Epic 3: Governance & Legal Compliance (Pillar B)

### Story 3.1: License Compatibility Scan (GOV-01)
**As a** legal compliance officer
**I want** license conflict detection
**So that** I can avoid legal liability

**Acceptance Criteria:**
- [ ] Deep dependency scan for license information
- [ ] Detect copyleft "viral" pollution in permissive projects
- [ ] Use **ZeroDB Vector Search** for semantic license matching
- [ ] Report "High Legal Risk" for incompatible combinations
- [ ] Integration with ClearlyDefined API for license data

**AINative Integration:** Use ZeroDB vector embeddings to semantically match license text variations

**Story Points:** 8

---

### Story 3.2: SPDX Content Validation (GOV-02)
**As a** compliance auditor
**I want** LICENSE file content validation
**So that** I can verify license authenticity

**Acceptance Criteria:**
- [ ] Compare LICENSE content against SPDX standard texts
- [ ] Calculate Levenshtein distance (< 5% deviation = match)
- [ ] Use **ZeroDB Vector Search** for fuzzy matching
- [ ] Detect modified or non-standard license texts

**AINative Integration:** Store SPDX license embeddings in ZeroDB for fast semantic comparison

**Story Points:** 5

---

### Story 3.3: Governance Model Classification (GOV-03)
**As an** OSPO analyst
**I want** governance model identification
**So that** I can assess project decision-making structure

**Acceptance Criteria:**
- [ ] Analyze GOVERNANCE.md using **AINative semantic analysis**
- [ ] Classify as: BDFL, Meritocracy, Foundation-backed, Corporate
- [ ] Identify keywords: "Steering Committee", "Voting", "Consensus"
- [ ] Store classification in **ZeroDB PostgreSQL**

**AINative Integration:** Use ZeroDB vector search for semantic governance classification

**Story Points:** 5

---

### Story 3.4: Bus Factor Analysis (GOV-04)
**As a** risk manager
**I want** bus factor calculation
**So that** I can assess maintainer concentration risk

**Acceptance Criteria:**
- [ ] Analyze commit history for contributor distribution
- [ ] Calculate CHAOSS "Elephant Factor" metric
- [ ] Warn if >50% of commits in last 6 months by 1 author
- [ ] Track trends in **ZeroDB PostgreSQL**

**Story Points:** 3

---

### Story 3.5: Asset Protection Check (GOV-05)
**As a** legal advisor
**I want** trademark and export control checks
**So that** I can verify commercial OSS compliance

**Acceptance Criteria:**
- [ ] Check for Trademark Guidelines document
- [ ] Detect Export Control notices (ECCN)
- [ ] Verify CLA/DCO requirements documented

**Story Points:** 2

---

## Epic 4: Community Health (Pillar C)

### Story 4.1: Time-to-First-Response (COM-01)
**As a** community manager
**I want** response time metrics
**So that** I can assess community engagement

**Acceptance Criteria:**
- [ ] Calculate median time to first response (last 90 days)
- [ ] Categorize: Healthy (<48h), Slow (>1 week), Dormant (>1 month)
- [ ] Separate metrics for Issues vs PRs
- [ ] Store time series in **ZeroDB PostgreSQL**

**AINative Integration:** Track historical responsiveness trends in ZeroDB

**Story Points:** 5

---

### Story 4.2: Contributor Funnel Analysis (COM-02)
**As a** community strategist
**I want** contributor segmentation
**So that** I can measure retention

**Acceptance Criteria:**
- [ ] Segment: "Casual" (1-2 commits), "Regular" (monthly), "Core" (weekly)
- [ ] Calculate conversion rates between segments
- [ ] Visualize contributor drop-off rates
- [ ] Track cohorts over time in **ZeroDB PostgreSQL**

**Story Points:** 5

---

### Story 4.3: Zombie Project Detection (COM-03)
**As an** OSPO manager
**I want** zombie project identification
**So that** I can avoid adopting abandoned projects

**Acceptance Criteria:**
- [ ] Calculate human vs bot issue closure ratio
- [ ] Flag projects where >80% closures are automated/stale
- [ ] Detect "Stale" bot activity patterns
- [ ] Warn on low "Change Request Closure Ratio"

**Story Points:** 3

---

### Story 4.4: DEI Artifact Validation (COM-04)
**As a** DEI advocate
**I want** Code of Conduct quality checks
**So that** I can ensure enforcement mechanisms exist

**Acceptance Criteria:**
- [ ] Validate CODE_OF_CONDUCT.md contains enforcement contact
- [ ] Check for email or URL in enforcement section
- [ ] Detect template-only CoC (no customization)
- [ ] Verify reporting process is documented

**Story Points:** 2

---

## Epic 5: AI-Native Readiness (Pillar D)

### Story 5.1: Model Card Validation (AI-01)
**As an** ML engineer
**I want** Model Card presence verification
**So that** I can ensure AI documentation standards

**Acceptance Criteria:**
- [ ] Check README for: "Intended Use", "Limitations", "Bias" sections
- [ ] Validate Hugging Face Model Card format
- [ ] Use **ZeroDB Vector Search** for section detection
- [ ] Flag missing "Nutrition Label" sections

**AINative Integration:** Semantic search for Model Card sections using ZeroDB

**Story Points:** 5

---

### Story 5.2: Dataset Provenance (AI-02)
**As a** data scientist
**I want** dataset documentation checks
**So that** I can verify data lineage

**Acceptance Criteria:**
- [ ] Detect .csv/.parquet files in repository
- [ ] Check for "Datasheets for Datasets" documentation
- [ ] Verify data source attribution
- [ ] Flag missing provenance documentation

**Story Points:** 3

---

### Story 5.3: Agentic Rule Detection (AI-03)
**As an** AI developer
**I want** agentic configuration detection
**So that** I can verify AI assistant compatibility

**Acceptance Criteria:**
- [ ] Detect `.cursor/rules` (Cursor IDE)
- [ ] Detect `CLAUDE.md` (Anthropic Claude Code)
- [ ] Detect `.github/copilot-instructions.md` (GitHub Copilot)
- [ ] Detect `agentic-rules` or similar patterns
- [ ] Report AI context file coverage

**Story Points:** 2

---

### Story 5.4: Metadata Quality (AI-04)
**As a** tooling developer
**I want** machine-readable metadata validation
**So that** I can enable automated discovery

**Acceptance Criteria:**
- [ ] Validate YAML front-matter in README.md
- [ ] Check for: license, language, tags fields
- [ ] Verify package.json/pyproject.toml completeness
- [ ] Score metadata completeness (0-100%)

**Story Points:** 2

---

## Epic 6: Inclusive Language & Accessibility (Pillar E)

### Story 6.1: Inclusive Naming Scan (INC-01)
**As a** community advocate
**I want** non-inclusive terminology detection
**So that** I can improve contributor experience

**Acceptance Criteria:**
- [ ] Detect Tier 1 terms (master, slave, whitelist, blacklist)
- [ ] Detect Tier 2 terms (sanity-check)
- [ ] Detect Tier 3 terms (man-hour, man-in-the-middle)
- [ ] Provide replacement suggestions
- [ ] Report file:line locations

**Story Points:** 3

---

### Story 6.2: Diminishing Language Detection (INC-02)
**As a** documentation author
**I want** dismissive language detection
**So that** I can create welcoming documentation

**Acceptance Criteria:**
- [ ] Detect: "just", "simply", "easy", "obvious", "trivial"
- [ ] Context-aware detection (avoid false positives)
- [ ] Suggest alternative phrasing
- [ ] Calculate "welcoming score"

**Story Points:** 3

---

### Story 6.3: Assumed Knowledge Detection (INC-03)
**As a** new contributor
**I want** prerequisite knowledge flagging
**So that** I can identify documentation gaps

**Acceptance Criteria:**
- [ ] Detect unexplained Git operations
- [ ] Flag tool usage without setup instructions
- [ ] Identify acronyms without definitions
- [ ] Suggest adding prerequisite sections

**Story Points:** 3

---

## Epic 7: Technical Rigor (Pillar F)

### Story 7.1: Linter Configuration Check (TECH-01)
**As a** code quality engineer
**I want** linter presence verification
**So that** I can ensure code standards

**Acceptance Criteria:**
- [ ] Detect: .eslintrc, .pylintrc, golangci.yml, rustfmt.toml
- [ ] Check for meta-linters (Super-Linter)
- [ ] Verify CI integration for linting

**Story Points:** 2

---

### Story 7.2: Test Coverage Detection (TECH-02)
**As a** quality engineer
**I want** coverage reporting verification
**So that** I can assess test quality

**Acceptance Criteria:**
- [ ] Detect Codecov/Coveralls integration
- [ ] Find coverage badges in README
- [ ] Check for coverage configuration files

**Story Points:** 2

---

### Story 7.3: Semantic Versioning Validation (TECH-03)
**As a** release manager
**I want** semver compliance verification
**So that** I can ensure predictable versioning

**Acceptance Criteria:**
- [ ] Analyze git tags for vX.Y.Z format
- [ ] Detect breaking changes without major bump
- [ ] Verify CHANGELOG.md exists and is maintained

**Story Points:** 2

---

## Epic 8: Reporting & Output

### Story 8.1: JSON Report Generator
**As a** CI/CD pipeline
**I want** machine-readable JSON output
**So that** I can automate quality gates

**Acceptance Criteria:**
- [ ] Standardized JSON schema for all pillars
- [ ] Overall score (0-10) and risk level
- [ ] Per-pillar scores and details
- [ ] Actionable recommendations array
- [ ] Store reports in **ZeroDB File Storage**

**AINative Integration:** Cache JSON reports in ZeroDB for historical comparison

**Story Points:** 3

---

### Story 8.2: Markdown Report Generator
**As a** human reviewer
**I want** readable markdown output
**So that** I can review findings easily

**Acceptance Criteria:**
- [ ] Summary scorecard table
- [ ] Findings grouped by severity (Critical, Warning, Info)
- [ ] File:line references with context
- [ ] Resource links for remediation
- [ ] Badge-ready score display

**Story Points:** 3

---

### Story 8.3: Historical Trend Tracking
**As an** OSPO manager
**I want** scan history storage
**So that** I can track improvement over time

**Acceptance Criteria:**
- [ ] Store each scan in **ZeroDB PostgreSQL**
- [ ] Calculate score trends (improving/declining/stable)
- [ ] Generate trend visualizations
- [ ] Alert on score regressions

**AINative Integration:** Full scan history in ZeroDB PostgreSQL with trend queries

**Story Points:** 5

---

## Epic 9: Claude Code Integration

### Story 9.1: Claude Skill Definition
**As a** Claude Code user
**I want** an `/oss-repo-scan` skill
**So that** I can scan repos conversationally

**Acceptance Criteria:**
- [ ] SKILL.md with full capability description
- [ ] Reference files for each check category
- [ ] Support for quick/standard/thorough depth
- [ ] Natural language result interpretation

**Story Points:** 3

---

### Story 9.2: MCP Server Integration
**As a** Claude Code user
**I want** MCP server configuration
**So that** I can use the scanner as a tool

**Acceptance Criteria:**
- [ ] .mcp.json configuration template
- [ ] Tool definitions for scan operations
- [ ] Integration with ZeroDB MCP for storage

**Story Points:** 2

---

## Architecture

### Package Structure

```
oss-repo-check/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main export
│   ├── cli.ts                      # CLI with commander.js
│   ├── scanner/
│   │   ├── orchestrator.ts         # Scan coordination
│   │   ├── security/               # Pillar A checks
│   │   │   ├── scorecard.ts
│   │   │   ├── branch-protection.ts
│   │   │   ├── dependency-pinning.ts
│   │   │   ├── binary-detection.ts
│   │   │   └── token-permissions.ts
│   │   ├── governance/             # Pillar B checks
│   │   │   ├── license-scan.ts
│   │   │   ├── spdx-validation.ts
│   │   │   ├── governance-model.ts
│   │   │   ├── bus-factor.ts
│   │   │   └── asset-protection.ts
│   │   ├── community/              # Pillar C checks
│   │   │   ├── response-time.ts
│   │   │   ├── contributor-funnel.ts
│   │   │   ├── zombie-detection.ts
│   │   │   └── dei-validation.ts
│   │   ├── ai-readiness/           # Pillar D checks
│   │   │   ├── model-card.ts
│   │   │   ├── dataset-provenance.ts
│   │   │   ├── agentic-rules.ts
│   │   │   └── metadata-quality.ts
│   │   ├── inclusive/              # Pillar E checks
│   │   │   ├── naming-scan.ts
│   │   │   ├── diminishing-language.ts
│   │   │   └── assumed-knowledge.ts
│   │   └── technical/              # Pillar F checks
│   │       ├── linter-config.ts
│   │       ├── coverage-detection.ts
│   │       └── semver-validation.ts
│   ├── integrations/
│   │   ├── github-api.ts           # GitHub REST/GraphQL
│   │   ├── zerodb-client.ts        # AINative ZeroDB
│   │   ├── openssf-scorecard.ts    # OpenSSF API
│   │   └── clearly-defined.ts      # License data API
│   ├── reporters/
│   │   ├── json.ts
│   │   ├── markdown.ts
│   │   └── badge.ts
│   └── types/
│       └── index.ts
├── .claude/
│   └── skills/
│       └── oss-repo-scan/
│           ├── SKILL.md
│           └── references/
├── tests/
└── docs/
```

---

## JSON Report Schema

```json
{
  "repo": "owner/project",
  "scanned_at": "2026-01-15T00:00:00Z",
  "overall_score": 8.5,
  "risk_level": "LOW",
  "pillars": {
    "security": {
      "score": 9.0,
      "checks": {
        "openssf_scorecard": 8.5,
        "branch_protection": true,
        "pinned_dependencies": true,
        "binary_artifacts": false,
        "token_permissions": "minimal"
      }
    },
    "governance": {
      "score": 7.5,
      "model": "Meritocracy",
      "license": "Apache-2.0",
      "license_compatible": true,
      "bus_factor": 3
    },
    "community": {
      "score": 8.0,
      "responsiveness": "24h",
      "health_status": "Active",
      "zombie_risk": false
    },
    "ai_readiness": {
      "score": 6.0,
      "model_card": false,
      "agent_rules": ["CLAUDE.md"],
      "metadata_quality": 80
    },
    "inclusive": {
      "score": 9.0,
      "tier1_violations": 0,
      "tier2_violations": 1,
      "diminishing_language": 3,
      "assumed_knowledge": 2
    },
    "technical": {
      "score": 8.5,
      "linter_config": true,
      "coverage_reporting": true,
      "semver_compliant": true
    }
  },
  "findings": [...],
  "recommendations": [...]
}
```

---

## Success Metrics (KPIs)

| Metric | Target |
|--------|--------|
| False Positive Rate | < 5% on "High Risk" flags |
| Scan Time | < 30 seconds for average repos |
| Test Coverage | ≥ 80% |
| AINative API Latency | < 2 seconds for semantic checks |
| Adoption | Used by OSPOs for inbound OSS gatekeeping |

---

## Story Point Summary

| Epic | Stories | Total Points |
|------|---------|--------------|
| Epic 1: Core Infrastructure | 3 | 10 |
| Epic 2: Security | 5 | 22 |
| Epic 3: Governance | 5 | 23 |
| Epic 4: Community | 4 | 15 |
| Epic 5: AI-Native | 4 | 12 |
| Epic 6: Inclusive | 3 | 9 |
| Epic 7: Technical | 3 | 6 |
| Epic 8: Reporting | 3 | 11 |
| Epic 9: Claude Integration | 2 | 5 |
| **Total** | **32** | **113** |

---

## Implementation Phases

### Phase 1: Foundation (Stories: 1.1-1.3, 6.1-6.3)
- Core infrastructure and CLI
- Inclusive language checks (original v1 scope)
- Basic markdown/JSON reporting

### Phase 2: Security & Governance (Stories: 2.1-2.5, 3.1-3.5)
- OpenSSF Scorecard integration
- License compliance scanning
- ZeroDB integration for storage

### Phase 3: Community & AI (Stories: 4.1-4.4, 5.1-5.4)
- CHAOSS metrics implementation
- AI-readiness checks
- Historical trending

### Phase 4: Polish & Integration (Stories: 7.1-7.3, 8.1-8.3, 9.1-9.2)
- Technical rigor checks
- Claude Code skill
- MCP server integration

---

## Dependencies

| External Service | Purpose | Required |
|-----------------|---------|----------|
| GitHub API | Repository data, branch protection | Yes |
| OpenSSF Scorecard | Security metrics | Optional |
| ClearlyDefined | License data | Optional |
| ZeroDB (AINative) | Storage, vector search | Yes |
| SPDX | License validation | Yes |

---

## References

- [OpenSSF Scorecard](https://scorecard.dev)
- [CHAOSS Metrics](https://chaoss.community)
- [Inclusive Naming Initiative](https://inclusivenaming.org)
- [The Open Source Way](https://www.theopensourceway.org)
- [SPDX License List](https://spdx.dev)
- [ClearlyDefined](https://clearlydefined.io)
- [AINative ZeroDB](https://ainative.studio)
