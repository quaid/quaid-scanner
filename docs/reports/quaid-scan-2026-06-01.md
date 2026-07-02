# quaid-scanner Report: /Users/karstenwade/Projects/AINative-Studio/src/oss-repo-check

**Score:** 🔴 2.3/10 — CRITICAL risk
**Maturity:** sandbox | **Depth:** standard | **Duration:** 0.1s
**Scanned:** 2026-06-01T20:50:16.602Z

## Pillar Scores

| Pillar | Score | Weight | Findings |
|--------|-------|--------|----------|
| Security | 0.0 | 25% | 0C 16W 1I |
| Governance | 2.0 | 20% | 0C 2W 10I |
| Community | 1.5 | 15% | 0C 3W 8I |
| AI Readiness | 4.0 | 15% | 0C 4W 0I |
| Inclusive Language | 3.0 | 15% | 0C 4W 2I |
| Technical Rigor | 6.5 | 10% | 0C 1W 4I |

## Warnings

- **[TIMEOUT-binary-artifacts]** Scanner "binary-artifacts" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-dep-pinning-docker]** Scanner "dep-pinning-docker" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[dep-pinning-packages-1]** Loosely pinned dependency "chalk": "^5.3.0" uses ^ prefix in dependencies *(Consider pinning "chalk" to an exact version for reproducible builds)*
- **[dep-pinning-packages-2]** Loosely pinned dependency "commander": "^12.1.0" uses ^ prefix in dependencies *(Consider pinning "commander" to an exact version for reproducible builds)*
- **[dep-pinning-packages-3]** Loosely pinned dependency "glob": "^10.4.5" uses ^ prefix in dependencies *(Consider pinning "glob" to an exact version for reproducible builds)*
- **[dep-pinning-packages-4]** Loosely pinned dependency "octokit": "^4.0.2" uses ^ prefix in dependencies *(Consider pinning "octokit" to an exact version for reproducible builds)*
- **[dep-pinning-packages-5]** Loosely pinned dependency "@types/node": "^20.17.12" uses ^ prefix in devDependencies *(Consider pinning "@types/node" to an exact version for reproducible builds)*
- **[dep-pinning-packages-6]** Loosely pinned dependency "@typescript-eslint/eslint-plugin": "^7.18.0" uses ^ prefix in devDependencies *(Consider pinning "@typescript-eslint/eslint-plugin" to an exact version for reproducible builds)*
- **[dep-pinning-packages-7]** Loosely pinned dependency "@typescript-eslint/parser": "^7.18.0" uses ^ prefix in devDependencies *(Consider pinning "@typescript-eslint/parser" to an exact version for reproducible builds)*
- **[dep-pinning-packages-8]** Loosely pinned dependency "@vitest/coverage-v8": "^2.1.8" uses ^ prefix in devDependencies *(Consider pinning "@vitest/coverage-v8" to an exact version for reproducible builds)*
- **[dep-pinning-packages-9]** Loosely pinned dependency "eslint": "^8.57.1" uses ^ prefix in devDependencies *(Consider pinning "eslint" to an exact version for reproducible builds)*
- **[dep-pinning-packages-10]** Loosely pinned dependency "prettier": "^3.8.1" uses ^ prefix in devDependencies *(Consider pinning "prettier" to an exact version for reproducible builds)*
- **[dep-pinning-packages-11]** Loosely pinned dependency "typescript": "^5.7.2" uses ^ prefix in devDependencies *(Consider pinning "typescript" to an exact version for reproducible builds)*
- **[dep-pinning-packages-12]** Loosely pinned dependency "vitest": "^2.1.8" uses ^ prefix in devDependencies *(Consider pinning "vitest" to an exact version for reproducible builds)*
- **[TIMEOUT-openssf-local-checks]** Scanner "openssf-local-checks" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-openssf-scorecard]** Scanner "openssf-scorecard" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-clearly-defined]** Scanner "clearly-defined" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-license-header-scanner]** Scanner "license-header-scanner" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[contributor-funnel-2]** Conversion rates: casual→regular 0%, regular→core 0% *(Low casual-to-regular conversion suggests contributor onboarding friction)*
- **[psych-safety-1]** No Code of Conduct found *(Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/)*
- **[support-channels-1]** No SUPPORT.md or .github/SUPPORT.md found *(Add a SUPPORT.md documenting how users can get help)*
- **[TIMEOUT-ai-repo-detection]** Scanner "ai-repo-detection" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-dataset-provenance]** Scanner "dataset-provenance" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-model-card-detection]** Scanner "model-card-detection" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-model-card-scoring]** Scanner "model-card-scoring" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-diminishing-language-scanner]** Scanner "diminishing-language-scanner" timed out after undefinedms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[TIMEOUT-inclusive-code-scanner]** Scanner "inclusive-code-scanner" failed: Cannot read properties of undefined (reading 'termListUrl') *(Check scanner implementation for errors)*
- **[TIMEOUT-inclusive-doc-scanner]** Scanner "inclusive-doc-scanner" failed: Cannot read properties of undefined (reading 'termListUrl') *(Check scanner implementation for errors)*
- **[TIMEOUT-inclusive-naming-scanner]** Scanner "inclusive-naming-scanner" failed: Cannot read properties of undefined (reading 'termListUrl') *(Check scanner implementation for errors)*
- **[interaction-templates-1]** No issue templates configured *(Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates)*

