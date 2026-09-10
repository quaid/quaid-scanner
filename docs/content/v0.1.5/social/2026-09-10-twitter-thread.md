---
title: "Twitter/X Thread: quaid-scanner v0.1.5"
author: Karsten Wade
date: 2026-09-10
status: draft
target: twitter
note: "7 posts. Terser than Bluesky. Lead with the two hooks: provenance + the self-scan jump. Keep technical specifics tight."
---

# Twitter/X Thread: quaid-scanner v0.1.5

---

**1/7**
quaid-scanner v0.1.5 is out.

Agent-run scans can now sign their work — and I fixed a scanner bug that made my own self-scan
score go *down*.

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
The other half: I ran quaid-scanner on quaid-scanner and fixed what it flagged.

A draft of these notes claimed 8.1/10. Real number: 6.5.

This release also fixed the response-time scanners, which had been erroring silently. A pillar
scores well when nothing is measuring it.

---

**6/7**
Working scanners now report: 1237h median first response, 83% of issues unanswered.

Both true. Community health reads 0.0.

Easy to publish a number that went up. The test is publishing the one that went down because you
made the tool more honest.

---

**7/7**
`npm install -g quaid-scanner@0.1.5`

Drive it from an agent? Start passing `--provenance-file`.

github.com/quaid/quaid-scanner

---

_[end thread]_
