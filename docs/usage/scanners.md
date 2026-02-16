# Scanner Reference

quaid-scanner organizes checks into six strategic pillars. Each pillar contributes a weighted score to the overall health assessment.

## Pillar Weights

| Pillar | Weight | Focus |
|--------|--------|-------|
| Security | 25% | Supply chain integrity |
| Governance | 20% | Legal compliance and project structure |
| Community | 15% | Contributor health and engagement |
| AI-Readiness | 15% | Model cards and agentic rules |
| Inclusive Language | 15% | Accessible, welcoming language |
| Technical Rigor | 10% | Automation and release discipline |

---

## Security Pillar (25%)

### OpenSSF Scorecard
**Name:** `openssf-scorecard`
**Requires:** GitHub token, public GitHub repository

Queries the OpenSSF Scorecard API for the 18-point security checklist. Maps each check score to findings:
- Score >= 8: PASS
- Score 5-7: WARNING
- Score < 5: CRITICAL

### OpenSSF Local Fallback
**Name:** `openssf-local-checks`

When the Scorecard API is unavailable, performs local equivalents: License presence, SECURITY.md presence, binary artifact scan, and recent commit activity check.

### OpenSSF Scorecard Caching
**Name:** N/A (utility module)

Caches Scorecard API responses locally with a 24-hour TTL. Stores historical scores for trend analysis over 7/30/90-day windows.

### Branch Protection Audit
**Name:** `branch-protection`
**Requires:** GitHub token

Queries GitHub API for branch protection settings on the default branch:
- Required pull request reviews
- Required status checks
- Force push restrictions
- Deletion protection
- Signed commit requirements

### Dependency Pinning (Package Managers)
**Name:** `dep-pinning-packages`

Scans package manager lockfiles and manifests for unpinned dependencies:
- `package.json` / `package-lock.json` (npm)
- `requirements.txt` / `Pipfile.lock` (Python)
- `Gemfile.lock` (Ruby)
- `go.sum` (Go)
- `Cargo.lock` (Rust)

### Dependency Pinning (Docker & Workflows)
**Name:** `dep-pinning-docker`

Scans for unpinned references in:
- Dockerfiles (`FROM` image tags)
- GitHub Actions workflows (action versions)

### Binary Artifact Detection
**Name:** `binary-artifacts`

Scans the repository for checked-in binary files that could harbor malicious content: `.exe`, `.dll`, `.so`, `.dylib`, `.jar`, `.war`, `.class`, `.pyc`, `.wasm`, etc.

### Token Permissions
**Name:** `token-permissions`

Analyzes GitHub Actions workflow files for overly permissive `GITHUB_TOKEN` permissions. Flags workflows that use `permissions: write-all` or lack explicit permission scoping.

---

## Governance Pillar (20%)

### License Detection
**Name:** `license-detection`

Detects LICENSE files (multiple naming variants), identifies SPDX license type via keyword matching, and falls back to `package.json` or `pyproject.toml` license fields.

### LICENSE Content Validation
**Name:** `license-content-validation`

Validates LICENSE file content against 12 SPDX license signature patterns. Reports match confidence: >= 75% PASS, < 75% WARNING, empty CRITICAL.

### SPDX License List
**Name:** N/A (utility module)

Reference data module with 50+ SPDX licenses including OSI/FSF approval flags and categories (permissive, copyleft-weak, copyleft-strong, public-domain).

### License Headers
**Name:** `license-headers`

Scans source files for `SPDX-License-Identifier:` headers in the first 30 lines. Cross-checks with root LICENSE file for consistency.

### Dependency License Scanning
**Name:** `dep-license-scanning`

Scans `node_modules` for dependency license info. Categorizes dependencies as permissive, copyleft, or unknown.

### License Compatibility
**Name:** `license-compatibility`

Checks dependency licenses against the project's own license using an SPDX compatibility matrix:
- CRITICAL: strong copyleft dependency in permissive project
- WARNING: weak copyleft dependency in permissive project

### Governance File Detection
**Name:** `governance-detection`

Detects governance-related files: GOVERNANCE.md, CONTRIBUTING.md, SECURITY.md, MAINTAINERS, OWNERS, CODEOWNERS, ROADMAP.md.

### Governance Model Classification
**Name:** `governance-classification`

Classifies governance model (BDFL, Meritocracy, Foundation-backed, Corporate, Community) by analyzing GOVERNANCE.md, CONTRIBUTING.md, and README.md for keyword patterns.

### Bus Factor Analysis
**Name:** `bus-factor`

Calculates bus factor from git commit history. Identifies the minimum number of contributors responsible for 50%+ of commits. Flags single-maintainer risk.

### Vendor Neutrality
**Name:** `vendor-neutrality`

Analyzes git log email domains to calculate vendor concentration. Flags:
- \>90% from one domain: CRITICAL
- \>70% from one domain: WARNING

