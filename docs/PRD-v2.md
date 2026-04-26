# Quaid's OSS Repo Scanner - PRD v2.1

## Executive Summary

**Product:** `quaid-scanner` - An Agent-First Strategic Repository Health Orchestrator

**Vision:** Evolve from mechanical *verification* (does this file exist?) to intelligent *valuation* (what is the semantic quality, strategic intent, and sociotechnical health of this project?). This tool supports the full lifecycle of open source engagement: **Attracting Users**, **Growing Participants**, and **Cultivating Contributors** as defined by The Open Source Way 2.0.

**Platform:** Node.js package with Claude Code skills integration, leveraging AINative services for semantic analysis, persistent storage, and intelligent reporting.

**Paradigm:** The most significant risks to modern projects are not syntactical errors in code, but sociotechnical failures—burnout, toxic exclusionary cultures, legal ambiguity, and supply chain fragility. Therefore, this tool prioritizes "Health as Code," treating community documentation and governance structures with the same rigor as the software itself.

---

## Agent-First Design Philosophy

### Primary Users: AI Agents

This scanner is designed **agent-first**. The primary users are AI coding agents (Claude, Gemini, ChatGPT, Copilot, Cursor) that integrate with development workflows. The tool is optimized for:

- **Machine-readable output** (JSON-first, markdown-second)
- **Deterministic scoring** (consistent results for automated decision-making)
- **API integration** (designed for programmatic invocation, not interactive terminal sessions)
- **Prompt-engineered extensibility** (agents modify behavior through configuration, not code changes)

### Persona Classification

**Agent Personas (Primary)** - AI systems that invoke the scanner:

| Persona | Role | Typical Actions |
|---------|------|-----------------|
| **Developer Agent** | Code assistant (Claude, Copilot, Cursor) | Scan repos before suggesting dependencies; validate project setup |
| **TDD Agent** | Test-driven development automation | Verify test coverage reporting; validate CI configuration |
| **OSS Researcher Agent** | Dependency evaluation | Assess project health before recommending adoption |
| **Security Agent** | Supply chain security | Audit dependencies for vulnerabilities and governance gaps |
| **OSPO Agent** | Portfolio management | Batch scan organizational repositories; generate compliance reports |

**Human Personas (Secondary)** - Humans interact **via AI agents**, not directly:

| Persona | Interaction Pattern | Example |
|---------|---------------------|---------|
| **AI Developer** | Pair-programs with coding agent | "Scan this repo and tell me if it's safe to depend on" |
| **OSPO Manager** | Directs OSPO agent via conversation | "Generate a health report for all our public repos" |
| **Security Engineer** | Reviews agent-generated reports | Agent produces report; human makes governance decisions |
| **Community Manager** | Uses agent to analyze contributor trends | "What's our contributor retention rate look like?" |

### AI-Native Principles

1. **Configuration over code changes** - Agents modify scanner behavior through `.quaid-scanner.yaml` and prompt engineering, not by editing source
2. **Deterministic by default** - Same inputs produce same outputs; randomness is opt-in
3. **Structured output** - All findings include machine-parseable metadata (severity scores, category IDs, file locations)
4. **Batch-friendly** - Designed for scanning multiple repositories in automated pipelines
5. **Fail-fast with clear signals** - Exit codes and error messages are designed for programmatic handling

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

| Pillar | Focus Area | Primary Standards |
|--------|------------|-------------------|
| **A** | Security & Supply Chain Integrity | OpenSSF Scorecard |
| **B** | Governance & Legal Compliance | SPDX, ClearlyDefined |
| **C** | Community Health | CHAOSS Metrics |
| **D** | AI-Native & Agentic Readiness | HuggingFace Model Cards |
| **E** | Inclusive Language & Accessibility | Inclusive Naming Initiative |
| **F** | Technical Rigor & Automation | SemVer, Linting Standards |

---

## Maturity Context Scoring

Scoring must be **contextual**. A "Sandbox" project (experimental, 1 maintainer) should not be penalized for lacking the rigorous governance of a "Graduated" project (production, 50 maintainers).

### Maturity Levels

| Level | Description | Expected Characteristics |
|-------|-------------|-------------------------|
| **Sandbox** | Early-stage, experimental | Single maintainer OK, basic docs, learning project |
| **Incubating** | Growing adoption | 2-3 maintainers, complete docs, active community |
| **Graduated** | Production-ready | 3+ maintainers, governance docs, foundation/corporate backing possible |
| **Archived** | Maintenance mode | Stable, feature-complete, security patches only |

### Detection Strategy

**Auto-Detection Signals (default):**

| Signal | Sandbox | Incubating | Graduated |
|--------|---------|------------|-----------|
| Stars | < 100 | 100-1000 | > 1000 |
| Contributors (6mo) | 1-2 | 3-10 | > 10 |
| Release count | 0-2 | 3-10 | > 10 |
| Days since release | Any | < 365 | < 180 |
| Has GOVERNANCE.md | No | Optional | Yes |
| Has SECURITY.md | Optional | Yes | Yes |
| CI/CD configured | Optional | Yes | Yes |

**Override via CLI:**

```bash
quaid-scanner . --maturity sandbox      # Expect less
quaid-scanner . --maturity graduated    # Expect enterprise-grade
quaid-scanner . --maturity auto         # Default: auto-detect
```

**Override via Config:**

```yaml
# .quaid-scanner.yaml
maturity: incubating
```

### Contextual Scoring Modifiers

| Check | Sandbox Impact | Incubating Impact | Graduated Impact |
|-------|----------------|-------------------|------------------|
| Bus Factor = 1 | INFO | WARNING | CRITICAL |
| No GOVERNANCE.md | INFO | WARNING | CRITICAL |
| No SECURITY.md | WARNING | CRITICAL | CRITICAL |
| Response Time > 7d | INFO | WARNING | CRITICAL |
| Single vendor >80% | INFO | INFO | WARNING |

---

## External Tool Strategy

### Shell Out (Authoritative External Tools)

| Tool | Rationale |
|------|-----------|
| **OpenSSF Scorecard CLI** | Industry-standard 18-point security checklist; too complex to reimplement correctly; frequent updates |

**Implementation:**

```bash
# Execute scorecard via containerized CLI
docker run -e GITHUB_AUTH_TOKEN gcr.io/openssf/scorecard:stable \
  --repo=github.com/owner/repo --format=json
```

**Fallback:** When Scorecard unavailable (no Docker, network issues), implement local subset of checks.

### Native Implementation (Full Control)

| Domain | Rationale |
|--------|-----------|
| **License Scanning** | Simple SPDX matching + compatibility matrix; no external dependencies needed |
| **Community Metrics** | Git log parsing + GitHub API; GrimoireLab too heavy for lightweight CLI |
| **Inclusive Language** | Regex patterns; configurable word lists |
| **Documentation Quality** | Section detection + semantic search via ZeroDB |

---

## AINative Services Integration

### Core Storage Services

| Service | Use Case | Benefit |
|---------|----------|---------|
| **ZeroDB Vector Search** | Semantic license matching, governance classification | AI-powered content analysis |
| **ZeroDB PostgreSQL** | Store scan results, track historical trends | Persistent audit trail |
| **ZeroDB File Storage** | Cache reports, store badge assets, SPDX data | Fast retrieval |
| **ZeroDB Tables** | NoSQL storage for scan metadata | Flexible schema |

### Enhanced AI Services

| Service | Endpoint | Use Case in oss-repo-check |
|---------|----------|---------------------------|
| **Embeddings Generation** | AI Provider Factory | Generate embeddings for semantic analysis |
| **Memory API** | `POST /{project_id}/database/memory/store` | Store scan context for multi-repo analysis |
| **Memory Search** | `POST /{project_id}/database/memory/search` | Find similar past scans, retrieve context |
| **RLHF Feedback** | `POST /{project_id}/rlhf/feedback` | Collect user corrections on findings |
| **Quantum Search** | `POST /{project_id}/database/vectors/quantum-search` | Find repos with similar health profiles |

### Embeddings-Powered Analysis

The following checks benefit from semantic embeddings beyond keyword matching:

#### License Matching (Story 3.1, 3.2)
```
Input: Non-standard LICENSE text
↓
Embedding Generation (Cohere/OpenAI)
↓
Vector Similarity Search against SPDX embeddings
↓
Output: "92% match to Apache-2.0 with custom attribution clause"
```

**Implementation:**
- Pre-compute embeddings for all SPDX license templates (store in ZeroDB)
- On scan: embed LICENSE file content
- Similarity search with threshold: >0.95 = exact match, 0.85-0.95 = variant, <0.85 = unknown

#### Governance Classification (Story 3.3)
```
Input: GOVERNANCE.md content
↓
Embedding + Classification prompt
↓
AI Provider (Claude/GPT-4)
↓
Output: { model: "Foundation-backed", confidence: 0.87, signals: ["TSC", "charter", "voting"] }
```

**Reference Embeddings to Pre-compute:**
| Governance Model | Example Sources |
|------------------|-----------------|
| BDFL | Python, Linux (historical) |
| Foundation | Apache, CNCF, Linux Foundation projects |
| Corporate | Google projects, Microsoft projects |
| Community/Consensus | Rust, Node.js |
| Meritocracy | Apache projects |

#### CONTRIBUTING.md Quality (Story 6.3)
```
Input: CONTRIBUTING.md content
↓
Section embeddings vs "Gold Standard" template
↓
Gap Analysis
↓
Output: { completeness: 72%, missing: ["testing instructions", "code style guide"] }
```

**Gold Standard Sections (embed as reference):**
- Environment setup
- Running tests
- Code style guide
- Pull request process
- Issue triage process
- Communication channels

#### Model Card Completeness (Story 5.1)
```
Input: README.md for ML repo
↓
Semantic section detection (not just header matching)
↓
Output: Detected sections even without standard headers
```

**Why Embeddings Help:**
- README says "What this model should NOT be used for" → matches "Limitations" section semantically
- README says "How we trained it" → matches "Training Data" section
- README says "Potential harms" → matches "Ethical Considerations" section

### Memory API for Multi-Repo Context

When scanning multiple repositories (OSPO portfolio analysis):

```
Scan Repo A
↓
Store context in Memory API:
{
  repo: "org/repo-a",
  health_score: 7.2,
  key_findings: ["bus_factor_1", "no_security_md"],
  scanned_at: "2026-01-18T..."
}
↓
Scan Repo B
↓
Memory Search: "Find similar repos by finding profile"
↓
Output: "Repo B has similar issues to Repo A (scanned 2 days ago)"
```

**Use Cases:**
- Portfolio-wide vulnerability patterns
- Cross-repo governance consistency
- Identifying repos that need similar fixes

### RLHF Feedback Loop

Collect user corrections to improve detection accuracy:

```
Scan produces: "CRITICAL: Non-inclusive term 'master' in src/config.py:47"
↓
User marks: "False positive - this is 'masterpiece' not 'master'"
↓
RLHF API: Store feedback
{
  finding_id: "inc-001",
  user_verdict: "false_positive",
  context: "masterpiece",
  correct_action: "ignore"
}
↓
Over time: Improve regex patterns, add exceptions
```

**Feedback Categories:**
| Category | User Action | System Learning |
|----------|-------------|-----------------|
| False Positive | "Not an issue" | Add to exception patterns |
| False Negative | "Missed this" | Expand detection patterns |
| Severity Wrong | "Should be WARNING not CRITICAL" | Adjust thresholds |
| Good Catch | "Helpful finding" | Reinforce pattern |

### Quantum Search for Similar Repos

Find repositories with similar health profiles:

