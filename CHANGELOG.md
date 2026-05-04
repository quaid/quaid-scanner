# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-03

First public release of quaid-scanner — an agent-first OSS repository health scanner
built on CHAOSS metrics, The Open Source Way 2.0, and the Inclusive Naming Initiative.

### Added

#### Core Infrastructure
- `quaid-scanner` CLI with `--depth` (quick/standard/thorough), `--format` (json/markdown),
  `--output`, `--threshold`, `--quiet`, `--verbose`, `--ecosystem`, and `--graph` flags
- Exit codes: `0` (score ≥ 8.0), `1` (score 5.0–7.9), `2` (score < 5.0 or threshold failed)
- Plugin-based `Scanner` interface with per-pillar orchestration and weighted scoring
- `ScannerRegistry` for registering and resolving scanner plugins
- `buildContext` / `buildConfig` for Git metadata, maturity detection, and config normalization
- JSON reporter (`buildScanReport`, `serializeJson`) producing schema-valid `ScanReport`
- Markdown reporter (`renderMarkdown`) with score badge, pillar scorecard, findings by severity,
  recommendations, and metadata footer
- ASCII trend renderer (`renderTrendAscii`) and `alertOnDrop` for score regression detection
- MCP server (`src/mcp.ts`) exposing `scan_repository` and `graph_query` tools over JSONRPC stdin/stdout
- `/quaid-scan` Claude Code skill in `.claude/skills/quaid-scan/`

#### Scanners — Security & Supply Chain (Pillar A)
- **Binary Artifacts** — detects committed binaries and build outputs
- **Branch Protection** — checks default branch protection rules via GitHub API
- **Dependency Pinning** — flags unpinned npm/pip/cargo/GitHub Actions dependencies
- **Pinning Docker** — validates Docker base image tag hygiene
- **Pinning Packages** — validates lock file presence and version pinning
- **OpenSSF Caching** — checks for OpenSSF Scorecard badge and CI caching
- **Local Checks** — validates `.gitignore`, secrets hygiene, and file permission signals
- **OpenSSF Scorecard** — invokes the OpenSSF Scorecard API when a GitHub token is present

#### Scanners — Governance & Legal (Pillar B)
- **Bus Factor** — estimates maintainer concentration risk from git log
- **Branch Protection** (governance view) — cross-pillar signal
- **License Compatibility** — validates SPDX license identifiers and dependency compatibility
- **License Classification** — classifies license permissiveness tier
- **License Detection** — detects LICENSE file presence and format
- **License Headers** — checks for SPDX license headers in source files
- **License Scanning** — deep SPDX expression validation
- **License Validation** — cross-references against known-valid SPDX identifiers
- **Vendor Neutrality** — detects single-vendor governance concentration signals

#### Scanners — Community Health (Pillar C)
- **Bot Filter** — identifies and excludes bot commits from contributor counts
- **Burnout Detection** — flags single-maintainer fatigue signals (commit cadence, issue backlog)
- **Contributor Data** — git log contributor counts, domain distribution, 12-month window
- **Contributor Funnel** — casual/regular/core cohort analysis with conversion rates
- **Funding** — checks for FUNDING.yml, OpenCollective, GitHub Sponsors signals
- **Issue Closure** — measures issue resolution rate and response time
- **Psychological Safety** — scans community docs for inclusive and welcoming language signals
- **Response Classification** — classifies maintainer response patterns
- **Response Time** — measures median first-response time from git/issue history
- **Stale Bot** — detects stale-bot configuration and policy
- **Support Channels** — checks for documented support pathways (Discord, Slack, forums, etc.)

#### Scanners — AI-Native & Agentic Readiness (Pillar D)
- **AI Repository Detection** — identifies AI/ML repos from file structure and keywords
- **Agentic Rules** — detects Claude Code, Cursor, Windsurf, OpenClaw, and `.agents/` rule files
- **Dataset Provenance** — checks for dataset documentation and lineage signals
- **Model Card Detection** — validates HuggingFace Model Card section completeness
- **Model Card Scoring** — scores Model Card quality against HuggingFace schema
- **Multi-Model Agentic Rule Detection** — scans for multi-model agent orchestration patterns

