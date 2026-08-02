---
title: "Twitter/X Thread: quaid-scanner v0.1.5"
author: Karsten Wade
date: 2026-08-02
status: draft
target: twitter
note: "7 posts. Terser than Bluesky. Lead with the two hooks: provenance + the self-scan jump. Keep technical specifics tight."
---

# Twitter/X Thread: quaid-scanner v0.1.5

---

**1/7**
quaid-scanner v0.1.5 is out.

Agent-run scans can now sign their work — and the scanner took its own medicine, going from 4.8/10
(HIGH risk) to 8.1/10 (LOW risk) on its own self-scan.

🧵

---

**2/7**
New: `--provenance-file <path>`

Pass a JSON record of the agent session — models, token counts, session ID, timestamp — and it's
embedded in the report:

→ JSON: top-level `provenance` object
→ Markdown: `## Report Provenance` table

---

**3/7**
Fully opt-in.

No file → no provenance key, output unchanged.
Missing or malformed file → warns and continues.

A bad provenance file never aborts a scan.

---

**4/7**
Why: it makes agent-run workflows auditable.

A report can say exactly which model generated it and at what token cost. Review a backlog an agent
filed last week — and see its receipts.

`ProvenanceInfo` is exported for library use.

---

**5/7**
The other half: a health scanner that scores badly on its own criteria is hard to trust.

So I ran quaid-scanner on quaid-scanner and fixed what it flagged.

4.8 → 8.1. Scoring didn't change. The project did.

---

**6/7**
What changed:
→ GOVERNANCE.md
→ funding link
→ CI enforcing lint + 80% coverage on every PR
→ Actions pinned to commit SHAs (#123)

Every one was a finding the tool reported about itself.

---

**7/7**
`npm install -g quaid-scanner@0.1.5`

Drive it from an agent? Start passing `--provenance-file`.

github.com/quaid/quaid-scanner

---

_[end thread]_
