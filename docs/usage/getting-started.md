# Getting Started with quaid-scanner

## What is quaid-scanner?

quaid-scanner is an agent-first open source repository health scanner. It evaluates repositories across six strategic pillars — Security, Governance, Community, AI-Readiness, Inclusive Language, and Technical Rigor — to produce a comprehensive health assessment.

The scanner is designed primarily for AI coding agents (Claude, Copilot, Cursor) but works equally well when invoked directly by humans.

## Installation

### From npm (recommended)

```bash
npm install -g quaid-scanner
```

### From source

```bash
git clone https://github.com/AINative-Studio/oss-repo-check.git
cd oss-repo-check
npm install
npm run build
```

After building from source, run via:

```bash
node dist/cli.js <target>
```

### Requirements

- Node.js >= 18.0.0
- Git (for local repository scanning)
- GitHub token (optional, enables API-dependent scanners)

## Quick Start

### Scan a local repository

```bash
quaid-scanner /path/to/repo
```

### Scan a GitHub repository

```bash
quaid-scanner https://github.com/owner/repo
```

### Scan with GitHub token (enables full analysis)

```bash
GITHUB_TOKEN=ghp_xxxx quaid-scanner https://github.com/owner/repo
```

### Scan current directory

```bash
quaid-scanner .
```

## CLI Reference

```
Usage: quaid-scanner [options] [target]

Agent-first OSS repository health scanner based on CHAOSS metrics,
The Open Source Way 2.0, and Inclusive Naming Initiative

Arguments:
  target                  Path to local repo or GitHub URL

Options:
  -V, --version           Output the version number
  --depth <level>         Scan depth: quick, standard, or thorough (default: "standard")
  --format <type>         Output format: json or markdown (default: "json")
  --output <file>         Write output to file instead of stdout
  --config <file>         Path to .quaid-scanner.yaml config file
  --threshold <score>     Minimum score (0-10); exit with failure if below
  --maturity <level>      Maturity level: sandbox, incubating, graduated, archived, or auto (default: "auto")
  --quiet                 Suppress progress output
  --verbose               Show detailed progress
  -h, --help              Display help for command
```

## Scan Depth

| Depth | Description | Use Case |
|-------|-------------|----------|
| `quick` | Fast checks only (file existence, basic patterns) | CI pipelines, quick assessments |
| `standard` | All local checks + API queries (default) | Regular health checks |
| `thorough` | Full analysis including historical trends | Detailed audits, adoption decisions |

## Maturity Levels

Scoring is contextual — a sandbox project is not penalized for lacking the governance of a graduated project.

| Level | Description | Expectations |
|-------|-------------|-------------|
| `sandbox` | Early-stage, experimental | Single maintainer OK, basic docs |
| `incubating` | Growing adoption | 2-3 maintainers, complete docs |
| `graduated` | Production-ready | 3+ maintainers, governance docs |
| `archived` | Maintenance mode | Stable, security patches only |
| `auto` | Auto-detect from signals (default) | Stars, contributors, releases |

Override with `--maturity`:

```bash
quaid-scanner . --maturity sandbox     # Expect less
quaid-scanner . --maturity graduated   # Expect enterprise-grade
```

## Output Formats

### JSON (default)

Machine-readable output for agent consumption:

```bash
quaid-scanner . --format json
```

### Markdown

Human-readable report:

```bash
quaid-scanner . --format markdown --output report.md
```

## GitHub Token

Many scanners query the GitHub API for richer analysis. Without a token, these scanners return INFO findings instead.

### Scanners requiring GitHub token

- Branch Protection Audit
- OpenSSF Scorecard
- Response Time Collection
- Response Time Classification
- Issue Closure Metrics
- Burnout Detection
- Release Cadence

### Setup

```bash
# Via environment variable
export GITHUB_TOKEN=ghp_your_token_here
quaid-scanner https://github.com/owner/repo

# Via command line
GITHUB_TOKEN=ghp_xxxx quaid-scanner .
```

The token needs `repo` read access. For public repositories, a fine-grained token with `public_repo` scope is sufficient.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Scan completed successfully |
| 1 | Scan completed but score below `--threshold` |
| 2 | Configuration or input error |

## Next Steps

- [Configuration Reference](./configuration.md) for `.quaid-scanner.yaml` options
- [Scanner Reference](./scanners.md) for the full list of checks
- [Examples](./examples.md) for common workflow patterns