```
After scanning current repo:
{
  security_score: 6.5,
  governance_score: 8.0,
  community_score: 4.2,  // Low
  ai_readiness: 7.5,
  inclusive_score: 9.0
}
↓
Quantum Search: "Find repos with similar community score issues"
↓
Output: [
  { repo: "similar-org/project-x", community_score: 4.5, fixed_via: "added SUPPORT.md" },
  { repo: "other-org/project-y", community_score: 3.8, fixed_via: "enabled Discussions" }
]
↓
Recommendation: "Projects with similar community health issues improved by adding SUPPORT.md"
```

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        oss-repo-check CLI                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Scanner   │  │  Reporters  │  │   Config    │  │    Cache    │ │
│  │ Orchestrator│  │  (MD/JSON)  │  │   Loader    │  │   Manager   │ │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └──────┬──────┘ │
│         │                                                   │        │
│         │         ┌─────────────────────────────────────────┼────┐   │
│         │         │           AINative Client               │    │   │
│         │         ├─────────────────────────────────────────┼────┤   │
│         ▼         │                                         ▼    │   │
│  ┌─────────────┐  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐│   │
│  │  Semantic   │◄─┼─►│ Vectors  │  │ Memory   │  │    Files     ││   │
│  │  Analyzer   │  │  │   API    │  │   API    │  │    API       ││   │
│  └─────────────┘  │  └──────────┘  └──────────┘  └──────────────┘│   │
│                   │                                              │   │
│                   │  ┌──────────┐  ┌──────────┐  ┌──────────────┐│   │
│                   │  │PostgreSQL│  │  RLHF    │  │   Quantum    ││   │
│                   │  │  Tables  │  │   API    │  │   Search     ││   │
│                   │  └──────────┘  └──────────┘  └──────────────┘│   │
│                   └──────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │     AINative Studio API       │
                    │   api.ainative.studio/v1/     │
                    ├───────────────────────────────┤
                    │  Kong Gateway (rate limiting) │
                    └───────────────────────────────┘
```

---

## Epic 1: Core Infrastructure

### Story 1.1: Project Initialization
**As a** Developer Agent
**I want** a well-structured TypeScript project
**So that** I can build maintainable, type-safe code

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 1.1.1 | `package.json` includes: name (`quaid-scanner`), version, description, main, types, bin, scripts (build, test, lint), keywords, license, engines (>=18.0.0) | Validate JSON schema |
| 1.1.2 | `tsconfig.json` enables: strict, noUnusedLocals, noUnusedParameters, noImplicitReturns, target ES2022, module NodeNext | Parse and verify flags |
| 1.1.3 | ESLint configured with `@typescript-eslint/recommended` ruleset | Config file present |
| 1.1.4 | Prettier configured with: semi: true, singleQuote: true, tabWidth: 2 | Config file present |
| 1.1.5 | Vitest configured with coverage thresholds: lines 80%, branches 80%, functions 80% | `vitest.config.ts` present |
| 1.1.6 | `npm run build` succeeds with zero errors | Exit code 0 |
| 1.1.7 | `npm test` runs with coverage report | Coverage report generated |

**Story Points:** 2

---

### Story 1.2: CLI Interface
**As a** Developer Agent
**I want** a command-line interface optimized for programmatic invocation
**So that** I can scan repositories and parse structured output

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 1.2.1 | `quaid-scanner <path>` accepts local filesystem path | Scan completes on `.` |
| 1.2.2 | `quaid-scanner <url>` accepts GitHub URL format `https://github.com/owner/repo` | Parses owner/repo correctly |
| 1.2.3 | `--depth quick` runs only file presence checks | Timing < 5 seconds |
| 1.2.4 | `--depth standard` runs presence + content analysis | Timing < 15 seconds |
| 1.2.5 | `--depth thorough` runs all checks including API calls | Timing < 60 seconds |
| 1.2.6 | `--format json` outputs valid JSON matching schema (default) | JSON Schema validation |
| 1.2.7 | `--format markdown` outputs GitHub-flavored markdown | Validate markdown syntax |
| 1.2.8 | `--output <file>` writes to specified path, creates directories if needed | File exists after run |
| 1.2.9 | `--config <file>` loads YAML/JSON config overriding defaults | Config values applied |
| 1.2.10 | Exit code 0 when all checks pass (score >= 8.0) | Process exit code |
| 1.2.11 | Exit code 1 when warnings present (score 5.0-7.9) | Process exit code |
| 1.2.12 | Exit code 2 when critical issues found (score < 5.0) | Process exit code |
| 1.2.13 | `--help` displays all options with descriptions | Help text complete |
| 1.2.14 | `--version` displays package version from package.json | Version matches |
| 1.2.15 | `--quiet` suppresses progress output, only shows final result | No intermediate output |
| 1.2.16 | `--verbose` shows detailed progress for each check | Progress events logged |

**Story Points:** 3

---

### Story 1.3a: Scanner Plugin Architecture
**As a** Developer Agent
**I want** a modular scanner plugin system
**So that** new check categories can be added via configuration

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 1.3a.1 | Scanner plugins implement `Scanner` interface: `name`, `pillar`, `run(context): Promise<Finding[]>` | TypeScript compilation |
| 1.3a.2 | `registerScanner(scanner: Scanner)` adds scanner to registry | Scanner appears in list |
| 1.3a.3 | `Finding` interface includes: severity, category, message, file, line, column, suggestion, reference | TypeScript compilation |
| 1.3a.4 | Severity enum: `CRITICAL` (2), `WARNING` (1), `INFO` (0), `PASS` (-1) | Enum values correct |
| 1.3a.5 | Progress events emitted: `scan:start`, `scanner:start`, `scanner:complete`, `scan:complete` | Events received |

**Story Points:** 2

---

### Story 1.3b: Scanner Orchestration & Scoring
**As a** Developer Agent
**I want** parallel scanner execution with weighted scoring
**So that** scan results are efficient and consistent

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 1.3b.1 | Scanners in different pillars execute in parallel using `Promise.all()` | Execution time < sum of individual times |
| 1.3b.2 | Scanners within same pillar execute sequentially if `dependsOn` specified | Order verified |
| 1.3b.3 | Overall score calculated as weighted average: Security 25%, Governance 20%, Community 15%, AI 15%, Inclusive 15%, Technical 10% | Score formula verified |
| 1.3b.4 | `--threshold <number>` fails scan if score below threshold | Exit code 2 when below |
| 1.3b.5 | Timeout per scanner configurable, default 30 seconds | Timeout fires |

**Story Points:** 2

---

## Epic 2: Security & Supply Chain (Pillar A)

### Story 2.1a: OpenSSF Scorecard CLI Integration (SEC-01a)
**As a** Security Agent
**I want** OpenSSF Scorecard execution via Docker/API
**So that** I can assess supply chain security using industry standards

> **Implementation Strategy:** Shell out to OpenSSF Scorecard CLI (authoritative, frequently updated) with API fallback.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.1a.1 | Execute OpenSSF Scorecard via Docker CLI: `docker run -e GITHUB_AUTH_TOKEN=$GITHUB_TOKEN gcr.io/openssf/scorecard:stable --repo=github.com/{owner}/{repo} --format=json` | Shell execution |
| 2.1a.2 | Query Scorecard API if Docker unavailable: `GET https://api.securityscorecards.dev/projects/github.com/{owner}/{repo}` | API fallback |
| 2.1a.3 | Parse all 18 check categories from JSON output | All categories extracted |
| 2.1a.4 | Map Scorecard checks to findings: score < 5 = CRITICAL, 5-7 = WARNING, >= 8 = PASS | Mapping correct |
| 2.1a.5 | Set `scorecard_source` field to indicate data source (`docker`, `api`, `local`) | Source tracking |

**Story Points:** 3

---

### Story 2.1b: OpenSSF Scorecard Caching & History (SEC-01b)
**As a** OSPO Agent
**I want** cached Scorecard results with historical tracking
**So that** I can monitor security trends over time

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.1b.1 | Cache responses in **ZeroDB Tables** with 24-hour TTL | Cache hit on repeat scan |
| 2.1b.2 | Store historical scores in **ZeroDB PostgreSQL** table `scorecard_history(repo, date, score, checks_json, source)` | Insert succeeds |
| 2.1b.3 | Calculate trend: compare current score to 7-day, 30-day, 90-day averages | Trend direction reported |

**Story Points:** 2

---

### Story 2.1c: OpenSSF Local Fallback Checks (SEC-01c)
**As a** Security Agent
**I want** local security checks when Scorecard is unavailable
**So that** I can still assess basic security hygiene offline

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.1c.1 | Handle both Docker and API unavailable gracefully | Graceful degradation |
| 2.1c.2 | Implement local checks for: Binary-Artifacts, Branch-Protection, License, Security-Policy, Maintained | Native checks |
| 2.1c.3 | Report `scorecard_source: local` when using local fallback | Source flagged |

**OpenSSF Scorecard Checks Reference:**

| Check | What it measures |
|-------|-----------------|
| Binary-Artifacts | No binaries in source |
| Branch-Protection | Default branch protected |
| CI-Tests | CI runs tests |
| CII-Best-Practices | CII badge present |
| Code-Review | PRs reviewed before merge |
| Contributors | Multiple contributors |
| Dangerous-Workflow | No dangerous workflow patterns |
| Dependency-Update-Tool | Dependabot/Renovate configured |
| Fuzzing | Fuzz testing present |
| License | License file present |
| Maintained | Recent commits |
| Packaging | Published to package registry |
| Pinned-Dependencies | Dependencies pinned |
| SAST | Static analysis configured |
| Security-Policy | SECURITY.md present |
| Signed-Releases | Releases are signed |
| Token-Permissions | Minimal token permissions |
| Vulnerabilities | No known vulnerabilities |

**Story Points:** 3

---

### Story 2.2: Branch Protection Audit (SEC-02)
**As a** Security Agent
**I want** branch protection verification
**So that** I can ensure code review requirements

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.2.1 | Query GitHub API: `GET /repos/{owner}/{repo}/branches/{branch}/protection` | API response parsed |
| 2.2.2 | Check `required_pull_request_reviews.required_approving_review_count >= 1` | Boolean result |
| 2.2.3 | Check `required_status_checks.strict == true` | Boolean result |
| 2.2.4 | Check `allow_force_pushes.enabled == false` | Boolean result |
| 2.2.5 | Check `allow_deletions.enabled == false` | Boolean result |
| 2.2.6 | Check `required_linear_history.enabled == true` (INFO level if false) | Boolean result |
| 2.2.7 | Check `required_signatures.enabled == true` (INFO level if false) | Boolean result |
| 2.2.8 | Severity CRITICAL if any of 2.2.2-2.2.5 fail | Finding severity correct |
| 2.2.9 | Handle 404 response (no protection): CRITICAL finding "Branch protection not configured" | Finding generated |
| 2.2.10 | Handle 403 response (no access): WARNING finding "Unable to verify branch protection" | Finding generated |
| 2.2.11 | Check protection on default branch (from `GET /repos/{owner}/{repo}` → `default_branch`) | Correct branch checked |

**Story Points:** 3

---

### Story 2.3a: Dependency Pinning - Package Managers (SEC-03a)
**As a** Security Agent
**I want** dependency pinning validation for package managers
**So that** I can prevent supply chain attacks via unpinned dependencies

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.3a.1 | **package.json**: Flag `"*"`, `"latest"`, `"x"` in dependencies/devDependencies (Regex: `":\s*["'](\*\|latest\|x)["']`) | Pattern detection |
| 2.3a.2 | **package.json**: Flag `^` and `~` prefixes as WARNING (not CRITICAL) (Regex: `":\s*["'][\^~]`) | Pattern detection |
| 2.3a.3 | **package-lock.json**: PASS if present and `lockfileVersion >= 2` | File check + JSON parse |
| 2.3a.4 | **requirements.txt**: Flag missing `==` pinning (Regex: `^[a-zA-Z][\w-]*(?![=<>])`) | Pattern detection |
| 2.3a.5 | **Gemfile**: Flag `gem "x"` without version constraint (Regex: `gem\s+["']\w+["'](?!\s*,)`) | Pattern detection |
| 2.3a.6 | **go.mod**: INFO if not using `go.sum` for verification | File existence check |
| 2.3a.7 | **Cargo.toml**: Flag `"*"` versions (Regex: `version\s*=\s*["']\*["']`) | Pattern detection |

**Story Points:** 3

---

