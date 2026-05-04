# {{ORG_NAME}} OSS Portfolio Health Report

<!--
  ╔══════════════════════════════════════════════════════════════════╗
  ║  AGENT INSTRUCTIONS — HOW TO FILL THIS TEMPLATE                 ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║                                                                  ║
  ║  1. RUN THE SCANS                                                ║
  ║     For each repo in the portfolio:                              ║
  ║       quaid-scanner https://github.com/ORG/REPO                 ║
  ║         --depth quick --format json --quiet                      ║
  ║         --output /tmp/scan-REPO.json                             ║
  ║                                                                  ║
  ║  2. FILL HEADER PLACEHOLDERS                                     ║
  ║     {{ORG_NAME}}     → GitHub org or person name                 ║
  ║     {{SCAN_DATE}}    → ISO date (YYYY-MM-DD)                     ║
  ║     {{TOOL_VERSION}} → from `quaid-scanner --version`            ║
  ║     {{SCAN_DEPTH}}   → quick | standard | thorough               ║
  ║     {{REPO_COUNT}}   → total number of repos scanned             ║
  ║                                                                  ║
  ║  3. FILL EXECUTIVE SUMMARY                                       ║
  ║     Aggregate across all scan JSONs:                             ║
  ║     - Count repos by riskLevel                                   ║
  ║     - Find min/max overallScore and their repo names             ║
  ║     - Identify the 2-3 pillars that score lowest across the      ║
  ║       portfolio — these become PATTERN_1, PATTERN_2, etc.        ║
  ║     - Identify the strongest pillar — this is STRENGTH           ║
  ║     - Note any scanner limitations affecting results (CAVEAT)    ║
  ║     For REMEDIATION PRIORITIES: sort unique finding categories   ║
  ║     by frequency (how many repos have that category) and list    ║
  ║     the top 8.                                                   ║
  ║                                                                  ║
  ║  4. FILL SCORE TABLE                                             ║
  ║     One row per repo. Pull overallScore, riskLevel, and each     ║
  ║     pillar score from pillars.PILLAR.score in each scan JSON.    ║
  ║     Sort rows by overallScore descending.                        ║
  ║                                                                  ║
  ║  5. FILL PER-REPO SECTIONS                                       ║
  ║     One section per repo. For each scan JSON:                    ║
  ║     - Render the pillar bar: 10 chars, '█' per integer point,    ║
  ║       '░' for remainder. E.g. score 6.5 → ██████░░░░            ║
  ║     - CRITICAL findings: show each unique message once.          ║
  ║       Group inclusive-naming/language findings by term and       ║
  ║       total count rather than listing every instance.            ║
  ║     - WARNING findings: group by category, show count and one    ║
  ║       representative message per category. Cap at 10 categories. ║
  ║     - Recommendations: pull from the recommendations array,      ║
  ║       deduplicate by action text, show top 6.                    ║
  ║                                                                  ║
  ║  6. FILL BACKLOG USER STORIES                                    ║
  ║     See the "Common Story Templates" table at the bottom of this ║
  ║     file — it maps finding categories to pre-written stories.    ║
  ║     For each repo:                                               ║
  ║     a. Collect unique finding categories (CRITICAL + WARNING).   ║
  ║     b. For each category that has a matching template row,       ║
  ║        copy that story. Add 🔴 if the finding was CRITICAL,      ║
  ║        🟡 if WARNING.                                             ║
  ║     c. Order: CRITICAL stories first, WARNING after.             ║
  ║     d. Number stories sequentially within each repo.             ║
  ║     e. Skip categories not in the template table — they need     ║
  ║        manual stories written from the finding message +         ║
  ║        suggestion fields in the JSON.                            ║
  ║                                                                  ║
  ║  7. REMOVE ALL COMMENT BLOCKS before publishing.                 ║
  ║     Delete every <!-- ... --> block including this one.          ║
  ╚══════════════════════════════════════════════════════════════════╝
-->

