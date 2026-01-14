# OSS Repository Health Scanner - PRD & Implementation Plan

## Executive Summary

Create `oss-repo-check` - a **Node.js package** with Claude Code skills integration that analyzes open source repositories for community health, sustainability practices, and inclusive language. Deployable via npm, usable both as CLI tool and Claude skill.

Based on research from The Open Source Way guidebook, CHAOSS metrics models, and the Inclusive Naming Initiative.

---

## Package Architecture

```
oss-repo-check/
├── package.json                    # npm package config
├── tsconfig.json                   # TypeScript config
├── src/
│   ├── index.ts                    # Main entry point
│   ├── cli.ts                      # CLI interface
│   ├── scanner/
│   │   ├── index.ts                # Scanner orchestrator
│   │   ├── docs-checker.ts         # Essential docs scanning
│   │   ├── language-checker.ts     # Inclusive language detection
│   │   ├── knowledge-checker.ts    # Assumed knowledge detection
│   │   ├── health-checker.ts       # Community health metrics
│   │   └── github-api.ts           # GitHub API integration
│   ├── patterns/
│   │   ├── inclusive-terms.ts      # Word lists (Tier 1/2/3)
│   │   ├── diminishing-language.ts # "just", "simply", etc.
│   │   └── assumed-knowledge.ts    # Prerequisites patterns
│   ├── reporters/
│   │   ├── markdown.ts             # Markdown report generator
│   │   └── json.ts                 # JSON report generator
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── .claude/
│   └── skills/
│       └── oss-repo-scan/
│           ├── SKILL.md            # Claude skill definition
│           └── references/         # Reference documentation
├── tests/
│   ├── scanner.test.ts
│   ├── patterns.test.ts
│   └── fixtures/                   # Test repositories
└── docs/
    └── usage.md                    # Package documentation
```

---

## Research Summary

### Reference Works Analyzed

| Source | Key Contribution |
|--------|-----------------|
| **The Open Source Way** | 7-area community management framework: Getting Started → Attracting Users → Guiding Participants → Growing Contributors → Measuring Success |
| **CHAOSS Metrics** | 89 metrics, 17 models covering Activity, Contributors, D&I, Documentation, Project Health |
| **Inclusive Naming Initiative** | 3-tier word replacement system for non-inclusive terminology |

---

## Sustainable Community Practices Checklist

### Category 1: Essential Documentation (Critical)

- [ ] **README.md** - Project description, installation, usage, badges
- [ ] **CONTRIBUTING.md** - How to contribute, code style, process
- [ ] **CODE_OF_CONDUCT.md** - Behavioral expectations, enforcement
- [ ] **LICENSE** - Clear open source license
- [ ] **SECURITY.md** - Vulnerability reporting process
- [ ] **GOVERNANCE.md** - Decision-making process, maintainers

### Category 2: Contributor Experience (High Priority)

- [ ] **Issue templates** - Bug reports, feature requests, questions
- [ ] **PR templates** - Checklist, description requirements
- [ ] **Good first issues** - Labeled entry points for newcomers
- [ ] **Development setup docs** - Environment, dependencies, build
- [ ] **Architecture overview** - How the codebase is organized

### Category 3: Inclusive Language (Medium Priority)

- [ ] No Tier 1 terms (master, whitelist/blacklist, slave, etc.)
- [ ] No Tier 2 terms (sanity-check)
- [ ] Limited Tier 3 terms (man-hour, man-in-the-middle, etc.)
- [ ] No diminishing language ("just", "simply", "easy", "obvious")
- [ ] Gender-neutral language (they vs he/she)

### Category 4: Assumed Knowledge (Medium Priority)

- [ ] Prerequisites explicitly stated
- [ ] Git/GitHub operations explained or linked
- [ ] Tooling requirements documented (node, python, etc.)
- [ ] No assumed familiarity ("as you know", "obviously")
- [ ] Step-by-step instructions for common tasks

### Category 5: Community Health Signals (Informational)

- [ ] Multiple maintainers (bus factor > 1)
- [ ] Recent activity (commits within 90 days)
- [ ] Issue response (median time to first response)
- [ ] Release frequency (regular releases)
- [ ] Contributor diversity (not dominated by single org)

---

## Skill Architecture

### File Structure

