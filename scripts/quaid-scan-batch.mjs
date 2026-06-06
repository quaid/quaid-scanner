#!/usr/bin/env node
/**
 * quaid-scan-batch.mjs
 *
 * Scans every repo in REPOS, writes docs/reports/quaid-scan-YYYY-MM-DD.md,
 * commits it on a branch, creates + merges a PR, then files GitHub issues
 * for actionable (CRITICAL/WARNING) findings that are not scanner failures.
 *
 * Usage:
 *   node scripts/quaid-scan-batch.mjs [--dry-run] [--start-from <repo>] [--only <repo>] [--force]
 *
 * Requirements:
 *   - npm run build must be run first (imports from ../dist/index.js)
 *   - GITHUB_TOKEN set in environment
 *   - Local clones of target repos in BASE directory
 *
 * Idempotency: completed repos are recorded in scripts/.quaid-scan-state.json
 * and skipped on re-runs. Use --force to re-run all repos regardless.
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import from the built package in this repo (requires npm run build first)
const distPath = join(__dirname, '..', 'dist', 'index.js');
if (!existsSync(distPath)) {
  console.error('Error: dist/index.js not found. Run `npm run build` first.');
  process.exit(1);
}

const {
  Orchestrator,
  createDefaultRegistry,
  buildScanReport,
  renderMarkdown,
  serializeJson,
  buildContext,
  isErrorFinding,
  renderIssueBody,
} = await import(distPath);

// ── Config ────────────────────────────────────────────────────────────────────

/**
 * Returns the local calendar date as YYYY-MM-DD using the host's timezone,
 * avoiding the UTC-date mismatch that occurs when toISOString() is used
 * for runs near midnight local time.
 *
 * @param {Date} d - The Date to format. Defaults to the current time.
 * @returns {string} e.g. "2026-06-05"
 */
function localDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const BASE        = join(__dirname, '..', '..', 'AINative-Studio', 'src');
const ORG         = 'AINative-Studio';
const TODAY       = localDate();
const BRANCH      = `chore/quaid-scan-${TODAY}`;
const STATE_FILE  = join(__dirname, '.quaid-scan-state.json');
const DRY         = process.argv.includes('--dry-run');
const FORCE       = process.argv.includes('--force');
const ONLY        = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;
const START_FROM  = process.argv.includes('--start-from')
  ? process.argv[process.argv.indexOf('--start-from') + 1]
  : null;

// ── Repo list ─────────────────────────────────────────────────────────────────

const REPOS = [
  // ⭐ Featured on /open-source
  'Agent-402', 'agentic-rules', 'ai-kit', 'ai-kit-a2ui', 'ainative-code',
  'ainative-sdks', 'ainative-zerodb-memory-mcp', 'ainative-zerodb-mcp-server',
  'AINativeStudio-IDE', 'ragbot-starter', 'zerodb-local',
  // ✓ Listed on /open-source
  'Agent-Gaunlet-Starter-Kit', 'agent-starter', 'agent-swarm-monitor',
  'ai-kit-a2ui-core', 'ai-kit-showcase', 'ai-twin-content-studio', 'aikit-agent-demo',
  'ainative-strapi-mcp-server', 'ax-dealroom', 'cody-sdk-typescript', 'crewai-zerodb',
  'DesignSystem-MCP', 'langchain-zerodb', 'llama-index-vector-stores-zerodb',
  'mcp-server-template', 'openclaw-gateway', 'oss-repo-check', 'sc-health-rag',
  'shadcn-ui-mcp-server', 'sol-mate-app', 'sol-mate-trust-api', 'zerodb-claude-plugin',
  'zerodb-cli', 'zerodb-cloudflare-worker', 'zerodb-go-sdk', 'zerodb-nextjs-template',
  'zerodb-python-sdk', 'zerodb-sequential-thinking-mcp', 'zerodb-supabase-adapter',
  'zerodb-typescript-sdk', 'zerodb-vercel-integration',
  // Unlisted AINative originals
  'Agent-402-frontend', 'ai-kit-nextjs-a2ui', 'ai-kit-svelte-a2ui', 'ai-kit-vue-a2ui',
  'ainative-ecosystem', 'ainative-jetbrains', 'ainative-neovim', 'boardlens',
  'builder-ainative-studio', 'cody-plugins-official', 'djunion', 'docflow',
  'dothack-backend', 'dothack-frontend', 'embedding-service', 'enerygrid', 'EventPulse',
  'foundercap', 'founderhouse', 'fundraising-agent', 'get-physics-done', 'getlayn',
  'Go-SDK', 'google-io-hackathon-code-review', 'google-io-hackathon-data-room',
  'greentrack', 'hackerdojo', 'homebrew-tap', 'kwanzaa', 'littleleague-nft',
  'llmevals-framework', 'llmevals-framework-frontend', 'llms-txt', 'mcp-l-core',
  'MealBuddy', 'nextjs-zerodb-doc-search', 'northbound-agency', 'PublicFounders',
  'python-sdk', 'rewardsy', 'santa-cruz-builder-class-2025', 'ScoutAgent', 'smb-dash',
  'sol-mate-frontend', 'telemetry-agent', 'travelpal', 'TypeScript-SDK', 'versions',
  'well-known-uris', 'ZeroMerch',
];

