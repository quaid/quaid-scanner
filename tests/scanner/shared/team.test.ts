/**
 * Tests for team-shape detection (#245).
 *
 * The question these answer is narrow and practical: **could this project
 * satisfy a required-review rule?** That needs at least two people who could
 * plausibly review each other. Exact contributor identity resolution is a hard
 * problem; this is deliberately a cheap approximation aimed at that one
 * decision, and it fails toward "not solo" so a wrong answer never silently
 * relaxes a security check.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { analyzeTeamShape, readTeamShape } from '../../../src/scanner/shared/team.js';

const C = (email: string, name: string, commits = 1): Array<{ email: string; name: string }> =>
  Array.from({ length: commits }, () => ({ email, name }));

describe('analyzeTeamShape', () => {
  it('reports a single committer as solo', () => {
    const t = analyzeTeamShape(C('solo@example.com', 'Solo Dev', 20));
    expect(t.committerCount).toBe(1);
    expect(t.soloMaintainer).toBe(true);
    expect(t.dominantShare).toBe(1);
  });

  it('reports two active committers as not solo', () => {
    const t = analyzeTeamShape([
      ...C('a@example.com', 'Ada', 10),
      ...C('b@example.com', 'Linus', 10),
    ]);
    expect(t.committerCount).toBe(2);
    expect(t.soloMaintainer).toBe(false);
  });

  /**
   * The case that motivated this: quaid-scanner's own history has three author
   * emails and one human. Counting distinct emails would have reported three
   * committers and left the bug unfixed on the very repo that hit it.
   */
  it('merges one human committing under several emails', () => {
    const t = analyzeTeamShape([
      ...C('quaid@iquaid.org', 'Karsten Wade', 186),
      ...C('quaid@users.noreply.github.com', 'quaid', 60),
      ...C('kwade@redhat.com', 'Karsten Wade', 2),
    ]);
    expect(t.committerCount).toBe(1);
    expect(t.soloMaintainer).toBe(true);
  });

  it('merges identities sharing an author name', () => {
    const t = analyzeTeamShape([
      ...C('work@corp.com', 'Jane Roe', 5),
      ...C('personal@gmail.com', 'Jane Roe', 5),
    ]);
    expect(t.committerCount).toBe(1);
  });

  it('merges identities sharing an email local-part', () => {
    const t = analyzeTeamShape([
      ...C('jroe@corp.com', 'Jane Roe', 5),
      ...C('jroe@users.noreply.github.com', 'jroe', 5),
    ]);
    expect(t.committerCount).toBe(1);
  });

  it('does not merge two different people at the same domain', () => {
    const t = analyzeTeamShape([
      ...C('ada@corp.com', 'Ada Lovelace', 5),
      ...C('linus@corp.com', 'Linus Torvalds', 5),
    ]);
    expect(t.committerCount).toBe(2);
    expect(t.soloMaintainer).toBe(false);
  });

  /**
   * A drive-by contributor does not make a project reviewable. If one identity
   * holds essentially all the commits, there is no second reviewer in practice.
   */
  it('treats an overwhelmingly dominant committer as effectively solo', () => {
    const t = analyzeTeamShape([
      ...C('owner@example.com', 'Owner', 199),
      ...C('driveby@example.com', 'Drive By', 1),
    ]);
    expect(t.committerCount).toBe(2);
    expect(t.dominantShare).toBeGreaterThanOrEqual(0.95);
    expect(t.soloMaintainer).toBe(true);
  });

  it('treats a genuine second maintainer as not solo', () => {
    const t = analyzeTeamShape([
      ...C('owner@example.com', 'Owner', 80),
      ...C('second@example.com', 'Second', 20),
    ]);
    expect(t.dominantShare).toBeLessThan(0.95);
    expect(t.soloMaintainer).toBe(false);
  });

  it('ignores bot identities when deciding team shape', () => {
    // A bot cannot review a pull request, so it must not count as a second
    // maintainer and rescue a solo repo from the solo path.
    const t = analyzeTeamShape([
      ...C('owner@example.com', 'Owner', 50),
      ...C('49699333+dependabot[bot]@users.noreply.github.com', 'dependabot[bot]', 50),
    ]);
    expect(t.soloMaintainer).toBe(true);
  });

  it('reports no history as unknown rather than solo', () => {
    // Fail toward "not solo": an unknown team shape must never relax a check.
    const t = analyzeTeamShape([]);
    expect(t.historyAvailable).toBe(false);
    expect(t.soloMaintainer).toBe(false);
  });
});

describe('readTeamShape', () => {
  let tmpDir: string;

  const git = (cmd: string, cwd: string): void => {
    execSync(`git ${cmd}`, { cwd, stdio: ['ignore', 'ignore', 'ignore'] });
  };

  const commitAs = (dir: string, email: string, name: string, file: string): void => {
    fs.writeFileSync(path.join(dir, file), `${file}\n`, 'utf-8');
    git(`add ${file}`, dir);
    git(
      `-c user.email="${email}" -c user.name="${name}" commit -m "add ${file}"`,
      dir,
    );
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quaid-team-'));
    git('init -q', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects a solo repo from real git history', () => {
    commitAs(tmpDir, 'solo@example.com', 'Solo Dev', 'a.txt');
    commitAs(tmpDir, 'solo@example.com', 'Solo Dev', 'b.txt');
    const t = readTeamShape(tmpDir);
    expect(t.historyAvailable).toBe(true);
    expect(t.soloMaintainer).toBe(true);
  });

  it('detects a two-person repo from real git history', () => {
    commitAs(tmpDir, 'ada@example.com', 'Ada', 'a.txt');
    commitAs(tmpDir, 'linus@example.com', 'Linus', 'b.txt');
    const t = readTeamShape(tmpDir);
    expect(t.committerCount).toBe(2);
    expect(t.soloMaintainer).toBe(false);
  });

  /**
   * buildContext clones GitHub targets with `--depth 1`, so a remote scan sees
   * exactly one commit by one author. Reading that as "solo" would relax
   * security checks on every remote scan — including large multi-maintainer
   * projects. Shallow history must read as unknown.
   */
  it('treats a shallow clone as unknown, not solo', () => {
    commitAs(tmpDir, 'ada@example.com', 'Ada', 'a.txt');
    commitAs(tmpDir, 'linus@example.com', 'Linus', 'b.txt');

    const shallow = fs.mkdtempSync(path.join(os.tmpdir(), 'quaid-shallow-'));
    fs.rmSync(shallow, { recursive: true, force: true });
    execSync(`git clone -q --depth 1 "file://${tmpDir}" "${shallow}"`, {
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    try {
      const t = readTeamShape(shallow);
      expect(t.historyAvailable).toBe(false);
      expect(t.soloMaintainer).toBe(false);
    } finally {
      fs.rmSync(shallow, { recursive: true, force: true });
    }
  });

  it('treats a non-git directory as unknown, not solo', () => {
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'quaid-plain-'));
    try {
      const t = readTeamShape(plain);
      expect(t.historyAvailable).toBe(false);
      expect(t.soloMaintainer).toBe(false);
    } finally {
      fs.rmSync(plain, { recursive: true, force: true });
    }
  });
});