### Story 2.3b: Dependency Pinning - Docker & Workflows (SEC-03b)
**As a** Security Agent
**I want** dependency pinning validation for Docker and GitHub Actions
**So that** I can prevent supply chain attacks via mutable tags

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.3b.1 | **Dockerfile**: Flag `:latest` tags (Regex: `FROM\s+\S+:latest`) | Pattern detection |
| 2.3b.2 | **Dockerfile**: Flag missing digest for base images (Regex: `FROM\s+\S+(?!@sha256:)`) | Pattern detection |
| 2.3b.3 | **Dockerfile**: PASS if using `@sha256:` digest (Regex: `FROM\s+\S+@sha256:[a-f0-9]{64}`) | Pattern detection |
| 2.3b.4 | **.github/workflows/*.yml**: Flag `uses:` without `@` version (Regex: `uses:\s+[\w-]+/[\w-]+(?!@)`) | Pattern detection |
| 2.3b.5 | **.github/workflows/*.yml**: Flag `@main`, `@master`, `@latest` (Regex: `uses:\s+.+@(main\|master\|latest)`) | Pattern detection |
| 2.3b.6 | **.github/workflows/*.yml**: PASS if using SHA: `@[a-f0-9]{40}` | Regex match |
| 2.3b.7 | **.github/workflows/*.yml**: PASS if using semver: `@v\d+\.\d+\.\d+` | Regex match |
| 2.3b.8 | Report: count of unpinned by file type, severity by file criticality (workflow = CRITICAL, deps = WARNING) | Aggregated counts |

**Story Points:** 2

---

### Story 2.4: Binary Artifact Detection (SEC-04)
**As a** Security Agent
**I want** binary file detection
**So that** I can identify potential malware vectors

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.4.1 | Detect by extension: `.exe`, `.dll`, `.so`, `.dylib`, `.bin`, `.jar`, `.war`, `.ear`, `.class`, `.pyc`, `.pyo`, `.o`, `.a`, `.lib` | Extension list check |
| 2.4.2 | Detect by magic bytes (first 4 bytes): `4D5A` (MZ/exe), `7F454C46` (ELF), `CAFEBABE` (Java class), `504B0304` (ZIP/JAR) | Binary header check |
| 2.4.3 | Exclude paths matching `.gitignore` patterns | Gitignore parsing |
| 2.4.4 | Exclude paths in config `binary_allowlist`: default `["*.ico", "*.png", "*.jpg", "*.gif", "*.woff", "*.woff2", "*.ttf", "*.eot"]` | Config-based exclusion |
| 2.4.5 | CRITICAL if binary > 1MB in source tree | Size check |
| 2.4.6 | WARNING if binary > 100KB in source tree | Size check |
| 2.4.7 | INFO if any binary present (even small/allowed) | Presence check |
| 2.4.8 | Report SHA-256 hash for each detected binary | Hash calculation |
| 2.4.9 | Report file path relative to repo root | Path normalization |
| 2.4.10 | Skip files in `node_modules/`, `vendor/`, `.git/` | Path exclusion |

**Story Points:** 3

---

### Story 2.5: Token Permission Analysis (SEC-05)
**As a** Security Agent
**I want** GitHub Actions permission analysis
**So that** I can enforce least privilege

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.5.1 | Parse all `.github/workflows/*.yml` files | YAML parsing |
| 2.5.2 | Check top-level `permissions:` block exists | Key presence |
| 2.5.3 | CRITICAL if no `permissions:` block (inherits default read-write) | Finding generated |
| 2.5.4 | CRITICAL if `permissions: write-all` | Exact match |
| 2.5.5 | WARNING if any permission set to `write` without justification comment | Permission value check |
| 2.5.6 | PASS if `permissions: read-all` or `permissions: {}` | Exact match |
| 2.5.7 | Parse job-level `permissions:` overrides | Nested YAML parsing |
| 2.5.8 | Report each permission scope: `actions`, `checks`, `contents`, `deployments`, `id-token`, `issues`, `packages`, `pull-requests`, `repository-projects`, `security-events`, `statuses` | Scope enumeration |
| 2.5.9 | Flag `${{ secrets.GITHUB_TOKEN }}` used in `curl`/`wget` commands | String search in `run:` blocks |
| 2.5.10 | Suggest minimal permissions based on actions used (e.g., `actions/checkout` needs `contents: read`) | Recommendation engine |

**Story Points:** 3

---

## Epic 3: Governance & Legal Compliance (Pillar B)

### Story 3.1a: License Detection & Identification (GOV-01a)
**As a** OSPO Agent
**I want** project license identification from multiple sources
**So that** I can determine the licensing terms

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.1a.1 | Identify project license from: `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `COPYING`, `package.json:license`, `pyproject.toml:license` | File/field detection |
| 3.1a.2 | Use **ZeroDB Vector Search** to match non-standard license text to known licenses | Semantic matching |
| 3.1a.3 | Handle missing license in project: CRITICAL "No license detected" | Missing data handling |
| 3.1a.4 | Report: detected license ID, confidence score | Summary generation |

**Story Points:** 2

---

### Story 3.1b: Dependency License Scanning (GOV-01b)
**As a** OSPO Agent
**I want** dependency license scanning via ClearlyDefined API
**So that** I can identify transitive license requirements

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.1b.1 | Query ClearlyDefined API: `GET https://api.clearlydefined.io/definitions/{type}/{provider}/{namespace}/{name}/{revision}` for each dependency | API integration |
| 3.1b.2 | Store dependency license tree in **ZeroDB Tables** | Data persistence |
| 3.1b.3 | Handle missing license in dependency: WARNING "Unknown license for {package}" | Missing data handling |
| 3.1b.4 | Report: dependency count by license type | Summary generation |

**Story Points:** 2

---

### Story 3.1c: License Compatibility Analysis (GOV-01c)
**As a** OSPO Agent
**I want** license conflict detection using compatibility matrix
**So that** I can avoid legal liability

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.1c.1 | Build license compatibility matrix using SPDX license expressions | Matrix lookup |
| 3.1c.2 | CRITICAL if copyleft (GPL, AGPL) dependency in permissive (MIT, Apache, BSD) project | Compatibility check |
| 3.1c.3 | WARNING if weak copyleft (LGPL, MPL) dependency in permissive project | Compatibility check |
| 3.1c.4 | INFO if license requires attribution and NOTICE file missing | Attribution check |
| 3.1c.5 | Report: conflicts found with specific dependency paths | Summary generation |

**License Compatibility Matrix (subset):**

| Project License | Compatible Dependencies | Incompatible Dependencies |
|-----------------|------------------------|---------------------------|
| MIT | MIT, BSD, Apache-2.0, ISC, Unlicense | GPL-2.0, GPL-3.0, AGPL-3.0 |
| Apache-2.0 | MIT, BSD, Apache-2.0, ISC | GPL-2.0 (OK with GPL-3.0) |
| GPL-3.0 | All (copyleft absorbs) | None |
| LGPL-3.0 | All when dynamically linked | Static linking restricts |

**Story Points:** 3

---

### Story 3.2a: SPDX License List Management (GOV-02a)
**As a** OSPO Agent
**I want** cached SPDX license data with vector embeddings
**So that** I can perform accurate license matching

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.2a.1 | Download SPDX license list from `https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json` | HTTP fetch |
| 3.2a.2 | Cache SPDX data in **ZeroDB File Storage** with 7-day TTL | Cache implementation |
| 3.2a.3 | Generate **ZeroDB vector embeddings** for each SPDX license template | Embedding generation |

**Story Points:** 2

---

### Story 3.2b: LICENSE Content Validation (GOV-02b)
**As a** OSPO Agent
**I want** LICENSE file content validation against SPDX templates
**So that** I can verify license authenticity

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.2b.1 | Normalize LICENSE text: lowercase, collapse whitespace, remove copyright line variations | Text normalization |
| 3.2b.2 | Calculate Levenshtein distance between LICENSE and each SPDX template | Distance calculation |
| 3.2b.3 | PASS if distance < 5% of template length (allows minor variations) | Threshold check |
| 3.2b.4 | WARNING if distance 5-15% (modified license) | Threshold check |
| 3.2b.5 | CRITICAL if distance > 15% or no match found (unknown/custom license) | Threshold check |
| 3.2b.6 | Semantic search against SPDX embeddings for fuzzy matching | Vector similarity |
| 3.2b.7 | Report: detected license ID, confidence score, matched template sections | Match details |

**Story Points:** 3

---

### Story 3.2c: Source File License Headers (GOV-02c)
**As a** OSPO Agent
**I want** SPDX license header validation in source files
**So that** I can verify consistent licensing

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.2c.1 | Detect SPDX-License-Identifier header in source files | Header scan |
| 3.2c.2 | Cross-check: header IDs match LICENSE file | Consistency check |
| 3.2c.3 | WARNING if headers inconsistent with LICENSE file | Finding generated |

**Story Points:** 2

---

### Story 3.3a: Governance File Detection (GOV-03a)
**As a** OSPO Agent
**I want** governance documentation detection
**So that** I can assess project decision-making structure

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.3a.1 | Check for governance files: `GOVERNANCE.md`, `GOVERNANCE`, `docs/governance.md`, `docs/GOVERNANCE.md`, `.github/GOVERNANCE.md` | File detection |
| 3.3a.2 | INFO if no governance file found | Finding generated |
| 3.3a.3 | Extract text and generate **ZeroDB vector embedding** | Embedding generation |
| 3.3a.4 | PASS if governance file present and classifiable; INFO otherwise | Severity assignment |

**Story Points:** 2

---

### Story 3.3b: Governance Model Classification (GOV-03b)
**As a** OSPO Agent
**I want** governance model classification using semantic analysis
**So that** I can categorize project governance structure

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.3b.1 | Classify using keyword detection and semantic similarity | Classification logic |
| 3.3b.2 | **BDFL** indicators: "benevolent dictator", "final decision", "project lead decides", single maintainer with >80% commits | Keyword + metric |
| 3.3b.3 | **Meritocracy** indicators: "committer", "merit", "earned commit access", "maintainer ladder" | Keyword detection |
| 3.3b.4 | **Foundation-backed** indicators: "foundation", "steering committee", "TSC", "technical oversight", "charter" | Keyword detection |
| 3.3b.5 | **Corporate** indicators: "company", "employer", "corporate contributor", single org >70% commits | Keyword + metric |
| 3.3b.6 | **Community** indicators: "consensus", "voting", "RFC", "proposal process", "community decision" | Keyword detection |
| 3.3b.7 | Report confidence score (0-100%) for classification | Score calculation |
| 3.3b.8 | Store classification in **ZeroDB PostgreSQL** for trending | Data persistence |

**Story Points:** 3

---

### Story 3.4a: Bus Factor Analysis (GOV-04a)
**As a** OSPO Agent
**I want** bus factor and maintainer concentration analysis
**So that** I can assess single-point-of-failure risk

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.4a.1 | Query git log for last 12 months: `git log --since="12 months ago" --format="%ae"` | Git command |
| 3.4a.2 | Normalize email addresses (lowercase, map known aliases) | Email normalization |
| 3.4a.3 | **Exclude unidentifiable domains:** Filter out `noreply@github.com`, `users.noreply.github.com` from domain analysis | Privacy handling |
| 3.4a.4 | For GitHub noreply addresses, extract username but mark domain as "unknown" | Username extraction |
| 3.4a.5 | Calculate commits per unique contributor | Count aggregation |
| 3.4a.6 | **Bus Factor** = minimum contributors needed to account for 50% of commits | Calculation |
| 3.4a.7 | **Elephant Factor** = % of commits from top contributor | Calculation |
| 3.4a.8 | CRITICAL if Bus Factor = 1 (maturity-aware: INFO for Sandbox) | Threshold check |
| 3.4a.9 | WARNING if Bus Factor <= 2 or Elephant Factor > 50% | Threshold check |
| 3.4a.10 | PASS if Bus Factor >= 3 and Elephant Factor < 50% | Threshold check |

**Story Points:** 3

---

### Story 3.4b: Vendor Neutrality Analysis (GOV-04b)
**As a** OSPO Agent
**I want** vendor concentration analysis
**So that** I can assess vendor lock-in risk

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.4b.1 | Extract email domains from top 10 committers (by commit count) | Domain extraction |
| 3.4b.2 | Group commits by corporate domain (e.g., `@google.com`, `@microsoft.com`, `@amazon.com`) | Domain grouping |
| 3.4b.3 | **Single Vendor Concentration:** Calculate % of commits from largest single domain | Percentage |
| 3.4b.4 | WARNING if >70% of commits from single corporate domain | Vendor lock-in risk |
| 3.4b.5 | CRITICAL if >90% from single corporate domain (for Graduated maturity) | High lock-in |
| 3.4b.6 | Cross-reference with governance model: Flag contradiction if "Meritocracy" claimed but single vendor | Consistency check |
| 3.4b.7 | **Succession Planning:** Scan governance docs for "Emeritus", "succession", "handover" | Keyword detection |
| 3.4b.8 | INFO if no succession planning documented (for projects with Bus Factor <= 2) | Planning gap |
| 3.4b.9 | Store contributor distribution and vendor analysis in **ZeroDB PostgreSQL** | Data persistence |
| 3.4b.10 | Report: bus factor, elephant factor, top 5 contributors with %, vendor concentration %, succession plan status | Summary generation |

**Story Points:** 3

---

### Story 3.5: Asset Protection & Legal Barrier Automation (GOV-05)
**As a** OSPO Agent
**I want** trademark, export control, and contribution agreement checks
**So that** I can verify commercial OSS compliance and contributor friction

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.5.1 | Check for trademark files: `TRADEMARK`, `TRADEMARKS.md`, `docs/trademark*` | File detection |
| 3.5.2 | Check for export control: `EXPORT`, `ECCN`, pattern "Export Control" in README | Text search |
| 3.5.3 | INFO if no trademark policy (recommended for projects with established brand) | Finding generated |
| 3.5.4 | Check for CLA documentation: `CLA.md`, `.github/CLA.md`, "CLA" section in CONTRIBUTING | File/section detection |
| 3.5.5 | Check for DCO requirement: "DCO", "Developer Certificate of Origin", "Signed-off-by" | Text search |
| 3.5.6 | Detect CLA/DCO bot automation (see reference table below) | GitHub App check |
| 3.5.7 | Check branch protection for required "license/cla" or "dco" status | API check |
| 3.5.8 | Classify friction level (see reference table below) | Assessment |
| 3.5.9 | WARNING if CLA/DCO required but no automation detected | High friction |
| 3.5.10 | Scan CONTRIBUTING.md for manual CLA instructions (print, sign, scan, email) | Anti-pattern detection |
| 3.5.11 | WARNING if manual CLA process detected | Antiquated process |
| 3.5.12 | INFO if no CLA/DCO (acceptable for permissive licenses; recommended for corporate contributions) | Neutral finding |
| 3.5.13 | PASS if CLA/DCO with automation configured | Low friction |
| 3.5.14 | Report: CLA/DCO present, automation type, friction level, trademark status | Summary generation |

**CLA/DCO Bot Detection Patterns:**

| CLA/DCO Bot | Detection Method |
|-------------|------------------|
| `cla-assistant` | `.github/workflows/*` containing `cla-assistant/github-action` |
| `cla-bot` | `.clabot` config file |
| `dco-app` | Workflow containing `dcoapp/dco-action` |
| `probot-dco` | `.github/dco.yml` |
| `easycla` | Workflow containing `easycla` |

**Friction Level Classification:**

| CLA/DCO State | Classification | Friction Level |
|---------------|----------------|----------------|
| Automated bot + docs | **Low Friction** | Click-through or commit sign-off |
| Docs only, no automation | **Medium Friction** | Manual process |
| Required but not documented | **High Friction** | Contributor confusion |
| Manual CLA (print/sign/scan) | **Very High Friction** | Barrier to casual contributors |

**Story Points:** 3

---

## Epic 4: Community Health (Pillar C)

> Based on The Open Source Way 2.0 framework: Attracting Users → Growing Participants → Cultivating Contributors

### Story 4.1a: Issue/PR Response Time Collection (COM-01a)
**As a** OSPO Agent
**I want** response time data collection from GitHub
**So that** I can measure community engagement

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.1a.1 | Query GitHub GraphQL for issues/PRs created in last 90 days | API query |
| 4.1a.2 | Calculate time from creation to first comment | Time delta |
| 4.1a.3 | Store time series in **ZeroDB PostgreSQL** table `response_metrics(repo, date, median_issue, median_pr, p90, p99)` | Data persistence |

**Story Points:** 2

---

### Story 4.1b: Bot Filtering for Response Metrics (COM-01b)
**As a** OSPO Agent
**I want** bot comment filtering using configurable patterns
**So that** I measure genuine human engagement

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.1b.1 | Filter `[bot]` suffix usernames (Regex: `\[bot\]$`) | Pattern matching |
| 4.1b.2 | Filter `-bot` suffix usernames (Regex: `-bot$`) | Pattern matching |
| 4.1b.3 | Filter known bot names: `codecov`, `netlify`, `vercel`, `sonarcloud`, `dependabot`, `renovate` | Configurable list |
| 4.1b.4 | Filter boilerplate content: "Thanks for your submission!", "This issue has been marked as stale" | Content heuristics |
| 4.1b.5 | **Configurable bot list** via `.quaid-scanner.yaml`: `bots.additional: ["my-custom-bot"]` | Config support |

**Story Points:** 2

---

### Story 4.1c: Response Time Classification (COM-01c)
**As a** OSPO Agent
**I want** response time health classification
**So that** I can assess community engagement quality

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.1c.1 | Calculate: median, p90, p99 response times | Statistical measures |
| 4.1c.2 | **Healthy**: Median < 48 hours | Threshold classification |
| 4.1c.3 | **Warning**: Median 48h - 7 days | Threshold classification |
| 4.1c.4 | **Critical Risk**: Median > 7 days | Threshold classification |
| 4.1c.5 | Separate metrics for Issues vs Pull Requests | Split calculation |
| 4.1c.6 | Flag if PR response time >> Issue response time (contributor friction) | Comparison |
| 4.1c.7 | Compare current 30-day median to historical 365-day median | Trend detection |
| 4.1c.8 | **Latency Drift Alert:** WARNING if recent median > 200% of historical average | Burnout indicator |

**Story Points:** 2

---

### Story 4.2a: Contributor Data Collection (COM-02a)
**As a** OSPO Agent
**I want** contributor data extraction from git history
**So that** I can analyze contributor distribution

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.2a.1 | Parse git log for last 12 months: `git log --since="12 months ago" --format="%ae"` | Git command |
| 4.2a.2 | Normalize email addresses (lowercase, map `noreply.github.com` to username) | Email normalization |
| 4.2a.3 | **Exclude `noreply@github.com`** from identifiable domain analysis | Privacy handling |
| 4.2a.4 | Count commits per unique contributor | Aggregation |
| 4.2a.5 | Track cohort sizes over time in **ZeroDB PostgreSQL** | Historical storage |

**Story Points:** 2

---

### Story 4.2b: Contributor Funnel Analysis (COM-02b)
**As a** OSPO Agent
**I want** contributor pipeline metrics with conversion rates
**So that** I can identify retention issues

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.2b.1 | **Casual** cohort: 1-5 commits (One-time or drive-by contributors) | Classification |
| 4.2b.2 | **Regular** cohort: 6-50 commits (Consistent contributors) | Classification |
| 4.2b.3 | **Core** cohort: 50+ commits (Maintainers and key contributors) | Classification |
| 4.2b.4 | Calculate conversion rates: `(Regular / Casual)` and `(Core / Regular)` | Funnel metrics |
| 4.2b.5 | Benchmark: Healthy funnel has >10% Casual→Regular conversion | Threshold |
| 4.2b.6 | **Churn Alert:** Flag if Active Regular (last 90 days) declining while Casual increasing | Pattern detection |
| 4.2b.7 | Report: cohort counts, conversion rates, trend direction | Summary output |
| 4.2b.8 | **"Revolving Door" Warning:** If >80% of contributors are Casual, flag retention issue | Anti-pattern |

**Story Points:** 2

---

### Story 4.3a: Issue Closure Metrics (COM-03a)
**As a** OSPO Agent
**I want** issue and PR closure ratio calculation
**So that** I can measure team capacity

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.3a.1 | Query GitHub API for issues/PRs opened and closed in last 90 days | API query |
| 4.3a.2 | **Closure Ratio** = `(Closed Issues + Closed PRs) / (Opened Issues + Opened PRs)` | Calculation |
| 4.3a.3 | **Sustainable**: Ratio ≈ 1.0 (Team keeping pace with demand) | Classification |
| 4.3a.4 | **Manageable**: Ratio 0.8 - 1.0 (Slight backlog accumulation) | Classification |
| 4.3a.5 | **Burnout Risk**: Ratio < 0.8 (Backlog growing faster than capacity) | Classification |
| 4.3a.6 | **Critical**: Ratio < 0.5 (Team overwhelmed; intervention needed) | Classification |

**Story Points:** 2

---

### Story 4.3b: Maintainer Burnout Detection (COM-03b)
**As a** OSPO Agent
**I want** burnout risk indicators based on combined signals
**So that** I can intervene before maintainer collapse

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.3b.1 | **Latency Drift:** Compare median response (30 days) vs (365 days) | Trend analysis |
| 4.3b.2 | WARNING if recent latency > 200% of historical | Capacity collapse signal |
| 4.3b.3 | **Zombie Project Detection:** Flag if closure ratio < 0.5 AND last release > 180 days | Combined signal |
| 4.3b.4 | **Open Issue Age Analysis:** Calculate median age of open issues | Backlog health |
| 4.3b.5 | WARNING if median open issue age > 90 days | Stale backlog |
| 4.3b.6 | Cross-reference with Bus Factor (Story 3.4a): Burnout + Bus Factor 1 = CRITICAL | Combined risk |
| 4.3b.7 | Store burnout metrics in **ZeroDB PostgreSQL** for trending | Historical data |
| 4.3b.8 | Report: closure ratio, latency drift %, median issue age, zombie risk flag | Summary output |

**Story Points:** 2

---

### Story 4.4: Psychological Safety Artifacts (COM-04)
**As a** OSPO Agent
**I want** visible DEI infrastructure detection
**So that** I can assess community safety signals

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.4.1 | Check for CODE_OF_CONDUCT.md or CODE-OF-CONDUCT.md | File detection |
| 4.4.2 | CRITICAL if no Code of Conduct found (for Incubating/Graduated maturity) | Maturity-aware |
| 4.4.3 | Scan CoC for enforcement keywords: "report"/"reporting", "enforcement"/"consequence", contact method (email, form link) | Keyword detection |
| 4.4.4 | WARNING if CoC exists but lacks enforcement mechanism | Performative CoC |
| 4.4.5 | Scan GOVERNANCE.md for enforcement terms: "Committee", "Ombudsperson", "Anonymity" | Governance integration |
| 4.4.6 | **All-Contributors Bot Detection:** Check for `.all-contributorsrc` file | File detection |
| 4.4.7 | INFO: "Project recognizes non-code contributions" if all-contributors configured | Positive signal |
| 4.4.8 | Check all-contributors config for contribution types beyond `code`: `doc`, `design`, `translation`, `eventOrganizing` | Diversity indicator |
| 4.4.9 | Check README for "Contributors" section or all-contributors badge | Visibility |
| 4.4.10 | **Inclusive Governance:** Scan governance docs for explicit inclusion language | Content analysis |
| 4.4.11 | Store DEI artifact presence in **ZeroDB Tables** | Metadata storage |

**Story Points:** 3

---

### Story 4.5: Stale Bot Aggression Check (COM-05)
**As a** OSPO Agent
**I want** stale bot configuration analysis
**So that** contributions aren't prematurely closed

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.5.1 | Detect stale bot configurations: `.github/stale.yml`, `.github/workflows/stale.yml`, `action.yml` with `actions/stale` | File detection |
| 4.5.2 | Parse YAML for `daysUntilStale` and `daysUntilClose` settings | Config parsing |
| 4.5.3 | **Hostile**: days-before-close < 14 days | Classification |
| 4.5.4 | **Aggressive**: days-before-close 14-29 days | Classification |
| 4.5.5 | **Reasonable**: days-before-close 30-60 days | Classification |
| 4.5.6 | **Lenient**: days-before-close > 60 days | Classification |
| 4.5.7 | WARNING if `daysUntilClose < 30` | Aggressive policy |
| 4.5.8 | CRITICAL if `daysUntilClose < 14` | Hostile pattern |
| 4.5.9 | Check for exempt labels in config | Config parsing |
| 4.5.10 | WARNING if config lacks exemptions for: `security`, `bug`, `pinned`, `good first issue` | Missing exemptions |
| 4.5.11 | Check stale bot message content for welcoming vs dismissive tone | Content analysis |
| 4.5.12 | INFO: Suggest adding exemption labels if missing | Recommendation |
| 4.5.13 | Report: stale bot present, close threshold, exempt labels, aggression level | Summary output |

**Story Points:** 2

---

### Story 4.6: Support Channel Clarity (COM-06)
**As a** OSPO Agent
**I want** support documentation and channel validation
**So that** I can assess user guidance quality

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.6.1 | Check for SUPPORT.md or `.github/SUPPORT.md` | File detection |
| 4.6.2 | Check README for "Support", "Getting Help", or "Questions" section | Section detection |
| 4.6.3 | Verify separate channels documented for: Bug reports (GitHub Issues), Feature requests (Issues/Discussions), General questions (Discussions, Discord, Slack, Stack Overflow) | Content analysis |
| 4.6.4 | WARNING if documentation encourages GitHub Issues for "help" questions | Maintainer burnout risk |
| 4.6.5 | Check for GitHub Discussions enabled (via API) | API check |
| 4.6.6 | INFO: "Consider enabling GitHub Discussions for Q&A" if not enabled | Recommendation |
| 4.6.7 | Detect community links: Discord invite, Slack link, mailing list | Link detection |
| 4.6.8 | Verify community links are functional (HTTP HEAD request, check for 404/expired) | Link validation |
| 4.6.9 | WARNING if support links return 404 or Discord invite expired | Broken links |
| 4.6.10 | PASS if SUPPORT.md present with distinct channels for bugs vs questions | Complete support docs |
| 4.6.11 | Report: support doc present, channels found, broken links | Summary output |

**Story Points:** 3

---

### Story 4.7: Funding Infrastructure (COM-07)
**As a** OSPO Agent
**I want** funding mechanism detection
**So that** I can assess financial sustainability options

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.7.1 | Check for `.github/FUNDING.yml` | File detection |
| 4.7.2 | Parse FUNDING.yml for valid platform keys: `github`, `patreon`, `open_collective`, `ko_fi`, `tidelift`, `community_bridge`, `custom` | YAML parsing |
| 4.7.3 | Validate YAML syntax (valid keys, proper format) | Schema validation |
| 4.7.4 | **Link Health Check:** HTTP HEAD request to funding URLs | HTTP check |
| 4.7.5 | WARNING if any funding link returns 404 or error | Broken funding |
| 4.7.6 | Check README for sponsorship badges/buttons | Badge detection |
| 4.7.7 | INFO: "Funding infrastructure present" if FUNDING.yml configured | Positive signal |
| 4.7.8 | INFO: "No funding infrastructure detected" (neutral, not negative) | Absent signal |
| 4.7.9 | Cross-reference with maturity: Graduated projects without funding = INFO | Maturity context |
| 4.7.10 | Report: platforms configured, link health, badge presence | Summary output |

**Story Points:** 2

---

## Epic 5: AI-Native Readiness (Pillar D)

### Story 5.1a: AI Repository Detection (AI-01a)
**As a** Developer Agent
**I want** AI/ML repository detection
**So that** I can conditionally apply Model Card requirements

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 5.1a.1 | Detect AI/ML repository by: `.py` files importing `torch`/`tensorflow`/`transformers`, `model` directory, `.onnx`/`.pt`/`.h5` files | Pattern detection |
| 5.1a.2 | Report: AI repo detected (true/false), detection signals | Conditional trigger |

**Story Points:** 1

---

### Story 5.1b: Model Card Section Detection (AI-01b)
**As a** Developer Agent
**I want** Model Card section validation
**So that** I can ensure AI documentation standards

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 5.1b.1 | If AI repo detected, require Model Card sections | Conditional requirement |
| 5.1b.2 | Check README.md for section headers (case-insensitive) | Section detection |
| 5.1b.3 | **Required sections** (CRITICAL if missing): "Model Description", "Intended Use", "Limitations" | Header search |
| 5.1b.4 | **Recommended sections** (WARNING if missing): "Training Data", "Evaluation", "Bias", "Ethical Considerations" | Header search |
| 5.1b.5 | **Optional sections** (INFO if missing): "Carbon Footprint", "Citation", "Model Card Authors" | Header search |
| 5.1b.6 | Use **ZeroDB Vector Search** to detect section content semantically (not just headers) | Semantic search |

**Story Points:** 2

---

### Story 5.1c: Model Card Scoring (AI-01c)
**As a** Developer Agent
**I want** Model Card completeness scoring
**So that** I can measure AI documentation quality

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 5.1c.1 | Check for HuggingFace-style YAML front-matter with `model-index:` | YAML parsing |
| 5.1c.2 | Score completeness: (required × 3 + recommended × 2 + optional × 1) / max_score × 100 | Score calculation |
| 5.1c.3 | CRITICAL if completeness < 40% | Threshold check |
| 5.1c.4 | WARNING if completeness 40-70% | Threshold check |
| 5.1c.5 | PASS if completeness > 70% | Threshold check |

**HuggingFace Model Card Reference Format:**

```yaml
---
language: en
license: apache-2.0
model-index:
  - name: model-name
    results:
      - task: text-classification
        metrics:
          - name: Accuracy
            value: 0.95
---

# Model Card for {model_name}

## Model Description
## Intended Use
## Limitations
## Training Data
## Evaluation
## Bias, Risks, and Limitations
## Ethical Considerations
## Citation
```

**Story Points:** 2

---

### Story 5.2: Dataset Provenance (AI-02)
**As a** Developer Agent
**I want** dataset documentation checks
**So that** I can verify data lineage

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 5.2.1 | Detect dataset files: `*.csv`, `*.parquet`, `*.json` (>1MB), `*.arrow`, `data/` directory | File detection |
| 5.2.2 | If datasets detected, check for documentation | Conditional requirement |
| 5.2.3 | Check for `DATASHEET.md`, `DATA_README.md`, `data/README.md` | File detection |
| 5.2.4 | Check for "Datasheets for Datasets" sections: "Motivation", "Composition", "Collection Process", "Preprocessing", "Uses", "Distribution", "Maintenance" | Section detection |
| 5.2.5 | WARNING if dataset files present but no datasheet | Finding generated |
| 5.2.6 | Check for data source attribution in README | Text search |
| 5.2.7 | Detect DVC (Data Version Control) usage: `.dvc` files, `dvc.yaml` | File detection |
| 5.2.8 | PASS if DVC or explicit datasheet present | Presence check |

**Story Points:** 3

---

### Story 5.3: Multi-Model Agentic Rule Detection (AI-03)
**As a** Developer Agent
**I want** agentic configuration detection for all major coding AI assistants
**So that** I can verify AI-native repository readiness

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 5.3.1 | Detect **Claude Code** config: `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/commands/`, `.claude/settings.json`, `.claude/skills/` | File detection |
| 5.3.2 | Detect **Cursor IDE** config: `.cursor/rules`, `.cursorrules`, `.cursorignore` | File detection |
| 5.3.3 | Detect **GitHub Copilot** config: `.github/copilot-instructions.md`, `.copilot-codegeneration.yml` | File detection |
| 5.3.4 | Detect **Google Gemini** config: `GEMINI.md`, `.gemini/`, `gemini-rules.md` | File detection |
| 5.3.5 | Detect **ChatGPT/OpenAI** config: `CHATGPT.md`, `.openai/`, `gpt-instructions.md` | File detection |
| 5.3.6 | Detect **Codeium/Windsurf** config: `.codeium/`, `codeium-rules.md` | File detection |
| 5.3.7 | Detect **Amazon Q Developer** config: `.amazonq/`, `amazonq-rules.md` | File detection |
| 5.3.8 | Detect **Sourcegraph Cody** config: `.cody/`, `CODY.md`, `cody-instructions.md` | File detection |
| 5.3.9 | Detect generic agentic rules: `AGENTS.md`, `AI_GUIDELINES.md`, `.ai/` directory | File detection |
| 5.3.10 | Report which AI assistants have configuration present | Coverage report |
| 5.3.11 | INFO: "Repository has AI assistant configuration for: {list}" | Finding generated |
| 5.3.12 | INFO: "No AI assistant configuration detected" (neutral, not negative) | Finding generated |
| 5.3.13 | Parse CLAUDE.md for structure: check for "Critical Rules", "Commands", "Skills" sections | Section detection |
| 5.3.14 | Calculate AI-readiness score based on presence and completeness | Score calculation |

**Agentic Rule Files Reference:**

| AI Assistant | Primary Config Files | Secondary Config |
|--------------|---------------------|------------------|
| Claude Code | `CLAUDE.md`, `.claude/CLAUDE.md` | `.claude/commands/`, `.claude/skills/`, `.claude/settings.json` |
| Cursor | `.cursorrules`, `.cursor/rules` | `.cursorignore` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.copilot-codegeneration.yml` |
| Google Gemini | `GEMINI.md`, `.gemini/` | `gemini-rules.md` |
| ChatGPT/OpenAI | `CHATGPT.md`, `.openai/` | `gpt-instructions.md` |
| Codeium/Windsurf | `.codeium/` | `codeium-rules.md` |
| Amazon Q | `.amazonq/` | `amazonq-rules.md` |
| Sourcegraph Cody | `CODY.md`, `.cody/` | `cody-instructions.md` |
| Generic | `AGENTS.md`, `AI_GUIDELINES.md` | `.ai/` directory |

**Story Points:** 3

---

### Story 5.4: Metadata Quality (AI-04)
**As a** Developer Agent
**I want** machine-readable metadata validation
**So that** I can enable automated discovery

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 5.4.1 | Check README.md for YAML front-matter between `---` markers | YAML detection |
| 5.4.2 | Parse front-matter, validate YAML syntax | YAML parsing |
| 5.4.3 | Check for standard fields: `title`, `description`, `license`, `language`, `tags` | Field detection |
| 5.4.4 | Check `package.json` for: `name`, `version`, `description`, `license`, `keywords`, `repository`, `author` | Field detection |
| 5.4.5 | Check `pyproject.toml` for: `[project]` section with `name`, `version`, `description`, `license`, `keywords` | Field detection |
| 5.4.6 | Check `Cargo.toml` for: `[package]` section with `name`, `version`, `description`, `license`, `keywords` | Field detection |
| 5.4.7 | Calculate metadata score: present_fields / expected_fields × 100 | Score calculation |
| 5.4.8 | PASS if score >= 80% | Threshold check |
| 5.4.9 | WARNING if score 50-79% | Threshold check |
| 5.4.10 | CRITICAL if score < 50% | Threshold check |

**Story Points:** 2

---

## Epic 6: Inclusive Language & Accessibility (Pillar E)

### Story 6.1a: Inclusive Naming Term List Management (INC-01a)
**As a** Developer Agent
**I want** inclusive naming term list loading and caching
**So that** I can detect non-inclusive terminology

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 6.1a.1 | Load term list from `https://inclusivenaming.org/word-lists/index.json` or bundled fallback | Data loading |
| 6.1a.2 | Cache term list in **ZeroDB File Storage** with 7-day TTL | Cache implementation |
| 6.1a.3 | Support config override via `.quaid-scanner.yaml`: `inclusive.custom_terms` | Config support |

**Story Points:** 1

---

### Story 6.1b: Documentation Language Scanning (INC-01b)
**As a** Developer Agent
**I want** non-inclusive terminology detection in documentation
**So that** I can improve contributor experience

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 6.1b.1 | Scan all text files: `*.md`, `*.txt`, `*.rst`, `*.adoc`, `*.html` | File selection |
| 6.1b.2 | Case-insensitive whole-word matching (avoid "mastery" matching "master") | Regex: `\bmaster\b` |
| 6.1b.3 | Report file path, line number, column, matched term, context (±20 chars) | Finding details |
| 6.1b.4 | Exclude paths in `.gitignore` and `node_modules/`, `vendor/`, `.git/` | Path exclusion |
| 6.1b.5 | Allow per-line suppression with comment `<!-- inclusive-naming-ignore -->` | Suppression support |

**Tier 0 - No Change Recommended (informational only):**

| Term | Reason |
|------|--------|
| blackbox | Opacity reference, not racial |
| blackout | Not color-based |
| disable | Valid tech term |
| whitebox | Unrestricted |
| white-label | Unrestricted |
| parent-child | Natural hierarchy |
| red team | Not Indigenous reference |
| fellow | Gender-neutral |
| master inventor | Skill-based |
| mastermind | Skill-based |

**Story Points:** 2

---

### Story 6.1c: Code Comment Language Scanning (INC-01c)
**As a** Developer Agent
**I want** non-inclusive terminology detection in code comments
**So that** I can ensure inclusive codebase language

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 6.1c.1 | Scan code comments in: `*.js`, `*.ts`, `*.py`, `*.go`, `*.java`, `*.rs`, `*.rb`, `*.c`, `*.cpp`, `*.h` | Comment extraction |
| 6.1c.2 | Scan string literals in code files | String extraction |
| 6.1c.3 | Allow per-line suppression with comment `// inclusive-naming-ignore` or `# inclusive-naming-ignore` | Suppression support |
| 6.1c.4 | Config option `inclusive.ignore_terms: ["master"]` to skip specific terms | Config support |

**Tier 1 - Replace Immediately (CRITICAL):**

| Term | Regex Pattern | Replacements |
|------|---------------|--------------|
| master (standalone) | `\bmaster\b(?!mind\|y\|piece\|ful)` | main, primary, source, original |
| master-slave | `\bmaster[/-]slave\b` | primary-secondary, leader-follower, controller-worker |
| slave | `\bslave\b` | secondary, replica, follower, worker |
| whitelist | `\bwhite[-]?list\b` | allowlist, approved list, safe list |
| blacklist | `\bblack[-]?list\b` | blocklist, denylist, banned list |
| blackhat/whitehat | `\b(black\|white)[-]?hat\b` | malicious/ethical, attacker/defender |
| grandfathered | `\bgrandfather(ed\|ing)?\b` | legacy, exempted, preapproved |
| cripple | `\bcripple[ds]?\b` | disable, degrade, impair, limit |
| tribe | `\btribe[s]?\b` | team, group, squad, community |
| abort | `\babort(ed\|ing\|s)?\b` | cancel, terminate, stop, halt |

**Story Points:** 2

---

### Story 6.1d: Inclusive Language Scoring (INC-01d)
**As a** Developer Agent
**I want** tiered inclusive language scoring
**So that** I can prioritize terminology improvements

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 6.1d.1 | Group findings by tier with severity mapping | Tier aggregation |
| 6.1d.2 | Calculate score: 100 - (tier1 × 10 + tier2 × 5 + tier3 × 2) capped at 0 | Score formula |
| 6.1d.3 | CRITICAL if score < 50 | Threshold check |
| 6.1d.4 | WARNING if score 50-80 | Threshold check |
| 6.1d.5 | PASS if score > 80 | Threshold check |

**Tier 2 - Strongly Consider (WARNING):**

| Term | Regex Pattern | Replacements |
|------|---------------|--------------|
| sanity check | `\bsanity[- ]?check\b` | confidence check, validity check, coherence check |

**Tier 3 - Recommended (INFO):**

| Term | Regex Pattern | Replacements |
|------|---------------|--------------|
| man-hour | `\bman[- ]?hours?\b` | person-hour, work-hour, staff-hour |
| man-in-the-middle | `\bman[- ]?in[- ]?the[- ]?middle\b` | machine-in-the-middle, on-path attack |
| end-of-life | `\bend[- ]?of[- ]?life\b` | deprecated, sunset, end of support |
| evangelist | `\bevangelist[s]?\b` | advocate, champion, ambassador |
| hallucinate | `\bhallucinate[ds]?\b` | generate inaccurate, confabulate |
| segregate | `\bsegregate[ds]?\b` | separate, segment, isolate |
| totem pole | `\btotem[- ]?pole\b` | hierarchy, ranking |
| blast radius | `\bblast[- ]?radius\b` | impact scope, affected area |

**Story Points:** 1

---

### Story 6.2: Diminishing Language Detection (INC-02)
**As a** Developer Agent
**I want** dismissive language detection
**So that** I can create welcoming documentation

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 6.2.1 | Scan documentation files: `*.md`, `README*`, `CONTRIBUTING*`, `docs/**/*` | File selection |
| 6.2.2 | Detect dismissive patterns with context (not standalone words) | Contextual matching |
| 6.2.3 | Exclude code blocks (``` and indented) from scanning | Code block detection |
| 6.2.4 | Report: term, file, line, surrounding sentence for context | Finding details |
| 6.2.5 | Calculate "welcoming score": 100 - (warning_count × 3 + info_count × 1) capped at 0 | Score formula |
| 6.2.6 | Allow suppression with `<!-- inclusive-ok -->` comment | Suppression support |
| 6.2.7 | Group findings by file with counts | Aggregation |
| 6.2.8 | PASS if welcoming score > 85 | Threshold check |
| 6.2.9 | WARNING if score 60-85 | Threshold check |
| 6.2.10 | CRITICAL if score < 60 | Threshold check |

