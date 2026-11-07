---
title: "Bluesky Thread: quaid-scanner v0.1.5"
author: Karsten Wade
date: 2026-09-10
status: draft
target: bluesky
note: "8 posts. Audience knows the tool. Two beats: (1) session provenance for agent-run scans, (2) fixing a broken scanner made the self-scan score go down, and we published that. Honest, invitational tone."
---

# Bluesky Thread: quaid-scanner v0.1.5

---

**1/8**
quaid-scanner v0.1.5 is out.

Two things: agent-run scans can now sign their work, and I fixed a broken scanner that made my own
self-scan score go down.

🧵

---

**2/8**
The tool is built to be driven by an agent, not a human at a terminal.

But there was a gap: when an agent runs a scan and files a backlog, which model produced it, and at
what cost? Nothing recorded that.

v0.1.5 adds session provenance.

---

**3/8**
New flag: `--provenance-file <path>`

It takes a small JSON record — models used, token counts, session ID, agent ID, timestamp — and
embeds it in the report.

JSON output gets a top-level `provenance` object. Markdown gets a `## Report Provenance` table.

---

**4/8**
It's fully opt-in.

No provenance file, no provenance key — existing output is byte-for-byte unchanged.

And a missing or malformed file just warns and continues. A bad provenance file never aborts a scan.

---

**5/8**
Why it matters: it makes an agent-run workflow auditable.

A report can now say, in machine-readable terms, exactly which model generated it and how many
tokens it cost. When you review a backlog an agent filed last week, you can see its receipts.

---

**6/8**
The other half of this release is uncomfortable.

A draft of these notes claimed 8.1/10, LOW risk. The real number is 6.5, MEDIUM.

Nothing regressed. This release also fixed the response-time scanners, which had been erroring
against GitHub's GraphQL API and quietly contributing nothing. A pillar scores well when nothing
is measuring it.

---

**7/8**
Now that they work, they report the truth about a solo-maintained project: 1237-hour median first
response, 83% of issues with no reply at all.

Community health reads 0.0.

It is easy to publish a number that went up. The test of a health tool is publishing the one that
went down because you made the tool more honest.

---

**8/8**
`npm install -g quaid-scanner@0.1.5`

If you drive it from an agent, start passing `--provenance-file` — your reports will carry their own
receipts.

github.com/quaid/quaid-scanner

---

_[end thread]_
