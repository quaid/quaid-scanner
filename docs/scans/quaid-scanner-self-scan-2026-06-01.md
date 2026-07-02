# quaid-scanner Report: /Users/karstenwade/Projects/quaid-scanner

**Score:** 🟠 4.1/10 — HIGH risk
**Maturity:** sandbox | **Depth:** standard | **Duration:** 30.1s
**Scanned:** 2026-06-02T05:27:49.412Z

## Pillar Scores

| Pillar | Score | Weight | Findings |
|--------|-------|--------|----------|
| Security | 3.5 | 25% | 0C 4W 1I |
| Governance | 3.0 | 20% | 0C 2W 8I |
| Community | 4.0 | 15% | 0C 1W 9I |
| AI Readiness | 8.0 | 15% | 0C 0W 4I |
| Inclusive Language | 0.0 | 15% | 2C 31W 37I |
| Technical Rigor | 8.5 | 10% | 0C 0W 3I |

## Critical Findings

### DIMINISH-SUMMARY
**Pillar:** Inclusive Language | **Category:** welcoming-score

Welcoming score: 0/100 (31 warnings, 19 info)

_(source: local file check)_

**Suggestion:** Review flagged diminishing language to make documentation more welcoming to all skill levels.

**Reference:** https://inclusivenaming.org/

### inclusive-doc-scanner:README.md:592:master
**Pillar:** Inclusive Language | **Category:** inclusive-language

Non-inclusive term "master" found. Consider using: main, primary, source, original

_(source: local file check)_

