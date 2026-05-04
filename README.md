# quaid-scanner

[![npm version](https://img.shields.io/npm/v/quaid-scanner.svg)](https://www.npmjs.com/package/quaid-scanner)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

**Agent-first OSS repository health scanner.** Evaluates any open source project across six strategic pillars and returns structured findings for agents, CI pipelines, or humans.

Built on [CHAOSS metrics](https://chaoss.community/), [The Open Source Way 2.0](https://www.theopensourceway.org/), and the [Inclusive Naming Initiative](https://inclusivenaming.org/).

---

## Install

```bash
npm install -g quaid-scanner
```

Or run without installing:

```bash
npx quaid-scanner . --depth quick
```

**Requirements:** Node.js ≥ 18, Git

---

## Quick Start

```bash
# Scan the current directory
quaid-scanner .

# Scan a GitHub repository
GITHUB_TOKEN=ghp_xxxx quaid-scanner https://github.com/owner/repo

# Scan with markdown output to file
quaid-scanner . --format markdown --output report.md

# Scan with a minimum score threshold (exits 2 if score < 6.0)
quaid-scanner . --threshold 6.0

# Include ecosystem intelligence (rivals, partners, strategy)
quaid-scanner . --ecosystem

# Full thorough scan with everything
quaid-scanner . --depth thorough --ecosystem --format markdown --output full-report.md
```

---

## What It Scans

46 checks across six weighted pillars:

| Pillar | Weight | What it measures |
|--------|--------|-----------------|
| **Security** | 25% | Binary artifacts, branch protection, dependency pinning, token permissions, OpenSSF Scorecard |
| **Governance** | 20% | License detection/validation/compatibility, bus factor, vendor neutrality, asset protection |
| **Community** | 15% | Contributor funnel, burnout signals, response time, psychological safety, funding, support channels |
| **AI Readiness** | 15% | Model cards, agentic rules (Claude/Cursor/Windsurf), dataset provenance, multi-model detection |
| **Inclusive Language** | 15% | INI term scanning in source, docs, and naming; diminishing and assumed-knowledge language |
| **Technical Rigor** | 10% | Linter config, test coverage, SemVer/release cadence, interaction templates |

---

## CLI Reference

```
quaid-scanner [target] [options]

Arguments:
  target                  Local path or GitHub URL (default: current directory)

Options:
  --depth <level>         quick (~5s), standard (~15s), thorough (~60s)  [default: standard]
  --format <type>         json or markdown  [default: json]
  --output <file>         Write output to file instead of stdout
  --config <file>         Path to .quaid-scanner.yaml config file
  --threshold <score>     Minimum acceptable score (0–10); exit 2 if below
  --maturity <level>      sandbox | incubating | graduated | archived | auto  [default: auto]
  --ecosystem             Run ecosystem intelligence (rivals, partners, communities, strategy)
  --ecosystem-depth       static | assisted  [default: static]
  --quiet                 Suppress progress output (clean stdout for piping)
  --verbose               Show per-scanner progress
  -h, --help              Show help
  -V, --version           Show version
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Score ≥ 8.0 — Low Risk |
| `1` | Score 5.0–7.9 — Medium Risk |
| `2` | Score < 5.0 — High/Critical Risk, or `--threshold` not met |

---

## Example Output

```json
{
  "repo": "owner/my-project",
  "overallScore": 7.2,
  "riskLevel": "MEDIUM",
  "maturity": "incubating",
  "pillars": {
    "security": { "score": 6.1, "weight": 0.25 },
    "governance": { "score": 8.4, "weight": 0.20 },
    "community": { "score": 7.8, "weight": 0.15 },
    "ai-readiness": { "score": 5.5, "weight": 0.15 },
    "inclusive": { "score": 9.0, "weight": 0.15 },
    "technical": { "score": 7.0, "weight": 0.10 }
  },
  "findings": [
    {
      "severity": "CRITICAL",
      "pillar": "security",
      "category": "dep-pinning-packages",
      "message": "package-lock.json absent — dependencies not pinned",
      "suggestion": "Run npm install to generate a lock file and commit it"
    }
  ],
  "recommendations": [
    { "priority": 1, "action": "Add package-lock.json to version control" }
  ]
}
```

---

## Configuration

Create `.quaid-scanner.yaml` in your repo root:

```yaml
depth: standard
threshold: 6.0
pillars:
  disabledScanners:
    - vendor-neutrality
inclusive:
  excludePatterns:
    - "vendor/**"
    - "node_modules/**"
```

Full options: [docs/usage/configuration.md](docs/usage/configuration.md)

---

## Agentic Use

quaid-scanner is designed **agent-first**. JSON output is the primary interface; markdown is secondary.

### Claude Code Skill

If you use Claude Code, the `/quaid-scan` skill is included:

```
/quaid-scan .
/quaid-scan https://github.com/owner/repo --depth thorough
/quaid-scan . --ecosystem
```

The skill interprets findings, explains severity, and suggests next steps in plain language.

### MCP Server

Add to your `.mcp.json` to expose `scan_repository` and `graph_query` as agent tools:

```json
{
  "mcpServers": {
    "quaid-scanner": {
      "command": "npx",
      "args": ["quaid-scanner/dist/mcp.js"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "quaid-scanner": {
      "command": "node",
      "args": ["/path/to/node_modules/quaid-scanner/dist/mcp.js"]
    }
  }
}
```

**MCP tools exposed:**

| Tool | What it does |
|------|-------------|
| `scan_repository` | Full health scan — returns `ScanReport` JSON |
| `graph_query` | Query the OSS social graph for a repo (requires ZeroDB) |

### Prompt Patterns

**Before adopting a dependency:**
```
Scan https://github.com/owner/repo with quaid-scanner at standard depth.
Summarize the top 3 risks and whether I should depend on this project.
```

**Before a release:**
```
Run quaid-scanner on the current directory at thorough depth with --threshold 7.0.
Block the release if exit code is 2. For any CRITICAL findings, open GitHub issues.
```

**Portfolio audit:**
```
Scan these 5 repos with quaid-scanner --depth quick --format json --quiet,
sort by overallScore ascending, and summarize the bottom 2 for remediation.
```

**Ecosystem positioning:**
```
Run quaid-scanner . --ecosystem --format json.
From the ecosystem section, identify the top 3 rivals and suggest one
differentiation message for each based on our pillar scores.
```

### Agent-Friendly Flags

```bash
# Silent JSON — ideal for piping into jq or agent parsers
quaid-scanner . --quiet --format json

# Capture to variable in bash
REPORT=$(quaid-scanner . --quiet --format json)
SCORE=$(echo "$REPORT" | jq '.overallScore')

# Write to file then read (avoids stdout buffering on large repos)
quaid-scanner . --quiet --format json --output /tmp/scan.json
```

Full agentic patterns: [docs/usage/agentic-usage.md](docs/usage/agentic-usage.md)

---

## Ecosystem Intelligence

The `--ecosystem` flag runs a parallel analysis that does **not** affect `overallScore`:

```bash
quaid-scanner . --ecosystem --format json | jq '.ecosystem'
```

Returns:
- **`profile`** — detected domain, foundations, standards, topics
- **`rivals`** — competing projects with similarity scores
- **`partners`** — integration/dependency relationships
- **`userCommunities`** — forums, Slack, Discord, conferences to engage
- **`recommendations`** — ranked strategic actions (join a foundation, adopt a standard, etc.)
- **`dataSource`** — `static` | `zerodb-assisted` | `zerodb-full`

---

## OSS Social Graph

Requires ZeroDB (`ZERODB_API_URL`, `ZERODB_API_KEY`, `ZERODB_PROJECT_ID`).

Each scan registers the repo as a node. After multiple scans across related projects, the graph enables:

```bash
# Who depends on this repo?
quaid-scanner . --format json | jq '.graph.reverseDependents'

# What should we know about?
quaid-scanner . --format json | jq '.graph.discoveryFeed'
```

Or via MCP:
```
graph_query(repo: "owner/my-project", hops: 2, edgeTypes: ["depends_on"])
```

---

## CI/CD Integration

```yaml
# GitHub Actions
- name: OSS Health Check
  run: |
    npx quaid-scanner . --depth standard --threshold 5.0 --format json --output scan-report.json
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Upload scan report
  uses: actions/upload-artifact@v4
  with:
    name: quaid-scan-report
    path: scan-report.json
```

---

## Development

```bash
git clone https://github.com/quaid/quaid-scanner.git
cd quaid-scanner
npm install
npm run build
npm test
npm run test:coverage
```

**Adding a scanner:** See [docs/usage/scanners.md](docs/usage/scanners.md) for the plugin interface. All scanners implement `Scanner` from `src/types/index.ts`.

---

## Documentation

| Doc | Contents |
|-----|---------|
| [Getting Started](docs/usage/getting-started.md) | Installation, first scan, scan depth |
| [Scanner Reference](docs/usage/scanners.md) | All 46 checks with thresholds and remediation |
| [Agentic Usage](docs/usage/agentic-usage.md) | Prompt patterns, agent workflows, MCP setup |
| [Configuration](docs/usage/configuration.md) | `.quaid-scanner.yaml` full reference |
| [Examples](docs/usage/examples.md) | CI/CD, portfolio scanning, security audits |

---

## License

[Apache-2.0](LICENSE) — Karsten Wade