// ── State file (idempotency) ──────────────────────────────────────────────────

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { runDate: TODAY, completed: [], failed: [] };
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ── Rate limit ────────────────────────────────────────────────────────────────

async function checkRateLimit(minRemaining = 200) {
  try {
    const raw = sh(`gh api rate_limit --jq '.resources.graphql | {remaining,reset}'`);
    const { remaining, reset } = JSON.parse(raw);
    if (remaining < minRemaining) {
      const waitMs = reset * 1000 - Date.now() + 5000;
      if (waitMs > 0) {
        console.log(`  ⏳ rate limit: ${remaining} points remaining — waiting ${Math.ceil(waitMs / 1000)}s`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  } catch {
    // ignore — rate limit check is best-effort
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sh(cmd, cwd, opts = {}) {
  try {
    return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
  } catch (e) {
    if (opts.allowFail) return '';
    throw e;
  }
}

function log(repo, msg) {
  console.log(`[${repo}] ${msg}`);
}

function defaultBranch(repoDir) {
  try {
    const b = sh('git remote show origin', repoDir, { allowFail: true });
    const m = b.match(/HEAD branch:\s*(\S+)/);
    if (m) return m[1];
  } catch {}
  const branches = sh('git branch', repoDir, { allowFail: true });
  if (branches.includes('main')) return 'main';
  if (branches.includes('master')) return 'master';
  return 'main';
}

async function scanRepo(repoDir) {
  const version = '0.1.3';
  const target = { type: 'local', value: repoDir };
  // Explicit scannerTimeout avoids the undefined-→-0ms bug (#135)
  const config = { depth: 'standard', format: 'markdown', quiet: true, scannerTimeout: 90_000 };

  const { context, cleanup } = buildContext(target, config, version);
  try {
    const registry = createDefaultRegistry();
    const orchestrator = new Orchestrator(registry);
    const result = await orchestrator.run(context);
    const report = buildScanReport(target, result, config, context.maturity, version);
    report.metadata.commitSha = context.git?.commitSha ?? '';
    report.metadata.branch    = context.git?.branch    ?? '';
    report.metadata.remoteUrl = context.git?.remoteUrl ?? '';
    const markdown = renderMarkdown(report);
    const json     = JSON.parse(serializeJson(report));
    return { markdown, json, report };
  } finally {
    cleanup();
  }
}

function commitReport(repoDir, reportPath, markdown) {
  writeFileSync(reportPath, markdown, 'utf-8');
  sh(`git add -f "${reportPath}"`, repoDir);
  const diff = sh('git diff --staged --name-only', repoDir, { allowFail: true });
  if (!diff) return false;
  sh(`git commit -m "docs: add quaid-scanner health report ${TODAY}"`, repoDir);
  return true;
}

function createAndMergePR(repoDir, repoName, baseBranch, score, risk) {
  // Verify we are on the correct branch before creating PR (#141)
  const currentBranch = sh('git rev-parse --abbrev-ref HEAD', repoDir, { allowFail: true });
  if (currentBranch !== BRANCH) {
    throw new Error(`Expected branch ${BRANCH} but HEAD is ${currentBranch}`);
  }

  // Verify scan branch shares history with remote base (#146)
  const mergeBase = sh(`git merge-base "${BRANCH}" "origin/${baseBranch}"`, repoDir, { allowFail: true });
  if (!mergeBase) {
    throw new Error(`No common ancestor between ${BRANCH} and origin/${baseBranch} — orphan branch`);
  }

  sh(`git push origin "${BRANCH}"`, repoDir);

  const body = [
    `## OSS Health Report — ${TODAY}`,
    '',
    `**Score:** ${score.toFixed(1)}/10 | **Risk:** ${risk} | **Depth:** standard`,
    '',
    `Generated by [quaid-scanner](https://github.com/quaid/quaid-scanner) v0.1.3.`,
    '',
    `Report: \`docs/reports/quaid-scan-${TODAY}.md\``,
    `Issues for actionable findings are filed separately in this repo.`,
  ].join('\n');

  const bodyFile = `/tmp/quaid-pr-body-${repoName}.md`;
  writeFileSync(bodyFile, body, 'utf-8');

  // Always pass --head explicitly (#141)
  const prUrl = sh(
    `gh pr create --title "docs: quaid-scanner health report ${TODAY}" --body-file "${bodyFile}" --head "${BRANCH}" --base "${baseBranch}"`,
    repoDir,
  );
  sh(`gh pr merge "${prUrl}" --merge --delete-branch`, repoDir, { allowFail: true });
  return prUrl;
}

async function createIssues(repoDir, repoName, findings, report, reportRelPath) {
  // Skip issue filing entirely if the scan was partial (#138, #142)
  if (report.partial) {
    log(repoName, `⚠ scan was partial (${report.failedScanners.length} failed scanners) — skipping issue filing`);
    return [];
  }

  // Filter to actionable findings only — exclude scanner failures (#142, #139)
  const actionable = findings.filter(
    (f) => (f.severity === 'CRITICAL' || f.severity === 'WARNING') && !isErrorFinding(f),
  );

  if (actionable.length === 0) return [];

  // Check for existing quaid-scan issues to avoid duplicates (#148)
  const existingRaw = sh(
    `gh issue list -R "${ORG}/${repoName}" --label "quaid-scan" --state open --json number`,
    repoDir, { allowFail: true },
  );
  const existing = JSON.parse(existingRaw || '[]');
  if (existing.length > 0) {
    log(repoName, `  ${existing.length} quaid-scan issues already open — skipping filing`);
    return [];
  }

  const created = [];
  for (let i = 0; i < actionable.length; i++) {
    const f = actionable[i];
    // Rate limit check every 10 issues (#147)
    if (i % 10 === 0) await checkRateLimit(100);

    const title = `[${f.pillar}] ${f.message}`.slice(0, 140);
    // Use renderIssueBody for agent-executable structured template (#143)
    const body = renderIssueBody(f, report);
    const bodyFile = `/tmp/quaid-issue-${repoName}-${i}.md`;
    writeFileSync(bodyFile, body, 'utf-8');

    try {
      const issueUrl = sh(
        `gh issue create --title ${JSON.stringify(title)} --body-file "${bodyFile}" --label "quaid-scan"`,
        repoDir,
      );
      created.push(issueUrl.trim());
    } catch (e) {
      log(repoName, `  ⚠ issue create failed: ${e.message?.slice(0, 80)}`);
    }
  }
  return created;
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function main() {
  const state = FORCE ? { runDate: TODAY, completed: [], failed: [] } : loadState();
  const repos = ONLY ? REPOS.filter((r) => r === ONLY) : REPOS;

  let started = !START_FROM;
  let passed = 0, failed = 0, skipped = 0;

  for (const repo of repos) {
    if (!started) {
      if (repo === START_FROM) started = true;
      else { log(repo, 'skipping (before --start-from)'); skipped++; continue; }
    }

    // Idempotency: skip already-completed repos (#148)
    if (!FORCE && state.completed.includes(repo)) {
      log(repo, 'already completed — skipping (use --force to re-run)');
      skipped++;
      continue;
    }

    const repoDir = join(BASE, repo);
    if (!existsSync(repoDir)) {
      log(repo, '⚠ directory not found, skipping');
      skipped++;
      continue;
    }

    console.log(`\n${'─'.repeat(60)}`);
    log(repo, 'scanning (standard depth)…');

    try {
      // 1. Scan
      const { markdown, json, report } = await scanRepo(repoDir);
      const score = json.overallScore;
      const risk  = json.riskLevel;
      const failCount = json.failedScanners?.length ?? 0;
      log(repo, `score=${score.toFixed(1)} risk=${risk} findings=${json.findings.length}${failCount ? ` partial(${failCount} failed)` : ''}`);

      const reportRelPath = `docs/reports/quaid-scan-${TODAY}.md`;
      const reportAbsPath = join(repoDir, reportRelPath);

      if (DRY) {
        const actionableCount = json.findings.filter(
          (f) => (f.severity === 'CRITICAL' || f.severity === 'WARNING') && !isErrorFinding(f),
        ).length;
        log(repo, `[DRY RUN] would write report, create PR, file ${actionableCount} issues`);
        passed++;
        continue;
      }

      // 2. Write report + commit
      mkdirSync(join(repoDir, 'docs', 'reports'), { recursive: true });

      const baseBranch = defaultBranch(repoDir);
      sh(`git fetch origin "${baseBranch}"`, repoDir, { allowFail: true });
      sh(`git checkout "${baseBranch}"`, repoDir, { allowFail: true });
      sh(`git reset --hard "origin/${baseBranch}"`, repoDir, { allowFail: true });
      sh(`git checkout -B "${BRANCH}"`, repoDir);

      const committed = commitReport(repoDir, reportAbsPath, markdown);
      if (!committed) {
        log(repo, 'report unchanged — skipping PR');
        sh(`git checkout "${baseBranch}"`, repoDir, { allowFail: true });
        state.completed.push(repo);
        saveState(state);
        passed++;
        continue;
      }

      // 3. PR + merge
      try {
        await checkRateLimit(500);
        const prUrl = createAndMergePR(repoDir, repo, baseBranch, score, risk);
        log(repo, `PR merged: ${prUrl}`);
      } catch (e) {
        log(repo, `⚠ PR failed: ${e.message?.slice(0, 120)}`);
      }

      // 4. Issues
      sh(`git checkout "${baseBranch}"`, repoDir, { allowFail: true });
      await checkRateLimit(500);
      const issueUrls = await createIssues(repoDir, repo, json.findings, report, reportRelPath);
      log(repo, `filed ${issueUrls.length} issues`);

      state.completed.push(repo);
      saveState(state);
      passed++;
    } catch (err) {
      log(repo, `✗ ERROR: ${err.message}`);
      if (!state.failed.includes(repo)) state.failed.push(repo);
      saveState(state);
      failed++;
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Done. ${passed} passed, ${failed} failed, ${skipped} skipped.`);
  if (state.failed.length > 0) {
    console.log(`Failed repos: ${state.failed.join(', ')}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
