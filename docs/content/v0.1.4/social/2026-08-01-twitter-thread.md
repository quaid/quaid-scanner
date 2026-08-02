---
title: "Twitter/X Thread: quaid-scanner v0.1.4"
author: Karsten Wade
date: 2026-08-01
status: draft
target: twitter
note: "7 posts. Twitter audience more terse — cut the nuance, lead with the problem/fix loop, keep technical specifics tight. Same honest tone as Bluesky but shorter."
---

# Twitter/X Thread: quaid-scanner v0.1.4

---

**1/7**
quaid-scanner v0.1.4 is out.

I ran it against real repos and watched it generate hundreds of false-positive inclusive language
findings. A scanner that cries wolf is worse than no scanner.

This release fixes the scanner.

🧵

---

**2/7**
What was wrong:

→ Acronym detector flagged GET, POST, IT, OR, AND as "unexplained acronyms"
→ Scanner read its own generated reports and found issues in its own output
→ Minified bundles were scanned as project content
→ One INI tier-1 term → CRITICAL severity → inclusive score 0.0
→ Same pattern in 30 files = 30 separate findings

---

**3/7**
The acronym fix took 4 PRs.

1. Skip HTTP verbs and markdown emphasis words
2. Add a 300-word English dictionary
3. Expand the dictionary + emphasis denylist
4. Replace the heuristic with suffix/length/vowel-pattern test

Result: flags actual unexplained acronyms.

---

**4/7**
INI severity is now decoupled from INI tier.

Tier 1/2/3 used to map to CRITICAL/WARNING/INFO.
Now tier is a metadata label.
Severity is capped at WARNING for all inclusive findings.

quaid-scanner's own inclusive pillar score: 0.0 → 4.5.

---

**5/7**
New: grouped markdown rendering.

Before: 1 pattern in 30 files = 30 finding blocks
After: 1 finding block + file list

The real problems in a report are now visible.

---

**6/7**
Also new:
→ `renderHtml()` library export — self-contained HTML report, no external deps
→ Per-term INI deep links in findings
→ Per-pattern Microsoft Style Guide references on diminishing-language findings
→ INI tier as metadata field

---

**7/7**
`npm install -g quaid-scanner@0.1.4`

If you ran it before and ignored the inclusive findings because there were too many —
re-run it now. The findings that remain are the ones worth acting on.

github.com/quaid/quaid-scanner

---

_[end thread]_
