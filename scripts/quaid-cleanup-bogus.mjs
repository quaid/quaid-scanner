#!/usr/bin/env node
/**
 * quaid-cleanup-bogus.mjs
 *
 * Closes bogus issues created when quaid-scanner had an undefined scannerTimeout
 * (bug #135) and when the inclusive scanner crashed on undefined config (bug #136).
 *
 * Two title patterns are matched — ONLY these; no legitimate findings will be closed:
 *   1. Contains "timed out after"                  → scanner timeout (undefined timeout)
 *   2. Contains "Cannot read properties of undefined" → inclusive scanner crash
 *
 * Usage:
 *   node scripts/quaid-cleanup-bogus.mjs [--dry-run] [--only <repo>] [--org <org>]
 *
 * Pacing: 3s between individual closes, 10s between repos.
 *
 * After closing, writes a rescan-needed summary to stdout.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

// ── Config ────────────────────────────────────────────────────────────────────

const ORG  = process.argv.includes('--org')
  ? process.argv[process.argv.indexOf('--org') + 1]
  : 'AINative-Studio';
const DRY  = process.argv.includes('--dry-run');
const ONLY = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;

const CLOSE_COMMENT =
  'Bogus issue from a scanner timeout/crash during the initial batch run. ' +
  'The scanner did not produce a valid finding. ' +
  'This repo will be rescanned once quaid-scanner v0.1.3 is deployed (fixes #135 and #136).';

// Repos that received bogus issues — edit this list before each cleanup run.
const REPOS = [
  'Agent-402',
  'Agent-Gaunlet-Starter-Kit',
  'agent-starter',
  'agent-swarm-monitor',
  'agentic-rules',
  'ai-kit',
  'ai-kit-a2ui',
  'ai-kit-a2ui-core',
  'ainative-code',
  'ainative-sdks',
  'ainative-zerodb-memory-mcp',
  'ainative-zerodb-mcp-server',
  'AINativeStudio-IDE',
  'getlayn',
  'google-io-hackathon-code-review',
  'google-io-hackathon-data-room',
  'greentrack',
  'hackerdojo',
  'homebrew-tap',
  'kwanzaa',
  'littleleague-nft',
  'llmevals-framework',
  'llmevals-framework-frontend',
  'mcp-l-core',
  'MealBuddy',
  'ragbot-starter',
  'zerodb-local',
];

const TIMEOUT_PATTERN = /timed out after/i;
const CRASH_PATTERN   = /Cannot read properties of undefined/i;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
  } catch (e) {
    if (opts.allowFail) return '';
    throw e;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkRateLimit(minRemaining = 100) {
  try {
    const raw = sh(`gh api rate_limit --jq '.resources.graphql | {remaining,reset}'`);
    const { remaining, reset } = JSON.parse(raw);
    if (remaining < minRemaining) {
      const waitMs = reset * 1000 - Date.now() + 5000;
      if (waitMs > 0) {
        console.log(`\n  ⏳ rate limit: ${remaining} remaining — waiting ${Math.ceil(waitMs / 1000)}s`);
        await sleep(waitMs);
      }
    }
  } catch {
    // best-effort
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const repos = ONLY ? REPOS.filter((r) => r === ONLY) : REPOS;

  console.log(`\nquaid-cleanup-bogus${DRY ? ' [DRY RUN]' : ''} — closing timeout and crash issues`);
  console.log(`Org: ${ORG} | Repos: ${repos.length} | Pacing: 3s/close, 10s/repo\n`);

  const summary = [];
  let totalClosed = 0, totalFailed = 0;

  for (const repo of repos) {
    const orgRepo = `${ORG}/${repo}`;
    console.log(`\n── ${repo} ──────────────────────────────`);

    let issues;
    try {
      const raw = sh(`gh issue list -R ${orgRepo} --state open --limit 200 --json number,title`);
      issues = JSON.parse(raw);
    } catch (e) {
      console.log(`  ✗ could not list issues: ${e.message?.slice(0, 80)}`);
      summary.push({ repo, closed: 0, failed: 0, error: true });
      continue;
    }

    const bogus = issues.filter(
      (i) => TIMEOUT_PATTERN.test(i.title) || CRASH_PATTERN.test(i.title),
    );

    if (bogus.length === 0) {
      console.log(`  ✓ no bogus issues found`);
      summary.push({ repo, closed: 0, failed: 0 });
      continue;
    }

    const timeoutCount = bogus.filter((i) => TIMEOUT_PATTERN.test(i.title)).length;
    const crashCount   = bogus.filter((i) => CRASH_PATTERN.test(i.title)).length;
    console.log(`  found ${bogus.length} bogus (${timeoutCount} timeout, ${crashCount} crash)`);

    let repoClosed = 0, repoFailed = 0;

    for (let i = 0; i < bogus.length; i++) {
      const issue = bogus[i];

      if (i % 30 === 0) await checkRateLimit();

      if (DRY) {
        console.log(`  [DRY] would close #${issue.number}: ${issue.title.slice(0, 70)}`);
        repoClosed++;
        totalClosed++;
        continue;
      }

      try {
        sh(`gh issue close ${issue.number} -R ${orgRepo} --comment ${JSON.stringify(CLOSE_COMMENT)}`);
        console.log(`  closed #${issue.number}: ${issue.title.slice(0, 70)}`);
        repoClosed++;
        totalClosed++;
      } catch (e) {
        console.log(`  ✗ failed #${issue.number}: ${e.message?.slice(0, 60)}`);
        repoFailed++;
        totalFailed++;
      }

      await sleep(3000);
    }

    summary.push({ repo, closed: repoClosed, failed: repoFailed });
    console.log(`  repo done: ${repoClosed} closed, ${repoFailed} failed`);
    if (!DRY) await sleep(10000);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Total closed: ${totalClosed}, failed: ${totalFailed}`);

  if (DRY) {
    console.log(`\n[DRY RUN complete — no issues were actually closed]`);
    return;
  }

  // ── Rescan summary ────────────────────────────────────────────────────────

  const lines = [
    `# Repos Needing Rescan After Bogus Issue Cleanup`,
    ``,
    `Closed ${totalClosed} bogus issues across ${repos.length} repos.`,
    `Rescan these repos once quaid-scanner v0.1.3 is deployed.`,
    ``,
    `| Repo | Closed | Needs Rescan |`,
    `|------|:------:|:------------:|`,
    ...summary.map((s) => `| ${s.repo} | ${s.closed} | ${s.closed > 0 ? '✓' : ''} |`),
  ];

  const outPath = `/tmp/quaid-rescan-needed-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`\nWrote rescan summary → ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