**Diminishing Language Patterns:**

| Pattern | Regex | Severity | Replacement Suggestion |
|---------|-------|----------|------------------------|
| "just [verb]" | `\bjust\s+(run\|do\|add\|use\|change\|set\|put\|make\|click\|type\|enter\|install\|clone\|fork)\b` | WARNING | Remove "just" - "Run the command" |
| "simply [verb]" | `\bsimply\s+(run\|do\|add\|use\|change\|set\|put\|make\|click\|type\|enter\|install)\b` | WARNING | Remove "simply" |
| "easy/easily" | `\b(easy\|easily)\b` in documentation context | INFO | "straightforward" or remove |
| "obvious/obviously" | `\bobvious(ly)?\b` | WARNING | Remove or explain explicitly |
| "trivial" | `\btrivial(ly)?\b` | INFO | "small change" or "minor update" |
| "everyone knows" | `\beveryone\s+knows\b` | WARNING | Explain or link to resource |
| "as you know" | `\bas\s+you\s+(probably\s+)?know\b` | WARNING | Remove or explain |
| "of course" | `\bof\s+course\b` | INFO | Remove or explain why |
| "clearly" | `\bclearly\b` in explanatory context | INFO | Remove and explain |
| "basically" | `\bbasically\b` | INFO | Remove or provide detail |

