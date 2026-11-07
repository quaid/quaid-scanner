/**
 * Team-shape detection (#245).
 *
 * Some controls a scanner can recommend are not merely unmet on a
 * solo-maintained project — they are *unsatisfiable*. GitHub does not let you
 * approve your own pull request, so "require 1 approving review" on a one-person
 * repo forces an admin override on every merge, which is worse than having no
 * rule at all: it trains the only person holding the bypass to use it
 * reflexively, and it makes the setting meaningless to anyone reading it.
 *
 * This module answers one narrow question — **are there at least two people who
 * could plausibly review each other's work?** — so scanners can adjust severity
 * and suggestion text accordingly.
 *
 * It is deliberately a cheap approximation. Contributor identity resolution is a
 * hard problem with entire projects devoted to it; this aims only at the review
 * decision. Every ambiguity resolves toward "not solo", so a wrong answer can
 * never silently relax a security check.
 */

import { execSync } from 'node:child_process';

/** Share of commits held by the largest identity above which a project has no practical second reviewer. */
const DOMINANCE_THRESHOLD = 0.95;

/** Window of history considered. Matches the bus-factor scanner. */
const HISTORY_WINDOW = '12 months ago';

/** A single commit's author, as recorded by git. */
export interface CommitAuthor {
  email: string;
  name: string;
}

/** What the scanners consume. */
export interface TeamShape {
  /** Distinct human identities committing in the window. 0 when history is unavailable. */
  committerCount: number;
  /**
   * True when the project has no practical second reviewer — either one
   * identity, or one identity holding essentially all commits. Always false
   * when `historyAvailable` is false.
   */
  soloMaintainer: boolean;
  /** Share of commits held by the largest identity, 0–1. */
  dominantShare: number;
  /**
   * False when git history could not be read — no repository, or a shallow
   * clone. Callers must not treat this as solo.
   */
  historyAvailable: boolean;
}

const UNKNOWN: TeamShape = {
  committerCount: 0,
  soloMaintainer: false,
  dominantShare: 0,
  historyAvailable: false,
};

/**
 * Identifies bot committers, which cannot review a pull request and so must not
 * count as a second maintainer.
 */
function isBot(author: CommitAuthor): boolean {
  const name = author.name.toLowerCase();
  const email = author.email.toLowerCase();
  return (
    name.endsWith('[bot]') ||
    name.endsWith('-bot') ||
    email.includes('[bot]@') ||
    email.endsWith('@bots.noreply.github.com')
  );
}

/**
 * Returns the comparison keys for an author. Two authors are the same person if
 * they share any key.
 *
 * The keys are the author name and the email local-part, both normalised. That
 * merges the common real-world aliasing — one human committing from a work
 * address, a personal address, and a GitHub `noreply` address — without merging
 * two different people who merely share a domain.
 */
function identityKeys(author: CommitAuthor): string[] {
  const keys: string[] = [];

  const name = author.name.trim().toLowerCase();
  if (name) keys.push(`name:${name}`);

  const email = author.email.trim().toLowerCase();
  let local = email.split('@')[0] ?? '';
  // GitHub noreply addresses take the form `12345+username@users.noreply.github.com`.
  const plusIdx = local.indexOf('+');
  if (plusIdx >= 0) local = local.slice(plusIdx + 1);
  if (local) keys.push(`local:${local}`);

  return keys;
}

/**
 * Groups commit authors into distinct human identities and derives the team
 * shape.
 *
 * @param authors - One entry per commit, in any order.
 * @returns The team shape. An empty input yields `historyAvailable: false`.
 */
export function analyzeTeamShape(authors: readonly CommitAuthor[]): TeamShape {
  if (authors.length === 0) return { ...UNKNOWN };

  const humans = authors.filter((a) => !isBot(a));
  if (humans.length === 0) return { ...UNKNOWN };

  // Union identities that share any key, by assigning each key a group id and
  // merging groups when an author bridges two of them.
  const keyToGroup = new Map<string, number>();
  const groupCommits = new Map<number, number>();
  let nextGroup = 0;

  const mergeGroups = (from: number, into: number): void => {
    if (from === into) return;
    for (const [k, g] of keyToGroup) {
      if (g === from) keyToGroup.set(k, into);
    }
    groupCommits.set(into, (groupCommits.get(into) ?? 0) + (groupCommits.get(from) ?? 0));
    groupCommits.delete(from);
  };

  for (const author of humans) {
    const keys = identityKeys(author);
    const existing = [...new Set(keys.map((k) => keyToGroup.get(k)).filter((g): g is number => g !== undefined))];

    let group: number;
    if (existing.length === 0) {
      group = nextGroup++;
      groupCommits.set(group, 0);
    } else {
      group = existing[0];
      for (const other of existing.slice(1)) mergeGroups(other, group);
    }

    for (const k of keys) keyToGroup.set(k, group);
    groupCommits.set(group, (groupCommits.get(group) ?? 0) + 1);
  }

  const counts = [...groupCommits.values()].sort((a, b) => b - a);
  const total = counts.reduce((sum, n) => sum + n, 0);
  const dominantShare = total > 0 ? counts[0] / total : 0;
  const committerCount = counts.length;

  return {
    committerCount,
    soloMaintainer: committerCount <= 1 || dominantShare >= DOMINANCE_THRESHOLD,
    dominantShare,
    historyAvailable: true,
  };
}

/**
 * Reads commit authors from a repository and derives its team shape.
 *
 * Returns the unknown shape — never solo — when the directory is not a git
 * repository or its history is shallow. `buildContext` clones GitHub targets
 * with `--depth 1`, so a remote scan sees exactly one commit by one author;
 * reading that as solo would relax security checks on every remote scan,
 * including large multi-maintainer projects.
 *
 * @param repoPath - Absolute path to the repository working tree.
 * @returns The team shape, or the unknown shape if history is unreadable.
 */
export function readTeamShape(repoPath: string): TeamShape {
  const run = (cmd: string): string | null => {
    try {
      return execSync(cmd, {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 15_000,
      }).trim();
    } catch {
      return null;
    }
  };

  if (run('git rev-parse --is-inside-work-tree') !== 'true') return { ...UNKNOWN };
  if (run('git rev-parse --is-shallow-repository') === 'true') return { ...UNKNOWN };

  // Unit separator between fields, record separator between commits, so that a
  // name containing the delimiter cannot corrupt the parse.
  const log = run(`git log --since="${HISTORY_WINDOW}" --format="%ae%x1f%an%x1e"`);
  if (log === null || log === '') return { ...UNKNOWN };

  const authors: CommitAuthor[] = [];
  for (const record of log.split('\x1e')) {
    const trimmed = record.trim();
    if (!trimmed) continue;
    const [email, name] = trimmed.split('\x1f');
    if (email === undefined) continue;
    authors.push({ email, name: name ?? '' });
  }

  return analyzeTeamShape(authors);
}