## Info

- **[branch-protection-1]** GitHub token not provided. Cannot check branch protection settings.
- **[asset-protection-1]** No trademark policy found (optional)
- **[asset-protection-2]** No export control documentation found (optional)
- **[asset-protection-3]** No CLA or DCO requirement detected
- **[asset-protection-4]** Contributor friction level: Low
- **[bus-factor-1]** Bus factor: 1, Elephant factor: 53% (3 contributors, 113 commits in last 12 months)
- **[dep-license-scanning-1]** package.json found but node_modules not installed — cannot scan dependency licenses
- **[governance-classification-1]** No governance model detected — governance files exist but no recognizable model pattern found
- **[governance-detection-1]** No governance documentation found
- **[license-compatibility-1]** Project license is Apache-2.0 — no installed dependencies to check compatibility
- **[vendor-neutrality-domain-count]** Found 3 unique email domain(s) across 113 commits
- **[burnout-detection-1]** Burnout detection requires a GitHub token
- **[contributor-data-2]** Contributor emails span 3 domains
- **[contributor-funnel-1]** Contributor funnel: 2 core, 0 regular, 1 casual (3 total)
- **[funding-1]** No funding infrastructure detected
- **[issue-closure-1]** Issue closure analysis requires a GitHub token
- **[response-classification-1]** Response classification requires a GitHub token
- **[response-time-1]** Response time analysis requires a GitHub token
- **[stale-bot-1]** No stale bot configured
- **[AK-GIT-CLONE-README.md:83]** Assumed knowledge: "clone" operation used without explanation
- **[AK-ACRONYM-CHAOSS-README.md:3]** Undefined acronym "CHAOSS" may confuse newcomers
- **[linter-config-2]** Linter config found but no lint step detected in CI workflows
- **[release-cadence-1]** No releases or version tags found
- **[test-coverage-3]** No coverage badge found in README
- **[semver-validation-1]** No git tags found — cannot validate SemVer

## Recommendations

- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Consider pinning "chalk" to an exact version for reproducible builds
- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Low casual-to-regular conversion suggests contributor onboarding friction
- **[MEDIUM impact / low effort]** Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/
- **[MEDIUM impact / low effort]** Add a SUPPORT.md documenting how users can get help
- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Check scanner implementation for errors
- **[MEDIUM impact / low effort]** Add .github/ISSUE_TEMPLATE/ with bug report and feature request templates

## Score Rationale

Overall score is a weighted sum of six pillar scores (each scored 0–10).

| Pillar | Weight | Raw Score | Contribution |
|--------|--------|-----------|-------------|
| Security | 25% | 0.0 | 0.00 |
| Governance | 20% | 2.0 | 0.40 |
| Community | 15% | 1.5 | 0.22 |
| AI Readiness | 15% | 4.0 | 0.60 |
| Inclusive Language | 15% | 3.0 | 0.45 |
| Technical Rigor | 10% | 6.5 | 0.65 |
| **Overall** | **100%** | | **2.30** |

---
*quaid-scanner v0.1.2 | 2026-06-01T20:50:16.602Z*
*Commit: dbdd9fc40698179332314ce1dab383702d708db0*