**Story Points:** 3

---

### Story 6.3: Assumed Knowledge Detection (INC-03)
**As a** Developer Agent
**I want** prerequisite knowledge flagging
**So that** I can identify documentation gaps

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 6.3.1 | Scan: `README.md`, `CONTRIBUTING.md`, `INSTALL.md`, `docs/getting-started.md` | File selection |
| 6.3.2 | Detect unexplained Git operations (see reference table below) | Pattern matching |
| 6.3.3 | Detect tool assumptions without setup (see reference table below) | Pattern matching |
| 6.3.4 | Detect undefined acronyms: 3+ capital letters not defined within 500 chars before (Pattern: `\b[A-Z]{3,}\b`) | Pattern detection |
| 6.3.5 | Exclude common known acronyms: API, URL, HTML, CSS, JSON, YAML, HTTP, HTTPS, REST, CLI, GUI, IDE, OS, SDK, SQL, SSH, SSL, TLS, DOM, DNS, IP, TCP, UDP, AWS, GCP, CI, CD | Allowlist |
| 6.3.6 | Check for Prerequisites/Requirements section in README | Section detection |
| 6.3.7 | WARNING if commands detected without prerequisites section | Finding generated |
| 6.3.8 | INFO for each assumed knowledge instance | Finding per instance |
| 6.3.9 | Suggest: "Consider adding a Prerequisites section" | Recommendation |
| 6.3.10 | Calculate accessibility score based on findings | Score calculation |

