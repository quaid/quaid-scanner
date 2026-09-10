# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.5] - 2026-08-02

### Added

- **Agent-session provenance** — A new `--provenance-file <path>` flag lets an agent inject a JSON
  record of its session (models used, token counts, session/agent IDs, timestamp) at scan time. The
  data is carried through as a top-level `provenance` object in JSON output and a `## Report
  Provenance` section in markdown output — opt-in, omitted entirely when unused. The `ProvenanceInfo`
  type is exported for library consumers. (#178, #179, #180)
- **Project governance and funding** — Added a `GOVERNANCE.md` describing the maintainer-led model,
  how decisions are made in the open, and the path to adding maintainers, plus a `FUNDING.yml`
  Sponsor link (Open Collective).
- **Continuous integration** — A CI workflow now runs lint, build, and the full test suite with
  coverage on every push and pull request to `main`.

### Fixed

- **Response-time and response-classification scanners no longer error against GitHub's GraphQL
  API** — Both scanners ordered an inner `comments` connection by `CREATED_AT`, which
  `IssueCommentOrderField` no longer accepts, causing GitHub to reject the whole query and degrade
  every affected finding to a WARNING carrying the raw API error. The invalid ordering is removed;
  GitHub's default ascending-by-creation comment order preserves first-response timing exactly. (#213)

### Changed

- **Consolidated scanner directory exclusions** — Eight scanners each maintained their own drifting
  `EXCLUDED_DIRS` lists. They now share a single `excludeGlobs()` baseline (dependencies, build
  output, caches, toolchain directories, and quaid-scanner's own report output), closing the drift
  that had reintroduced self-scan and cache bugs. The binary-artifacts scanner intentionally keeps
  `__pycache__` visible so it can still flag committed `.pyc` bytecode. (#171)
- **Supply-chain hardening** — GitHub Actions in the publish and CI workflows are pinned to full
  commit SHAs instead of moving tags. (#123)

## [0.1.4] - 2026-08-01

### Fixed

- **Inclusive scanner config hardening** — Additional defensive guards on all three inclusive
  scanners (`inclusive-code-scanner`, `inclusive-doc-scanner`, `inclusive-naming-scanner`) for
  every `config.inclusive` property access, beyond the crash fix shipped in v0.1.3. Eliminates a
  remaining class of undefined-access failures when library callers supply a partial config. (#149)
- **Exclude `.claude` and `.ainative` from binary-artifacts scan** — toolchain directories
  contain compiled hooks and binary-like files that are not repository artifacts. They now receive
  the same treatment as `node_modules/` and `dist/`. (#150, #161)
- **Acronym heuristic overhaul — four-stage false-positive elimination** — The assumed-knowledge
  scanner's acronym detector was generating heavy noise: it flagged markdown emphasis words
  (`ALL_CAPS`), HTTP verbs (`GET`, `POST`, `PUT`), and common English words (`IT`, `OR`, `AND`).
  Fixed progressively: (1) skip emphasis and HTTP verbs (#162), (2) skip real English words via a
  300-word dictionary (#166), (3) expand the dictionary and emphasis denylist (#191), (4) replace
  the heuristic with a principled suffix/length/vowel-pattern test (#193). (#151)
- **Cite Microsoft Style Guide for diminishing-language findings** — `referenceUrl` on
  diminishing-language findings now points to the Microsoft Style Guide entry for inclusive
  language instead of a generic placeholder. (#152, #160)
- **Split scanner errors into a separate report section** — Scanner failures (timeouts, crashes)
  now render in their own `## Scanner Errors` section rather than mixed into finding sections,
  making errors easier to notice and distinguish from real findings. (#154, #163)
- **Cap inclusive pillar findings at WARNING; remove CRITICAL from inclusive scanners** — INI
  tier 1/2/3 previously mapped directly to CRITICAL/WARNING/INFO severity, making the inclusive
  pillar score contribution disproportionate. Tier is now a metadata label; severity is capped at
  WARNING for all three inclusive scanners. (#165, #167, #168)
- **Exclude self-generated output from inclusive content scanners** — The doc-scanner and
  code-scanner were scanning quaid's own generated HTML reports and markdown output files,
  producing findings about the scanner's own output. Generated output is now excluded. (#169, #172)
- **De-duplicate file list and findings in inclusive scanners** — When multiple glob patterns
  matched the same file, inclusive scanners could process it multiple times and emit duplicate
  findings. Files are now deduplicated before processing; findings are deduplicated after
  collection. (#170, #173)
- **Per-term INI deep links in inclusive scanner findings** — `referenceUrl` on inclusive-scanner
  findings now links to the specific INI term page
  (`inclusivenaming.org/language-guide/terms/{term}`) rather than the INI homepage. (#174, #176)
- **devDependency `^` prefix severity changed from WARNING to INFO** — semver range prefixes in
  devDependencies don't ship with the library; WARNING overstated the risk. Changed to INFO. (#177, #186)
- **Reduce INFO deduction to prevent inclusive pillar score 0.0** — A disproportionate per-finding
  deduction on INFO-severity findings was driving the inclusive pillar to 0.0 even with no
  CRITICAL or WARNING findings present. INFO findings now carry a lighter score deduction. (#175, #187)
- **`renderIssueBody` — three correctness fixes** — Wrong querySelector that matched no elements;
  broken report URL template; missing per-pillar rationale in the "Why it matters" section. All
  three corrected. (#182, #183, #184, #189)
- **Local timezone for report timestamps and filenames** — Report timestamps and auto-generated
  filenames (e.g. `scan-2026-06-12T14-30-00.md`) were formatted in UTC regardless of host
  timezone. Now use local time. (#188, #190)
- **Skip code fences in prose checks (assumed-knowledge scanner)** — The assumed-knowledge
  scanner was checking inside fenced code blocks for prose patterns, producing false positives for
  technical terms in example code. Code blocks are now excluded from prose heuristics. (#194, #195)
- **Drop hardcoded `'Replace with:'` prefix in grouped renderer** — The grouped markdown renderer
  was prepending `'Replace with:'` to every suggestion, duplicating text the suggestion already
  expressed. (#203, #205)
- **Cap context length in grouped markdown renderer** — Long file paths and context snippets
  could make grouped findings unreadably wide. Context is now capped at 120 characters. (#201, #206)
- **Skip minified bundles in inclusive scanners** — Minified JavaScript (`*.min.js`,
  `*.bundle.js`, etc.) was being scanned for inclusive language. These are now excluded alongside
  `node_modules/`, `dist/`, and `build/`. (#202, #208)
- **Exclude self-generated `.html` reports from inclusive scanners** — HTML report files written
  by the scanner were being re-scanned on subsequent runs, generating findings about the scanner's
  own output. (#207, #209)

### Added

- **Per-term `referenceUrl` on diminishing-language patterns** — Each pattern in the
  diminishing-language scanner now carries its own `referenceUrl` linking to the Microsoft Style
  Guide, Hemingway App, or other authoritative reference for that specific pattern rather than
  sharing a single generic link. (#153, #164)
- **INI tier as metadata, decoupled from severity** — INI tier (1/2/3) is now surfaced as a
  classification label in finding metadata, independent of `severity`. Consumers can filter or
  display by tier without overloading the severity field. (#165, #167)
- **Grouped markdown rendering** — `--format markdown` output now collapses repeat findings (same
  category, multiple files) into a single grouped block with a file list and representative
  context, dramatically reducing report size for projects with widespread findings. (#196, #197)
- **`renderHtml()` library export** — Generates a fully self-contained single-file HTML report
  with embedded CSS, pillar score bars, severity-coloured findings, and collapsible sections. No
  external dependencies. Available at the package root for consumers who want HTML output
  programmatically. (Story 8.8, #200)

## [0.1.3] - 2026-06-02

### Fixed

- **`scannerTimeout` undefined → 0 ms** — when library callers omit `scannerTimeout` from their
  config, the orchestrator now falls back to `DEFAULT_CONFIG.scannerTimeout` (90 s) instead of
  passing `undefined` to `setTimeout`, which Node.js silently coerced to 0 ms. This was the root
  cause of ~281 bogus "timed out after undefinedms" issues filed across 27 external repos. (#135)
- **Inclusive scanner crash on undefined `config.inclusive`** — all three inclusive scanners
  (`inclusive-code-scanner`, `inclusive-doc-scanner`, `inclusive-naming-scanner`) now handle a
  missing `config.inclusive` object gracefully by falling back to safe defaults. Previously they
  crashed with `Cannot read properties of undefined (reading 'termListUrl')`, producing ~81 bogus
  crash issues in external repos. (#136)
- **CLI stdout flush race** — the CLI previously called `process.exit()` immediately after
  `process.stdout.write()`, which could truncate output when stdout was piped. Now uses the
  write-callback form (`process.stdout.write(output, () => process.exit(code))`) to guarantee the
  write completes before the process exits. (#137)
- **`partial` and `failedScanners` missing from scan reports** — `OrchestratorResult` and
  `ScanReport` now carry `partial: boolean` and `failedScanners: FailedScannerRecord[]` so
  consumers can detect and handle incomplete scans without parsing raw finding categories. (#138)
- **`buildContext` not exported from the package** — `buildContext`, `readGitInfo`, `GitInfo`, and
  `BuildContextResult` are now re-exported from `src/index.ts`. Previously consumers had to import
  from the internal `dist/context-builder.js` path. (#140)
- **`.quaid-scanner-ignore` not respected by `diminishing-language-scanner` and
  `assumed-knowledge-scanner`** — these two scanners now load and apply both `.quaid-scanner-ignore`
  file patterns and `config.inclusive.excludePatterns`, consistent with the other inclusive
  scanners. (#122)

### Added

- **`isErrorFinding()` library export** — utility function that returns `true` for findings whose
  `category` is `'timeout'` or `'error'` (i.e. scanner failures, not real repo findings). Batch
  runners and agent tools should filter these out before filing issues. Re-exported from the
  package root. (#139)
- **`renderIssueBody()` library export** — produces a structured, agent-executable GitHub issue
  body with five sections (What is wrong / Why it matters / How to fix it / How to verify /
  Context) and a runnable `quaid-scanner` verification command. Available at the package root so
  all consumers (batch runners, MCP tools, CI integrations) get a consistent template. (#143)
- **`scripts/quaid-scan-batch.mjs`** — production batch runner that scans every repo in a GitHub
  org, commits health reports, opens and merges PRs, and files structured GitHub issues. Fixes all
  batch runner bugs from the June 2026 incident: idempotency state file, rate-limit backoff,
  orphan-branch guard, `--head` flag on `gh pr create`, `git add -f`, `--body-file`, and actionable
  finding filter. (#141–#148)
- **`scripts/quaid-cleanup-bogus.mjs`** — closes bogus timeout/crash issues filed by a broken
  batch run. Matches only the two title patterns produced by the scanner bugs fixed in this
  release; does not touch any legitimate findings.
- **`scripts/quaid-scan-recovery.mjs`** — post-batch recovery utility that creates missing PRs,
  re-runs hard-error repos, and closes duplicate issues in a single repo.

## [0.1.2] - 2026-05-30

### Added

- **Naming Scanner** — new inclusive pillar scanner that checks the project's `package.json` name,
  README H1 title, and git remote repo slug against the INI term list. Returns CRITICAL (tier 1),
  WARNING (tier 2), or INFO (tier 3) findings with rename suggestions. (#93, #100)
- **ClearlyDefined License Cross-Validation** — new governance pillar scanner that cross-validates
  production npm dependency licenses against the ClearlyDefined.io public API. Flags copyleft
  (WARNING), unrecognised SPDX (WARNING), and NOASSERTION/missing (INFO). Degrades gracefully on
  network failure. Injectable `fetchFn` for test isolation. (#94, #101)
- **Branch protection** on `main`: required PR reviews (1 approval), force push disabled, branch
  deletion disabled. (#77)
- **Community health files**: `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `.github/SECURITY.md`
  (vulnerability disclosure policy), `.github/SUPPORT.md` (help channel guide). (#78, #79, #80, #97, #99)
- **GitHub issue templates**: structured forms for bug reports, feature requests, and false positives;
  blank issues disabled with links to Discussions and Security Advisories. (#81)
- **`dataSource` field on findings** — every finding now carries a `dataSource` tag (`'api'`,
  `'local'`, or `'heuristic'`) indicating where the data came from. Rendered in markdown reports as
  `_(source: external API)_` etc. (#103, #104)
- **Finding metadata rendered in markdown** — the markdown reporter now surfaces `context` (the
  triggering code/value), `dataSource`, and key metadata fields (`checkName`, `checkScore`,
  `branch`, `overallScore`) for each critical finding. (#104)
- **`referenceUrl` on all 43 scanners** — every scanner now populates `referenceUrl` with either a
  dynamically computed link to the authoritative source (OpenSSF Scorecard viewer, ClearlyDefined
  definition page, SPDX license page, GitHub branch settings) or a static link to the spec or
  standard that motivates the check (CHAOSS metric, INI overview, semver.org, etc.). (#105)
- **Score Rationale section** — every markdown report ends with a table showing each pillar's
  weight, raw score, and weighted contribution to the overall score. (#106)
- **`.quaid-scanner-ignore` file support** — place a `.quaid-scanner-ignore` file at the root of
  any scanned repository to exclude paths from inclusive language scanning. Format follows
  `.gitignore` conventions (one glob pattern per line, `#` comments, blank lines ignored). Also
  activates the existing but previously unimplemented `--exclude-pattern` config option. (#113)

### Changed

- Scanner count: 41 → 43.
- README scanner count updated throughout; Scanner Reference table updated.
- All content drafts in `docs/content/` updated to reflect 43-scanner count and OpenSSF Scorecard
  attribution in the Bluesky thread.

### Fixed

- MCP `.catch` handler (lines 222–224) now covered by a test that verifies the -32603 error
  response when `handleRequest` rejects. (#55, #56)
- Unreachable `return '0.0.0'` fallbacks in `mcp.ts` and `cli.ts` marked with `/* c8 ignore next 2 */`
  to eliminate spurious coverage gaps. (#56, #57)
- `package.json` dependency versions pinned to `^` ranges with locked minor versions to improve
  supply-chain reproducibility. (#84, #85)
- `InclusiveConfig.excludePatterns` was declared in the type but never applied by any scanner;
  both `code-scanner` and `doc-scanner` now merge config-supplied patterns into their glob ignore
  arrays. (#113)

## [0.1.1] - 2026-05-04

Bugfix release. All fixes relate to remote (GitHub URL) scanning correctness and output fidelity.

### Fixed

- **Remote repo file scanning** — when scanning a GitHub URL, file-based scanners (inclusive
  language, technical rigor, governance) were running against quaid-scanner's own local source
  tree instead of the target repository. `buildContext` now clones the target to a temp directory
  via `git clone --depth 1` and removes it after the scan. (#63, #64)
- **Private repo cloning** — the GitHub token is now included in the clone URL so private
  repositories can be scanned when `GITHUB_TOKEN` or `GITHUB_PERSONAL_ACCESS_TOKEN` is set. (#63)
- **GitHub token not read from environment** — `buildConfig` previously left `githubToken: null`
  unless a caller explicitly set it. It now reads `GITHUB_TOKEN`, falling back to
  `GITHUB_PERSONAL_ACCESS_TOKEN`. All GitHub API–backed checks (branch protection, OpenSSF
  Scorecard, issue closure, response time) now activate automatically when the token is available
  in the environment. (#61, #65)
- **Finding severity serialized as integer** — `serializeJson` emitted severity as the raw enum
  integer (e.g. `2`) instead of the human-readable label (`"CRITICAL"`). Agents and humans
  using `jq` filters like `.severity == "CRITICAL"` now work correctly. (#62, #66)
- **`mcp.ts` not updated for `buildContext` return type** — the MCP server's `scan_repository`
  handler was not destructuring the new `{ context, cleanup }` return shape, causing all MCP
  scans to throw. Fixed alongside removal of an unused `CollaborationSpectrum` import in
  `src/graph/collaboration-scorer.ts`. (#54)

### Changed

- `package.json` `repository.url` normalized to `git+https://github.com/quaid/quaid-scanner.git`
  (npm-canonical format). (#54)
- README updated: scanner count corrected to 41, `GITHUB_PERSONAL_ACCESS_TOKEN` fallback
  documented, `.env` sourcing pattern added, new **Portfolio Scanning** section with agent
  workflow and report template reference, pillar key in example output corrected to `ai_readiness`.

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

[0.1.1]: https://github.com/quaid/quaid-scanner/releases/tag/v0.1.1
[0.1.0]: https://github.com/quaid/quaid-scanner/releases/tag/v0.1.0
[Unreleased]: https://github.com/quaid/quaid-scanner/compare/v0.1.1...HEAD