**Scanned:** {{SCAN_DATE}}  |  **Tool:** quaid-scanner v{{TOOL_VERSION}}  |  **Depth:** {{SCAN_DEPTH}}  |  **Repos:** {{REPO_COUNT}}

---

## Executive Summary

<!--
  Write 1-2 sentences framing the portfolio and what was evaluated.
  Then fill the bullets below from aggregated scan data.
-->

quaid-scanner evaluated {{REPO_COUNT}} public {{ORG_NAME}} repositories across six weighted pillars:
Security (25%), Governance (20%), Community (15%), AI Readiness (15%), Inclusive Language (15%),
and Technical Rigor (10%).

### Key Findings

<!--
  Each bullet = one pattern observed across most or all repos.
  Lead with the most damaging universal gap, end with a strength.
  Last bullet = any known scanner limitations affecting these results.
-->

- **{{CRITICAL_COUNT}} repos rated CRITICAL risk**, {{HIGH_COUNT}} HIGH, {{MEDIUM_COUNT}} MEDIUM, {{LOW_COUNT}} LOW. Scores range from {{MIN_SCORE}} (`{{MIN_SCORE_REPO}}`) to {{MAX_SCORE}} (`{{MAX_SCORE_REPO}}`).
- **{{PATTERN_1}}** — _[e.g. "Community = 0 across every repo. Single-vendor commit history, no support channels, no contributor ladder."]_
- **{{PATTERN_2}}** — _[e.g. "Security = 0 on 20 of 27 repos. No OpenSSF Scorecard, loosely-pinned dependencies, no branch protection."]_
- **{{PATTERN_3}}** — _[optional third universal pattern]_
- **{{STRENGTH}}** — _[e.g. "AI Readiness is uniformly strong (7–8) across the portfolio."]_
- **{{CAVEAT}}** — _[note scanner limitations, e.g. "Inclusive scores on large repos are inflated by false positives for technical terms like 'abort' and 'whitelist' — see issue #63."]_

### Top Portfolio-Wide Remediation Priorities

<!--
  Sort by: number of repos affected (desc), then estimated impact.
  "Repos Affected" = count of repos that have a finding in that category.
  Limit to 8 rows. Actions should be concrete and owner-assignable.
-->

| Priority | Action | Repos Affected |
|----------|--------|----------------|
| 1 | {{ACTION_1}} | {{COUNT_1}}/{{REPO_COUNT}} |
| 2 | {{ACTION_2}} | {{COUNT_2}}/{{REPO_COUNT}} |
| 3 | {{ACTION_3}} | {{COUNT_3}}/{{REPO_COUNT}} |
| 4 | {{ACTION_4}} | {{COUNT_4}}/{{REPO_COUNT}} |
| 5 | {{ACTION_5}} | {{COUNT_5}}/{{REPO_COUNT}} |
| 6 | {{ACTION_6}} | {{COUNT_6}}/{{REPO_COUNT}} |
| 7 | {{ACTION_7}} | {{COUNT_7}}/{{REPO_COUNT}} |
| 8 | {{ACTION_8}} | {{COUNT_8}}/{{REPO_COUNT}} |

---

## Portfolio Score Summary

<!--
  One row per repo, sorted by overallScore descending.
  Pull all values from the scan JSON.
  Bold any pillar score ≥ 8. Mark any score = 0 with a dash (—) for readability.
-->

| Repo | Score | Risk | sec | gov | com | ai | inc | tec |
|------|------:|------|----:|----:|----:|---:|----:|----:|
| `{{REPO_1}}` | {{SCORE}} | {{RISK}} | {{SEC}} | {{GOV}} | {{COM}} | {{AI}} | {{INC}} | {{TEC}} |
| `{{REPO_2}}` | {{SCORE}} | {{RISK}} | {{SEC}} | {{GOV}} | {{COM}} | {{AI}} | {{INC}} | {{TEC}} |
| _(one row per repo)_ | | | | | | | | |

> **Pillar weights:** Security 25% · Governance 20% · Community 15% · AI Readiness 15% · Inclusive 15% · Technical 10%