**Git Operation Patterns (without explanation):**

| Pattern | Regex | Requires |
|---------|-------|----------|
| Fork instruction | `fork\s+(the\|this)?\s*repo` not followed by explanation/link within 200 chars | Link to GitHub fork guide |
| Clone instruction | `(git\s+)?clone\s+` not preceded by "git installed" or setup section | Prerequisites section |
| Branch operation | `git\s+(checkout\|branch\|switch)\s+-?[b]?\s*` without explanation | Git basics link |
| Rebase mention | `\brebase\b` without explanation within 500 chars | Rebase explanation |
| Cherry-pick | `cherry[- ]?pick` without explanation | Explanation needed |

**Tool Assumption Patterns:**

| Pattern | Regex | Requires |
|---------|-------|----------|
| npm without install | `npm\s+(install\|run\|test\|start)` without Node.js prerequisite | Node.js version requirement |
| pip without Python | `pip\s+install` without Python prerequisite | Python version requirement |
| cargo without Rust | `cargo\s+(build\|run\|test)` without Rust prerequisite | Rust installation link |
| make without build-essential | `make\s+\w+` without build tools prerequisite | Build tools requirement |
| docker without Docker | `docker\s+(run\|build\|compose)` without Docker prerequisite | Docker installation link |

**Story Points:** 3

---

## Epic 7: Technical Rigor (Pillar F)

### Story 7.1: Linter Configuration Check (TECH-01)
**As a** Developer Agent
**I want** linter presence verification
**So that** I can ensure code standards

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 7.1.1 | Detect JavaScript/TypeScript linters: `.eslintrc`, `.eslintrc.js`, `.eslintrc.json`, `.eslintrc.yml`, `eslint.config.js`, `eslint.config.mjs` | File detection |
| 7.1.2 | Detect Python linters: `.pylintrc`, `pylintrc`, `setup.cfg` with `[pylint]`, `pyproject.toml` with `[tool.pylint]`, `.flake8`, `.ruff.toml`, `ruff.toml` | File detection |
| 7.1.3 | Detect Go linters: `.golangci.yml`, `.golangci.yaml`, `golangci.yml` | File detection |
| 7.1.4 | Detect Rust linters: `rustfmt.toml`, `.rustfmt.toml`, `clippy.toml` | File detection |
| 7.1.5 | Detect Ruby linters: `.rubocop.yml`, `.rubocop.yaml` | File detection |
| 7.1.6 | Detect meta-linters: `.github/workflows/*` containing `super-linter`, `megalinter` | Workflow search |
| 7.1.7 | Detect formatters: `.prettierrc`, `.prettierrc.js`, `.editorconfig` | File detection |
| 7.1.8 | Check CI workflows for lint step: `npm run lint`, `eslint`, `pylint`, `flake8`, `golangci-lint` | Workflow search |
| 7.1.9 | PASS if linter config + CI integration found | Both conditions |
| 7.1.10 | WARNING if linter config but no CI integration | Config only |
| 7.1.11 | INFO if no linter detected | Neither found |
| 7.1.12 | Report: detected linters, CI integration status | Summary generation |

**Story Points:** 2

---