**Context:**
```
...clusive CRITICAL: `"master"` in `dep-pinning-d...
```

> File: `README.md`:592

**Suggestion:** Replace "master" with one of: main, primary, source, original

**Reference:** https://inclusivenaming.org/word-lists/

## Warnings

- **[dep-pinning-docker-1]** Action "actions/checkout" uses major-only version "@v4" in ".github/workflows/publish.yml" *(Consider pinning to a full semver (e.g., @v4.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-2]** Action "actions/setup-node" uses major-only version "@v4" in ".github/workflows/publish.yml" *(Consider pinning to a full semver (e.g., @v4.0.0) or SHA for better reproducibility)*
- **[openssf-scorecard-1]** OpenSSF Scorecard unavailable — fetch failed *(Check network connectivity or try again later)*
- **[token-permissions-1]** Workflow ".github/workflows/publish.yml" grants "id-token: write" permission *(Review if "id-token: write" is necessary. Use "read" if possible)*
- **[TIMEOUT-clearly-defined]** Scanner "clearly-defined" timed out after 30000ms *(Increase scannerTimeout in configuration or check network connectivity)*
- **[governance-classification-1]** Unclear governance model — best guess is "Foundation-backed" with low confidence (32%) *(Document the governance model explicitly in GOVERNANCE.md for clarity)*
- **[contributor-funnel-2]** Conversion rates: casual→regular 0%, regular→core 0% *(Low casual-to-regular conversion suggests contributor onboarding friction)*
- **[DIMINISH-docs/PRD-v2.md:1528:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/PRD-v2.md:1530:everyone knows]** Found diminishing language "everyone knows" in documentation *(Remove "everyone knows" — not everyone has the same knowledge. Explain the concept instead.)*
- **[DIMINISH-docs/PRD-v2.md:1531:as you know]** Found diminishing language "as you know" in documentation *(Remove "as you know" — readers may not know. State the information directly.)*
- **[DIMINISH-docs/PRD.md:87:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/PRD.md:95:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/PRD.md:95:as you know]** Found diminishing language "as you know" in documentation *(Remove "as you know" — readers may not know. State the information directly.)*
- **[DIMINISH-docs/content/v0.1.2/blog/2026-05-31-show-your-work.md:117:just [verb]]** Found diminishing language "just add" in documentation *(Remove "just" — it implies the task is trivial and can discourage readers who find it difficult.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:264:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:265:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:881:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:882:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:923:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:924:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:1399:just [verb]]** Found diminishing language "just use" in documentation *(Remove "just" — it implies the task is trivial and can discourage readers who find it difficult.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:1449:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:1450:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:1735:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:2114:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:2155:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:2292:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:2447:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:2494:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/jolliai-report-2026-05-05.md:140:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/jolliai-report-2026-05-05.md:141:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/jolliai-report-2026-05-05.md:142:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/jolliai-report-2026-05-05.md:143:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/jolliai-report-2026-05-05.md:150:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/jolliai-report-2026-05-05.md:232:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/scans/portfolio-report-template.md:313:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/usage/scanners.md:240:obvious/obviously]** Found diminishing language "obviously" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/usage/scanners.md:245:everyone knows]** Found diminishing language "everyone knows" in documentation *(Remove "everyone knows" — not everyone has the same knowledge. Explain the concept instead.)*

## Info

- **[branch-protection-1]** GitHub token not provided. Cannot check branch protection settings.
- **[asset-protection-1]** No trademark policy found (optional)
- **[asset-protection-2]** No export control documentation found (optional)
- **[asset-protection-3]** No CLA or DCO requirement detected
- **[asset-protection-4]** Contributor friction level: Low
- **[bus-factor-1]** Bus factor: 1, Elephant factor: 69% (3 contributors, 198 commits in last 12 months)
- **[governance-detection-1]** No governance documentation found
- **[license-header-scanner:no-headers]** No SPDX license headers found in 100 source file(s).
- **[vendor-neutrality-domain-count]** Found 3 unique email domain(s) across 198 commits
- **[burnout-detection-1]** Burnout detection requires a GitHub token
- **[contributor-data-2]** Contributor emails span 3 domains
- **[contributor-funnel-1]** Contributor funnel: 2 core, 0 regular, 1 casual (3 total)
- **[funding-1]** No funding infrastructure detected
- **[issue-closure-1]** Issue closure analysis requires a GitHub token
- **[response-classification-1]** Response classification requires a GitHub token
- **[response-time-1]** Response time analysis requires a GitHub token
- **[stale-bot-1]** No stale bot configured
- **[support-channels-2]** Support channels detected: discussions
- **[ai-repo-detection-1]** No AI/ML signals detected — not an AI repository
- **[dataset-provenance-1]** Not an AI/ML repository — dataset provenance check skipped
- **[model-card-detection-1]** Not an AI/ML repository — model card check skipped
- **[model-card-scoring-1]** Not an AI/ML repository — model card scoring skipped
- **[AK-GIT-CLONE-README.md:550]** Assumed knowledge: "clone" operation used without explanation
- **[AK-ACRONYM-LICENSE-README.md:4]** Undefined acronym "LICENSE" may confuse newcomers
- **[AK-ACRONYM-OSS-README.md:7]** Undefined acronym "OSS" may confuse newcomers
- **[AK-ACRONYM-CHAOSS-README.md:9]** Undefined acronym "CHAOSS" may confuse newcomers
- **[AK-ACRONYM-OSPO-README.md:15]** Undefined acronym "OSPO" may confuse newcomers
- **[AK-ACRONYM-PDF-README.md:19]** Undefined acronym "PDF" may confuse newcomers
- **[AK-ACRONYM-INI-README.md:96]** Undefined acronym "INI" may confuse newcomers
- **[AK-ACRONYM-WARNING-README.md:155]** Undefined acronym "WARNING" may confuse newcomers
- **[AK-ACRONYM-CRITICAL-README.md:155]** Undefined acronym "CRITICAL" may confuse newcomers
- **[AK-ACRONYM-MEDIUM-README.md:165]** Undefined acronym "MEDIUM" may confuse newcomers
- **[AK-ACRONYM-PASS-README.md:192]** Undefined acronym "PASS" may confuse newcomers
- **[AK-ACRONYM-INFO-README.md:192]** Undefined acronym "INFO" may confuse newcomers
- **[AK-ACRONYM-MCP-README.md:246]** Undefined acronym "MCP" may confuse newcomers
- **[AK-ACRONYM-REPORT-README.md:315]** Undefined acronym "REPORT" may confuse newcomers
- **[AK-ACRONYM-SCORE-README.md:316]** Undefined acronym "SCORE" may confuse newcomers
- **[AK-ACRONYM-YYYY-README.md:368]** Undefined acronym "YYYY" may confuse newcomers
- **[AK-ACRONYM-ASCII-README.md:402]** Undefined acronym "ASCII" may confuse newcomers
- **[AK-ACRONYM-SECURITY-README.md:536]** Undefined acronym "SECURITY" may confuse newcomers
- **[DIMINISH-docs/Open_Source_Way_et_al_expansions.md:206:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/PRD-v2.md:1527:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/PRD-v2.md:1529:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/PRD-v2.md:1532:of course]** Found diminishing language "of course" in documentation
- **[DIMINISH-docs/PRD-v2.md:1533:clearly]** Found diminishing language "clearly" in documentation
- **[DIMINISH-docs/PRD-v2.md:1534:basically]** Found diminishing language "basically" in documentation
- **[DIMINISH-docs/PRD-v2.md:1822:easy/easily]** Found diminishing language "easily" in documentation
- **[DIMINISH-docs/PRD-v2.md:2405:clearly]** Found diminishing language "clearly" in documentation
- **[DIMINISH-docs/PRD.md:87:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/PRD.md:429:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/content/v0.1.2/blog/2026-05-31-show-your-work.md:49:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/content/v0.1.2/blog/2026-05-31-show-your-work.md:143:of course]** Found diminishing language "of course" in documentation
- **[DIMINISH-docs/releases/v0.1.2.md:76:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/scans/ainative-portfolio-report-2026-05-04.md:1400:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/scans/jolliai-report-2026-05-05.md:150:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/scans/jolliai-report-2026-05-05.md:232:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/usage/scanners.md:240:trivial]** Found diminishing language "trivially" in documentation
- **[DIMINISH-docs/usage/scanners.md:240:of course]** Found diminishing language "of course" in documentation
- **[DIMINISH-docs/usage/scanners.md:240:clearly]** Found diminishing language "clearly" in documentation
- **[interaction-templates-1]** 4 issue templates found
- **[linter-config-2]** Linter config found but no lint step detected in CI workflows
- **[test-coverage-3]** No coverage badge found in README

## Recommendations

- **[HIGH impact / medium effort]** Review flagged diminishing language to make documentation more welcoming to all skill levels.
  - https://inclusivenaming.org/
- **[HIGH impact / medium effort]** Replace "master" with one of: main, primary, source, original
  - https://inclusivenaming.org/word-lists/
- **[MEDIUM impact / low effort]** Consider pinning to a full semver (e.g., @v4.0.0) or SHA for better reproducibility
- **[MEDIUM impact / low effort]** Check network connectivity or try again later
- **[MEDIUM impact / low effort]** Review if "id-token: write" is necessary. Use "read" if possible
- **[MEDIUM impact / low effort]** Increase scannerTimeout in configuration or check network connectivity
- **[MEDIUM impact / low effort]** Document the governance model explicitly in GOVERNANCE.md for clarity
- **[MEDIUM impact / low effort]** Low casual-to-regular conversion suggests contributor onboarding friction
- **[MEDIUM impact / low effort]** Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.

## Score Rationale

Overall score is a weighted sum of six pillar scores (each scored 0–10).

| Pillar | Weight | Raw Score | Contribution |
|--------|--------|-----------|-------------|
| Security | 25% | 3.5 | 0.88 |
| Governance | 20% | 3.0 | 0.60 |
| Community | 15% | 4.0 | 0.60 |
| AI Readiness | 15% | 8.0 | 1.20 |
| Inclusive Language | 15% | 0.0 | 0.00 |
| Technical Rigor | 10% | 8.5 | 0.85 |
| **Overall** | **100%** | | **4.10** |

---
*quaid-scanner v0.1.2 | 2026-06-02T05:27:49.412Z*
*Commit: 8e8fe8085c6ef49fcfa0911e0df112687535896c*