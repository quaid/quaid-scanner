# Configuration Reference

quaid-scanner can be configured via a `.quaid-scanner.yaml` file placed in the repository root or any parent directory.

## Config File Discovery

The scanner searches for configuration in this order:

1. Path specified by `--config` CLI flag
2. `.quaid-scanner.yaml` in the scanned repository root
3. `.quaid-scanner.yaml` in parent directories (walking up)
4. Default configuration

## Full Configuration Schema

```yaml
# .quaid-scanner.yaml

# Maturity level override (default: auto-detect)
# Values: sandbox, incubating, graduated, archived
maturity: auto

# Scan depth (default: standard)
# Values: quick, standard, thorough
depth: standard

# Output format (default: json)
# Values: json, markdown
format: json

# Write output to file instead of stdout
output: null

# Minimum passing score (0-10). Exit code 1 if below.
threshold: null

# Suppress progress output
quiet: false

# Show detailed progress
verbose: false

# Per-scanner timeout in milliseconds (default: 30000)
scannerTimeout: 30000

# Pillar configuration
pillars:
  # Disable entire pillars by name
  disabled:
    - ai_readiness  # Skip AI-Readiness pillar

  # Override default pillar weights (must sum to 1.0)
  weights:
    security: 0.30
    governance: 0.20
    community: 0.15
    ai_readiness: 0.10
    inclusive: 0.15
    technical: 0.10

  # Disable individual scanners by name
  disabledScanners:
    - vendor-neutrality
    - diminishing-language

# Bot filtering for community metrics
bots:
  # Enable bot filtering (default: true)
  enabled: true

  # Additional usernames to treat as bots
  additional:
    - my-internal-bot
    - release-bot

  # Usernames to exclude from bot detection
  exclude:
    - real-user-with-bot-suffix

# Inclusive language configuration
inclusive:
  # Custom term list URL (overrides built-in list)
  termListUrl: null

  # Add custom terms beyond the built-in list
  customTerms:
    legacy-term:
      - term: legacy-term
        tier: 2
        replacements: [preferred-term]
        reason: Company style guide

  # Terms to ignore (will not be flagged)
  ignoredTerms:
    - whitespace
    - blackbox

  # File patterns to exclude from scanning
  excludePatterns:
    - "vendor/**"
    - "third_party/**"
    - "*.min.js"
```

## Section Reference

### `pillars`

Control which pillars and scanners run.

| Field | Type | Description |
|-------|------|-------------|
| `disabled` | string[] | Pillar names to skip entirely |
| `weights` | object | Custom weight overrides (must sum to 1.0) |
| `disabledScanners` | string[] | Individual scanner names to skip |

Valid pillar names: `security`, `governance`, `community`, `ai_readiness`, `inclusive`, `technical`

### `bots`

Configure bot detection for community metrics (response times, contributor analysis).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable bot filtering |
| `additional` | string[] | `[]` | Extra usernames to treat as bots |
| `exclude` | string[] | `[]` | Usernames to not treat as bots |

Built-in bot detection matches:
- Usernames ending in `[bot]` or `-bot`
- Known bots: dependabot, renovate, codecov, greenkeeper, snyk-bot, etc.
- Boilerplate comment content patterns

### `inclusive`

Configure the inclusive language scanners.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `termListUrl` | string | `null` | URL to custom term list JSON |
| `customTerms` | object | `{}` | Additional terms to flag |
| `ignoredTerms` | string[] | `[]` | Terms to skip |
| `excludePatterns` | string[] | `[]` | Glob patterns for files to skip |

Each custom term entry has:

| Field | Type | Description |
|-------|------|-------------|
| `term` | string | The term to flag |
| `tier` | 1 \| 2 \| 3 | Severity tier (1=replace immediately, 2=strongly consider, 3=consider) |
| `replacements` | string[] | Suggested alternatives |
| `reason` | string | Why this term should be replaced |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub personal access token for API-dependent scanners |

## CLI Flags Override Config File

CLI flags always take precedence over config file values:

```bash
# Config file says depth: thorough, but CLI overrides to quick
quaid-scanner . --depth quick
```

## Minimal Config Examples

### CI Pipeline (fast, strict)

```yaml
depth: quick
threshold: 7.0
quiet: true
format: json
```

### Security-Focused Audit

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
```

### Skip Inclusive Language for Legacy Code

```yaml
inclusive:
  excludePatterns:
    - "legacy/**"
    - "vendor/**"
    - "*.generated.*"
  ignoredTerms:
    - whitespace
    - blacklist  # Used in firewall config naming
```