```
.claude/skills/oss-repo-scan/
├── SKILL.md                           # Main skill entry point
└── references/
    ├── essential-docs-checklist.md    # Documentation requirements
    ├── inclusive-language-guide.md    # Word lists and replacements
    ├── assumed-knowledge-patterns.md  # Detection patterns
    ├── community-health-metrics.md    # CHAOSS-based metrics
    └── report-templates.md            # Output format templates
```

### SKILL.md Content

```markdown
---
name: oss-repo-scan
description: Scan repositories for open source community health and sustainability. Use when (1) Evaluating a new repository, (2) Auditing your own project's contributor experience, (3) Checking inclusive language compliance, (4) Identifying missing documentation, (5) Assessing community health signals. Covers essential docs, assumed knowledge detection, inclusive naming, and CHAOSS-based metrics.
---

# OSS Repository Health Scanner

## Quick Start

Invoke with: `/oss-repo-scan [path-or-url] [--depth quick|standard|thorough]`

## Scan Categories

### 1. Essential Documentation (Critical)
Checks for presence and quality of:
- README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md
- LICENSE, SECURITY.md, GOVERNANCE.md
- Issue/PR templates

### 2. Inclusive Language (High)
Detects non-inclusive terminology:
- **Tier 1** (Replace immediately): master, slave, whitelist, blacklist, etc.
- **Tier 2** (Strongly consider): sanity-check
- **Tier 3** (Recommended): man-hour, man-in-the-middle, etc.
- **Diminishing**: "just", "simply", "easy", "obviously"

### 3. Assumed Knowledge (Medium)
Identifies unexplained prerequisites:
- Git operations without explanation
- Tool usage without setup instructions
- Acronyms/jargon without definitions

### 4. Community Health (Info)
Assesses sustainability signals:
- Maintainer count and diversity
- Activity recency
- Issue responsiveness
- Release patterns

## Output Format

Reports use severity levels:
- CRITICAL: Missing essential elements
- WARNING: Improvement strongly recommended
- INFO: Enhancement suggestions
- PASS: Element present and adequate

## Reference Files

See `references/essential-docs-checklist.md` for documentation requirements.
See `references/inclusive-language-guide.md` for complete word lists.
See `references/assumed-knowledge-patterns.md` for detection patterns.
See `references/community-health-metrics.md` for CHAOSS-based metrics.
```

---

## Scanning Algorithm

### Phase 1: Document Inventory (Quick)
```
1. Check root directory for essential files
2. Check .github/ for templates
3. Score presence: present/missing/partial
```

### Phase 2: Content Analysis (Standard)
```
1. README quality scoring:
   - Has project description (>100 chars)
   - Has installation instructions
   - Has usage examples
   - Has license badge
   - Has contributing section or link

2. CONTRIBUTING quality:
   - Has code style guide
   - Has PR process
   - Has issue process
   - Has communication channels

3. Language scanning:
   - Grep for inclusive naming terms
   - Grep for diminishing language
   - Grep for assumed knowledge phrases
```

### Phase 3: Community Health (Thorough)
```
1. Git history analysis:
   - Unique contributors count
   - Commit frequency
   - Recent activity date

2. GitHub API (if URL provided):
   - Open issues count
   - Issue response times
   - PR merge times
   - Contributor list

3. Dependency health:
   - LICENSE files in dependencies
   - Security advisories
```

---

## Detection Patterns

### Inclusive Naming Word Lists

**Tier 1 - Replace Immediately:**
```
master → main, primary, leader, host
slave → replica, secondary, follower, worker
whitelist → allowlist, approved list, safe list
blacklist → blocklist, denylist, banned list
blackhat/whitehat → malicious/ethical, attacker/defender
grandfathered → legacy, exempted, pre-existing
cripple → disable, degrade, limit
tribe → team, group, community
```

**Tier 2 - Strongly Consider:**
```
sanity check → confidence check, coherence check, validity check
```

**Tier 3 - Recommended:**
```
man-hour → person-hour, engineer-hour, labor-hour
man-in-the-middle → machine-in-the-middle, interceptor, on-path attack
end-of-life → deprecated, sunset, retired
evangelist → advocate, champion, ambassador
```

### Diminishing Language Patterns

```regex
\bjust\b\s+(fork|clone|run|install|add|create|do)
\bsimply\b\s+(fork|clone|run|install|add|create|do)
\b(easy|easily|straightforward|trivial|obvious|obviously)\b
\beveryone knows\b
\bas you( probably)? know\b
\bof course\b
```

### Assumed Knowledge Patterns

