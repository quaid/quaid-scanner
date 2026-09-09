---
title: "Bluesky Thread: quaid-scanner v0.1.5"
author: Karsten Wade
date: 2026-08-02
status: draft
target: bluesky
note: "8 posts. Audience knows the tool. Two beats: (1) session provenance for agent-run scans, (2) the tool took its own medicine and went 4.8 -> 8.1. Honest, invitational tone."
---

# Bluesky Thread: quaid-scanner v0.1.5

---

**1/8**
quaid-scanner v0.1.5 is out.

Two things: agent-run scans can now sign their work, and the scanner finally took its own medicine —
its self-scan went from 4.8/10 (HIGH risk) to 8.1/10 (LOW risk).

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

A health scanner that scores badly on its own criteria is hard to trust. So I ran quaid-scanner
against quaid-scanner and fixed what it flagged.

4.8/10 → 8.1/10. The scoring didn't change. The project did.

---

**7/8**
What changed:

→ GOVERNANCE.md (how decisions get made, how to become a maintainer)
→ A funding link
→ CI that enforces lint + 80% coverage on every PR
→ GitHub Actions pinned to commit SHAs

Every one was a finding the scanner had been reporting about itself.

---

**8/8**
`npm install -g quaid-scanner@0.1.5`

If you drive it from an agent, start passing `--provenance-file` — your reports will carry their own
receipts.

github.com/quaid/quaid-scanner

---

_[end thread]_
