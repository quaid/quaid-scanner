---
title: "Sign Your Work: Session Provenance for Agent-Run Scans"
slug: session-provenance-agent-scans-v015
description: quaid-scanner v0.1.5 lets an agent embed its session metadata — model, token cost, session ID — into every report. It also fixed four scanner defects found by dogfooding, and watched its own score go down as a result.
author: Karsten Wade
date: 2026-09-10
status: draft
target: iquaid.org
tags: [quaid-scanner, provenance, agent-first, oss-health, ai-agents, supply-chain]
---

# Sign Your Work: Session Provenance for Agent-Run Scans

quaid-scanner has always been built to be driven by an agent, not just a person at a terminal.

But there was a gap.
When an agent runs a scan, files a backlog of issues, and hands you a report, one question goes
unanswered: which model produced this, and at what cost?

v0.1.5 closes that gap with session provenance.

## What it looks like

There is a new flag, `--provenance-file`, that accepts a small JSON record of the agent session:

```bash
echo '{"models":["claude-opus-4-8"],"inputTokens":12450,"outputTokens":3210,"totalTokens":15660,"sessionId":"sess_abc123","agentId":"karsten-ospo","generatedAt":"2026-09-10T14:23:00-07:00"}' > /tmp/prov.json

quaid-scanner . --format json --quiet --provenance-file /tmp/prov.json
```

The scanner embeds that record, unchanged, in the report it produces.
In JSON output it becomes a top-level `provenance` object.
In markdown output it becomes a `## Report Provenance` section rendered as a readable table.

It is entirely opt-in.
No provenance file, no provenance key — existing output is byte-for-byte identical to v0.1.4.
And if the file is missing or malformed, the scanner warns and keeps going.
A bad provenance file never aborts a scan.

## Why it matters

The value of an agent-first tool only shows up when an agent drives the whole workflow:
scan a portfolio, group the findings, generate a backlog, open the issues.

Provenance makes that chain auditable.
A report can now say, in machine-readable terms, exactly which model generated it, in which session,
using how many tokens.
When you review a backlog an agent filed last week, you can see its receipts.

The `ProvenanceInfo` type is exported, so library consumers can construct it programmatically
instead of writing JSON by hand.

## Taking its own medicine

A health scanner that scores badly on its own criteria is hard to trust.

So this release did something uncomfortable: it ran quaid-scanner against quaid-scanner and fixed
what it found.

So this release did something uncomfortable: it ran quaid-scanner against quaid-scanner and fixed
what it found.

It added a [GOVERNANCE.md](https://github.com/quaid/quaid-scanner/blob/main/.github/GOVERNANCE.md)
describing how decisions get made and how someone becomes a maintainer.
It added a funding link.
It added a CI workflow that runs lint, build, and the full test suite with coverage on every pull
request, so the 80% coverage gate is enforced rather than merely hoped for.
It pinned its GitHub Actions to commit SHAs instead of moving tags, closing a real supply-chain gap.

Every one of those was a finding quaid-scanner had been reporting about itself.

And then the score went *down*.

A draft of these notes claimed 8.1 out of 10, LOW risk.
The real number is 6.5, MEDIUM.
Not because anything regressed — because this release also fixed the response-time scanners, which
had been erroring against GitHub's GraphQL API and quietly contributing nothing.
A pillar scores well when nothing is measuring it.

Now that they work, they report that the median first response on an issue here is 1237 hours and
that 83% of issues have no response at all.
Both are true.
Community health reads 0.0.

That is the more useful version of taking your own medicine.
It is easy to publish a number that went up.
The test of a health tool is whether you publish the one that went down because you made the tool
more honest.

## Upgrading

```bash
npm install -g quaid-scanner@0.1.5
```

If you drive quaid-scanner from an agent, start passing `--provenance-file` and your reports will
carry their own receipts.

Full release notes: [docs/releases/v0.1.5.md](https://github.com/quaid/quaid-scanner/blob/main/docs/releases/v0.1.5.md)

Full changelog: [CHANGELOG.md](https://github.com/quaid/quaid-scanner/blob/main/CHANGELOG.md)