```regex
# Git assumptions
fork (the|this) repo
clone (the|this|it)
git (checkout|branch|merge|rebase|cherry-pick)
push (to|your)

# Tool assumptions without setup
npm (install|run|test)
pip install
cargo (build|run|test)
make\s+\w+

# Missing context signals
see (the )?(docs|documentation|wiki)
refer to
check out
```

---

## Report Output Format

```markdown
# OSS Repository Health Report

**Repository:** {name}
**Scanned:** {timestamp}
**Depth:** {quick|standard|thorough}

## Summary Scorecard

| Category | Score | Status |
|----------|-------|--------|
| Essential Docs | 4/6 | WARNING |
| Inclusive Language | 87% | WARNING |
| Assumed Knowledge | 92% | PASS |
| Community Health | 3/5 | INFO |

**Overall Grade:** B (Good with improvements needed)

---

## CRITICAL Issues (2)

### Missing CODE_OF_CONDUCT.md
**Impact:** Contributors lack behavioral guidelines
**Action:** Add CODE_OF_CONDUCT.md using [Contributor Covenant](https://www.contributor-covenant.org/)

### Missing SECURITY.md
**Impact:** No clear vulnerability reporting process
**Action:** Add SECURITY.md with disclosure policy

---

## WARNING (5)

### Inclusive Language: "whitelist" found (3 occurrences)
**Tier:** 1 (Replace immediately)
**Locations:**
- `src/config.py:47` - "add to whitelist"
- `README.md:89` - "whitelist the domain"
- `docs/api.md:156` - "whitelist entry"
**Replacement:** allowlist, approved list

### Diminishing Language: "just" (7 occurrences)
**Locations:**
- `README.md:23` - "just run npm install"
- `CONTRIBUTING.md:12` - "just fork the repo"
**Impact:** Makes tasks seem trivial, discourages questions
**Action:** Remove or rephrase: "Run npm install" or "To install: npm install"

### Assumed Knowledge: Git operations
**Locations:**
- `CONTRIBUTING.md:5` - "Fork and clone the repo"
**Issue:** Assumes familiarity with fork/clone workflow
**Action:** Link to GitHub's fork guide or add brief explanation

---

## INFO (3)

### Single maintainer detected
**Finding:** 1 contributor with >90% of commits
**Recommendation:** Document succession plan, encourage co-maintainers

### No recent releases
**Finding:** Last release 8 months ago
**Recommendation:** Consider tagging releases more frequently

---

## PASS (8)

- README.md present with description
- LICENSE present (MIT)
- CONTRIBUTING.md present
- Issue templates present
- PR template present
- Installation instructions present
- No Tier 1 "master/slave" terminology
- Gender-neutral language

---

## Recommended Actions (Priority Order)

1. **Add CODE_OF_CONDUCT.md** [Critical]
2. **Add SECURITY.md** [Critical]
3. **Replace "whitelist" with "allowlist"** [High]
4. **Remove diminishing language** [Medium]
5. **Add explicit Git workflow guide** [Medium]
6. **Document maintainer succession** [Low]

---

## Resources

- [Contributor Covenant](https://www.contributor-covenant.org/)
- [GitHub Security Policy](https://docs.github.com/en/code-security)
- [Inclusive Naming Initiative](https://inclusivenaming.org/)
- [CHAOSS Metrics](https://chaoss.community/)
- [The Open Source Way](https://www.theopensourceway.org/)
```

---

## Implementation Plan

### Files to Create

#### Package Infrastructure
| File | Purpose |
|------|---------|
| `package.json` | npm package configuration with bin entry |
| `tsconfig.json` | TypeScript configuration |
| `.gitignore` | Update for build artifacts |

#### Core Scanner (`src/scanner/`)
| File | Purpose |
|------|---------|
| `src/index.ts` | Main package export |
| `src/cli.ts` | CLI interface with commander.js |
| `src/scanner/index.ts` | Scanner orchestrator |
| `src/scanner/docs-checker.ts` | Essential docs presence/quality |
| `src/scanner/language-checker.ts` | Inclusive language scanning |
| `src/scanner/knowledge-checker.ts` | Assumed knowledge detection |
| `src/scanner/health-checker.ts` | Community health metrics |
| `src/scanner/github-api.ts` | GitHub API for remote repos |

#### Pattern Definitions (`src/patterns/`)
| File | Purpose |
|------|---------|
| `src/patterns/inclusive-terms.ts` | Inclusive Naming Initiative word lists |
| `src/patterns/diminishing-language.ts` | "just", "simply", "easy" patterns |
| `src/patterns/assumed-knowledge.ts` | Git/tool assumption patterns |

