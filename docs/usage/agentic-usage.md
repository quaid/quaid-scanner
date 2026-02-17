# Agentic Usage Guide

quaid-scanner is designed agent-first. This guide covers how AI coding agents (Claude Code, Cursor, Copilot, custom agents) can use it effectively.

---

## Why Agent-First?

The default JSON output is structured for machine consumption. Agents can parse the `ScanReport` schema directly, prioritize work using the `recommendations` array, and track progress across repeated scans. Human-readable markdown is available via `--format markdown` but JSON is the primary interface.

---

## Quick Integration

### Run a scan and capture output

```bash
quaid-scanner . --format json --quiet 2>/dev/null
```

The `--quiet` flag suppresses progress output. Redirecting stderr ensures only the JSON report reaches the agent.

### Recommended flags for agents

| Flag | Value | Why |
|------|-------|-----|
| `--format` | `json` | Machine-parseable output |
| `--quiet` | (flag) | No progress noise |
| `--depth` | `quick` | Fast feedback loop during active work |
| `--depth` | `standard` | Full analysis for planning or evaluation |

---

## Understanding the JSON Output

The scan produces a `ScanReport` object. Here are the key fields an agent should use:

### Top-level summary

```json
{
  "overallScore": 7.2,
  "riskLevel": "MEDIUM",
  "maturity": "incubating"
}
```

- `overallScore`: 0-10 composite across all pillars. Above 7 is healthy. Below 5 needs attention.
- `riskLevel`: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- `maturity`: Detected or overridden maturity level. Scoring expectations scale with maturity.

### Pillar scores

```json
{
  "pillars": {
    "security": {
      "score": 6.5,
      "weight": 0.25,
      "weightedScore": 1.625,
      "counts": { "critical": 1, "warning": 3, "info": 2, "pass": 8 }
    }
  }
}
```

Use pillar scores to identify which area needs the most work. The pillar with the lowest score and highest weight has the most impact on the overall score.

### Findings

```json
{
  "findings": [
    {
      "id": "dep-pinning-packages-1",
      "severity": 2,
      "pillar": "security",
      "category": "Dependency Pinning",
      "message": "requirements.txt contains 3 unpinned dependencies",
      "file": "requirements.txt",
      "line": 5,
      "suggestion": "Pin all dependencies to exact versions using == operator"
    }
  ]
}
```

Severity values: `-1` (PASS), `0` (INFO), `1` (WARNING), `2` (CRITICAL).

Agents should focus on `severity: 2` findings first. The `file`, `line`, and `suggestion` fields give agents enough context to make fixes directly.

### Recommendations

```json
{
  "recommendations": [
    {
      "priority": 1,
      "action": "Pin unpinned dependencies in requirements.txt",
      "impact": "high",
      "effort": "low",
      "findingIds": ["dep-pinning-packages-1", "dep-pinning-packages-2"]
    }
  ]
}
```

The `recommendations` array is pre-sorted by priority. Agents should work through them in order — high-impact, low-effort items come first.

---

## Prompt Patterns

### Initial repository assessment

```
Run `quaid-scanner . --format json --quiet` and summarize the results.
Identify the three lowest-scoring pillars and list the critical findings
for each. Suggest which issues I should address first based on the
recommendations array.
```

### Fix critical findings

```
Run `quaid-scanner . --format json --quiet` and fix all critical
(severity 2) findings that you can address by editing files in this
repository. Skip findings that require external actions like configuring
GitHub branch protection. After making changes, re-run the scan to
verify improvements.
```

### Pre-commit health check

```
Before committing, run `quaid-scanner . --depth quick --format json --quiet`
and warn me if any new critical findings appeared compared to the
previous scan.
```

### Adoption evaluation

