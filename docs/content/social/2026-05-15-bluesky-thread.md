---
title: "Bluesky Thread: quaid-scanner v0.1.1"
author: Karsten Wade
date: 2026-05-15
status: draft
target: bluesky
note: "8 posts, slightly longer and more conversational than the Twitter version. Bluesky audience skews OSS and fediverse-adjacent — lean into open standards, CHAOSS, The Open Source Way."
---

# Bluesky Thread: quaid-scanner v0.1.1

---

**1/8**
Shipped: quaid-scanner v0.1.1

It scans any OSS repo — local path or GitHub URL — across 6 pillars and returns structured JSON designed to be parsed by an agent, not read by a human.

41 scanners. Apache-2.0. Built on CHAOSS metrics and The Open Source Way 2.0.

🧵

---

**2/8**
The core idea: OSS health debt is usually invisible until it compounds.

Governance never written down. Security posture assumed but unverified. Contributor funnel never cultivated.

quaid-scanner makes that debt visible at machine speed, and structures the findings so an agent can turn them into a sprint backlog.

---

**3/8**
What it scans:

→ Security: token permissions, dependency pinning, OpenSSF Scorecard, binary artifacts
→ Governance: license detection + compatibility, vendor neutrality, bus factor
→ Community: contributor funnel, burnout signals, response time, psychological safety
→ AI Readiness: agentic rules, model cards, dataset provenance
→ Inclusive Language: INI term scanning in source + docs
→ Technical Rigor: linting, test coverage, SemVer hygiene

---

**4/8**
Every finding includes a `suggestion` field.

That suggestion is the raw material for a user story.

The full agent workflow: scan → parse findings → fill report template → generate backlog stories → open GitHub issues.

A human reviews at each stage. The heavy lifting is done.

---

**5/8**
First real-world scan after v0.1.1's fixes: a public project scoring 1.7/10 CRITICAL.

But the texture matters: 85% issue closure rate, 90/100 welcoming score, Claude Code config detected — and five GitHub Actions workflows with no `permissions:` block.

Active, responsive, and in need of supply-chain hygiene. The backlog writes itself.

---

**6/8**
The MCP server exposes `scan_repository` and `graph_query` as agent tools.

The `/quaid-scan` Claude Code skill is in the repo.

`GITHUB_TOKEN` or `GITHUB_PERSONAL_ACCESS_TOKEN` unlocks branch protection, OpenSSF Scorecard, and issue metrics automatically.

---

**7/8**
Already in v0.1.1:

→ Scan history + trend tracking via ZeroDB — `alertOnDrop` catches regressions in CI
→ Ecosystem intelligence — `--ecosystem` returns rivals, partners, strategic positioning (non-scored)

Roadmap:

→ Cross-validation against OpenSSF Scorecard API + `licensee` CLI — so you can trust the findings
→ Synthetic ground-truth corpus with mutation tests

---

**8/8**
Apache-2.0. 41 scanners. Built on OpenSSF Scorecard, CHAOSS metrics, The Open Source Way 2.0, and the Inclusive Naming Initiative.

`npm install -g quaid-scanner`

github.com/quaid/quaid-scanner

If you're in OSPO work, foundation governance, or building agentic workflows over OSS portfolios — I'd really value feedback on what the scanner gets wrong.

False positives on inclusive language are especially useful to know about.

---

_[end thread]_