---

## Per-Repository Analysis

<!--
  ┌─────────────────────────────────────────────────────────────┐
  │  AGENT: Copy the block below once per repo. Fill all        │
  │  placeholders from the repo's scan JSON. Delete sections    │
  │  that have no findings (e.g. skip "Critical Findings" if    │
  │  there are zero CRITICAL results).                          │
  │                                                             │
  │  PILLAR BAR FORMAT:                                         │
  │    10 characters total.                                     │
  │    Filled chars = floor(score), e.g. 6.5 → 6 filled.       │
  │    '█' = filled, '░' = empty.                               │
  │    Example score 7: ███████░░░                              │
  └─────────────────────────────────────────────────────────────┘
-->

### `{{ORG_NAME}}/{{REPO_NAME}}`

**Language:** {{LANGUAGE}}  |  **Description:** {{DESCRIPTION}}  |  **Score:** {{SCORE}}/10  |  **Risk:** {{RISK}}  |  **Maturity:** {{MATURITY}}  |  **Scan time:** {{DURATION_MS}}ms

| Pillar | Score | Bar |
|--------|------:|-----|
| Security     | {{SEC_SCORE}} | `{{SEC_BAR}}` |
| Governance   | {{GOV_SCORE}} | `{{GOV_BAR}}` |
| Community    | {{COM_SCORE}} | `{{COM_BAR}}` |
| AI Readiness | {{AI_SCORE}}  | `{{AI_BAR}}`  |
| Inclusive    | {{INC_SCORE}} | `{{INC_BAR}}` |
| Technical    | {{TEC_SCORE}} | `{{TEC_BAR}}` |

#### Critical Findings

<!--
  AGENT INSTRUCTIONS:
  - Pull findings where severity == "CRITICAL" from the scan JSON.
  - Deduplicate: if the same message appears multiple times (same file
    pattern), show it once with a note like "(×12 files)".
  - For inclusive-naming/language categories: count total occurrences
    per term, then write ONE summary bullet listing term → count pairs
    rather than repeating the finding per file.
  - Include the file path if present (helps the developer find it fast).
  - Always include the suggestion field as a sub-bullet.
-->

- **[CRITICAL]** `{{CATEGORY}}`: {{MESSAGE}}
  - _Suggestion: {{SUGGESTION}}_
- **[CRITICAL]** `{{CATEGORY}}`: {{MESSAGE}} _(in `{{FILE}}`, line {{LINE}})_
  - _Suggestion: {{SUGGESTION}}_

<!--  Inclusive grouping example (use when ≥5 inclusive CRITICAL findings):
- **[CRITICAL]** `inclusive-naming/language`: {{TOTAL_COUNT}} occurrences of
  likely-technical terms (`abort` ×N, `whitelist` ×N, `master` ×N). Review
  context — many may be legitimate. See scanner issue #63.
-->

#### Warning Findings

<!--
  AGENT INSTRUCTIONS:
  - Group by category. Show: category name, count, one representative
    message, and the suggestion.
  - Cap at 10 categories. If more exist, add a final line:
    "…and N additional warning categories — see full scan JSON."
  - Sort by count descending.
-->

- **`{{CATEGORY}}`** ({{COUNT}}): {{SAMPLE_MESSAGE}}
  - _Suggestion: {{SUGGESTION}}_
- **`{{CATEGORY}}`** ({{COUNT}}): {{SAMPLE_MESSAGE}}
  - _Suggestion: {{SUGGESTION}}_

#### Recommendations

<!--
  AGENT INSTRUCTIONS:
  - Pull from the recommendations array in the scan JSON.
  - Deduplicate by action text.
  - Show top 6, sorted by priority field ascending.
  - Include impact and effort fields from the JSON.
-->

