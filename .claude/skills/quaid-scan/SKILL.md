---
name: quaid-scan
description: Scan an OSS repository for health, quality, and ecosystem position using quaid-scanner. Use when (1) asked to assess repo health or quality, (2) checking compliance with OSS best practices, (3) getting a scorecard before a PR or release, (4) analyzing rivals/partners/communities for a project. Returns structured findings across 6 pillars with actionable recommendations.
---

# quaid-scan Skill

Runs quaid-scanner against a local path or GitHub URL and interprets the results.

## 6 Pillars (weighted)

| Pillar | Weight | What it measures |
|--------|--------|-----------------|
| Security | 25% | Supply chain, branch protection, token permissions, OpenSSF Scorecard |
| Governance | 20% | License, bus factor, vendor neutrality, asset protection |
| Community | 15% | Contributor funnel, response time, burnout signals, funding |
| AI Readiness | 15% | Model cards, agentic rules, dataset provenance |
| Inclusive | 15% | INI terms, diminishing language, assumed knowledge |
| Technical | 10% | Linting, test coverage, SemVer/CHANGELOG consistency |

## CLI Reference

```bash
# Quick scan of current directory
node dist/cli.js . --depth quick

# Standard scan with JSON output
node dist/cli.js . --format json

# Thorough scan of a GitHub repo
node dist/cli.js https://github.com/owner/repo --depth thorough

# Markdown report to file
node dist/cli.js . --format markdown --output report.md

# With ecosystem intelligence (rivals, partners, community recommendations)
node dist/cli.js . --ecosystem

# With threshold (exit 2 if score < 6.0)
node dist/cli.js . --threshold 6.0

# Depth levels
# --depth quick     ~5s   — file presence checks, no API calls
# --depth standard  ~15s  — default, adds GitHub API checks
# --depth thorough  ~60s  — all checks including OpenSSF Scorecard API
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Score ≥ 8.0 (Low Risk) |
| 1 | Score 5.0–7.9 (Medium Risk) |
| 2 | Score < 5.0 (High/Critical Risk) or `--threshold` not met |

## How to Interpret Results

After running, interpret the JSON output:

```
overallScore: 3.3  → CRITICAL — immediate action needed on high-severity findings
riskLevel: CRITICAL

Priority order:
1. findings where severity = CRITICAL → block PR / release
2. findings where severity = WARNING  → schedule for sprint
3. recommendations[0..2]             → top actions by impact/effort ratio
```

### Severity Scale
- `CRITICAL (4)` — Blocks trust; fix before release
- `WARNING (3)` — Important gaps; schedule soon
- `INFO (2)` — Informational; low urgency
- `PASS (1)` — Check passed; no action needed

## Common Use Cases

### Before merging a PR
```bash
node dist/cli.js . --depth quick --threshold 5.0
# Exit 2 = fail CI; exit 0/1 = pass
```

### Weekly health check
```bash
node dist/cli.js . --format markdown --output weekly-health.md
```

### Analyze before pitching to a foundation
```bash
node dist/cli.js . --ecosystem --depth thorough --format json --output pre-pitch.json
# Check: ecosystem.rivals, ecosystem.recommendations, overallScore
```

### Check a dependency before adopting it
```bash
node dist/cli.js https://github.com/owner/repo --depth standard
```

## Ecosystem Intelligence (`--ecosystem`)

When `--ecosystem` is passed, the report gains a top-level `ecosystem` object:

```json
{
  "ecosystem": {
    "profile": { "domain": "oss-health", "ecosystems": ["OpenSSF"], "standards": [...] },
    "rivals": [{ "name": "OpenSSF Scorecard", "role": "rival", "similarityScore": null }],
    "partners": [{ "name": "commander", "role": "upstream", "tags": ["dependency"] }],
    "userCommunities": [{ "name": "CHAOSS Community", "url": "...", "type": "forum" }],
    "recommendations": [{ "type": "foundation", "title": "Apply to OpenSSF...", "impact": "high" }],
    "dataSource": "static",
    "disclaimer": "..."
  }
}
```

`dataSource` values:
- `"static"` — from built-in taxonomy (ZeroDB not needed)
- `"zerodb-assisted"` — < 10 similar repos found in vector index
- `"zerodb-full"` — 10+ similar repos found

## Build First

The skill requires a built project:
```bash
cd /path/to/quaid-scanner && npm run build
```
