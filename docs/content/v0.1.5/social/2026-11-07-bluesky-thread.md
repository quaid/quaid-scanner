---
title: "Bluesky Thread: quaid-scanner v0.1.5"
author: Karsten Wade
date: 2026-11-07
status: draft
target: bluesky
note: "11 posts. Leads with the solo-maintainer story (#245) — the strongest beat and the one with a point beyond the release. Then the LMCache accuracy defects, then the honest score. Provenance demoted to the release-notes link; it is real but it is not the story. Corrected: the 8.1 → 6.5 drop is caused by scanning without a token (#247), NOT the GraphQL fix."
---

# Bluesky Thread: quaid-scanner v0.1.5

---

**1/11**
My OSS health scanner raised a CRITICAL on my own repo: no required pull-request reviews.

So I enabled them.

I am the only committer. GitHub does not let you approve your own pull request.

🧵

---

**2/11**
Every merge since has required an admin override of the branch protection rule.

Which is strictly worse than not having the rule at all. It trains the one person holding the
bypass to use it reflexively, and it makes the protection meaningless to anyone reading the
repository's settings.

---

**3/11**
The scanner recommended a control the project structurally cannot satisfy.

The project got less safe by following the advice.

---

**4/11**
That is a class of bug, not a one-off.

Only 2 of 43 scanners consulted project maturity at all. And maturity is the wrong axis anyway —
a project can be mature, well-tested, widely used, and still have exactly one committer.

---

**5/11**
So v0.1.5 adds team-shape awareness.

No practical second reviewer? "Required reviews not enabled" drops from CRITICAL to INFO, and
recommends required status checks instead — satisfiable by one person, and they actually block a
bad merge.

---

**6/11**
Two details mattered more than I expected.

Counting distinct commit emails does not work. This repo's own history has three author addresses
and one human. The naive version would have reported three committers and left the bug unfixed on
the very repo that hit it.

---

**7/11**
And every ambiguity has to resolve toward "not solo."

GitHub targets get cloned `--depth 1`. A naive reading marks every remote scan solo and quietly
relaxes security checks across the board.

Unknown team shape keeps the original severity.

---

**8/11**
The rest of v0.1.5 came from pointing the tool at a real project — LMCache — and finding four
defects, all the same shape: the scanner penalised the more sophisticated setup.

SHA-pinned actions read as unpinned. Multi-stage Docker builds misread. 701 findings inside a
`.venv/`.

---

**9/11**
The worst one: the published binary did nothing at all.

A global install printed nothing and exited 0. A CI job gating on `--threshold` read that as a
clean pass and silently approved every repo.

Invisible to a 97%-coverage suite — every test invoked `dist/cli.js` directly.

---

**10/11**
Last thing. A draft of these notes said 8.1/10, LOW risk. The published number is 6.5, MEDIUM.

The 8.1 came from scanning without a `GITHUB_TOKEN`. Five API-backed scanners degrade to a benign
INFO instead of recording as skipped, so the pillars they feed score well by not being measured.

---

**11/11**
That is its own bug, now filed. A 1.6-point swing across a risk boundary, from an environment
variable, with nothing in the report saying so.

`npm install -g quaid-scanner@0.1.5`

Next release is "promises kept" — every feature the docs claim either works or gets withdrawn.

github.com/quaid/quaid-scanner

---

_[end thread]_
