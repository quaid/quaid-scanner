---
title: "Twitter/X Thread: quaid-scanner v0.1.5"
author: Karsten Wade
date: 2026-11-07
status: draft
target: twitter
note: "8 posts. Terser than Bluesky, same arc: solo-maintainer lead, LMCache defects, honest score. Corrected: the 8.1 → 6.5 drop is caused by scanning without a token (#247), NOT the GraphQL fix."
---

# Twitter/X Thread: quaid-scanner v0.1.5

---

**1/8**
My OSS health scanner raised a CRITICAL on my own repo: no required PR reviews.

So I enabled them.

I'm the only committer. GitHub won't let you approve your own PR.

🧵

---

**2/8**
Every merge since has needed an admin override of the branch protection rule.

Worse than not having the rule. It trains the one person with the bypass to use it reflexively,
and makes the protection meaningless to anyone reading the repo settings.

---

**3/8**
The scanner recommended a control the project structurally cannot satisfy.

The project got less safe by following the advice.

That's a class of bug. Only 2 of 43 scanners consulted project maturity — and maturity is the
wrong axis. A project can be mature, widely used, and still have one committer.

---

**4/8**
v0.1.5 adds team-shape awareness.

No practical second reviewer → "required reviews not enabled" goes CRITICAL → INFO, and
recommends required status checks instead. Satisfiable by one person, and they actually block a
bad merge.

---

**5/8**
Detail I didn't expect: counting distinct commit emails doesn't work.

This repo's history has 3 author addresses and 1 human. The naive version reports 3 committers
and leaves the bug unfixed on the exact repo that hit it.

---

**6/8**
And every ambiguity has to resolve to "not solo."

GitHub targets are cloned `--depth 1`. A naive reading marks *every* remote scan solo and quietly
relaxes security checks everywhere.

---

**7/8**
Rest of the release: 4 defects found by scanning a real project (LMCache). All the same shape —
the scanner penalised the more sophisticated setup.

Worst: the published binary did nothing. Printed nothing, exited 0. CI gating on `--threshold`
read that as a clean pass.

---

**8/8**
Also: a draft of these notes said 8.1/10 LOW. Published number is 6.5 MEDIUM.

The 8.1 came from scanning with no `GITHUB_TOKEN` — 5 scanners degrade to a benign INFO instead
of recording as skipped. Pillars score well by not being measured.

`npm i -g quaid-scanner@0.1.5`

---

_[end thread]_
