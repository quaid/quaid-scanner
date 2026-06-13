---
name: quaid-release
description: Full release process for quaid-scanner — docs, CHANGELOG, version bump, npm publish, content drafts. Use when preparing a new version for release.
---

# quaid-release Skill

End-to-end release process for quaid-scanner.
Run this skill when a version is ready to ship.

## When to use

- User asks to "do a release", "cut a release", "prep the release", or similar
- After a sprint of bug fixes or features are merged and ready to ship
- Before running `npm publish`

## Pre-flight Checklist

Before starting, confirm:

1. All intended PRs are merged to `main`
2. `git status` is clean (no uncommitted changes)
3. You are logged in to npm: `npm whoami` — if not, ask user to run `! npm login`
4. Identify the new version: read `package.json` current version and determine patch/minor/major bump

## Step 1 — Identify What's in the Release

```bash
# Get all commits since the last version tag or release date
git log --oneline --since="$(git log --oneline | grep 'chore: release\|bump version' | head -1 | cut -d' ' -f1 || echo '1970-01-01')"
```

More reliably: read CHANGELOG.md `## [Unreleased]` section and cross-reference with `git log --oneline` since the last `## [X.Y.Z]` date.

Categorize commits into:
- **Fixed** — bug fixes (commits starting with `fix:`)
- **Added** — new features/exports (commits starting with `feat:`)
- **Changed** — behaviour changes
- **Docs** — skip unless they affect user-facing docs

## Step 2 — Update README

Things that may need updating:

- **Project Health section** — update "Current score as of vX.Y.Z" version reference and self-scan scores if materially different
- **Known findings table** — remove any issues that were fixed in this release
- **Known false positives table** — remove any entries for issues fixed in this release
- **CLI Reference** — if new flags were added
- **Library usage** — if new exports were added (`renderHtml`, new types, etc.)
- **Scanner count** — if new scanners were added (currently "43 scanners")

## Step 3 — Write CHANGELOG Entry

Replace the `## [Unreleased]` section content (keep the heading) with the new version entry.

Format:
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Fixed

- **Short description** — detailed explanation of what was wrong and what changed.
  Include the GitHub issue/PR numbers at the end. (#NNN, #NNN)

### Added

- **Short description** — what was added and why it matters to consumers.
  Include GitHub issue/PR numbers. (#NNN, #NNN)
```

Rules:
- Past tense, third person ("The scanner now…" not "We fixed…")
- Include enough detail that a user can understand the impact without reading the PR
- Group related fixes together under a shared heading when it makes narrative sense
- Do NOT include docs-only commits in the changelog

## Step 4 — Write docs/releases/vX.Y.Z.md

Follow the format of `docs/releases/v0.1.2.md` and `docs/releases/v0.1.4.md`.

Structure:
```
# quaid-scanner vX.Y.Z

**Released:** YYYY-MM-DD

## What's New

[Feature-focused narrative. Group related changes under H3 headings. Write for a user
who didn't follow the development — explain what was wrong and what it looks like now.]

## Bug Fixes

[Terse bulleted list of fixes not already covered in What's New. Reference issue numbers.]

## Self-Scan (vX.Y.Z, quick depth)

[Update the self-scan table. Run: quaid-scanner . --depth quick --quiet --format json
and populate the pillar scores and finding counts from the output.]

## Upgrade

    npm install -g quaid-scanner@X.Y.Z

## Full Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for the complete list of changes.
```

To get current self-scan scores:
```bash
quaid-scanner . --depth quick --quiet --format json | jq '{
  overallScore, riskLevel,
  pillars: (.pillars | to_entries | map({key: .key, value: .value.score}))
}'
```

## Step 5 — Bump Version

```bash
# Edit package.json version field
# Old: "version": "X.Y.Z-1"
# New: "version": "X.Y.Z"
```

Use the Edit tool — do not use `npm version` (it creates a git tag automatically).

## Step 6 — Run Tests

```bash
npm run test:coverage
```

All tests must pass. The CLI integration test (`Story 1.2`) is known to flake on subprocess timeout.
If only that test fails, retry with:

```bash
QUAID_SUBPROCESS_TIMEOUT=60000 npx vitest run tests/cli/cli-integration.test.ts
```

If it passes with the extended timeout, it is a timing flake — proceed to publish.

## Step 7 — Commit the Release

Stage and commit all release-prep changes:
- `package.json` (version bump)
- `CHANGELOG.md` (new entry)
- `README.md` (if updated)
- `docs/releases/vX.Y.Z.md` (new file)
- `docs/content/vX.Y.Z/` (new content drafts)

Commit message format:
```
chore: release vX.Y.Z
```

No AI attribution. No "Generated with Claude Code". No co-author lines.

## Step 8 — npm Publish

```bash
npm publish --access public
```

The `prepublishOnly` hook runs `npm run build && npm run test:coverage` automatically.
If tests pass and the publish succeeds, you will see:
```
+ quaid-scanner@X.Y.Z
```

Verify:
```bash
npm view quaid-scanner@X.Y.Z version
```

## Step 9 — Create GitHub Release

```bash
gh release create vX.Y.Z \
  --title "quaid-scanner vX.Y.Z" \
  --notes-file docs/releases/vX.Y.Z.md
```

## Step 10 — Content Drafts

Create `docs/content/vX.Y.Z/blog/` and `docs/content/vX.Y.Z/social/`.

### Blog post

File: `docs/content/vX.Y.Z/blog/YYYY-MM-DD-{slug}.md`

Frontmatter:
```yaml
---
title: "..."
slug: ...
description: "120-160 char description for SEO"
author: Karsten Wade
date: YYYY-MM-DD
status: draft
target: iquaid.org
tags: [quaid-scanner, ...]
---
```

Style guide (from blog-publish-pipeline):
- Voice: Karsten Wade "Quaid" — invitational not preachy
- No-link-no-fact rule: no specific claim without a verifiable URL
- One sentence per line within paragraphs (semantic line breaks)
- 500–700 words
- Lead with a concrete problem or observation, not a feature announcement

### Social posts

Files:
- `docs/content/vX.Y.Z/social/YYYY-MM-DD-bluesky-thread.md` (8–9 posts)
- `docs/content/vX.Y.Z/social/YYYY-MM-DD-twitter-thread.md` (7 posts)
- `docs/content/vX.Y.Z/social/YYYY-MM-DD-linkedin.md` (5–7 paragraphs)

Each file uses the same YAML frontmatter pattern (title, author, date, status, target, note).

Bluesky: OSS / fediverse-adjacent audience. Build a story arc across the thread.
Twitter/X: Same audience, terser. Lead with the problem/fix loop. Keep technical specifics tight.
LinkedIn: Broader professional audience. More narrative. Lead with the human/business problem.

### Publishing

Drafts live in `docs/content/vX.Y.Z/` permanently. They feed into the blog-sources pipeline
only at publish time — do not push to blog-sources or Strapi from this step.
Use the `/blog-publish-pipeline` skill when ready to publish.

## Notes

- Never add AI attribution to commits, PRs, or issue comments
- The `prepublishOnly` hook runs the full test suite — do not skip it
- README self-scan scores should reflect a real scan, not estimated values; update when possible
- Inclusive score 0.0 in self-scan is a known historical issue; v0.1.4+ should be above 4.0
