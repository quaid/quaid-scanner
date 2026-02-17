# quaid-scanner

Agent-first open source repository health scanner based on [CHAOSS metrics](https://chaoss.community/), [The Open Source Way 2.0](https://www.theopensourceway.org/), and the [Inclusive Naming Initiative](https://inclusivenaming.org/).

## What It Does

Evaluates repositories across six strategic pillars to produce a comprehensive health assessment:

| Pillar | Weight | Focus |
|--------|--------|-------|
| Security | 25% | Supply chain integrity, dependency pinning, branch protection |
| Governance | 20% | Licensing, governance structure, bus factor, vendor neutrality |
| Community | 15% | Response times, contributor funnel, burnout signals |
| AI-Readiness | 15% | Model cards and agentic rules |
| Inclusive Language | 15% | Accessible, welcoming language in docs and code |
| Technical Rigor | 10% | Release cadence, interaction templates |

## Quick Start

```bash
npm install -g quaid-scanner

# Scan a local repository
quaid-scanner /path/to/repo

# Scan a GitHub repository
GITHUB_TOKEN=ghp_xxxx quaid-scanner https://github.com/owner/repo

# Scan current directory
quaid-scanner .
```

## Requirements

- Node.js >= 18.0.0
- Git (for local repository scanning)
- GitHub token (optional, enables API-dependent scanners)

## CLI Options

```
quaid-scanner [options] [target]

Options:
  --depth <level>       quick, standard, or thorough (default: standard)
  --format <type>       json or markdown (default: json)
  --output <file>       Write output to file
  --config <file>       Path to .quaid-scanner.yaml
  --threshold <score>   Minimum score (0-10); exit 1 if below
  --maturity <level>    sandbox, incubating, graduated, archived, or auto
  --quiet               Suppress progress output
  --verbose             Show detailed progress
```

## Configuration

Place a `.quaid-scanner.yaml` in your repository root:

```yaml
depth: standard
threshold: 6.0
pillars:
  disabledScanners:
    - vendor-neutrality
inclusive:
  excludePatterns:
    - "vendor/**"
```

See the [Configuration Reference](docs/usage/configuration.md) for all options.

## Documentation

- [Getting Started](docs/usage/getting-started.md) - Installation, CLI reference, scan depth
- [Agentic Usage](docs/usage/agentic-usage.md) - Prompt patterns, agent workflows, actionable findings
- [Scanner Reference](docs/usage/scanners.md) - All 35+ checks across six pillars
- [Configuration](docs/usage/configuration.md) - `.quaid-scanner.yaml` options
- [Examples](docs/usage/examples.md) - CI/CD, agent workflows, security audits

## Development

```bash
git clone https://github.com/AINative-Studio/oss-repo-check.git
cd oss-repo-check
npm install
npm run build
npm test
```

## License

Apache-2.0
