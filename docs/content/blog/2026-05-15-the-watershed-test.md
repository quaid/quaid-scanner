---
title: "The Watershed Test: Introducing quaid-scanner for Agent-First OSS Health Assessment"
slug: quaid-scanner-v011-agent-first-oss-health-scanner
description: Introducing quaid-scanner v0.1.1, a 43-scanner OSS health tool built to be operated by agents, not just read by humans—and what that design choice changes about how we understand open source project health.
author: Karsten Wade
date: 2026-05-15
status: draft
target: iquaid.org
tags: [quaid-scanner, open-source, oss-health, agents, mcp, chaoss, inclusive-naming, community-health]
---

# The Watershed Test: Introducing quaid-scanner for Agent-First OSS Health Assessment

There is a moment every open source program manager knows.
Someone asks — a CTO, a community board, a procurement officer — _"Is this project healthy?"_
And you feel yourself about to reach for the usual toolkit: GitHub stars, commit frequency, a quick look at the issue backlog, a gut-check on the README.

It is not a bad toolkit.
It is just not a complete one.
And it does not scale.

---

## The Water Always Finds the Gap

The open source ecosystem has always been a watershed.
Value flows from upstream experiments down through adoption, forks, and production dependencies, eventually reaching the organizations and individuals who depend on these projects to build their own work.
We have gotten very good at measuring the volume of that flow — downloads, forks, stars.
We have been considerably less systematic about measuring its quality: whether the governance is sound, the license is compatible, the contributor base is sustainable, the security posture is real rather than assumed.

I have spent the better part of twenty years working in and on open source communities.
The pattern I keep returning to is this: most projects that fail do not fail because of technical debt.
They fail because of _unexamined health debt_ — governance that was never written down, contributor funnels that were never cultivated, security practices that were assumed but never verified.

quaid-scanner is my attempt to make that debt visible, systematically, at machine speed.

---

## Forty-One Lenses Across Six Pillars

