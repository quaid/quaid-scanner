---
title: "Signal Over Noise: What We Fixed in the Inclusive Language Scanner"
slug: signal-over-noise-inclusive-scanner-v014
description: v0.1.4 ships 21 bug fixes and 4 features concentrated almost entirely on inclusive language scanner quality — eliminating false positives so the real findings can finally be heard.
author: Karsten Wade
date: 2026-06-12
status: draft
target: iquaid.org
tags: [quaid-scanner, inclusive-language, open-source, oss-health, false-positives, signal-to-noise]
---

# Signal Over Noise: What We Fixed in the Inclusive Language Scanner

The honest version of what happened between v0.1.3 and v0.1.4 is this:
I ran quaid-scanner against several real repositories and watched it produce hundreds of inclusive
language findings on projects that did not have inclusive language problems.

That is a serious quality failure.
A scanner that cries wolf is worse than no scanner at all,
because it trains the people reading reports to ignore the findings.

v0.1.4 is the fix.
Twenty-one bug fixes and four features, almost all of them in the inclusive language pillar.

---

## What Was Generating the Noise

**Acronyms that were not acronyms.**
The assumed-knowledge scanner flags unexplained acronyms — terms that a reader may not know that
appear without being defined.
It was using a heuristic that treated any sequence of uppercase letters as an acronym.
So `GET`, `POST`, and `PUT` (HTTP verbs) were flagged.
So were `ALL_CAPS` emphasis words in markdown.
So were `IT`, `OR`, `AND`, and `IS` — ordinary English words that happen to be uppercase in
certain contexts.

The fix came in four stages across multiple PRs because the heuristic needed to be replaced, not
patched.
The final version uses a principled suffix/length/vowel-pattern test rather than the naive
uppercase check.
The result is an acronym detector that flags actual unexplained acronyms.

**The scanner was reading its own output.**
After generating a report, subsequent scans would pick up the report file and scan it.
The report contains findings, and findings contain terms that triggered more findings.
A mention of "master" in a Docker pinning finding would generate an inclusive language finding
about using "master."

This is the scanner hallucinating.
The fix excludes generated HTML and markdown output from the content scanners.

**Minified bundles.**
`*.min.js` files contain a lot of text.
Some of it — identifiers, string literals, variable names — was triggering inclusive language
findings.
Minified bundles are not project content; they are compiled artifacts.
They are now excluded alongside `node_modules/`, `dist/`, and `build/`.

**Severity miscalibration.**
INI tier 1/2/3 mapped directly to CRITICAL/WARNING/INFO severity.
A single tier-1 term in a project name was CRITICAL, which dragged the inclusive pillar score
down in a way that overwhelmed the rest of the report.

The fix is to decouple tier from severity.
Tier is now a metadata label.
Severity is determined by scanner logic and is capped at WARNING for the inclusive pillar.
The INI tier information is still available for consumers who want to filter by it — it is just no
longer the severity value itself.

**Repeated findings from the same pattern across dozens of files.**
When a project had one diminishing language pattern ("simply", "just") in thirty documentation
files, the scanner generated thirty separate findings.
The report became a wall of the same finding, repeated.

The grouped markdown renderer collapses these.
One finding block.
One file list.
One set of context snippets.
The actual diversity of problems in the project is now visible because the repeated findings no
longer dominate.

---

## What the Scanner Looks Like Now

Here is an example of what v0.1.3 might have produced for a project with three instances of
"simply" across documentation and one legitimate acronym issue:

```
[WARNING] Diminishing language: "simply" in docs/getting-started.md
[WARNING] Diminishing language: "simply" in docs/api-reference.md
[WARNING] Diminishing language: "simply" in docs/configuration.md
[WARNING] Unexplained acronym: "API" in docs/getting-started.md
[WARNING] Unexplained acronym: "IT" in docs/getting-started.md
[WARNING] Unexplained acronym: "POST" in docs/api-reference.md
[WARNING] Unexplained acronym: "GET" in docs/api-reference.md
```

Here is what v0.1.4 produces for the same project:

```
[WARNING] Diminishing language: "simply" — 3 files
  docs/getting-started.md, docs/api-reference.md, docs/configuration.md
  Suggestion: Replace with more specific language. (Microsoft Style Guide)
  
[WARNING] Unexplained acronym: "API" in docs/getting-started.md
  Consider defining "API" on first use or linking to a glossary.
```

The real finding is still there.
The noise is gone.

---

## On False Positives as a Trust Problem

I have been running quaid-scanner against real repositories — some in the AINative portfolio,
some external projects I scan periodically to check health trends.

When the scanner reports 196 inclusive language findings for a project that has a `.quaid-scanner-ignore` file and has done real inclusive language work, I do not trust the findings.
Neither do the maintainers of those projects.

Accuracy is the prerequisite for usefulness.
A scanner that gets precision right can ask people to act on findings.
A scanner that does not gets skimmed and filed.

v0.1.4 moves the inclusive language pillar from "produces a lot of output" to "produces accurate output."
There is more work to do — the roadmap has Category B and Category D scanners (ableist language,
cognitive load patterns) that are not yet written.
But the foundation has to be right before building up.

---

## Upgrading

```bash
npm install -g quaid-scanner@0.1.4
```

If you have been running quaid-scanner and discounting the inclusive language findings because
there were too many of them, this release is worth re-running.
The findings that remain after v0.1.4 are the ones worth acting on.

Full release notes: [docs/releases/v0.1.4.md](https://github.com/quaid/quaid-scanner/blob/main/docs/releases/v0.1.4.md)

Full changelog: [CHANGELOG.md](https://github.com/quaid/quaid-scanner/blob/main/CHANGELOG.md)