### Story 7.2: Test Coverage Detection (TECH-02)
**As a** TDD Agent
**I want** coverage reporting verification
**So that** I can assess test quality

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 7.2.1 | Detect coverage services: `.codecov.yml`, `codecov.yml`, `.coveralls.yml`, `coveralls.yml` | File detection |
| 7.2.2 | Detect coverage in CI: workflows containing `codecov/codecov-action`, `coverallsapp/github-action` | Workflow search |
| 7.2.3 | Detect coverage badges in README: `codecov.io`, `coveralls.io`, `shields.io/badge/coverage` | Badge detection |
| 7.2.4 | Detect coverage config: `jest.config.js` with `coverageThreshold`, `pytest.ini` with `--cov`, `nyc` config | Config detection |
| 7.2.5 | Detect coverage output files: `coverage/`, `htmlcov/`, `.coverage`, `lcov.info`, `coverage.xml` in `.gitignore` | Gitignore check |
| 7.2.6 | PASS if coverage service integration found | Integration present |
| 7.2.7 | WARNING if coverage config but no CI integration | Config only |
| 7.2.8 | INFO if no coverage detected | Neither found |
| 7.2.9 | Extract coverage percentage from badge if possible | Badge parsing |
| 7.2.10 | Report: coverage tool, CI integration, badge percentage (if found) | Summary generation |

**Story Points:** 2

---

### Story 7.3: Semantic Versioning Validation (TECH-03)
**As a** Developer Agent
**I want** semver compliance verification
**So that** I can ensure predictable versioning

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 7.3.1 | List git tags matching semver: `v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?` | Tag listing |
| 7.3.2 | Verify tags are in chronological order (newer version = later date) | Order check |
| 7.3.3 | WARNING if tags skip versions (e.g., v1.0.0 → v1.0.5 skipping .1-.4) | Gap detection |
| 7.3.4 | Check for `CHANGELOG.md`, `HISTORY.md`, `NEWS.md`, `RELEASES.md` | File detection |
| 7.3.5 | Parse CHANGELOG for "Keep a Changelog" format sections: Added, Changed, Deprecated, Removed, Fixed, Security | Section detection |
| 7.3.6 | Cross-reference CHANGELOG versions with git tags | Consistency check |
| 7.3.7 | WARNING if CHANGELOG missing entries for tagged versions | Missing entries |
| 7.3.8 | Check `package.json`/`pyproject.toml`/`Cargo.toml` version matches latest tag | Version consistency |
| 7.3.9 | PASS if semver tags + CHANGELOG present and consistent | All checks pass |
| 7.3.10 | WARNING if tags present but no CHANGELOG | Missing CHANGELOG |
| 7.3.11 | INFO if no version tags found | No tags |
| 7.3.12 | Report: latest version, tag count, CHANGELOG present, consistency status | Summary generation |

**Story Points:** 2

---

### Story 7.4: Release Cadence & Project Vitality (TECH-04)
**As a** OSS Researcher Agent
**I want** release health metrics
**So that** I can distinguish active projects from abandonware

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 7.4.1 | Query git tags and GitHub Releases API | Data retrieval |
| 7.4.2 | Calculate `days_since_release` from most recent semantic version tag | Date calculation |
| 7.4.3 | **Active**: < 90 days (Low risk - regular maintenance) | Classification |
| 7.4.4 | **Stable**: 90-365 days (Medium - may be mature/complete) | Classification |
| 7.4.5 | **Potentially Dormant**: 365-730 days (High - needs investigation) | Classification |
| 7.4.6 | **Likely Abandoned**: > 730 days (Critical - adoption risk) | Classification |
| 7.4.7 | Cross-reference with commit activity: if commits but no releases, flag "unreleased work" | Combined signal |
| 7.4.8 | **Release Frequency:** Calculate average days between releases (last 2 years) | Frequency metric |
| 7.4.9 | **Semantic Versioning Hygiene:** Validate tags match SemVer pattern (Regex: `^v?\d+\.\d+\.\d+`) | Pattern check |
| 7.4.10 | WARNING if tags don't follow SemVer (e.g., `release-2023`, `build-123`) | Pattern mismatch |
| 7.4.11 | Check releases for cryptographic signatures: `.asc`, `.sig`, `.bundle`, `.intoto.jsonl` | Signature detection |
| 7.4.12 | INFO if release artifacts have cryptographic signatures (positive signal) | Security bonus |
| 7.4.13 | **Pre-release Detection:** Flag if only pre-release versions (alpha, beta, rc) available | Stability indicator |
| 7.4.14 | WARNING if project has pre-releases but no stable release | Not production ready |
| 7.4.15 | Store release metrics in **ZeroDB PostgreSQL** for trending | Historical data |
| 7.4.16 | Report: latest version, days since release, release frequency, signing status, vitality classification | Summary output |

**Semantic Versioning Assessment:**

| Tagging Pattern | Assessment |
|-----------------|------------|
| Consistent SemVer | **Professional** - automated dependency management friendly |
| Mixed patterns | **Warning** - inconsistent release process |
| No semantic tags | **Poor** - difficult for adopters to track versions |

**Signature Type Reference:**

| Signature Type | Files | Assessment |
|----------------|-------|------------|
| PGP/GPG | `.asc`, `.sig` | High security maturity |
| Sigstore/cosign | `.sig`, `.bundle` | Modern signing |
| SLSA provenance | `.intoto.jsonl` | Supply chain attestation |
| No signatures | N/A | Standard (not a finding for most projects) |

**Story Points:** 3

---

### Story 7.5: Interaction Template Validation (TECH-05)
**As a** Developer Agent
**I want** issue/PR template validation
**So that** contributors have a smooth experience filing reports

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 7.5.1 | Detect issue templates: `.github/ISSUE_TEMPLATE/`, `.github/ISSUE_TEMPLATE.md` | File detection |
| 7.5.2 | Detect PR templates: `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/` | File detection |
| 7.5.3 | **YAML Front-Matter Validation:** Parse templates for valid YAML between `---` markers | YAML parsing |
| 7.5.4 | ERROR if YAML syntax invalid (broken template frustrates users) | Syntax check |
| 7.5.5 | Check for required YAML fields: `name`, `description`, `labels` | Field validation |
| 7.5.6 | WARNING if `labels` field missing (missed auto-triage opportunity) | Missing field |
| 7.5.7 | Check for body content elements: HTML comments, placeholder text, checkboxes, section headers | Content analysis |
| 7.5.8 | INFO if template lacks guidance comments (missed UX opportunity) | UX check |
| 7.5.9 | Check for template types: Bug report, Feature request, Question, Security | Type detection |
| 7.5.10 | PASS if bug and feature templates present with valid YAML | Minimum coverage |
| 7.5.11 | WARNING if no issue templates configured | Missing templates |
| 7.5.12 | Report: templates found, YAML validity, guidance quality | Summary output |

**Template Type Detection:**

| Template Type | Purpose | Detection |
|---------------|---------|-----------|
| Bug report | Structured bug filing | `bug` in name/labels |
| Feature request | New functionality | `feature` or `enhancement` in name |
| Question | Support (should redirect to Discussions) | `question` in name |
| Security | Private vulnerability reporting | Links to security contact |

**Template Body Element Reference:**

| Element | Purpose | Detection |
|---------|---------|-----------|
| HTML comments (`<!-- -->`) | Guide users on what to write | Comment blocks |
| Placeholder text | Show expected format | Template strings |
| Checkboxes (`- [ ]`) | Structured requirements | Markdown syntax |
| Section headers | Organize information | `##` headers |

**Story Points:** 2

---

## Epic 8: Reporting & Output

### Story 8.1: JSON Report Generator
**As a** Developer Agent
**I want** machine-readable JSON output
**So that** I can automate quality gates

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 8.1.1 | Output valid JSON per JSON Schema Draft 7 | Schema validation |
| 8.1.2 | Include top-level fields: `repo`, `scanned_at` (ISO 8601), `version` (tool version), `depth`, `duration_ms` | Field presence |
| 8.1.3 | Include `overall_score` (0.0-10.0, one decimal) | Field format |
| 8.1.4 | Include `risk_level`: "CRITICAL" (<4), "HIGH" (4-5.9), "MEDIUM" (6-7.9), "LOW" (>=8) | Enum values |
| 8.1.5 | Include `pillars` object with scores and details for each pillar | Nested structure |
| 8.1.6 | Include `findings` array with all findings | Array structure |
| 8.1.7 | Each finding includes: `id`, `severity`, `pillar`, `category`, `message`, `file`, `line`, `column`, `context`, `suggestion`, `reference_url` | Finding schema |
| 8.1.8 | Include `recommendations` array with prioritized actions | Array structure |
| 8.1.9 | Each recommendation includes: `priority` (1-5), `action`, `impact`, `effort` (low/medium/high) | Recommendation schema |
| 8.1.10 | Include `metadata` object: `commit_sha`, `branch`, `remote_url` | Metadata |
| 8.1.11 | Store report in **ZeroDB File Storage** with key `{repo}/{date}/{sha}.json` | Storage implementation |
| 8.1.12 | Provide JSON Schema file for consumers | Schema export |