The scanner evaluates any OSS repository across six weighted pillars, drawing on four frameworks I trust: [OpenSSF Scorecard](https://securityscorecards.dev/), [CHAOSS metrics](https://chaoss.community/), [The Open Source Way 2.0](https://www.theopensourceway.org/), and the [Inclusive Naming Initiative](https://inclusivenaming.org/).

| Pillar | Weight |
|--------|--------|
| Security & Supply Chain | 25% |
| Governance & Legal | 20% |
| Community Health | 15% |
| AI-Native & Agentic Readiness | 15% |
| Inclusive Language | 15% |
| Technical Rigor | 10% |

Forty-one scanners run across those pillars — everything from checking whether GitHub Actions workflows declare least-privilege token permissions, to whether the contributor base is concentrated in a single vendor's email domain, to whether the model card for an AI project meets HuggingFace's schema.

The output is a score from 0–10, a structured JSON report, and — critically — a findings list where every entry includes a `suggestion` field.
That suggestion field is not decoration.
It is the link between a finding and a backlog story.

---

## Why Agent-First Changes Everything

Most health-scoring tools are built to be read by humans.
The score goes in a dashboard.
A human reads the dashboard.
A human decides what to do.
quaid-scanner is built to be _operated_ by an agent.

This is not a marketing distinction — it changes the design in concrete ways.

JSON is the primary output format.
Markdown is secondary.
Every finding has a machine-parseable category, severity, and suggestion.
The MCP server exposes `scan_repository` and `graph_query` as first-class agent tools.
The CLI is designed for `--quiet --format json` as the canonical invocation.

The workflow I have in mind — and have validated on a portfolio of OSS projects — looks like this:

1. An agent scans a repository (or a portfolio of repositories in parallel)
2. The agent parses findings by pillar and severity
3. The agent fills the portfolio report template from the structured JSON
4. The agent derives user stories from findings, drawing on the story template bank
5. The agent opens GitHub issues from the backlog stories

At each step, a human reviews and adjusts.
But the heavy lifting — the classification, the synthesis, the story writing — is done.
This is the difference between a scan that produces a PDF you file and forget, and a scan that produces a backlog you actually work through.

---

## What v0.1.1 Fixed

The initial v0.1.0 release established the architecture and the full scanner suite.
v0.1.1 is a focused bugfix release, but the fixes matter for real-world use.

The most significant: when scanning a GitHub URL, file-based scanners were running against quaid-scanner's _own_ source tree instead of the target repository.
The tool was grading itself.
The fix involved cloning the target to a temp directory, scanning it, and removing it — a pattern that also unlocks private repository scanning when a GitHub token is present.

A second fix addressed the GitHub token never being read from the environment automatically.
This silently disabled all GitHub API–backed checks — branch protection, OpenSSF Scorecard, issue response time — even when `GITHUB_TOKEN` was set.
It now reads `GITHUB_TOKEN` with fallback to `GITHUB_PERSONAL_ACCESS_TOKEN`.

A third fixed severity values being serialized as raw integers in JSON output (`2` instead of `"CRITICAL"`).
If you were piping output to `jq` and filtering by severity, you were getting nothing.

---

## A First Real Scan

To validate the fixes, I ran quaid-scanner against [jolliai/jolliai](https://github.com/jolliai/jolliai), a public repository I had not previously examined.

The overall score came back 1.7/10 — CRITICAL.
But the texture of the score is instructive.

The AI Readiness pillar scored 6.5/10.
Claude Code configuration was detected, welcoming score was 90/100, and the issue closure rate was an excellent 85% — 46 closed out of 54 opened in 90 days.
These are real signals of a project being actively tended.

The Security pillar scored 0.
Five GitHub Actions workflows were missing `permissions:` blocks, inheriting default read-write access for `GITHUB_TOKEN`.
Thirteen action dependencies were pinned to mutable major-version tags rather than commit SHAs.

This is the gap that quaid-scanner exists to surface: a project being actively worked and genuinely responsive to its community, with security hygiene that has not yet caught up to current supply-chain standards.
The findings become backlog stories.
The backlog stories become issues.
The issues become pull requests.
The watershed fills in.

---

## What Is Already There and What Is Coming

quaid-scanner is at v0.1.x.
The roadmap is public in the [PRD](https://github.com/quaid/quaid-scanner/blob/main/docs/PRD-v2.md).

**Already in v0.1.1:** Scan history persistence and trend analysis via ZeroDB — `storeScanHistory`, `queryTrend`, `renderTrendAscii`, and `alertOnDrop` are live.
If you have ZeroDB credentials, every scan is stored automatically.
The `alertOnDrop` function lets CI catch score regressions before they merge.

**Also already in v0.1.1:** Ecosystem intelligence — `quaid-scanner . --ecosystem` runs a parallel analysis layer that does not affect the scored pillars.
It returns rivals, partners, user communities, and strategic positioning recommendations alongside the health data.
OSPOs and maintainers who want positioning context alongside health scores can use it today.

**On the roadmap:** Accuracy validation (Epics 11 and 12) addresses the question I hear most often: _"How do I know the findings are correct?"_
The answer will be two complementary systems: a cross-validation harness that diffs quaid findings against authoritative external tools (OpenSSF Scorecard API, the `licensee` CLI), and a ground-truth corpus — synthetic fixture repositories with precisely controlled properties — whose expected findings are asserted on every test run.

---

## Starting Points

```bash
# Install
npm install -g quaid-scanner

# Scan the current directory
quaid-scanner . --depth standard

# Scan a GitHub repository
GITHUB_TOKEN=ghp_xxxx quaid-scanner https://github.com/owner/repo

# Agent-friendly: silent JSON for piping
quaid-scanner . --quiet --format json | jq '.overallScore'
```

The [Claude Code skill](https://github.com/quaid/quaid-scanner/tree/main/.claude/skills/quaid-scan) is included in the repository.
The MCP server configuration is in the [README](https://github.com/quaid/quaid-scanner#mcp-server).

If you find a finding that looks wrong — a false positive on inclusive language, a missed security signal — the right place to bring it is the [issue tracker](https://github.com/quaid/quaid-scanner/issues).
The accuracy validation work in Epic 11 will formalize exactly this feedback loop.

Open source health is not a dashboard metric.
It is a practice.
I hope this tool makes the practice a little less manual, and a lot more actionable.
