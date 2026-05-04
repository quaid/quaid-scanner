# AINative Studio OSS Portfolio Health Report

**Scanned:** 2026-05-04  |  **Tool:** quaid-scanner v0.1.0  |  **Depth:** quick  |  **Repos:** 27

---

## Executive Summary

quaid-scanner evaluated 27 public AINative Studio repositories across six weighted pillars: Security (25%), Governance (20%), Community (15%), AI Readiness (15%), Inclusive Language (15%), and Technical Rigor (10%).

### Key Findings

- **All 27 repos rated CRITICAL risk** except `crewai-zerodb` (HIGH). Scores range from 1.4 (`zerodb-local`) to 4.0 (`crewai-zerodb`).
- **Community = 0 across every repo.** Single-vendor commit history, no support channels, no contributor ladder, and no psychological safety documentation are universal gaps.
- **Security = 0 on 20 of 27 repos.** No OpenSSF Scorecard integration, loosely-pinned dependencies, and missing branch protection signals dominate.
- **Governance = 0–1 on nearly every repo.** No license headers, vendor neutrality flags (single-organization contributors), and missing CLA/DCO are consistent.
- **AI Readiness is uniformly strong (7–8).** Expected for an AI-native org.
- **Inclusive Language** scores are mixed. Many low scores are driven by technical terms (`abort`, `whitelist`, `blacklist`, `master`) used in legitimate programming contexts — these are likely false positives requiring context-aware scanner improvements (issue #63).

### Top Portfolio-Wide Remediation Priorities

| Priority | Action | Repos Affected |
|----------|--------|----------------|
| 1 | Add `LICENSE` file and SPDX headers to all source files | 27/27 |
| 2 | Enable OpenSSF Scorecard via GitHub Actions | 27/27 |
| 3 | Pin all dependencies (lock files, exact versions) | ~22/27 |
| 4 | Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md` | 27/27 |
| 5 | Add GitHub branch protection rules (require PR review, status checks) | 27/27 |
| 6 | Add test suite with coverage configuration | ~20/27 |
| 7 | Review and replace non-inclusive terms in code/docs | ~15/27 |
| 8 | Add `FUNDING.yml` or link to sponsorship | 27/27 |

---

## Portfolio Score Summary

| Repo | Score | Risk | sec | gov | com | ai | inc | tec |
|------|------:|------|----:|----:|----:|---:|----:|----:|
| `ainative-zerodb-mcp-server` | 1.6 | CRITICAL | 0 | 0 | 0 | 7.5 | 0 | 5 |
| `ainative-zerodb-memory-mcp` | 1.8 | CRITICAL | 0 | 1 | 0 | 7.5 | 0.5 | 4 |
| `ainative-strapi-mcp-server` | 3.5 | CRITICAL | 3.5 | 1 | 0 | 7.5 | 6 | 4 |
| `agentic-rules` | 3 | CRITICAL | 6 | 1 | 0 | 6.5 | 0 | 3 |
| `shadcn-ui-mcp-server` | 1.6 | CRITICAL | 0 | 1 | 0 | 7.5 | 0 | 3 |
| `mcp-l-core` | 2.2 | CRITICAL | 0 | 1 | 0 | 7.5 | 1.5 | 6.5 |
| `zerodb-typescript-sdk` | 2 | CRITICAL | 0 | 1 | 0 | 7.5 | 0.5 | 6 |
| `zerodb-python-sdk` | 2.3 | CRITICAL | 2 | 1 | 0 | 7.5 | 0 | 5 |
| `zerodb-supabase-adapter` | 3 | CRITICAL | 0 | 0 | 0 | 7.5 | 8 | 6.5 |
| `zerodb-vercel-integration` | 2.4 | CRITICAL | 0 | 0 | 0 | 7.5 | 5 | 5.5 |
| `crewai-zerodb` | 4 | HIGH | 6 | 1 | 0 | 7.5 | 6 | 3 |
| `zerodb-local` | 1.4 | CRITICAL | 0 | 1 | 0 | 4.5 | 0 | 5 |
| `zerodb-cli` | 2.2 | CRITICAL | 0 | 1 | 0 | 7.5 | 3 | 4 |
| `zerodb-nextjs-template` | 2.3 | CRITICAL | 0 | 0 | 0 | 7.5 | 5.5 | 3 |
| `zerodb-claude-plugin` | 1.9 | CRITICAL | 0 | 0 | 0 | 7.5 | 2.5 | 4 |
| `ai-kit` | 1.9 | CRITICAL | 0 | 0 | 0 | 7.5 | 0 | 8 |
| `ai-kit-a2ui` | 2 | CRITICAL | 0 | 1 | 0 | 8 | 0 | 6 |
| `ai-kit-showcase` | 2.4 | CRITICAL | 0 | 0 | 0 | 7.5 | 6.5 | 3 |
| `ainative-sdks` | 3.7 | CRITICAL | 3 | 0 | 0 | 7.5 | 10 | 3 |
| `Agent-402` | 2.4 | CRITICAL | 6 | 0 | 0 | 3.5 | 0 | 4 |
| `ragbot-starter` | 1.7 | CRITICAL | 0 | 0 | 0 | 8 | 0 | 5 |
| `cody-sdk-typescript` | 2 | CRITICAL | 0 | 1 | 0 | 7.5 | 0 | 6.5 |
| `builder-ainative-studio` | 1.6 | CRITICAL | 0 | 0 | 0 | 7.5 | 0 | 5 |
| `AINativeStudio-IDE` | 1.5 | CRITICAL | 0 | 1 | 0 | 6.5 | 0 | 3 |
| `ainative-code` | 1.6 | CRITICAL | 0 | 0.5 | 0 | 5 | 0 | 7 |
| `ainative-jetbrains` | 3.6 | CRITICAL | 3 | 0 | 0 | 7.5 | 9.5 | 3 |
| `ainative-neovim` | 3.6 | CRITICAL | 3 | 0 | 0 | 7.5 | 9.5 | 3 |

> **Pillar weights:** Security 25% · Governance 20% · Community 15% · AI Readiness 15% · Inclusive 15% · Technical 10%

---

## Per-Repository Analysis

### `AINative-Studio/ainative-zerodb-mcp-server`

**Language:** JavaScript  |  **Description:** MCP server for ZeroDB  |  **Score:** 1.6/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 856ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 5 | `█████░░░░░` |

#### Critical Findings

- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (13): Loosely pinned dependency "@modelcontextprotocol/sdk": "^1.24.0" uses ^ prefix in dependen
  - _Suggestion: Consider pinning "@modelcontextprotocol/sdk" to an exact version for reproducibl_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`openssf-scorecard`** (1): OpenSSF Scorecard unavailable for AINative-Studio/ainative-zerodb-mcp-server (HTTP 404)
  - _Suggestion: Ensure the repository is public and indexed by the Scorecard project_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
- **`test-coverage`** (1): No coverage configuration file found
  - _Suggestion: Add a coverage configuration (e.g., vitest.config.ts with coverage thresholds, j_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
3. Consider pinning "@modelcontextprotocol/sdk" to an exact version for reproducible builds _(impact: medium, effort: low)_
4. Ensure the repository is public and indexed by the Scorecard project _(impact: medium, effort: low)_
5. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
6. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_

---

### `AINative-Studio/ainative-zerodb-memory-mcp`

**Language:** JavaScript  |  **Description:** Lightweight memory MCP  |  **Score:** 1.8/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 812ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 0.5 | `░░░░░░░░░░` |
| Technical | 4 | `████░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `issue-closure`: Closure ratio: 0.00 (0 closed / 1 opened in 90 days)
  - _Suggestion: Team is overwhelmed — intervention needed to prevent maintainer burnout_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (6): Loosely pinned dependency "@modelcontextprotocol/sdk": "^0.5.0" uses ^ prefix in dependenc
  - _Suggestion: Consider pinning "@modelcontextprotocol/sdk" to an exact version for reproducibl_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`burnout-detection`** (1): Issue closure ratio: 0.00 (0/1)
  - _Suggestion: Low closure ratio indicates capacity issues_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
  - _…and 2 additional warning categories_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Team is overwhelmed — intervention needed to prevent maintainer burnout _(impact: high, effort: medium)_
3. Consider pinning "@modelcontextprotocol/sdk" to an exact version for reproducible builds _(impact: medium, effort: low)_
4. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
5. Low closure ratio indicates capacity issues _(impact: medium, effort: low)_
6. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_

---

### `AINative-Studio/ainative-strapi-mcp-server`

**Language:** JavaScript  |  **Description:** Strapi CMS MCP server  |  **Score:** 3.5/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 779ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 3.5 | `███░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 6 | `██████░░░░` |
| Technical | 4 | `████░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (2): Loosely pinned dependency "@modelcontextprotocol/sdk": "^1.24.3" uses ^ prefix in dependen
  - _Suggestion: Consider pinning "@modelcontextprotocol/sdk" to an exact version for reproducibl_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`burnout-detection`** (2): Median open issue age: 97 days (5 open issues)
  - _Suggestion: Open issues are aging — maintainers may be struggling to keep up_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
3. Consider pinning "@modelcontextprotocol/sdk" to an exact version for reproducible builds _(impact: medium, effort: low)_
4. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
5. Open issues are aging — maintainers may be struggling to keep up _(impact: medium, effort: low)_
6. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_

---

### `AINative-Studio/agentic-rules`

**Language:** Shell  |  **Description:** Rule sets for agentic IDEs  |  **Score:** 3/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 849ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 6 | `██████░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 6.5 | `██████░░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`burnout-detection`** (2): Median open issue age: 206 days (1 open issues)
  - _Suggestion: Open issues are aging — maintainers may be struggling to keep up_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`diminishing-language`** (2): Found diminishing language "obvious" in documentation
  - _Suggestion: Remove "obvious/obviously" — if it were truly obvious, it would not need to be s_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`claude-md-structure`** (1): CLAUDE.md lacks recognized structural sections
  - _Suggestion: Add sections like "Critical Rules", "Project Structure", "Common Tasks" to impro_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
  - _…and 1 additional warning categories_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
3. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
4. Open issues are aging — maintainers may be struggling to keep up _(impact: medium, effort: low)_
5. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
6. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_

---

### `AINative-Studio/shadcn-ui-mcp-server`

**Language:** —  |  **Description:** shadcn/ui MCP server  |  **Score:** 1.6/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 674ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/greetings.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/greetings.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/label.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/label.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by github-noreply (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (12): Action "actions/first-interaction" uses major-only version "@v1" in ".github/workflows/gre
  - _Suggestion: Consider pinning to a full semver (e.g., @v1.0.0) or SHA for better reproducibil_
- **`token-permissions`** (3): Job "greeting" in ".github/workflows/greetings.yml" overrides "issues: write" at job level
  - _Suggestion: Review if "issues: write" is necessary for job "greeting"_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
  - _…and 1 additional warning categories_

#### Recommendations

1. Add a "permissions:" block with minimal required permissions _(impact: high, effort: medium)_
2. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
3. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
4. Consider pinning to a full semver (e.g., @v1.0.0) or SHA for better reproducibility _(impact: medium, effort: low)_
5. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
6. Review if "issues: write" is necessary for job "greeting" _(impact: medium, effort: low)_

---

### `AINative-Studio/mcp-l-core`

**Language:** JavaScript  |  **Description:** Listening Protocol core  |  **Score:** 2.2/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 823ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 1.5 | `█░░░░░░░░░` |
| Technical | 6.5 | `██████░░░░` |

#### Critical Findings

- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (7): Loosely pinned dependency "ajv": "^8.12.0" uses ^ prefix in dependencies
  - _Suggestion: Consider pinning "ajv" to an exact version for reproducible builds_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`burnout-detection`** (1): Median open issue age: 328 days (3 open issues)
  - _Suggestion: Open issues are aging — maintainers may be struggling to keep up_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Consider pinning "ajv" to an exact version for reproducible builds _(impact: medium, effort: low)_
3. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
4. Open issues are aging — maintainers may be struggling to keep up _(impact: medium, effort: low)_
5. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
6. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_

---

### `AINative-Studio/zerodb-typescript-sdk`

**Language:** TypeScript  |  **Description:** ZeroDB TypeScript SDK  |  **Score:** 2/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 713ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 0.5 | `░░░░░░░░░░` |
| Technical | 6 | `██████░░░░` |

#### Critical Findings

- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (20): Loosely pinned dependency "axios": "^1.7.9" uses ^ prefix in dependencies
  - _Suggestion: Consider pinning "axios" to an exact version for reproducible builds_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Consider pinning "axios" to an exact version for reproducible builds _(impact: medium, effort: low)_
3. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
4. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
5. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_
6. Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/ _(impact: medium, effort: low)_

---

### `AINative-Studio/zerodb-python-sdk`

**Language:** Python  |  **Description:** ZeroDB Python SDK  |  **Score:** 2.3/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 745ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 2 | `██░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 5 | `█████░░░░░` |

#### Critical Findings

- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (3): Loosely pinned Python dependency "httpx" in requirements.txt
  - _Suggestion: Pin "httpx" with == (e.g., "httpx==x.y.z")_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
- **`test-coverage`** (1): No coverage configuration file found
  - _Suggestion: Add a coverage configuration (e.g., vitest.config.ts with coverage thresholds, j_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Pin "httpx" with == (e.g., "httpx==x.y.z") _(impact: medium, effort: low)_
3. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
4. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
5. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_
6. Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/ _(impact: medium, effort: low)_

---

### `AINative-Studio/zerodb-supabase-adapter`

**Language:** TypeScript  |  **Description:** Supabase adapter for ZeroDB  |  **Score:** 3/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 625ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 8 | `████████░░` |
| Technical | 6.5 | `██████░░░░` |

#### Critical Findings

- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (7): Loosely pinned dependency "typescript": "^5.0.0" uses ^ prefix in devDependencies
  - _Suggestion: Consider pinning "typescript" to an exact version for reproducible builds_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
3. Consider pinning "typescript" to an exact version for reproducible builds _(impact: medium, effort: low)_
4. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
5. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
6. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_

---

### `AINative-Studio/zerodb-vercel-integration`

**Language:** TypeScript  |  **Description:** Vercel integration for ZeroDB  |  **Score:** 2.4/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 618ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 5 | `█████░░░░░` |
| Technical | 5.5 | `█████░░░░░` |

#### Critical Findings

- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (9): Loosely pinned dependency "next": "^14.0.0" uses ^ prefix in dependencies
  - _Suggestion: Consider pinning "next" to an exact version for reproducible builds_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
  - _…and 1 additional warning categories_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
3. Consider pinning "next" to an exact version for reproducible builds _(impact: medium, effort: low)_
4. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
5. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
6. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_

---

### `AINative-Studio/crewai-zerodb`

**Language:** Python  |  **Description:** ZeroDB integration for CrewAI  |  **Score:** 4/10  |  **Risk:** HIGH  |  **Maturity:** sandbox  |  **Scan time:** 644ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 6 | `██████░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 6 | `██████░░░░` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
- **`linting`** (1): No linter configuration found
  - _Suggestion: Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to r_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
3. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
4. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
5. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_
6. Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/ _(impact: medium, effort: low)_

---

### `AINative-Studio/zerodb-local`

**Language:** Python  |  **Description:** Self-hosted ZeroDB runtime  |  **Score:** 1.4/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 900ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 4.5 | `████░░░░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 5 | `█████░░░░░` |

#### Critical Findings

- **[CRITICAL]** `model-card-scoring`: Model card critically incomplete: 24% — add required sections: Model Description, Limitations _(in `README.md`)_
  - _Suggestion: Improve model card in README.md by adding missing sections._
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/ci.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/ci.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/publish.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/publish.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/tauri.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/tauri.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `inclusive-naming/language`: 11 occurrences of likely-technical terms (`abort` ×9, `master` ×2). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`dependency-pinning`** (21): Docker base image "python:3.11-slim" uses tag without digest
  - _Suggestion: Pin with digest: python:3.11-slim@sha256:<hash>_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`token-permissions`** (2): Job "release" in ".github/workflows/publish.yml" overrides "contents: write" at job level
  - _Suggestion: Review if "contents: write" is necessary for job "release"_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`model-card-sections`** (1): Model card missing required sections: Model Description, Limitations
  - _Suggestion: Add missing sections to README.md: Model Description, Limitations_
- **`linting`** (1): No linter configuration found
  - _Suggestion: Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to r_
  - _…and 1 additional warning categories_

#### Recommendations

1. Add a "permissions:" block with minimal required permissions _(impact: high, effort: medium)_
2. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
3. Improve model card in README.md by adding missing sections. _(impact: high, effort: medium)_
4. Consider using: cancel, terminate, stop, halt _(impact: high, effort: medium)_
5. Replace "Master" with one of: main, primary, source, original _(impact: high, effort: medium)_
6. Replace "abort" with one of: cancel, terminate, stop, halt _(impact: high, effort: medium)_

---

### `AINative-Studio/zerodb-cli`

**Language:** Python  |  **Description:** ZeroDB local CLI  |  **Score:** 2.2/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 712ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 3 | `███░░░░░░░` |
| Technical | 4 | `████░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `inclusive-naming/language`: 1 occurrences of likely-technical terms (`abort` ×1). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`dependency-pinning`** (6): Loosely pinned Python dependency "typer" in requirements.txt
  - _Suggestion: Pin "typer" with == (e.g., "typer==x.y.z")_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
- **`linting`** (1): No linter configuration found
  - _Suggestion: Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to r_
  - _…and 1 additional warning categories_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Consider using: cancel, terminate, stop, halt _(impact: high, effort: medium)_
3. Pin "typer" with == (e.g., "typer==x.y.z") _(impact: medium, effort: low)_
4. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
5. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
6. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_

---

### `AINative-Studio/zerodb-nextjs-template`

**Language:** TypeScript  |  **Description:** Next.js + ZeroDB starter  |  **Score:** 2.3/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 665ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 5.5 | `█████░░░░░` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `license`: No license detected. Without a license, the project is under exclusive copyright by default.
  - _Suggestion: Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance._
- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (18): Loosely pinned dependency "react": "^18.3.1" uses ^ prefix in dependencies
  - _Suggestion: Consider pinning "react" to an exact version for reproducible builds_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
  - _…and 1 additional warning categories_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance. _(impact: high, effort: medium)_
3. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
4. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
5. Consider pinning "react" to an exact version for reproducible builds _(impact: medium, effort: low)_
6. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_

---

### `AINative-Studio/zerodb-claude-plugin`

**Language:** Python  |  **Description:** Claude Code persistent memory plugin  |  **Score:** 1.9/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 949ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 2.5 | `██░░░░░░░░` |
| Technical | 4 | `████░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `license`: No license detected. Without a license, the project is under exclusive copyright by default.
  - _Suggestion: Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance._
- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/ci.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/ci.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `inclusive-naming/language`: 2 occurrences of likely-technical terms (`master` ×1, `abort` ×1). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`dependency-pinning`** (5): Action "actions/checkout" uses major-only version "@v4" in ".github/workflows/ci.yml"
  - _Suggestion: Consider pinning to a full semver (e.g., @v4.0.0) or SHA for better reproducibil_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`diminishing-language`** (1): Found diminishing language "obvious" in documentation
  - _Suggestion: Remove "obvious/obviously" — if it were truly obvious, it would not need to be s_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
  - _…and 2 additional warning categories_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Add a "permissions:" block with minimal required permissions _(impact: high, effort: medium)_
3. Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance. _(impact: high, effort: medium)_
4. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
5. Replace "master" with one of: main, primary, source, original _(impact: high, effort: medium)_
6. Replace "abort" with one of: cancel, terminate, stop, halt _(impact: high, effort: medium)_

---

### `AINative-Studio/ai-kit`

**Language:** TypeScript  |  **Description:** Framework-agnostic LLM SDK  |  **Score:** 1.9/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 1904ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 8 | `████████░░` |

#### Critical Findings

- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `welcoming-score`: Welcoming score: 41/100 (5 warnings, 44 info)
  - _Suggestion: Review flagged diminishing language to make documentation more welcoming to all skill levels._
- **[CRITICAL]** `inclusive-naming/language`: 72 occurrences of likely-technical terms (`abort` ×51, `master` ×9, `whitelist` ×8, `blacklist` ×4). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`dependency-pinning`** (26): Loosely pinned dependency "@changesets/cli": "^2.27.1" uses ^ prefix in devDependencies
  - _Suggestion: Consider pinning "@changesets/cli" to an exact version for reproducible builds_
- **`diminishing-language`** (5): Found diminishing language "obvious" in documentation
  - _Suggestion: Remove "obvious/obviously" — if it were truly obvious, it would not need to be s_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`openssf-scorecard`** (1): OpenSSF Scorecard unavailable for AINative-Studio/ai-kit (HTTP 404)
  - _Suggestion: Ensure the repository is public and indexed by the Scorecard project_
- **`governance`** (1): Unclear governance model — best guess is "Meritocracy" with low confidence (38%)
  - _Suggestion: Document the governance model explicitly in GOVERNANCE.md for clarity_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Review flagged diminishing language to make documentation more welcoming to all skill levels. _(impact: high, effort: medium)_
3. Consider using: cancel, terminate, stop, halt _(impact: high, effort: medium)_
4. Consider using: main, primary, source, original _(impact: high, effort: medium)_
5. Consider using: allowlist, approved list, safe list _(impact: high, effort: medium)_
6. Consider using: blocklist, denylist, banned list _(impact: high, effort: medium)_

---

### `AINative-Studio/ai-kit-a2ui`

**Language:** TypeScript  |  **Description:** A2UI renderer for React + ShadCN  |  **Score:** 2/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 731ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 8 | `████████░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 6 | `██████░░░░` |

#### Critical Findings

- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (34): Loosely pinned dependency "@radix-ui/react-checkbox": "^1.0.4" uses ^ prefix in dependenci
  - _Suggestion: Consider pinning "@radix-ui/react-checkbox" to an exact version for reproducible_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`burnout-detection`** (2): Median open issue age: 131 days (14 open issues)
  - _Suggestion: Open issues are aging — maintainers may be struggling to keep up_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Consider pinning "@radix-ui/react-checkbox" to an exact version for reproducible builds _(impact: medium, effort: low)_
3. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
4. Open issues are aging — maintainers may be struggling to keep up _(impact: medium, effort: low)_
5. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_
6. Low casual-to-regular conversion suggests contributor onboarding friction _(impact: medium, effort: low)_

---

### `AINative-Studio/ai-kit-showcase`

**Language:** TypeScript  |  **Description:** AI Kit interactive demo  |  **Score:** 2.4/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 1014ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 6.5 | `██████░░░░` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `license`: No license detected. Without a license, the project is under exclusive copyright by default.
  - _Suggestion: Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance._
- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (27): Loosely pinned dependency "@ainative/ai-kit": "^0.1.0-alpha.4" uses ^ prefix in dependenci
  - _Suggestion: Consider pinning "@ainative/ai-kit" to an exact version for reproducible builds_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`issue-closure`** (1): Closure ratio: 0.67 (2 closed / 3 opened in 90 days)
  - _Suggestion: Backlog growing — consider adding maintainers or triaging more aggressively_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
  - _…and 2 additional warning categories_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance. _(impact: high, effort: medium)_
3. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
4. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
5. Consider pinning "@ainative/ai-kit" to an exact version for reproducible builds _(impact: medium, effort: low)_
6. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_

---

### `AINative-Studio/ainative-sdks`

**Language:** TypeScript  |  **Description:** Official AINative Studio SDKs  |  **Score:** 3.7/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 657ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 3 | `███░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 10 | `██████████` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `license`: No license detected. Without a license, the project is under exclusive copyright by default.
  - _Suggestion: Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance._
- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
- **`linting`** (1): No linter configuration found
  - _Suggestion: Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to r_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance. _(impact: high, effort: medium)_
3. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
4. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
5. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
6. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_

---

### `AINative-Studio/Agent-402`

**Language:** Python  |  **Description:** Autonomous fintech agent crew  |  **Score:** 2.4/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 1779ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 6 | `██████░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 3.5 | `███░░░░░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 4 | `████░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `model-card-scoring`: Model card critically incomplete: 10% — add required sections: Model Description, Intended Use, Limitations _(in `README.md`)_
  - _Suggestion: Improve model card in README.md by adding missing sections._
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `welcoming-score`: Welcoming score: 55/100 (1 warnings, 42 info)
  - _Suggestion: Review flagged diminishing language to make documentation more welcoming to all skill levels._
- **[CRITICAL]** `inclusive-naming/language`: 19 occurrences of likely-technical terms (`abort` ×8, `master` ×7, `whitelist` ×4). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`inclusive-naming`** (2): Non-inclusive term "sanity check" found in code comment
  - _Suggestion: Consider using: confidence check, validity check, coherence check_
- **`inclusive-language`** (2): Non-inclusive term "sanity check" found. Consider using: confidence check, validity check,
  - _Suggestion: Replace "sanity check" with one of: confidence check, validity check, coherence _
- **`governance`** (1): Unclear governance model — best guess is "Foundation-backed" with low confidence (32%)
  - _Suggestion: Document the governance model explicitly in GOVERNANCE.md for clarity_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`claude-md-structure`** (1): CLAUDE.md lacks recognized structural sections
  - _Suggestion: Add sections like "Critical Rules", "Project Structure", "Common Tasks" to impro_
  - _…and 5 additional warning categories_

#### Recommendations

1. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
2. Improve model card in README.md by adding missing sections. _(impact: high, effort: medium)_
3. Review flagged diminishing language to make documentation more welcoming to all skill levels. _(impact: high, effort: medium)_
4. Consider using: cancel, terminate, stop, halt _(impact: high, effort: medium)_
5. Replace "Whitelist" with one of: allowlist, approved list, safe list _(impact: high, effort: medium)_
6. Replace "master" with one of: main, primary, source, original _(impact: high, effort: medium)_

---

### `AINative-Studio/ragbot-starter`

**Language:** TypeScript  |  **Description:** Production RAG chatbot starter  |  **Score:** 1.7/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 949ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 8 | `████████░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 5 | `█████░░░░░` |

#### Critical Findings

- **[CRITICAL]** `license`: No license detected. Without a license, the project is under exclusive copyright by default.
  - _Suggestion: Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance._
- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`dependency-pinning`** (33): Loosely pinned dependency "@ainative/sdk": "^1.0.2" uses ^ prefix in dependencies
  - _Suggestion: Consider pinning "@ainative/sdk" to an exact version for reproducible builds_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`binary-artifacts`** (1): Binary artifact detected: "Bank-Gothic-Font.zip" (186.6KB, detected by magic bytes (ZIP/JA
  - _Suggestion: Remove binary files from the source tree. Use a package manager or artifact repo_
- **`governance`** (1): Unclear governance model — best guess is "Corporate" with low confidence (38%)
  - _Suggestion: Document the governance model explicitly in GOVERNANCE.md for clarity_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`burnout-detection`** (1): Median open issue age: 155 days (1 open issues)
  - _Suggestion: Open issues are aging — maintainers may be struggling to keep up_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
  - _…and 4 additional warning categories_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance. _(impact: high, effort: medium)_
3. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
4. Remove binary files from the source tree. Use a package manager or artifact repository instead. _(impact: medium, effort: low)_
5. Consider pinning "@ainative/sdk" to an exact version for reproducible builds _(impact: medium, effort: low)_
6. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_

---

### `AINative-Studio/cody-sdk-typescript`

**Language:** TypeScript  |  **Description:** Cody TypeScript SDK  |  **Score:** 2/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 1409ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 6.5 | `██████░░░░` |

#### Critical Findings

- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/ci.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/ci.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/claude.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/claude.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/create-releases.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/create-releases.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/detect-breaking-changes.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/detect-breaking-changes.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/publish-npm.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/publish-npm.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
  - _…and 1 more `token-permissions` findings_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `inclusive-naming/language`: 48 occurrences of likely-technical terms (`abort` ×48). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`dependency-pinning`** (38): Action "actions/checkout" uses major-only version "@v6" in ".github/workflows/ci.yml"
  - _Suggestion: Consider pinning to a full semver (e.g., @v6.0.0) or SHA for better reproducibil_
- **`token-permissions`** (2): Job "build" in ".github/workflows/ci.yml" overrides "id-token: write" at job level
  - _Suggestion: Review if "id-token: write" is necessary for job "build"_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`openssf-scorecard`** (1): OpenSSF Scorecard unavailable for AINative-Studio/cody-sdk-typescript (HTTP 404)
  - _Suggestion: Ensure the repository is public and indexed by the Scorecard project_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`missing-prerequisites`** (1): README.md contains tool commands but no Prerequisites or Requirements section
  - _Suggestion: Consider adding a Prerequisites section listing required tools and versions_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_

#### Recommendations

1. Add a "permissions:" block with minimal required permissions _(impact: high, effort: medium)_
2. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
3. Consider using: cancel, terminate, stop, halt _(impact: high, effort: medium)_
4. Replace "abort" with one of: cancel, terminate, stop, halt _(impact: high, effort: medium)_
5. Replace "Aborts" with one of: cancel, terminate, stop, halt _(impact: high, effort: medium)_
6. Replace "aborted" with one of: cancel, terminate, stop, halt _(impact: high, effort: medium)_

---

### `AINative-Studio/builder-ainative-studio`

**Language:** TypeScript  |  **Description:** AI-powered React component builder  |  **Score:** 1.6/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 1188ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 5 | `█████░░░░░` |

#### Critical Findings

- **[CRITICAL]** `license`: No license detected. Without a license, the project is under exclusive copyright by default.
  - _Suggestion: Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance._
- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `inclusive-naming/language`: 8 occurrences of likely-technical terms (`master` ×3, `abort` ×3, `whitelist` ×2). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`dependency-pinning`** (89): Loosely pinned dependency "@ai-sdk/openai": "^2.0.0" uses ^ prefix in dependencies
  - _Suggestion: Consider pinning "@ai-sdk/openai" to an exact version for reproducible builds_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`issue-closure`** (1): Closure ratio: 0.68 (25 closed / 37 opened in 90 days)
  - _Suggestion: Backlog growing — consider adding maintainers or triaging more aggressively_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
  - _…and 1 additional warning categories_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance. _(impact: high, effort: medium)_
3. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
4. Consider using: main, primary, source, original _(impact: high, effort: medium)_
5. Consider using: cancel, terminate, stop, halt _(impact: high, effort: medium)_
6. Replace "whitelist" with one of: allowlist, approved list, safe list _(impact: high, effort: medium)_

---

### `AINative-Studio/AINativeStudio-IDE`

**Language:** TypeScript  |  **Description:** AI-native code editor  |  **Score:** 1.5/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 9875ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 1 | `█░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 6.5 | `██████░░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/build-linux-arm.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/build-linux-arm.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/build-linux-arm64.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/build-linux-arm64.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/build-macos-arm64-signed-checked.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/build-macos-arm64-signed-checked.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/build-macos-x64-signed.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/build-macos-x64-signed.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
- **[CRITICAL]** `token-permissions`: Workflow ".github/workflows/build-windows-arm64-signed.yml" has no top-level permissions block (inherits default read-write) _(in `.github/workflows/build-windows-arm64-signed.yml`)_
  - _Suggestion: Add a "permissions:" block with minimal required permissions_
  - _…and 5 more `token-permissions` findings_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by github-noreply (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `inclusive-naming/language`: 638 occurrences of likely-technical terms (`abort` ×424, `master` ×147, `blacklist` ×39, `whitelist` ×28). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`dependency-pinning`** (140): Docker base image "mcr.microsoft.com/devcontainers/base:ubuntu" uses tag without digest
  - _Suggestion: Pin with digest: mcr.microsoft.com/devcontainers/base:ubuntu@sha256:<hash>_
- **`inclusive-naming`** (66): Non-inclusive term "sanity check" found in string literal
  - _Suggestion: Consider using: confidence check, validity check, coherence check_
- **`openssf-scorecard`** (3): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`token-permissions`** (2): Workflow ".github/workflows/build-remote-servers.yml" grants "contents: write" permission
  - _Suggestion: Review if "contents: write" is necessary. Use "read" if possible_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`diminishing-language`** (2): Found diminishing language "just use" in documentation
  - _Suggestion: Remove "just" — it implies the task is trivial and can discourage readers who fi_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
  - _…and 4 additional warning categories_

#### Recommendations

1. Add a "permissions:" block with minimal required permissions _(impact: high, effort: medium)_
2. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
3. Consider using: cancel, terminate, stop, halt _(impact: high, effort: medium)_
4. Consider using: main, primary, source, original _(impact: high, effort: medium)_
5. Consider using: allowlist, approved list, safe list _(impact: high, effort: medium)_
6. Consider using: blocklist, denylist, banned list _(impact: high, effort: medium)_

---

### `AINative-Studio/ainative-code`

**Language:** Go  |  **Description:** AI-native development CLI  |  **Score:** 1.6/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 1749ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 0 | `░░░░░░░░░░` |
| Governance | 0.5 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 5 | `█████░░░░░` |
| Inclusive | 0 | `░░░░░░░░░░` |
| Technical | 7 | `███████░░░` |

#### Critical Findings

- **[CRITICAL]** `dependency-pinning`: Docker base image uses ":latest" tag: "alpine:latest" _(in `Dockerfile`, line 39)_
  - _Suggestion: Pin to a specific version tag or use @sha256: digest_
- **[CRITICAL]** `model-card-scoring`: Model card critically incomplete: 5% — add required sections: Model Description, Intended Use, Limitations _(in `README.md`)_
  - _Suggestion: Improve model card in README.md by adding missing sections._
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by ainative.studio (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_
- **[CRITICAL]** `welcoming-score`: Welcoming score: 25/100 (5 warnings, 60 info)
  - _Suggestion: Review flagged diminishing language to make documentation more welcoming to all skill levels._
- **[CRITICAL]** `inclusive-naming/language`: 95 occurrences of likely-technical terms (`whitelist` ×61, `blacklist` ×15, `master` ×13, `abort` ×6). Review context — many may be legitimate uses of `abort()`, Git `master`, allow/deny lists. See issue [#63](https://github.com/quaid/quaid-scanner/issues/63).

#### Warning Findings

- **`diminishing-language`** (5): Found diminishing language "obvious" in documentation
  - _Suggestion: Remove "obvious/obviously" — if it were truly obvious, it would not need to be s_
- **`dependency-pinning`** (4): Docker base image "golang:1.21-alpine" uses tag without digest
  - _Suggestion: Pin with digest: golang:1.21-alpine@sha256:<hash>_
- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`token-permissions`** (2): Workflow ".github/workflows/release.yml" grants "contents: write" permission
  - _Suggestion: Review if "contents: write" is necessary. Use "read" if possible_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`governance`** (1): Unclear governance model — best guess is "Meritocracy" with low confidence (38%)
  - _Suggestion: Document the governance model explicitly in GOVERNANCE.md for clarity_
- **`burnout-detection`** (1): Median open issue age: 106 days (7 open issues)
  - _Suggestion: Open issues are aging — maintainers may be struggling to keep up_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
  - _…and 3 additional warning categories_

#### Recommendations

1. Pin to a specific version tag or use @sha256: digest _(impact: high, effort: medium)_
2. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
3. Improve model card in README.md by adding missing sections. _(impact: high, effort: medium)_
4. Review flagged diminishing language to make documentation more welcoming to all skill levels. _(impact: high, effort: medium)_
5. Consider using: allowlist, approved list, safe list _(impact: high, effort: medium)_
6. Consider using: blocklist, denylist, banned list _(impact: high, effort: medium)_

---

### `AINative-Studio/ainative-jetbrains`

**Language:** —  |  **Description:** JetBrains/IntelliJ plugin  |  **Score:** 3.6/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 610ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 3 | `███░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 9.5 | `█████████░` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `license`: No license detected. Without a license, the project is under exclusive copyright by default.
  - _Suggestion: Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance._
- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
- **`linting`** (1): No linter configuration found
  - _Suggestion: Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to r_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance. _(impact: high, effort: medium)_
3. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
4. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
5. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
6. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_

---

### `AINative-Studio/ainative-neovim`

**Language:** —  |  **Description:** Neovim plugin  |  **Score:** 3.6/10  |  **Risk:** CRITICAL  |  **Maturity:** sandbox  |  **Scan time:** 706ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security | 3 | `███░░░░░░░` |
| Governance | 0 | `░░░░░░░░░░` |
| Community | 0 | `░░░░░░░░░░` |
| AI Readiness | 7.5 | `███████░░░` |
| Inclusive | 9.5 | `█████████░` |
| Technical | 3 | `███░░░░░░░` |

#### Critical Findings

- **[CRITICAL]** `license`: No license detected. Without a license, the project is under exclusive copyright by default.
  - _Suggestion: Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance._
- **[CRITICAL]** `openssf-scorecard`: License check: No LICENSE file found
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **[CRITICAL]** `test-coverage`: No test files detected in the repository
  - _Suggestion: Add a test suite to improve code reliability and enable coverage tracking_
- **[CRITICAL]** `vendor-neutrality`: Project is dominated by gmail.com (100% of commits)
  - _Suggestion: Diversify contributors across multiple organizations to reduce single-vendor risk_

#### Warning Findings

- **`openssf-scorecard`** (2): Security-Policy check: No SECURITY.md file found
  - _Suggestion: Add a SECURITY.md file with vulnerability reporting instructions_
- **`error`** (2): Scanner "response-classification" failed: Cannot read properties of undefined (reading 're
  - _Suggestion: Check scanner implementation for errors_
- **`license-validation`** (1): No LICENSE file found in repository root
  - _Suggestion: Add a LICENSE file with a recognized open source license_
- **`contributor-data`** (1): 1 unique contributor with 1 commits in the last 12 months
  - _Suggestion: Single contributor detected — consider recruiting additional maintainers_
- **`contributor-funnel`** (1): Conversion rates: casual→regular 0%, regular→core 0%
  - _Suggestion: Low casual-to-regular conversion suggests contributor onboarding friction_
- **`psych-safety`** (1): No Code of Conduct found
  - _Suggestion: Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/_
- **`support-channels`** (1): No SUPPORT.md or .github/SUPPORT.md found
  - _Suggestion: Add a SUPPORT.md documenting how users can get help_
- **`interaction-templates`** (1): No issue templates configured
  - _Suggestion: Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates_
- **`linting`** (1): No linter configuration found
  - _Suggestion: Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to r_

#### Recommendations

1. Add a LICENSE file with a recognized open source license _(impact: high, effort: medium)_
2. Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance. _(impact: high, effort: medium)_
3. Diversify contributors across multiple organizations to reduce single-vendor risk _(impact: high, effort: medium)_
4. Add a test suite to improve code reliability and enable coverage tracking _(impact: high, effort: medium)_
5. Add a SECURITY.md file with vulnerability reporting instructions _(impact: medium, effort: low)_
6. Single contributor detected — consider recruiting additional maintainers _(impact: medium, effort: low)_

---

## Appendix: Backlog User Stories

User stories derived from CRITICAL and WARNING findings. Each story is scoped to a single actionable change. Stories are grouped by repo then by priority (CRITICAL before WARNING).

> **Format:** `As a [role], I want [change] so that [outcome].`

### `ainative-zerodb-mcp-server`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 4** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 10** 🟡 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

### `ainative-zerodb-memory-mcp`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🔴 `issue-closure`
> As a maintainer, I want to triage and close or label open issues to establish a response cadence so that contributors receive timely feedback and the issue backlog stays meaningful.

**Story 3** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 4** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 5** 🟡 `burnout-detection`
> As a maintainer, I want to distribute maintainer responsibilities by documenting and recruiting co-maintainers so that single-maintainer bus-factor risk is reduced.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 9** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 10** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 12** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

**Story 13** 🟡 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

### `ainative-strapi-mcp-server`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 3** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 4** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 5** 🟡 `burnout-detection`
> As a maintainer, I want to distribute maintainer responsibilities by documenting and recruiting co-maintainers so that single-maintainer bus-factor risk is reduced.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 9** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 10** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

### `agentic-rules`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 3** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 4** 🟡 `burnout-detection`
> As a maintainer, I want to distribute maintainer responsibilities by documenting and recruiting co-maintainers so that single-maintainer bus-factor risk is reduced.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `diminishing-language`
> As a contributor, I want to audit documentation for diminishing language (e.g. "just", "simply", "obviously") and rewrite for clarity so that documentation is welcoming to users of all experience levels.

**Story 10** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 11** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `shadcn-ui-mcp-server`

**Story 1** 🔴 `token-permissions`
> As a maintainer, I want to add `permissions: read-all` at the top level of every GitHub Actions workflow file so that workflows follow the principle of least privilege for GITHUB_TOKEN.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 4** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 5** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 9** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 10** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 12** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `mcp-l-core`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 3** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 4** 🟡 `burnout-detection`
> As a maintainer, I want to distribute maintainer responsibilities by documenting and recruiting co-maintainers so that single-maintainer bus-factor risk is reduced.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

### `zerodb-typescript-sdk`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 3** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 4** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 5** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 6** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 7** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 8** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 9** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

### `zerodb-python-sdk`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 3** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 4** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 5** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 6** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 7** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 8** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 9** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 10** 🟡 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

### `zerodb-supabase-adapter`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 4** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 10** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

### `zerodb-vercel-integration`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 4** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 10** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 11** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `crewai-zerodb`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 3** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 4** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 5** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 6** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 7** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 8** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 9** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 10** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `zerodb-local`

**Story 1** 🔴 `token-permissions`
> As a maintainer, I want to add `permissions: read-all` at the top level of every GitHub Actions workflow file so that workflows follow the principle of least privilege for GITHUB_TOKEN.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `model-card-scoring`
> As a maintainer, I want to add a model card section to README documenting intended use, limitations, and evaluation results so that AI governance requirements are met and downstream users can assess the model.

**Story 4** 🔴 `inclusive-naming`
> As a developer, I want to replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs so that the codebase aligns with Inclusive Naming Initiative guidelines.

**Story 5** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 6** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 7** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 8** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 9** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 10** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 11** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

**Story 12** 🟡 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

### `zerodb-cli`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🔴 `inclusive-naming`
> As a developer, I want to replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs so that the codebase aligns with Inclusive Naming Initiative guidelines.

**Story 3** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 4** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 10** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 11** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

**Story 12** 🟡 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

### `zerodb-nextjs-template`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 4** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 5** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 9** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 10** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 12** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `zerodb-claude-plugin`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `token-permissions`
> As a maintainer, I want to add `permissions: read-all` at the top level of every GitHub Actions workflow file so that workflows follow the principle of least privilege for GITHUB_TOKEN.

**Story 3** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 4** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 5** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 9** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 10** 🟡 `diminishing-language`
> As a contributor, I want to audit documentation for diminishing language (e.g. "just", "simply", "obviously") and rewrite for clarity so that documentation is welcoming to users of all experience levels.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 12** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

**Story 13** 🟡 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

### `ai-kit`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🔴 `welcoming-score`
> As a maintainer, I want to review community health files (README, CONTRIBUTING, CoC) for welcoming and inclusive tone so that first-time contributors feel invited to participate.

**Story 3** 🔴 `inclusive-naming`
> As a developer, I want to replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs so that the codebase aligns with Inclusive Naming Initiative guidelines.

**Story 4** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 5** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 10** 🟡 `diminishing-language`
> As a contributor, I want to audit documentation for diminishing language (e.g. "just", "simply", "obviously") and rewrite for clarity so that documentation is welcoming to users of all experience levels.

### `ai-kit-a2ui`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 3** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 4** 🟡 `burnout-detection`
> As a maintainer, I want to distribute maintainer responsibilities by documenting and recruiting co-maintainers so that single-maintainer bus-factor risk is reduced.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 10** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

### `ai-kit-showcase`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 4** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 5** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `issue-closure`
> As a maintainer, I want to triage and close or label open issues to establish a response cadence so that contributors receive timely feedback and the issue backlog stays meaningful.

**Story 9** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 10** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 11** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 12** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 13** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `ainative-sdks`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 4** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 10** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `Agent-402`

**Story 1** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 2** 🔴 `model-card-scoring`
> As a maintainer, I want to add a model card section to README documenting intended use, limitations, and evaluation results so that AI governance requirements are met and downstream users can assess the model.

**Story 3** 🔴 `welcoming-score`
> As a maintainer, I want to review community health files (README, CONTRIBUTING, CoC) for welcoming and inclusive tone so that first-time contributors feel invited to participate.

**Story 4** 🔴 `inclusive-naming`
> As a developer, I want to replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs so that the codebase aligns with Inclusive Naming Initiative guidelines.

**Story 5** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 9** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 10** 🟡 `diminishing-language`
> As a contributor, I want to audit documentation for diminishing language (e.g. "just", "simply", "obviously") and rewrite for clarity so that documentation is welcoming to users of all experience levels.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 12** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

**Story 13** 🟡 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

### `ragbot-starter`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 4** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 5** 🟡 `burnout-detection`
> As a maintainer, I want to distribute maintainer responsibilities by documenting and recruiting co-maintainers so that single-maintainer bus-factor risk is reduced.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 9** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 10** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 12** 🟡 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

### `cody-sdk-typescript`

**Story 1** 🔴 `token-permissions`
> As a maintainer, I want to add `permissions: read-all` at the top level of every GitHub Actions workflow file so that workflows follow the principle of least privilege for GITHUB_TOKEN.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `inclusive-naming`
> As a developer, I want to replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs so that the codebase aligns with Inclusive Naming Initiative guidelines.

**Story 4** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 5** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 9** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 10** 🟡 `missing-prerequisites`
> As a contributor, I want to add a Prerequisites section to README listing required tools and versions so that setup friction for new contributors is eliminated.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

### `builder-ainative-studio`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `inclusive-naming`
> As a developer, I want to replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs so that the codebase aligns with Inclusive Naming Initiative guidelines.

**Story 4** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 5** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 6** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 7** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 8** 🟡 `issue-closure`
> As a maintainer, I want to triage and close or label open issues to establish a response cadence so that contributors receive timely feedback and the issue backlog stays meaningful.

**Story 9** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 10** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 11** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 12** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `AINativeStudio-IDE`

**Story 1** 🔴 `token-permissions`
> As a maintainer, I want to add `permissions: read-all` at the top level of every GitHub Actions workflow file so that workflows follow the principle of least privilege for GITHUB_TOKEN.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `inclusive-naming`
> As a developer, I want to replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs so that the codebase aligns with Inclusive Naming Initiative guidelines.

**Story 4** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 5** 🟡 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 6** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 7** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 8** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 9** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 10** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 11** 🟡 `diminishing-language`
> As a contributor, I want to audit documentation for diminishing language (e.g. "just", "simply", "obviously") and rewrite for clarity so that documentation is welcoming to users of all experience levels.

**Story 12** 🟡 `welcoming-score`
> As a maintainer, I want to review community health files (README, CONTRIBUTING, CoC) for welcoming and inclusive tone so that first-time contributors feel invited to participate.

**Story 13** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 14** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `ainative-code`

**Story 1** 🔴 `dependency-pinning`
> As a maintainer, I want to pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file so that dependency substitution attacks and unexpected upstream breakage are mitigated.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `model-card-scoring`
> As a maintainer, I want to add a model card section to README documenting intended use, limitations, and evaluation results so that AI governance requirements are met and downstream users can assess the model.

**Story 4** 🔴 `welcoming-score`
> As a maintainer, I want to review community health files (README, CONTRIBUTING, CoC) for welcoming and inclusive tone so that first-time contributors feel invited to participate.

**Story 5** 🔴 `inclusive-naming`
> As a developer, I want to replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs so that the codebase aligns with Inclusive Naming Initiative guidelines.

**Story 6** 🟡 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 7** 🟡 `token-permissions`
> As a maintainer, I want to add `permissions: read-all` at the top level of every GitHub Actions workflow file so that workflows follow the principle of least privilege for GITHUB_TOKEN.

**Story 8** 🟡 `burnout-detection`
> As a maintainer, I want to distribute maintainer responsibilities by documenting and recruiting co-maintainers so that single-maintainer bus-factor risk is reduced.

**Story 9** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 10** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 11** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 12** 🟡 `diminishing-language`
> As a contributor, I want to audit documentation for diminishing language (e.g. "just", "simply", "obviously") and rewrite for clarity so that documentation is welcoming to users of all experience levels.

**Story 13** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

### `ainative-jetbrains`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 4** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 10** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

### `ainative-neovim`

**Story 1** 🔴 `openssf-scorecard`
> As a maintainer, I want to integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README so that supply-chain risk is continuously measured and publicly visible.

**Story 2** 🔴 `vendor-neutrality`
> As a maintainer, I want to add a GOVERNANCE.md that documents the contribution process and invites external contributors so that the project signals it welcomes community ownership beyond a single vendor.

**Story 3** 🔴 `test-coverage`
> As a developer, I want to add a test suite with a coverage threshold of ≥80% so that regressions are caught before merge and contributors have a safety net.

**Story 4** 🟡 `license-validation`
> As a maintainer, I want to validate the LICENSE file contains a recognized SPDX expression so that automated tooling can correctly classify the license.

**Story 5** 🟡 `contributor-data`
> As a maintainer, I want to document a contributor ladder in CONTRIBUTING.md and publicize it so that potential contributors understand the path from first-time contributor to maintainer.

**Story 6** 🟡 `contributor-funnel`
> As a maintainer, I want to add a CONTRIBUTING.md with step-by-step first-contribution guide so that the ratio of casual to regular contributors improves over time.

**Story 7** 🟡 `psych-safety`
> As a contributor, I want to add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository so that all contributors know the community standards and feel safe participating.

**Story 8** 🟡 `support-channels`
> As a user, I want to add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) so that users know how to get help without opening bug reports for support questions.

**Story 9** 🟡 `interaction-templates`
> As a contributor, I want to add GitHub Issue and Pull Request templates so that bug reports and PRs include the information maintainers need to triage them efficiently.

**Story 10** 🟡 `linting`
> As a developer, I want to add an ESLint/Ruff/golangci-lint config and enforce it in CI so that code style is consistent and reviewers can focus on logic rather than formatting.

---

*Report generated by [quaid-scanner](https://github.com/quaid/quaid-scanner) v0.1.0*
