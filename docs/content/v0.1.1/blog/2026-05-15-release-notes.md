---
title: "quaid-scanner v0.1.1 — Remote Scanning, Token Fixes, and Agent Fidelity"
slug: quaid-scanner-release-notes-v0-1-1
description: Release notes for quaid-scanner v0.1.1, a bugfix release correcting remote repo scanning, GitHub token handling, severity serialization, and MCP server compatibility.
author: Karsten Wade
category: Product Deep Dives
tags: [quaid-scanner, release-notes, open-source, oss-health, mcp, agents]
published: false
target_platform: github-release
version: 0.1.1
date: 2026-05-04
---

# quaid-scanner v0.1.1

This is a focused bugfix release.
All five fixes address correctness issues discovered during the first real-world scans of external repositories after the v0.1.0 launch.
None of the fixes change the scoring model, scanner logic, or public API shape.

## What Was Broken

### Remote Repo Scanning Ran Against the Wrong Tree

When you pointed quaid-scanner at a GitHub URL, the file-based scanners — inclusive language, technical rigor, governance — were quietly grading quaid-scanner's _own_ source tree instead of the target repository.

The root cause: `buildContext` was leaving `repoPath` empty for remote targets, so `glob()` resolved to `process.cwd()`.

**Fixed:** `buildContext` now clones the target via `git clone --depth 1` into a temporary directory, sets `repoPath` to that directory, and removes it after the scan completes.
([#63](https://github.com/quaid/quaid-scanner/issues/63), [#64](https://github.com/quaid/quaid-scanner/issues/64))

### Private Repos Could Not Be Cloned

After the clone fix landed, private repository scans returned _"Repository not found."_
The token was available but not being included in the clone URL.

**Fixed:** When `githubToken` is present, the clone URL is constructed as `https://{token}@github.com/{owner}/{repo}.git`.
([#63](https://github.com/quaid/quaid-scanner/issues/63))

### GitHub Token Was Never Read From the Environment

`buildConfig` left `githubToken: null` unless a caller explicitly provided it.
This silently disabled all GitHub API–backed checks — branch protection, OpenSSF Scorecard, issue closure rate, response time — even when `GITHUB_TOKEN` was present in the environment.

**Fixed:** `buildConfig` now reads `GITHUB_TOKEN`, falling back to `GITHUB_PERSONAL_ACCESS_TOKEN`.
All GitHub API checks activate automatically when either variable is set.
([#61](https://github.com/quaid/quaid-scanner/issues/61), [#65](https://github.com/quaid/quaid-scanner/issues/65))

### Severity Was Serialized as an Integer

`serializeJson` was emitting raw enum integers — `2` instead of `"CRITICAL"` — in the JSON output.
Any agent using `jq` filters like `.findings[] | select(.severity == "CRITICAL")` received zero results.

**Fixed:** A custom JSON.stringify replacer converts severity integers to their human-readable labels: `"PASS"`, `"INFO"`, `"WARNING"`, `"CRITICAL"`.
([#62](https://github.com/quaid/quaid-scanner/issues/62), [#66](https://github.com/quaid/quaid-scanner/issues/66))

### MCP Server Threw on Every Scan

The MCP server's `scan_repository` handler was accessing `buildContext` return values with the shape from before v0.1.0 — `context.git.commitSha` directly on the result — which is now `{ context, cleanup }`.
Every MCP scan threw immediately.

**Fixed:** The handler destructures `{ context, cleanup }` and wraps the scan in a `try/finally` block so `cleanup()` runs even on error.
Also removed an unused `CollaborationSpectrum` import from `src/graph/collaboration-scorer.ts` that was causing a TS6196 warning.
([#54](https://github.com/quaid/quaid-scanner/issues/54))

---

## Minor Changes

- `package.json` `repository.url` normalized to `git+https://github.com/quaid/quaid-scanner.git` (npm-canonical format).
- README updated: scanner count corrected to 41, `GITHUB_PERSONAL_ACCESS_TOKEN` fallback documented, `.env` sourcing pattern added, new Portfolio Scanning section, `ai_readiness` key corrected in example output.

---

## Upgrade

```bash
npm install -g quaid-scanner@latest
```

Or without installing:

```bash
npx quaid-scanner@0.1.1 https://github.com/owner/repo --depth quick
```

---

## Full Changelog

[v0.1.0...v0.1.1](https://github.com/quaid/quaid-scanner/compare/v0.1.0...v0.1.1)
