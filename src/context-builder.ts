import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MaturityLevel, ScanDepth } from './types/index.js';
import type { ScanContext, ScannerConfig } from './types/index.js';

type ValidatedTarget = { type: 'local' | 'github'; value: string };

export interface GitInfo {
  commitSha: string | null;
  branch: string | null;
  remoteUrl: string | null;
}

/** Result of buildContext, including a cleanup callback to remove any temp directories. */
export interface BuildContextResult {
  context: ScanContext;
  cleanup: () => void;
}

function runGit(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

export function readGitInfo(repoPath: string): GitInfo {
  return {
    commitSha: runGit('git rev-parse HEAD', repoPath),
    branch: runGit('git branch --show-current', repoPath),
    remoteUrl: runGit('git remote get-url origin', repoPath),
  };
}

function resolveMaturity(config: ScannerConfig): MaturityLevel {
  return config.maturity ?? MaturityLevel.SANDBOX;
}

/**
 * Builds a ScanContext for a validated target.
 *
 * For GitHub targets the repository is cloned into a temporary directory so
 * file-based scanners have real files to inspect. The returned `cleanup`
 * function removes that directory when the caller is finished with it.
 *
 * For local targets `cleanup` is a no-op.
 *
 * @param target - The validated scan target (local path or GitHub slug/URL)
 * @param config - Scanner configuration
 * @param _version - Scanner version string
 * @returns `{ context, cleanup }` — call `cleanup()` after the scan completes
 */
export function buildContext(
  target: ValidatedTarget,
  config: ScannerConfig,
  _version: string,
): BuildContextResult {
  let repoPath: string;
  let cleanup: () => void;

  if (target.type === 'github') {
    const tempDir = mkdtempSync(join(tmpdir(), 'quaid-'));
    const token = config.githubToken;
    const cloneUrl = token
      ? `https://${token}@github.com/${target.value}.git`
      : `https://github.com/${target.value}.git`;
    try {
      execSync(`git clone --depth 1 ${cloneUrl} ${tempDir}`, {
        stdio: ['ignore', 'ignore', 'ignore'],
        timeout: 120_000,
      });
    } catch (err) {
      throw new Error(`Failed to clone ${target.value}: ${err}`);
    }
    repoPath = tempDir;
    cleanup = () => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup — ignore errors
      }
    };
  } else {
    repoPath = target.value;
    cleanup = () => {};
  }

  const repoIdentifier = target.type === 'github' ? target.value : null;
  const git = readGitInfo(repoPath);
  const controller = new AbortController();

  const context: ScanContext = {
    repoPath,
    repoIdentifier,
    maturity: resolveMaturity(config),
    depth: config.depth ?? ScanDepth.STANDARD,
    config,
    git,
    signal: controller.signal,
    emit: () => {},
  };

  return { context, cleanup };
}
