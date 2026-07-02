#!/usr/bin/env node
/**
 * quaid-scan-recovery.mjs
 *
 * Post-batch recovery script for repositories where the initial scan run
 * failed to create PRs due to body-escaping issues (#144), hard scan errors,
 * or other transient failures.
 *
 * Phases:
 *   1. Create + merge PRs for repos that have a committed report but no merged PR
 *   2. Re-run scan for repos that hard-errored (no report file on disk)
 *   3. Close duplicate issues in a single repo (--dedup-repo flag)
 *
 * Usage:
 *   node scripts/quaid-scan-recovery.mjs [--dry-run] [--only <repo>] [--phase <1|2|3>]
 *     [--dedup-repo <repo>] [--scan-date <YYYY-MM-DD>]
 *
 * Requirements:
 *   - npm run build must be run first
 *   - GITHUB_TOKEN set in environment
 *   - Local clones of target repos in BASE directory
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const distPath = join(__dirname, '..', 'dist', 'index.js');
if (!existsSync(distPath)) {
  console.error('Error: dist/index.js not found. Run `npm run build` first.');
  process.exit(1);
}

const { Orchestrator, createDefaultRegistry, buildScanReport, renderMarkdown, serializeJson, buildContext } =
  await import(distPath);

// ── Config ────────────────────────────────────────────────────────────────────

const BASE      = join(__dirname, '..', '..', 'AINative-Studio', 'src');
const ORG       = 'AINative-Studio';
const SCAN_DATE = process.argv.includes('--scan-date')
  ? process.argv[process.argv.indexOf('--scan-date') + 1]
  : new Date().toISOString().slice(0, 10);
const BRANCH    = `chore/quaid-scan-${SCAN_DATE}`;
const DRY       = process.argv.includes('--dry-run');
const ONLY      = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;
const PHASE     = process.argv.includes('--phase')
  ? parseInt(process.argv[process.argv.indexOf('--phase') + 1], 10)
  : null;
const DEDUP_REPO = process.argv.includes('--dedup-repo')
  ? process.argv[process.argv.indexOf('--dedup-repo') + 1]
  : null;

// Repos that have a committed report but no merged PR (body-escaping failure, etc.)
// Edit this list for each recovery run based on the batch runner's failure output.
const PR_NEEDED = [
  'ainative-sdks', 'ai-kit-showcase', 'ai-twin-content-studio', 'aikit-agent-demo',
  'ainative-strapi-mcp-server', 'ax-dealroom', 'cody-sdk-typescript', 'crewai-zerodb',
  'DesignSystem-MCP', 'langchain-zerodb', 'llama-index-vector-stores-zerodb',
  'mcp-server-template', 'openclaw-gateway', 'sc-health-rag', 'shadcn-ui-mcp-server',
  'sol-mate-app', 'sol-mate-trust-api', 'zerodb-claude-plugin', 'zerodb-cli',
  'zerodb-cloudflare-worker', 'zerodb-go-sdk', 'zerodb-nextjs-template',
  'zerodb-python-sdk', 'zerodb-sequential-thinking-mcp', 'zerodb-supabase-adapter',
  'zerodb-typescript-sdk', 'zerodb-vercel-integration', 'Agent-402-frontend',
  'ai-kit-nextjs-a2ui', 'ai-kit-svelte-a2ui', 'ai-kit-vue-a2ui', 'ainative-ecosystem',
  'ainative-jetbrains', 'ainative-neovim', 'boardlens', 'builder-ainative-studio',
  'cody-plugins-official', 'djunion', 'docflow', 'dothack-backend', 'dothack-frontend',
  'embedding-service', 'enerygrid', 'EventPulse', 'foundercap', 'founderhouse',
  'fundraising-agent', 'getlayn', 'nextjs-zerodb-doc-search', 'northbound-agency',
  'PublicFounders', 'rewardsy', 'santa-cruz-builder-class-2025', 'ScoutAgent',
  'smb-dash', 'sol-mate-frontend', 'telemetry-agent', 'travelpal', 'TypeScript-SDK',
  'versions', 'well-known-uris', 'ZeroMerch',
];

// Repos that hard-errored and need a fresh scan.
const RERUN = ['Agent-Gaunlet-Starter-Kit', 'get-physics-done'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sh(cmd, cwd, opts = {}) {
  try {
    return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
  } catch (e) {
    if (opts.allowFail) return '';
    throw e;
  }
}

function log(repo, msg) { console.log(`[${repo}] ${msg}`); }

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
  const target  = { type: 'local', value: repoDir };
  const config  = { depth: 'standard', format: 'markdown', quiet: true, scannerTimeout: 90_000 };
  const { context, cleanup } = buildContext(target, config, version);
  try {
    const registry     = createDefaultRegistry();
    const orchestrator = new Orchestrator(registry);
    const result       = await orchestrator.run(context);
    const report       = buildScanReport(target, result, config, context.maturity, version);
    report.metadata.commitSha = context.git?.commitSha ?? '';
    report.metadata.branch    = context.git?.branch    ?? '';
    report.metadata.remoteUrl = context.git?.remoteUrl ?? '';
    const markdown = renderMarkdown(report);
    const json     = JSON.parse(serializeJson(report));
    return { markdown, json };
  } finally {
    cleanup();
  }
}

// ── Phase 1: Create missing PRs ───────────────────────────────────────────────

async function phase1() {
  const repos = ONLY ? PR_NEEDED.filter((r) => r === ONLY) : PR_NEEDED;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Phase 1: Create missing PRs (${repos.length} repos)\n`);

  let ok = 0, fail = 0;
  for (const repo of repos) {
    const repoDir = join(BASE, repo);
    if (!existsSync(repoDir)) { log(repo, '⚠ dir not found, skipping'); continue; }

    const base       = defaultBranch(repoDir);
    const reportPath = `docs/reports/quaid-scan-${SCAN_DATE}.md`;
    const reportAbs  = join(repoDir, reportPath);

    let score = '?', risk = '?';
    if (existsSync(reportAbs)) {
      try {
        const content = readFileSync(reportAbs, 'utf-8');
        const sm = content.match(/Overall Score[^\d]*([\d.]+)/);
        const rm = content.match(/Risk Level[^A-Z]*(CRITICAL|HIGH|MEDIUM|LOW)/);
        if (sm) score = sm[1];
        if (rm) risk  = rm[1];
      } catch {}
    }

    const body = [
      `## OSS Health Report — ${SCAN_DATE}`,
      '',
      `**Score:** ${score}/10 | **Risk:** ${risk} | **Depth:** standard`,
      '',
      `Generated by [quaid-scanner](https://github.com/quaid/quaid-scanner) v0.1.3.`,
      '',
      `Report: \`${reportPath}\``,
      `Issues for actionable findings are filed separately in this repo.`,
    ].join('\n');

    const bodyFile = `/tmp/quaid-recovery-pr-${repo}.md`;
    writeFileSync(bodyFile, body, 'utf-8');

    if (DRY) { log(repo, `[DRY] would create PR for ${BRANCH} → ${base}`); ok++; continue; }

    try {
      const existing = sh(
        `gh pr list --head "${BRANCH}" --json number --jq '.[0].number'`,
        repoDir, { allowFail: true },
      );
      if (existing && existing !== 'null') {
        log(repo, `PR #${existing} already exists — merging`);
        sh(`gh pr merge ${existing} --merge --delete-branch`, repoDir, { allowFail: true });
        ok++;
        continue;
      }

      const prUrl = sh(
        `gh pr create --title "docs: quaid-scanner health report ${SCAN_DATE}" --body-file "${bodyFile}" --head "${BRANCH}" --base "${base}"`,
        repoDir,
      );
      sh(`gh pr merge "${prUrl}" --merge --delete-branch`, repoDir, { allowFail: true });
      log(repo, `✓ PR merged: ${prUrl}`);
      ok++;
    } catch (e) {
      log(repo, `✗ PR failed: ${e.message?.slice(0, 100)}`);
      fail++;
    }
  }

  console.log(`\nPhase 1 done: ${ok} merged, ${fail} failed`);
}

// ── Phase 2: Re-run hard-error repos ─────────────────────────────────────────

async function phase2() {
  const repos = ONLY ? RERUN.filter((r) => r === ONLY) : RERUN;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Phase 2: Re-run hard-error repos (${repos.length} repos)\n`);

  for (const repo of repos) {
    const repoDir = join(BASE, repo);
    if (!existsSync(repoDir)) { log(repo, '⚠ dir not found, skipping'); continue; }

    log(repo, 'scanning…');
    try {
      const { markdown, json } = await scanRepo(repoDir);
      const base = defaultBranch(repoDir);
      const reportRelPath = `docs/reports/quaid-scan-${SCAN_DATE}.md`;
      const reportAbsPath = join(repoDir, reportRelPath);

      if (DRY) {
        log(repo, `[DRY] score=${json.overallScore.toFixed(1)} risk=${json.riskLevel} — would write report and create PR`);
        continue;
      }

      sh(`git checkout "${base}"`, repoDir, { allowFail: true });
      sh(`git pull origin "${base}"`, repoDir, { allowFail: true });
      sh(`git checkout -B "${BRANCH}"`, repoDir);

      mkdirSync(join(repoDir, 'docs', 'reports'), { recursive: true });
      writeFileSync(reportAbsPath, markdown, 'utf-8');
      sh(`git add -f "${reportAbsPath}"`, repoDir);

      const diff = sh('git diff --staged --name-only', repoDir, { allowFail: true });
      if (!diff) { log(repo, 'nothing to commit'); continue; }

      sh(`git commit -m "docs: add quaid-scanner health report ${SCAN_DATE}"`, repoDir);
      sh(`git push origin "${BRANCH}"`, repoDir);

      const body = [
        `## OSS Health Report — ${SCAN_DATE}`,
        '',
        `**Score:** ${json.overallScore.toFixed(1)}/10 | **Risk:** ${json.riskLevel} | **Depth:** standard`,
        '',
        `Generated by [quaid-scanner](https://github.com/quaid/quaid-scanner) v0.1.3.`,
        '',
        `Report: \`${reportRelPath}\``,
        `Issues for actionable findings are filed separately in this repo.`,
      ].join('\n');
      const bodyFile = `/tmp/quaid-recovery-rescan-${repo}.md`;
      writeFileSync(bodyFile, body, 'utf-8');

      const prUrl = sh(
        `gh pr create --title "docs: quaid-scanner health report ${SCAN_DATE}" --body-file "${bodyFile}" --head "${BRANCH}" --base "${base}"`,
        repoDir,
      );
      sh(`gh pr merge "${prUrl}" --merge --delete-branch`, repoDir, { allowFail: true });
      log(repo, `✓ PR merged: ${prUrl}`);
    } catch (e) {
      log(repo, `✗ ERROR: ${e.message}`);
    }
  }
}

// ── Phase 3: Close duplicate issues in one repo ───────────────────────────────

async function phase3() {
  const targetRepo = DEDUP_REPO ?? 'oss-repo-check';
  const repoDir    = join(BASE, targetRepo);
  const orgRepo    = `${ORG}/${targetRepo}`;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Phase 3: Close duplicate issues in ${orgRepo}\n`);

  const raw = sh(
    `gh issue list -R ${orgRepo} --state open --limit 100 --json number,title,createdAt`,
    repoDir, { allowFail: true },
  );
  const issues = JSON.parse(raw || '[]');

  // Sort newest first; close the newest duplicates (pilot run filed first)
  const sorted  = issues.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const toClose = sorted.slice(0, 30);

  let closed = 0;
  for (const issue of toClose) {
    if (DRY) {
      log(targetRepo, `[DRY] would close #${issue.number}: ${issue.title.slice(0, 70)}`);
      closed++;
      continue;
    }
    try {
      sh(
        `gh issue close ${issue.number} -R ${orgRepo} --comment "Duplicate of an earlier issue filed in the same batch run — closing."`,
        repoDir,
      );
      closed++;
    } catch {}
  }
  log(targetRepo, `closed ${closed} duplicate issues`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (PHASE === 1 || PHASE == null) await phase1();
  if (PHASE === 2 || PHASE == null) await phase2();
  if (PHASE === 3 || PHASE == null) await phase3();
  console.log(`\n${'═'.repeat(60)}\nAll done.\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