#### Reporters (`src/reporters/`)
| File | Purpose |
|------|---------|
| `src/reporters/markdown.ts` | Markdown report generator |
| `src/reporters/json.ts` | JSON structured output |

#### Types (`src/types/`)
| File | Purpose |
|------|---------|
| `src/types/index.ts` | TypeScript interfaces |

#### Claude Integration (`.claude/`)
| File | Purpose |
|------|---------|
| `.claude/skills/oss-repo-scan/SKILL.md` | Claude skill definition |
| `.claude/skills/oss-repo-scan/references/*.md` | Reference documentation |
| `.claude/commands/oss-repo-scan.md` | User-invocable command |

#### Tests (`tests/`)
| File | Purpose |
|------|---------|
| `tests/scanner.test.ts` | Scanner unit tests |
| `tests/patterns.test.ts` | Pattern matching tests |
| `tests/integration.test.ts` | End-to-end tests |
| `tests/fixtures/` | Test repository fixtures |

#### Documentation (`docs/`)
| File | Purpose |
|------|---------|
| `docs/usage.md` | Package usage documentation |

### Implementation Steps

1. **Initialize Node package** - package.json, tsconfig.json, dependencies
2. **Create type definitions** - TypeScript interfaces for findings, reports
3. **Implement pattern definitions** - Word lists, regex patterns
4. **Build docs-checker** - Essential documentation scanner
5. **Build language-checker** - Inclusive language scanner
6. **Build knowledge-checker** - Assumed knowledge detector
7. **Build health-checker** - Community health metrics
8. **Implement GitHub API client** - Remote repo support
9. **Create markdown reporter** - Human-readable output
10. **Create JSON reporter** - Machine-readable output
11. **Build CLI interface** - commander.js based CLI
12. **Write Claude skill files** - SKILL.md and references
13. **Write tests** - Unit and integration tests (80%+ coverage)
14. **Test on real repositories** - Validate against known repos

### Verification Plan

1. **Unit tests**: `npm test` - 80%+ coverage required
2. **Local scan**: `npx oss-repo-check .` on current repo
3. **Remote scan**: `npx oss-repo-check https://github.com/nodejs/node`
4. **Claude skill**: `/oss-repo-scan .` via Claude Code
5. **Output validation**: Verify both markdown and JSON outputs
6. **Depth modes**: Test `--depth quick|standard|thorough`

---

## Package Configuration

### package.json
```json
{
  "name": "oss-repo-check",
  "version": "0.1.0",
  "description": "Open source repository health and sustainability scanner",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "oss-repo-check": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["opensource", "community", "health", "scanner", "inclusive"],
  "license": "Apache-2.0",
  "dependencies": {
    "commander": "^12.0.0",
    "glob": "^10.0.0",
    "octokit": "^3.0.0",
    "chalk": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.0.0"
  }
}
```

### CLI Usage
```bash
# Install globally
npm install -g oss-repo-check

# Scan local directory
oss-repo-check .
oss-repo-check /path/to/repo

# Scan GitHub repository
oss-repo-check https://github.com/owner/repo

# Options
oss-repo-check . --depth quick       # Fast essential checks
oss-repo-check . --depth standard    # Default: docs + language
oss-repo-check . --depth thorough    # Full analysis with metrics

# Output formats
oss-repo-check . --format markdown   # Default: terminal display
oss-repo-check . --format json       # Machine-readable
oss-repo-check . --output report.md  # Write to file

# GitHub token for API access
export GITHUB_TOKEN=ghp_xxx
oss-repo-check https://github.com/owner/repo
```

---

## Integration Points

- **git-workflow skill**: Cross-reference for commit/PR standards
- **code-quality skill**: Leverage for code comment analysis
- **file-placement skill**: Verify documentation in correct locations
- **Claude Code CLI**: Invoke via `/oss-repo-scan` command
- **CI/CD pipelines**: Run as npm script in GitHub Actions

---

## Future Enhancements

1. **GitHub Action** - Standalone action for PR checks
2. **Badge generation** - Community health score badge (shields.io)
3. **Historical tracking** - Track improvement over time
4. **Custom config** - `.oss-repo-check.yaml` for project-specific rules
5. **Multi-language support** - Non-English documentation scanning
6. **PR comments** - Auto-comment on PRs with findings
7. **VS Code extension** - Real-time scanning in editor
