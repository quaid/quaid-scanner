# Examples

Common workflow patterns for quaid-scanner.

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Repository Health Check
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday
  push:
    branches: [main]

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for contributor analysis

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install -g quaid-scanner

      - name: Run health scan
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: quaid-scanner . --format json --threshold 6.0 --quiet
```

### Gate PRs on Minimum Score

```yaml
name: Health Gate
on: pull_request

jobs:
  health-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - run: npm install -g quaid-scanner

      - name: Check repository health
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: quaid-scanner . --depth quick --threshold 5.0 --quiet
```

### Generate Markdown Report Artifact

```yaml
- name: Generate report
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: quaid-scanner . --format markdown --output health-report.md

- uses: actions/upload-artifact@v4
  with:
    name: health-report
    path: health-report.md
```

---

## Agent Workflows

### Claude Code

```bash
# Scan before starting work on a new repo
quaid-scanner . --format json

# Quick check after making changes
quaid-scanner . --depth quick --format json --quiet
```

### Cursor / Copilot

Invoke via terminal:

```bash
quaid-scanner /path/to/repo --format json
```

Parse the JSON output to identify areas needing attention before suggesting changes.

---

## Adoption Evaluation

### Evaluate a GitHub Project

```bash
export GITHUB_TOKEN=ghp_your_token

# Full analysis for adoption decision
quaid-scanner https://github.com/facebook/react --depth thorough --format markdown --output react-evaluation.md
```

### Compare Multiple Projects

```bash
export GITHUB_TOKEN=ghp_your_token

for repo in facebook/react vuejs/core sveltejs/svelte; do
  echo "=== $repo ==="
  quaid-scanner "https://github.com/$repo" --depth standard --format json --quiet
  echo
done
```

---

## Security Auditing

### Security-Focused Config

Create `.quaid-scanner.yaml`:

```yaml
depth: thorough
pillars:
  weights:
    security: 0.40
    governance: 0.25
    community: 0.10
    ai_readiness: 0.05
    inclusive: 0.10
    technical: 0.10
  disabledScanners: []
```

```bash
GITHUB_TOKEN=ghp_xxxx quaid-scanner . --threshold 7.0
```

### Supply Chain Audit

```bash
# Check dependency pinning and binary artifacts
quaid-scanner . --depth thorough --format json | \
  jq '.findings[] | select(.pillar == "security")'
```

---

## Maturity Assessment

### Evaluate as Sandbox Project

```bash
# Lenient scoring for early-stage projects
quaid-scanner . --maturity sandbox
```

### Graduated Project Audit

```bash
# Strict scoring for production-grade expectations
quaid-scanner . --maturity graduated --threshold 7.5 --format markdown --output audit.md
```

---

## Selective Scanning

### Disable Specific Pillars

```yaml
# .quaid-scanner.yaml
pillars:
  disabled:
    - ai_readiness
    - inclusive
```

### Disable Individual Scanners

```yaml
# .quaid-scanner.yaml
pillars:
  disabledScanners:
    - vendor-neutrality    # Single-company project
    - stale-bot            # No stale bot configured
```

---

## Output Processing

### Extract Critical Findings

```bash
quaid-scanner . --format json --quiet | \
  jq '[.findings[] | select(.severity == 2)] | length'
```

### Pillar Scores Only

```bash
quaid-scanner . --format json --quiet | \
  jq '.pillars | to_entries[] | {pillar: .key, score: .value.score}'
```

### Filter by Pillar

```bash
quaid-scanner . --format json --quiet | \
  jq '[.findings[] | select(.pillar == "governance")]'
```