1. {{RECOMMENDATION}} _(impact: {{IMPACT}}, effort: {{EFFORT}})_
2. {{RECOMMENDATION}} _(impact: {{IMPACT}}, effort: {{EFFORT}})_
3. {{RECOMMENDATION}} _(impact: {{IMPACT}}, effort: {{EFFORT}})_
4. {{RECOMMENDATION}} _(impact: {{IMPACT}}, effort: {{EFFORT}})_
5. {{RECOMMENDATION}} _(impact: {{IMPACT}}, effort: {{EFFORT}})_
6. {{RECOMMENDATION}} _(impact: {{IMPACT}}, effort: {{EFFORT}})_

---

<!--  ↑ End of per-repo block. Copy and repeat for each repo.  -->

## Appendix: Backlog User Stories

<!--
  ┌──────────────────────────────────────────────────────────────────┐
  │  AGENT INSTRUCTIONS — HOW TO GENERATE USER STORIES              │
  │                                                                  │
  │  For each repo:                                                  │
  │  1. Collect all unique finding categories from CRITICAL and      │
  │     WARNING findings in that repo's scan JSON.                   │
  │  2. For each category, look it up in the "Common Story           │
  │     Templates" table at the bottom of this file.                 │
  │  3. If found: copy the story verbatim, set severity emoji        │
  │     (🔴 CRITICAL, 🟡 WARNING), and number it sequentially.       │
  │  4. If NOT found in the template table: write a new story using  │
  │     this formula:                                                │
  │       - Role: who is most affected (maintainer/developer/        │
  │               contributor/user)                                  │
  │       - Want: derive from the finding's "suggestion" field       │
  │       - Outcome: derive from the finding's "message" field —     │
  │               what goes wrong if this isn't fixed?               │
  │  5. Order: all 🔴 CRITICAL stories first, then 🟡 WARNING.       │
  │  6. Number stories sequentially within each repo (1, 2, 3…).    │
  │  7. Skip PASS and INFO findings — they don't generate stories.   │
  │  8. Skip duplicate categories — one story per category per repo. │
  └──────────────────────────────────────────────────────────────────┘
-->

User stories derived from CRITICAL and WARNING findings. Each story is scoped to a single
actionable change. Grouped by repo, CRITICAL stories first.

> **Format:** `As a [role], I want [change] so that [outcome].`

### `{{REPO_NAME}}`

**Story 1** 🔴 `{{CATEGORY}}`
> As a {{ROLE}}, I want to {{WANT}} so that {{OUTCOME}}.

**Story 2** 🔴 `{{CATEGORY}}`
> As a {{ROLE}}, I want to {{WANT}} so that {{OUTCOME}}.

**Story 3** 🟡 `{{CATEGORY}}`
> As a {{ROLE}}, I want to {{WANT}} so that {{OUTCOME}}.

<!--  ↑ Repeat story block per unique category per repo.  -->

---

## Common Story Templates by Category

<!--
  Reference bank for the Backlog section above.
  When a finding category matches a row here, copy the story.
  This table intentionally stays in the published report as a
  reference for anyone extending the backlog manually.
-->

