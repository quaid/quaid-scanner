import { execSync } from 'child_process';
import { MaturityLevel, ScanDepth } from './types/index.js';
import type { ScanContext, ScannerConfig } from './types/index.js';

type ValidatedTarget = { type: 'local' | 'github'; value: string };

export interface GitInfo {
  commitSha: string | null;
  branch: string | null;
  remoteUrl: string | null;
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

export function buildContext(
  target: ValidatedTarget,
  config: ScannerConfig,
  _version: string,
): ScanContext {
  const repoPath = target.type === 'local' ? target.value : '';
  const repoIdentifier = target.type === 'github' ? target.value : null;
  const git = target.type === 'local' ? readGitInfo(repoPath) : { commitSha: null, branch: null, remoteUrl: null };
  const controller = new AbortController();

  return {
    repoPath,
    repoIdentifier,
    maturity: resolveMaturity(config),
    depth: config.depth ?? ScanDepth.STANDARD,
    config,
    git,
    signal: controller.signal,
    emit: () => {},
  };
}
