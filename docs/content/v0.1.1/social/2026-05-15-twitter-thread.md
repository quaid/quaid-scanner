---
title: "Twitter/X Thread: quaid-scanner v0.1.1"
author: Karsten Wade
date: 2026-05-15
status: draft
target: twitter
note: "9 tweets, each under 280 chars. Thread stands alone without external links until the final tweet."
---

# Twitter/X Thread: quaid-scanner v0.1.1

---

**1/9**
I just shipped quaid-scanner v0.1.1 to npm.

It scans any OSS repo — local or GitHub URL — across 6 pillars: security, governance, community health, AI readiness, inclusive language, technical rigor.

43 scanners. Structured JSON. Designed to be operated by an agent.

🧵

---

**2/9**
The design principle: JSON is the primary output, not a dashboard.

Every finding has a `severity`, `category`, and `suggestion`.

The suggestion is raw material for a backlog story. The agent drafts the story. The agent opens the issue. The human reviews.

That's the loop.

---

**3/9**
What does it actually catch?

Ran it this week on a public project with 85% issue closure rate and 90/100 welcoming score.

Also had 5 GitHub Actions workflows with no `permissions:` block.

Score: 1.7/10 CRITICAL.

Both things can be true at the same time.

---

**4/9**
The most common invisible gap: GitHub token permissions.

Default read-write `GITHUB_TOKEN` in Actions is a supply-chain risk most active projects haven't addressed yet.

quaid surfaces it as a CRITICAL finding with a one-line fix suggestion.

---

**5/9**
It also checks for things most tools miss:

- AI-native readiness (Claude Code config, model cards, dataset provenance)
- Inclusive naming (INI term list across source, docs, and project name)
- Contributor funnel health (casual → regular → core conversion rates)
- Vendor neutrality (single-org commit concentration)

---

**6/9**
The MCP server exposes `scan_repository` and `graph_query` as agent tools.

The Claude Code `/quaid-scan` skill is in the repo.

Point an agent at a portfolio. Get structured findings. Generate a backlog. Open issues.

No dashboard. No PDF report that lives in a Notion page forever.

---

**7/9**
v0.1.1 fixes five bugs from the first real-world scans:

- Remote scanning was grading quaid's own source tree (oops)
- Private repo cloning needed the token in the clone URL
- `GITHUB_TOKEN` env var wasn't being read automatically
- Severity was serializing as integers (`2` not `"CRITICAL"`) — breaking all `jq` filters
- MCP server was throwing on every scan

---

**8/9**
Already in v0.1.1 (not coming soon):

→ Scan history + trend tracking — `alertOnDrop` catches score regressions in CI
→ Ecosystem intelligence — `--ecosystem` returns rivals, partners, strategic positioning

On the roadmap:

→ Cross-validation vs OpenSSF Scorecard API + `licensee` CLI (accuracy verification)
→ Ground-truth corpus: 8 synthetic repos, mutation tests, regression suite

---

**9/9**
Apache-2.0. 43 scanners. Built on OpenSSF Scorecard, CHAOSS metrics, The Open Source Way 2.0, and the Inclusive Naming Initiative.

`npm install -g quaid-scanner`

github.com/quaid/quaid-scanner

If you're building over OSS portfolios or running agent workflows on repos, I'd value your feedback on what it gets wrong.

---

_[end thread]_