**JSON Report Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["repo", "scanned_at", "overall_score", "risk_level", "pillars", "findings"],
  "properties": {
    "repo": { "type": "string" },
    "scanned_at": { "type": "string", "format": "date-time" },
    "version": { "type": "string" },
    "depth": { "enum": ["quick", "standard", "thorough"] },
    "duration_ms": { "type": "integer" },
    "overall_score": { "type": "number", "minimum": 0, "maximum": 10 },
    "risk_level": { "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
    "pillars": {
      "type": "object",
      "properties": {
        "security": { "$ref": "#/definitions/pillar" },
        "governance": { "$ref": "#/definitions/pillar" },
        "community": { "$ref": "#/definitions/pillar" },
        "ai_readiness": { "$ref": "#/definitions/pillar" },
        "inclusive": { "$ref": "#/definitions/pillar" },
        "technical": { "$ref": "#/definitions/pillar" }
      }
    },
    "findings": {
      "type": "array",
      "items": { "$ref": "#/definitions/finding" }
    },
    "recommendations": {
      "type": "array",
      "items": { "$ref": "#/definitions/recommendation" }
    }
  }
}
```

**Story Points:** 3

---

### Story 8.2: Markdown Report Generator
**As a** Human persona (via agent)
**I want** readable markdown output
**So that** I can review findings easily

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 8.2.1 | Generate valid GitHub-flavored markdown | Markdown lint |
| 8.2.2 | Header section with repo name, scan date, overall score badge | Section present |
| 8.2.3 | Summary scorecard table with pillar scores | Table format |
| 8.2.4 | Findings grouped by severity: CRITICAL, WARNING, INFO | Section ordering |
| 8.2.5 | Each finding includes: title, description, file:line reference, suggestion | Finding format |
| 8.2.6 | Code blocks with syntax highlighting for context | Fenced code blocks |
| 8.2.7 | Collapsible sections for large finding lists (>10) using `<details>` | HTML details |
| 8.2.8 | Resource links section with external references | Links section |
| 8.2.9 | Badge-ready score: `![Score](https://img.shields.io/badge/oss--health-8.5-green)` | Badge URL |
| 8.2.10 | Table of contents for long reports | TOC generation |
| 8.2.11 | Summary section with pass/fail counts per pillar | Summary stats |

**Story Points:** 3

---

### Story 8.3a: Scan History Storage (HIST-01a)
**As an** OSPO Agent
**I want** scan history storage in ZeroDB
**So that** I can track improvement over time

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 8.3a.1 | Store each scan in **ZeroDB PostgreSQL** table `scan_history` | Insert operation |
| 8.3a.2 | Schema: `id`, `repo`, `scanned_at`, `commit_sha`, `overall_score`, `pillar_scores` (JSONB), `finding_counts` (JSONB), `duration_ms` | Table schema |
| 8.3a.3 | Query trends: `--trend 30d` shows score over last 30 days | CLI option |

**Story Points:** 2

---

### Story 8.3b: Trend Analysis & Comparison (HIST-01b)
**As an** OSPO Agent
**I want** trend analysis and scan comparison
**So that** I can monitor progress

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 8.3b.1 | Calculate trend direction: improving (>5% up), declining (>5% down), stable | Trend calculation |
| 8.3b.2 | Alert if score dropped >10% from previous scan | Alert generation |
| 8.3b.3 | Generate ASCII chart for terminal display | Chart rendering |
| 8.3b.4 | `--compare <sha>` compares current scan to historical scan | Comparison mode |
| 8.3b.5 | Report new findings since last scan | Delta calculation |
| 8.3b.6 | Report fixed findings since last scan | Delta calculation |
| 8.3b.7 | API endpoint consideration: `GET /history/{repo}` for dashboard integration | API design |

**Story Points:** 3

---

## Epic 10: Ecosystem Intelligence

Strategic analysis of the competitive and cooperative OSS landscape. **Not a scored pillar** — does not affect `overallScore`. Opt-in via `--ecosystem` flag.

### Story 10.1: Domain Detection
**As a** developer running quaid-scanner
**I want** the tool to identify my project's domain
**So that** ecosystem analysis is relevant to my space

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 10.1.1 | `DomainDetector` scores README/package.json keywords against 30-domain taxonomy | Unit test |
| 10.1.2 | Detects primary language (TypeScript, Python, Go, Rust, etc.) | Unit test |
| 10.1.3 | Falls back to `general` domain when no keywords match | Unit test |
| 10.1.4 | `detectedTopics` array lists top-5 matched domains | Output check |

**Story Points:** 2

---

### Story 10.2: Foundation & Standards Mapping
**As a** maintainer
**I want** to know which foundations and standards apply to my domain
**So that** I can pursue alignment and certification

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 10.2.1 | `FoundationMapper` maps 30 domains to foundations (CNCF, OpenSSF, LF AI&Data, Apache, etc.) | Unit test |
| 10.2.2 | `standards` array lists applicable standards (OCI, SLSA, CHAOSS, OpenTelemetry, etc.) | Output check |
| 10.2.3 | Deduplicates foundations when profile already has entries | Unit test |

**Story Points:** 2

---

### Story 10.3: Rival & Partner Discovery
**As a** maintainer
**I want** to know which projects are my rivals and potential partners
**So that** I can differentiate and collaborate strategically

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 10.3.1 | `RivalFinder` returns static rivals from `DOMAIN_TO_RIVALS` taxonomy | Unit test |
| 10.3.2 | `similarityScore: null` for static-only rivals | Output check |
| 10.3.3 | ZeroDB vector search augments results when available (similarity > 0.75) | Integration test |
| 10.3.4 | `PartnerFinder` reads package.json/requirements.txt/go.mod deps | Unit test |
| 10.3.5 | `PartnerFinder` detects README "integrates with" mentions | Unit test |
| 10.3.6 | Deduplicates by name (case-insensitive) | Unit test |

**Story Points:** 3

---

### Story 10.4: Community Mapping
**As a** maintainer
**I want** a list of relevant communities to join
**So that** I can increase my project's visibility and gather users

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 10.4.1 | `CommunityMapper` returns communities from static taxonomy | Unit test |
| 10.4.2 | Detects Discord/Slack/Reddit/GitHub Discussions URLs in README | Unit test |
| 10.4.3 | Does not duplicate URLs found in both README and taxonomy | Unit test |
| 10.4.4 | Communities have `relevance: 'high' | 'medium' | 'low'` | Output check |

**Story Points:** 2

---

### Story 10.5: Strategy Recommendations
**As a** maintainer
**I want** actionable strategic recommendations
**So that** I know what to do next to grow my project's ecosystem position

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 10.5.1 | `StrategyAdvisor` returns ≤8 recommendations sorted by impact×effort | Unit test |
| 10.5.2 | Foundation recommendation present when `ecosystems` non-empty | Unit test |
| 10.5.3 | Standards recommendation present when `standards` non-empty | Unit test |
| 10.5.4 | Differentiation recommendation present when rivals exist | Unit test |
| 10.5.5 | All recommendations have `effort`, `impact`, and `resources` fields | Output check |

**Story Points:** 2

---

### Story 10.6: CLI Integration & Output
**As a** developer
**I want** `--ecosystem` flag to add intelligence to JSON/Markdown output
**So that** I can include it in CI reports or read it in the terminal

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 10.6.1 | `--ecosystem` flag triggers `EcosystemOrchestrator.analyze()` after scan | CLI test |
| 10.6.2 | `report.ecosystem` is populated; `overallScore` unchanged | Integration test |
| 10.6.3 | `dataSource: 'static'` when ZeroDB unavailable | Output check |
| 10.6.4 | `dataSource: 'zerodb-assisted'` or `'zerodb-full'` when ZeroDB connected | Integration test |
| 10.6.5 | Ecosystem section appears in Markdown output | CLI test |
| 10.6.6 | `disclaimer` field present in all outputs | Output check |

**Story Points:** 2

---

## Epic 9: Claude Code Integration

### Story 9.1: Claude Skill Definition
**As a** Developer Agent (Claude Code)
**I want** a `/quaid-scan` skill
**So that** I can scan repos conversationally

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 9.1.1 | `SKILL.md` in `.claude/skills/quaid-scan/` | File present |
| 9.1.2 | Frontmatter with: `name`, `description`, `version` | YAML valid |
| 9.1.3 | Description mentions all 6 pillars | Content check |
| 9.1.4 | Quick reference section with CLI options | Section present |
| 9.1.5 | Reference files for each pillar in `references/` directory | Files present |
| 9.1.6 | Examples section with common use cases | Section present |
| 9.1.7 | Skill outputs human-readable summary, not raw JSON | Output format |
| 9.1.8 | Skill interprets findings: "3 critical issues found: ..." | Interpretation |
| 9.1.9 | Skill suggests next steps based on findings | Recommendations |
| 9.1.10 | Support depth parameter: `/quaid-scan . --depth thorough` | Argument parsing |

**Story Points:** 3

---

### Story 9.2: MCP Server Integration
**As a** Developer Agent
**I want** MCP server configuration
**So that** I can use the scanner as a tool

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|--------------|
| 9.2.1 | `.mcp.json` template in repository root | File present |
| 9.2.2 | MCP server definition for `quaid-scanner` tool | Config structure |
| 9.2.3 | Tool parameters: `path`, `depth`, `format` | Parameter schema |
| 9.2.4 | Tool returns structured result for Claude interpretation | Result format |
| 9.2.5 | Integration with ZeroDB MCP for historical queries | MCP chaining |
| 9.2.6 | Documentation for MCP setup | Docs present |

**Story Points:** 2

---

## Architecture

### Package Structure

```
quaid-scanner/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main export
│   ├── cli.ts                      # CLI with commander.js
│   ├── scanner/
│   │   ├── orchestrator.ts         # Scan coordination
│   │   ├── security/               # Pillar A checks
│   │   ├── governance/             # Pillar B checks
│   │   ├── community/              # Pillar C checks
│   │   ├── ai-readiness/           # Pillar D checks
│   │   ├── inclusive/              # Pillar E checks
│   │   └── technical/              # Pillar F checks
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
│       └── quaid-scan/
├── tests/
└── docs/
```

---

## Success Metrics (KPIs)

| Metric | Target |
|--------|--------|
| False Positive Rate | < 5% on "High Risk" flags |
| Scan Time (quick) | < 5 seconds |
| Scan Time (standard) | < 15 seconds |
| Scan Time (thorough) | < 60 seconds |
| Test Coverage | ≥ 80% |
| AINative API Latency | < 2 seconds for semantic checks |

---

## Story Point Summary

| Epic | Stories | Total Points | Key Focus |
|------|---------|--------------|-----------|
| Epic 1: Core Infrastructure | 4 | 9 | CLI, Plugin Architecture, Orchestrator |
| Epic 2: Security | 7 | 20 | OpenSSF Scorecard, Supply Chain |
| Epic 3: Governance | 10 | 25 | License, Bus Factor, Vendor Neutrality |
| Epic 4: Community | 10 | 22 | OSW 2.0 Framework, Burnout Detection |
| Epic 5: AI-Native | 6 | 13 | Model Cards, Multi-Model Agentic Rules |
| Epic 6: Inclusive | 5 | 12 | INI Terms, Diminishing Language |
| Epic 7: Technical | 5 | 11 | Linting, Coverage, Release Vitality |
| Epic 8: Reporting | 4 | 11 | JSON/Markdown, Historical Trends |
| Epic 9: Claude Integration | 2 | 5 | SKILL.md, MCP Server |
| Epic 10: Ecosystem Intelligence | 6 | 13 | Rivals, Partners, Communities, Strategy |
| **Total** | **59** | **141** | |

---

### Change Log

#### v2.2 Changes (from v2.1)

| Change | Impact |
|--------|--------|
| **Add Epic 10: Ecosystem Intelligence** | New `--ecosystem` flag, `EcosystemOrchestrator`, domain taxonomy, rival/partner/community analysis, strategy advisor |
| **Story point total: 128 → 141** | 6 new stories, 13 new points |
| **ScanReport.ecosystem? optional field** | Non-breaking addition; does not affect overallScore |

#### v2.1 Changes (from v2.0)

| Change | Impact |
|--------|--------|
| **Renamed to "Quaid's OSS Repo Scanner"** | npm package: `quaid-scanner` |
| **Agent-first design philosophy added** | Primary users are AI agents, not humans |
| **All stories broken down to ≤3 points** | 37 stories → 53 stories |
| **Story 5.3 expanded for multi-model support** | Added Gemini, ChatGPT, Codeium, Amazon Q, Cody |
| **Fixed table formatting throughout** | Sub-tables moved to reference sections |
| **Added Agent vs Human personas section** | Clear AI-native interaction patterns |

#### v2.0 Changes (from v1.0)

| Change | Impact |
|--------|--------|
| Added maturity-context scoring (auto-detect + override) | Contextual findings |
| Expanded Epic 4 with Open Source Way 2.0 research | +3 stories |
| Added vendor neutrality analysis to Story 3.4 | +2 points |
| Expanded CLA/DCO automation in Story 3.5 | +1 point |
| Added Release Cadence & Vitality (Story 7.4) | +3 points |
| Added Interaction Template Validation (Story 7.5) | +2 points |
| Clarified OpenSSF Scorecard shell-out strategy | Implementation clarity |
| Added bot filtering patterns (configurable) | Accurate human response metrics |

---

## Implementation Phases

### Phase 1: Foundation (Stories: 1.1, 1.2, 1.3a, 1.3b, 6.1a-6.1d)
- Core infrastructure and CLI
- Maturity-context auto-detection
- Inclusive language checks (fully specified)
- Basic markdown/JSON reporting

### Phase 2: Security & Governance (Stories: 2.1a-2.5, 3.1a-3.5)
- OpenSSF Scorecard integration (shell-out + local fallback)
- License compliance scanning (native implementation)
- Vendor neutrality analysis
- CLA/DCO automation detection
- ZeroDB integration for storage

### Phase 3: Community Health (Stories: 4.1a-4.7, 7.4-7.5)
- Open Source Way 2.0 framework implementation
- Time-to-first-human-response (bot filtering)
- Contributor funnel analysis
- Maintainer burnout detection
- Stale bot aggression check
- Support channel clarity
- Release cadence & vitality
- Template validation

### Phase 4: AI & Polish (Stories: 5.1a-5.4, 7.1-7.3, 8.1-8.3b, 9.1-9.2)
- AI-readiness checks (Model Cards, multi-model agentic rules)
- Technical rigor checks
- Historical trending in ZeroDB
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
| Inclusive Naming | Term list | Yes (bundled fallback) |

---

## References

### Standards & Frameworks
- [OpenSSF Scorecard](https://scorecard.dev) - Supply chain security metrics
- [CHAOSS Metrics](https://chaoss.community) - Community health measurement
- [The Open Source Way 2.0](https://www.theopensourceway.org) - Community management framework
- [Inclusive Naming Initiative](https://inclusivenaming.org) - Terminology guidance
- [Inclusive Naming Word Lists JSON](https://inclusivenaming.org/word-lists/index.json) - Machine-readable term list
- [SPDX License List](https://spdx.dev) - License identifiers
- [ClearlyDefined](https://clearlydefined.io) - License data API
- [HuggingFace Model Cards](https://huggingface.co/docs/hub/model-cards) - AI documentation standard

### AINative Services
- [AINative ZeroDB](https://ainative.studio) - Vector search, PostgreSQL, File Storage

### Project Documentation
- [Open Source Way et al Expansions](./Open_Source_Way_et_al_expansions.md) - Strategic roadmap and detailed feature specifications