```
Run `quaid-scanner https://github.com/owner/repo --depth thorough --format json --quiet`
and give me a go/no-go recommendation for adopting this dependency.
Focus on: security posture, maintenance activity (is it abandoned?),
license compatibility with our Apache-2.0 project, and bus factor risk.
```

### Targeted pillar improvement

```
Run `quaid-scanner . --format json --quiet` and focus only on the
governance pillar. List every finding, explain what each one means,
and create the missing files (CONTRIBUTING.md, SECURITY.md, etc.)
with appropriate content for this project.
```

### Inclusive language cleanup

```
Run `quaid-scanner . --format json --quiet` and extract all inclusive
language findings. For each finding, show me the file, line, the
flagged term, and the suggested replacement. Then make all the
replacements.
```

---

## Agent Workflow Patterns

### Scan-Fix-Verify Loop

The most effective pattern for agents:

1. **Scan**: `quaid-scanner . --format json --quiet`
2. **Analyze**: Parse findings, sort by severity and recommendation priority
3. **Fix**: Address the highest-priority actionable finding
4. **Verify**: Re-scan with `--depth quick` to confirm improvement
5. **Repeat**: Continue until no critical findings remain

### Differential Scanning

Compare before/after:

```bash
# Before changes
quaid-scanner . --format json --quiet --output before.json

# ... make changes ...

# After changes
quaid-scanner . --format json --quiet --output after.json
```

Agents can diff the two reports to confirm that changes improved the score without introducing regressions.

### Maturity-Aware Triage

For sandbox/early-stage projects, don't overwhelm. Focus on:
1. License file exists
2. README has basic content
3. No critical security issues (binary artifacts, unpinned deps)

For graduated/production projects, expect more:
1. All governance docs present
2. Multiple maintainers (bus factor > 1)
3. Community health signals (response times, contributor funnel)
4. Full inclusive language compliance

---

## Which Findings Are Agent-Actionable?

Not all findings can be fixed by an agent editing files. Here's a classification:

### Directly fixable by agents

| Scanner | What the agent can do |
|---------|----------------------|
| `license-detection` | Create a LICENSE file |
| `governance-detection` | Create CONTRIBUTING.md, SECURITY.md, CODEOWNERS |
| `psych-safety` | Create CODE_OF_CONDUCT.md |
| `support-channels` | Create SUPPORT.md |
| `funding` | Create .github/FUNDING.yml |
| `interaction-templates` | Create issue/PR templates in .github/ |
| `dep-pinning-packages` | Pin dependency versions in lockfiles |
| `dep-pinning-docker` | Pin Docker image tags and action versions |
| `binary-artifacts` | Add entries to .gitignore, remove binaries |
| `token-permissions` | Add explicit permissions to workflow files |
| `license-headers` | Add SPDX headers to source files |
| `inclusive-doc-scanner` | Replace flagged terms in documentation |
| `inclusive-code-scanner` | Replace flagged terms in code comments |
| `diminishing-language` | Rephrase patronizing language in docs |
| `assumed-knowledge` | Expand acronyms, add context for jargon |
| `stale-bot` | Adjust stale bot configuration thresholds |

### Require human or external action

| Scanner | Why it needs a human |
|---------|---------------------|
| `branch-protection` | Requires GitHub admin settings |
| `openssf-scorecard` | Aggregate of many external signals |
| `response-time` | Depends on maintainer behavior |
| `issue-closure` | Depends on maintainer triage |
| `burnout-detection` | Signals, not fixable by code changes |
| `bus-factor` | Needs more contributors over time |
| `vendor-neutrality` | Organizational, not code-level |
| `contributor-funnel` | Community growth, not code-level |
| `release-cadence` | Requires creating an actual release |

---

## CLAUDE.md / Rules File Integration

Add quaid-scanner to your project's agent rules file so agents run it automatically:

```markdown
## Repository Health

Before starting work on this repository, run:
\`\`\`bash
quaid-scanner . --depth quick --format json --quiet
\`\`\`

Address any critical findings before making other changes.
After completing work, re-scan to verify no regressions.
```

---

## MCP Server Integration

For agents that support MCP (Model Context Protocol), quaid-scanner's JSON output can be piped to an MCP tool or served as a resource. The structured `ScanReport` schema maps naturally to tool responses.

```bash
# Example: pipe scan results as context
SCAN_RESULT=$(quaid-scanner . --format json --quiet 2>/dev/null)
# Feed $SCAN_RESULT into agent context or MCP resource
```