### Asset Protection
**Name:** `asset-protection`

Detects trademark files, export control notices, CLA/DCO requirements. Classifies contribution friction level (Low/Medium/High/Very High).

---

## Community Pillar (15%)

### Response Time Collection
**Name:** `response-time`
**Requires:** GitHub token

Queries GitHub GraphQL API for issues/PRs created in the last 90 days. Calculates time-to-first-comment as the response metric.

### Bot Filtering
**Name:** N/A (utility module)

Filters bot comments from community metrics. Detects `[bot]` suffixes, `-bot` suffixes, known bot names (dependabot, codecov, renovate, etc.), and boilerplate content patterns.

### Response Time Classification
**Name:** `response-classification`
**Requires:** GitHub token

Calculates median, p90, p99 response times separately for issues and PRs:
- Healthy: median < 48 hours (PASS)
- Warning: median 48h - 7 days (WARNING)
- Critical: median > 7 days (CRITICAL)

Flags contributor friction when PR response time exceeds issue response time by >2x.

### Contributor Data Collection
**Name:** `contributor-data`

Parses `git log` for 12 months of contributor emails. Normalizes identities, counts commits per contributor, and analyzes email domain distribution.

### Contributor Funnel Analysis
**Name:** `contributor-funnel`

Classifies contributors into cohorts:
- Casual: 1-5 commits
- Regular: 6-50 commits
- Core: 50+ commits

Calculates conversion rates and flags "revolving door" when >80% are casual.

### Issue Closure Metrics
**Name:** `issue-closure`
**Requires:** GitHub token

Calculates closure ratio (closed / opened) over 90 days:
- Sustainable: >= 0.8 (PASS)
- Manageable: 0.5-0.8 (WARNING)
- Overwhelmed: < 0.5 (CRITICAL)

### Maintainer Burnout Detection
**Name:** `burnout-detection`
**Requires:** GitHub token

Combines signals for burnout risk:
- Median open issue age > 90 days
- Closure ratio < 0.5
- Zombie project: no release >180 days + low closure ratio

### Psychological Safety Artifacts
**Name:** `psych-safety`

Detects CODE_OF_CONDUCT.md, validates enforcement mechanisms, checks for all-contributors configuration and README contributor sections.

### Stale Bot Aggression Check
**Name:** `stale-bot`

Detects stale bot configurations and classifies aggression:
- Hostile: close < 14 days (CRITICAL)
- Aggressive: 14-29 days (WARNING)
- Reasonable: 30-60 days (PASS)
- Lenient: > 60 days (PASS)

### Support Channel Clarity
**Name:** `support-channels`

Detects SUPPORT.md and community channel links (Discord, Slack, GitHub Discussions, Stack Overflow, Matrix, Gitter).

### Funding Infrastructure
**Name:** `funding`

Detects .github/FUNDING.yml and parses platform keys (GitHub Sponsors, Patreon, Open Collective, Ko-fi, Tidelift). Checks README for sponsor badges.

---

## Inclusive Language Pillar (15%)

### Documentation Language Scanner
**Name:** `inclusive-doc-scanner`

Scans `.md`, `.txt`, `.rst` documentation files for non-inclusive terminology using the Inclusive Naming Initiative word list.

### Code Comment Scanner
**Name:** `inclusive-code-scanner`

Scans source code comments for non-inclusive terminology across multiple languages (JS, TS, Python, Java, Go, Rust, C/C++, Ruby, Shell).

### Diminishing Language Detection
**Name:** `diminishing-language`

Detects patronizing or diminishing language patterns in documentation: "just", "simply", "obviously", "trivially", "clearly", "of course", etc.

### Assumed Knowledge Detection
**Name:** `assumed-knowledge`

Detects assumptions about reader knowledge in documentation: unexplained acronyms, jargon without context, "as everyone knows", etc.

---

## Technical Rigor Pillar (10%)

### Release Cadence & Vitality
**Name:** `release-cadence`

Classifies project vitality from release history:
- Active: < 90 days since release (PASS)
- Stable: 90-365 days (INFO)
- Potentially dormant: 365-730 days (WARNING)
- Likely abandoned: > 730 days (CRITICAL)

Validates SemVer tag hygiene and detects pre-release-only projects.

### Interaction Template Validation
**Name:** `interaction-templates`

Detects issue and PR templates, validates YAML front matter, checks for required fields (name, description, labels), and assesses guidance quality.

---

## Severity Levels

All findings use a consistent severity scale:

| Severity | Value | Meaning |
|----------|-------|---------|
| PASS | -1 | Check passed, positive signal |
| INFO | 0 | Informational, no action needed |
| WARNING | 1 | Potential issue, improvement recommended |
| CRITICAL | 2 | Significant risk, action required |
