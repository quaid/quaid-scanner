---
title: "A Control You Cannot Satisfy"
slug: control-you-cannot-satisfy-team-shape
description: My OSS health scanner told me to require code review. I am the only committer. Enabling it made the project measurably less safe — and exposed a whole class of bug in how health tools reason about team shape.
author: Karsten Wade
date: 2026-11-07
status: draft
target: iquaid.org
tags: [quaid-scanner, oss-health, governance, security, solo-maintainer, tooling]
---

# A Control You Cannot Satisfy

My open source health scanner raised a CRITICAL finding on my own repository: no required
pull-request reviews.

So I enabled them.

I am the only committer on that project. GitHub does not let you approve your own pull request.

## What following the advice actually did

Every merge after that required an admin override of the branch protection rule.

That is not a neutral workaround. It is strictly worse than not having the rule at all. It trains
the one person holding the bypass to use it reflexively, until the override stops registering as a
decision. And it makes the protection meaningless to anyone reading the repository's settings —
the rule is there, it is green, and it has been overridden on every single merge since the day it
was turned on.

The scanner recommended a control the project structurally cannot satisfy. The project got less
safe by following the advice.

## This is a class of bug

It would be easy to treat that as one bad rule and patch it. It is not.

Only 2 of the 43 scanners in this tool consulted project maturity at all. The PRD already commits
to the right principle — *"a sandbox project that hasn't written down its governance yet is not
failing"* — but that was implemented for project **age**, and age is not the axis that matters
here.

A project can be mature, well-tested, widely depended on, and still have exactly one committer.
Those are different properties. A health tool that collapses them will keep generating advice its
users cannot act on, and the most conscientious users — the ones who actually do what the report
says — are the ones it harms.

The failure shape is the same one that produced the other four defects in this release: the tool
penalised the setup it understood least well, and the remediation it offered was impossible or
already done.

## What v0.1.5 does instead

The scanner now derives **team shape** from git history, and scanners can ask whether a repository
has a practical second reviewer.

When it does not:

| Finding | Before | After |
|---|---|---|
| Required reviews not enabled | CRITICAL — "require at least 1 approving review" | **INFO** — "GitHub does not allow approving your own pull request… enable required status checks instead" |
| Required status checks not enabled | WARNING | unchanged — satisfiable solo, still the right ask |
| No branch protection at all | CRITICAL | unchanged — satisfiable solo, still important |

The substitution is the point. Required status checks are a real control: one person can turn them
on, and they genuinely block a merge when CI fails. That is the advice a solo maintainer should
have been getting all along.

A bus factor of one remains a real risk and stays visible in the report. What changed is that the
severity and the suggested remedy now match what the project can actually do about it.

## Two details that mattered more than expected

**Counting distinct commit emails does not work.**

It is the obvious implementation and it is wrong. This repository's own history has three author
addresses belonging to one human — a personal address, a GitHub noreply address, and a work
address. The naive version would have reported three committers, concluded there was a team, and
left the bug unfixed on the very repository that surfaced it.

So identities are grouped on author name *or* email local-part, with GitHub's `12345+` noreply
prefix stripped before comparison, and bot accounts excluded entirely.

**Every ambiguity has to resolve toward "not solo."**

An unknown team shape, a shallow clone, or a non-git directory all keep the original severity.
This is not defensive padding; it is load-bearing. quaid-scanner clones GitHub targets with
`--depth 1`, which produces exactly one visible commit. A naive reading would mark **every remote
scan** as solo-maintained and quietly relax security checks across an entire portfolio.

A signal that relaxes a security check has to fail closed. If the tool is not sure, it says the
stricter thing.

## The part I would rather not publish

A draft of these release notes claimed 8.1 out of 10, LOW risk. The published number is 6.5,
MEDIUM.

Nothing regressed. The 8.1 came from a scan run without a `GITHUB_TOKEN`, and that turns out to be
its own bug. Five API-backed scanners degrade to a harmless `INFO` when no token is present rather
than recording themselves as skipped. The report still says it is complete. The pillars those
scanners feed score well by not being measured.

A 1.6-point swing across a risk-level boundary, produced by an environment variable, with nothing
in the report disclosing it. It is filed, and it is the first thing the next release fixes.

It is easy to publish a number that went up. The test of a health tool is whether you publish the
one that went down because you made the tool more honest.

## Upgrading

```bash
npm install -g quaid-scanner@0.1.5
```

Full release notes:
[docs/releases/v0.1.5.md](https://github.com/quaid/quaid-scanner/blob/main/docs/releases/v0.1.5.md)

The next release is "promises kept": every feature the documentation claims either works or gets
withdrawn.