#### Scanners — Inclusive Language (Pillar E)
- **Language Scanner** — flags non-inclusive terms per Inclusive Naming Initiative list
- **Code Scanner** — scans source code identifiers and comments for exclusionary language
- **Doc Scanner** — scans documentation files for diminishing or exclusionary language
- **Naming Scanner** — checks project name and branding against INI guidelines
- **Scoring** — aggregates inclusive language findings into a pillar score

#### Scanners — Technical Rigor (Pillar F)
- **Interaction Templates** — validates GitHub Issue and PR template completeness
- **Linter Config** — detects ESLint, Prettier, Ruff, Golangci-lint configuration
- **Release Cadence** — classifies project vitality from release recency and SemVer hygiene
- **SemVer Validation** — validates git tags against semantic versioning conventions
- **Test Coverage** — detects test configuration and coverage threshold settings

#### Persistence & History (Epic 8)
- `ZeroDBClient` — thin REST wrapper for AINative ZeroDB (vector upsert/search, table insert/query)
- `storeScanHistory` — writes each scan result to a `scan_history` ZeroDB table
- `queryTrend` — queries score history and classifies trend as improving/declining/stable

#### Ecosystem Intelligence (Epic 10)
- `DomainDetector` — infers project domain from GitHub topics, README keywords, and file structure
- `FoundationMapper` — maps detected domains to OSS foundations and standards (static taxonomy)
- `RivalFinder` — identifies competitor projects via domain taxonomy and optional ZeroDB vector search
- `PartnerFinder` — identifies integration partners from dependency manifests and README patterns
- `CommunityMapper` — maps domains to known user communities (forums, Slack, Discord, etc.)
- `StrategyAdvisor` — deterministic rules engine producing up to 8 ranked strategic recommendations
- `CorpusBuilder` — upserts repo profiles into ZeroDB for similarity-based rival discovery
- `EcosystemOrchestrator` — coordinates all analyzers; opt-in via `--ecosystem` flag
- `dataSource` field: `'static'` | `'zerodb-assisted'` | `'zerodb-full'`

#### OSS Social Graph (Epic 11)
- `src/graph/types.ts` — `GraphNode`, `GraphEdge`, `CollaborationSpectrum`, `GraphIntelligence`,
  `DiscoveryFeed`, `TraversalOptions`, `GraphTraversalResult`, `ReverseDependencyResult`
- `upsertGraphNode` — registers each scanned repo as a node in the `graph_nodes` ZeroDB table
- `detectDependencyEdges` — creates `depends_on` edges from `package.json`, `requirements.txt`,
  and `go.mod` manifests
- `queryReverseDependencies` — returns all repos in the graph that depend on a given repo
- `analyzeSharedSignals` — detects shared maintainer (email overlap) and foundation co-membership
  signals, storing `co_signal` edges with Jaccard-weighted strength
- `scoreRelationship` — classifies pairs of repos on a 6-value collaboration spectrum:
  `upstream_dependency`, `downstream_consumer`, `peer_collaborator`, `adjacent_competitor`,
  `direct_rival`, `foundation_sibling`
- `traverseGraph` — BFS traversal up to 3 hops with edge-type and weight filtering
- `buildDiscoveryFeed` — produces 4 ranked suggestion lists: collaborate, depend_on, watch, join
- MCP `graph_query` tool — exposes graph traversal to any MCP-compatible agent

### Technical
- TypeScript strict mode, NodeNext module resolution, ESM throughout
- 74 test files, 1285 tests, ≥80% statement and branch coverage enforced via vitest thresholds
- `prepublishOnly` script runs build + full test suite before any npm publish

[0.1.0]: https://github.com/quaid/quaid-scanner/releases/tag/v0.1.0
[Unreleased]: https://github.com/quaid/quaid-scanner/compare/v0.1.0...HEAD
