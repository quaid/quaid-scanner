---
title: "Bluesky Thread: quaid-scanner v0.1.4"
author: Karsten Wade
date: 2026-08-01
status: draft
target: bluesky
note: "8 posts. Audience knows the tool from v0.1.2 announcement. Focus: what went wrong with the inclusive language scanner, what we fixed, what accurate output looks like. Honest tone — acknowledge the quality problem directly."
---

# Bluesky Thread: quaid-scanner v0.1.4

---

**1/8**
quaid-scanner v0.1.4 is out.

This release exists because I ran the scanner against real repos and watched it generate hundreds
of false-positive inclusive language findings.

A scanner that cries wolf is worse than no scanner.
v0.1.4 is the fix.

🧵

---

**2/8**
What was generating the noise:

The acronym detector treated every uppercase sequence as an unexplained acronym.
`GET`, `POST`, `PUT` — flagged.
`IT`, `OR`, `AND` — flagged.
Markdown emphasis words like `ALL_CAPS` — flagged.

The fix: replaced the heuristic entirely with a principled suffix/length/vowel-pattern test.
Took four PRs to get right.

---

**3/8**
The scanner was also reading its own output.

After a scan, subsequent runs would pick up the generated report and scan it.
A mention of "master" in a Docker pinning finding would generate an inclusive language finding
about the word "master."

The scanner was hallucinating.
Generated HTML and markdown output are now excluded from the content scanners.

---

**4/8**
Severity was miscalibrated.

INI tier 1/2/3 mapped directly to CRITICAL/WARNING/INFO.
One tier-1 term in a project name → CRITICAL severity → inclusive pillar score of 0.0.

The fix: decouple tier from severity.
Tier is now a metadata label.
Severity is capped at WARNING for all inclusive scanner findings.
The tier is still available for filtering — it just does not drive the score.

---

**5/8**
Grouped rendering is new.

Previously: one diminishing-language pattern in 30 files = 30 separate findings in the report.
Now: one finding block, one file list, 120-character context cap.

The actual problems in a report are now visible because the same finding no longer dominates the
whole output.

---

**6/8**
Also fixed in v0.1.4:

→ Minified bundles excluded from inclusive scanners
→ `.claude` and `.ainative` toolchain dirs excluded from binary-artifacts
→ Code fences excluded from prose pattern checks
→ `devDependency ^` prefix downgraded from WARNING to INFO
→ `renderIssueBody` — 3 correctness fixes
→ Local timezone for timestamps and filenames

---

**7/8**
The inclusive pillar score on quaid-scanner's own self-scan went from 0.0 to 4.5.

The remaining warnings are legitimate: diminishing language in documentation ("simply", "just")
and one known false positive that has an open issue.

That is what accurate output looks like.

---

**8/8**
`npm install -g quaid-scanner@0.1.4`

If you ran quaid-scanner before and discounted the inclusive findings because there were too many
— this release is worth re-running.

The findings that remain after v0.1.4 are the ones worth acting on.

github.com/quaid/quaid-scanner

---

_[end thread]_