| Category | Role | Want | Outcome |
|----------|------|------|---------|
| `vendor-neutrality` | maintainer | add a GOVERNANCE.md documenting the contribution process and inviting external contributors | the project signals it welcomes community ownership beyond a single vendor |
| `openssf-scorecard` | maintainer | integrate OpenSSF Scorecard via the scorecard-action GitHub Action and add the badge to README | supply-chain risk is continuously measured and publicly visible |
| `token-permissions` | maintainer | add `permissions: read-all` at the top level of every GitHub Actions workflow file | workflows follow the principle of least privilege for GITHUB_TOKEN |
| `dependency-pinning` | maintainer | pin all dependencies to exact versions (or SHAs for Actions) and commit a lock file | dependency substitution attacks and unexpected upstream breakage are mitigated |
| `test-coverage` | developer | add a test suite with a coverage threshold of ≥80% | regressions are caught before merge and contributors have a safety net |
| `license-detection-scanner` | maintainer | add an OSI-approved LICENSE file (e.g. Apache-2.0 or MIT) to the repository root | adopters know under what terms they can use and contribute to the project |
| `license-header-scanner` | developer | add SPDX license headers to all source files | every file is unambiguously licensed and compliant with the REUSE specification |
| `license-validation` | maintainer | ensure the LICENSE file contains a recognized SPDX identifier | automated tooling can correctly classify the project license |
| `license-compatibility` | maintainer | audit dependency licenses for compatibility with the project license | legal risk from incompatible transitive licenses is identified and resolved |
| `psych-safety` | contributor | add a CODE_OF_CONDUCT.md (e.g. Contributor Covenant) to the repository | all contributors know the community standards and feel safe participating |
| `support-channels` | user | add a SUPPORT.md documenting where to ask questions (GitHub Discussions, Discord, etc.) | users know how to get help without filing bug reports for support questions |
| `interaction-templates` | contributor | add GitHub Issue and Pull Request templates | bug reports and PRs include the information maintainers need to triage them efficiently |
| `contributor-data` | maintainer | document a contributor ladder in CONTRIBUTING.md and publicize it | potential contributors understand the path from first-time contributor to maintainer |
| `contributor-funnel` | maintainer | add a CONTRIBUTING.md with a step-by-step first-contribution guide | the ratio of casual to regular contributors improves over time |
| `funding` | maintainer | add a FUNDING.yml pointing to GitHub Sponsors, Open Collective, or similar | users can financially support the project's long-term sustainability |
| `stale-bot` | maintainer | configure a stale-bot (`stale.yml`) to auto-close inactive issues after 60 days | the issue tracker remains actionable and maintainer burden is reduced |
| `burnout-detection` | maintainer | distribute maintainer responsibilities by documenting and recruiting co-maintainers | single-maintainer bus-factor risk is reduced |
| `issue-closure` | maintainer | triage open issues to establish a consistent response cadence | contributors receive timely feedback and the issue backlog stays meaningful |
| `branch-protection` | maintainer | enable branch protection on the default branch requiring PR reviews and status checks | direct pushes to main are prevented and all changes go through review |
| `bus-factor` | maintainer | onboard at least one additional code owner with merge rights | the project can continue if the primary maintainer is unavailable |
| `response-time` | maintainer | set up GitHub saved replies and triage labels to reduce first-response time to issues | contributors are not left waiting and the project appears actively maintained |
| `linting` | developer | add an ESLint / Ruff / golangci-lint config and enforce it in CI | code style is consistent and reviewers focus on logic rather than formatting |
| `semver` | maintainer | create an initial SemVer git tag (e.g. v0.1.0) and set up a release workflow | users can pin to stable releases and changelogs are machine-readable |
| `release-cadence` | maintainer | publish a CHANGELOG and automate releases via GitHub Actions | users can track what changed between versions without reading raw commits |
| `inclusive-naming` | developer | replace non-inclusive terms (whitelist→allowlist, blacklist→denylist, master→main) in source and docs | the codebase aligns with Inclusive Naming Initiative guidelines |
| `diminishing-language` | contributor | audit documentation for diminishing language ("just", "simply", "obviously") and rewrite for clarity | documentation is welcoming to contributors of all experience levels |
| `assumed-knowledge` | contributor | expand README acronyms on first use and add a Prerequisites section | new contributors are not blocked by unexplained jargon or missing setup steps |
| `welcoming-score` | maintainer | review community health files (README, CONTRIBUTING, CoC) for welcoming and inclusive tone | first-time contributors feel invited to participate |
| `model-card-scoring` | maintainer | add a model card section to README documenting intended use, limitations, and evaluation results | AI governance requirements are met and downstream users can assess the model appropriately |
| `missing-prerequisites` | contributor | add a Prerequisites section to README listing required tools and versions | setup friction for new contributors is eliminated |
| `undefined-acronym` | contributor | expand all acronyms on first use throughout documentation | readers unfamiliar with the domain can follow the documentation without a glossary |

---

*Report generated by [quaid-scanner](https://github.com/quaid/quaid-scanner) v{{TOOL_VERSION}}*
