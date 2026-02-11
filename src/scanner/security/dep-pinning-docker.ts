/**
 * Dependency pinning scanner for Docker and GitHub Actions workflows.
 *
 * Checks Dockerfiles for unpinned base images and workflow files
 * for unpinned action references.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** Mutable branch references that should not be used. */
const MUTABLE_REFS = new Set(['main', 'master', 'latest']);

export class DepPinningDockerScanner implements Scanner {
  readonly name = 'dep-pinning-docker';
  readonly displayName = 'Dependency Pinning - Docker & Workflows';
  readonly pillar = Pillar.SECURITY;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];
    let counter = 0;

    const makeFinding = (
      severity: Severity,
      message: string,
      file: string,
      line: number | null,
      suggestion: string,
    ): Finding => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity,
        pillar: this.pillar,
        category: 'dependency-pinning',
        message,
        file,
        line,
        column: null,
        suggestion,
      };
    };

    // Check Dockerfiles
    findings.push(...await this.checkDockerfiles(repoPath, makeFinding));

    // Check GitHub Actions workflows
    findings.push(...await this.checkWorkflows(repoPath, makeFinding));

    return findings;
  }

  private async checkDockerfiles(
    repoPath: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
  ): Promise<Finding[]> {
    const patterns = ['Dockerfile', 'Dockerfile.*', '*.dockerfile', '**/Dockerfile', '**/Dockerfile.*'];
    const ignore = ['**/node_modules/**', '**/vendor/**', '**/.git/**'];

    let files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: repoPath, absolute: true, nodir: true, ignore });
      files.push(...matches);
    }
    // Deduplicate
    files = [...new Set(files)];

    const findings: Finding[] = [];

    for (const filePath of files.sort()) {
      const relativePath = path.relative(repoPath, filePath);
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const fromMatch = line.match(/^FROM\s+(\S+)/i);
        if (!fromMatch) continue;

        const image = fromMatch[1];
        const lineNum = i + 1;

        // Strip AS alias
        const imageRef = image.split(/\s+/)[0];

        // Check for @sha256: digest (PASS)
        if (imageRef.includes('@sha256:')) {
          findings.push(makeFinding(
            Severity.PASS,
            `Docker base image "${imageRef}" is pinned by digest`,
            relativePath,
            lineNum,
            'Image is properly pinned by digest',
          ));
          continue;
        }

        // Check for :latest tag (CRITICAL)
        if (imageRef.includes(':latest')) {
          findings.push(makeFinding(
            Severity.CRITICAL,
            `Docker base image uses ":latest" tag: "${imageRef}"`,
            relativePath,
            lineNum,
            'Pin to a specific version tag or use @sha256: digest',
          ));
          continue;
        }

        // Has a tag but no digest → WARNING
        if (imageRef.includes(':')) {
          findings.push(makeFinding(
            Severity.WARNING,
            `Docker base image "${imageRef}" uses tag without digest`,
            relativePath,
            lineNum,
            `Pin with digest: ${imageRef}@sha256:<hash>`,
          ));
          continue;
        }

        // No tag at all (implies :latest) → CRITICAL
        findings.push(makeFinding(
          Severity.CRITICAL,
          `Docker base image "${imageRef}" has no tag (implies :latest)`,
          relativePath,
          lineNum,
          'Add a version tag or @sha256: digest',
        ));
      }
    }

    return findings;
  }

  private async checkWorkflows(
    repoPath: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
  ): Promise<Finding[]> {
    const workflowDir = path.join(repoPath, '.github', 'workflows');
    if (!fs.existsSync(workflowDir)) return [];

    const ymlFiles = await glob('*.{yml,yaml}', { cwd: workflowDir, absolute: true, nodir: true });
    if (ymlFiles.length === 0) return [];

    const findings: Finding[] = [];

    for (const filePath of ymlFiles.sort()) {
      const relativePath = path.relative(repoPath, filePath);
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const usesMatch = line.match(/^-?\s*uses\s*:\s*(.+)/);
        if (!usesMatch) continue;

        const actionRef = usesMatch[1].trim();
        const lineNum = i + 1;

        // Skip local actions (e.g., ./path/to/action)
        if (actionRef.startsWith('./') || actionRef.startsWith('docker://')) continue;

        const atIdx = actionRef.indexOf('@');
        if (atIdx < 0) {
          // No @ version at all → CRITICAL
          findings.push(makeFinding(
            Severity.CRITICAL,
            `Action "${actionRef}" has no version pin in "${relativePath}"`,
            relativePath,
            lineNum,
            `Pin with a SHA: ${actionRef}@<commit-sha>`,
          ));
          continue;
        }

        const version = actionRef.slice(atIdx + 1);
        const actionName = actionRef.slice(0, atIdx);

        // Check for mutable refs
        if (MUTABLE_REFS.has(version)) {
          findings.push(makeFinding(
            Severity.CRITICAL,
            `Action "${actionName}" uses mutable ref "@${version}" in "${relativePath}"`,
            relativePath,
            lineNum,
            `Pin to a SHA or semver tag instead of @${version}`,
          ));
          continue;
        }

        // Check for SHA (40 hex chars) → PASS
        if (/^[a-f0-9]{40}$/.test(version)) {
          findings.push(makeFinding(
            Severity.PASS,
            `Action "${actionName}" is pinned by SHA in "${relativePath}"`,
            relativePath,
            lineNum,
            'Action is properly pinned by commit SHA',
          ));
          continue;
        }

        // Check for full semver (vX.Y.Z) → PASS
        if (/^v\d+\.\d+\.\d+$/.test(version)) {
          findings.push(makeFinding(
            Severity.PASS,
            `Action "${actionName}" is pinned to semver "${version}" in "${relativePath}"`,
            relativePath,
            lineNum,
            'Action is pinned to a specific version',
          ));
          continue;
        }

        // Major-only version (v4) → WARNING
        if (/^v\d+$/.test(version)) {
          findings.push(makeFinding(
            Severity.WARNING,
            `Action "${actionName}" uses major-only version "@${version}" in "${relativePath}"`,
            relativePath,
            lineNum,
            `Consider pinning to a full semver (e.g., @${version}.0.0) or SHA for better reproducibility`,
          ));
          continue;
        }

        // Other version formats → WARNING
        findings.push(makeFinding(
          Severity.WARNING,
          `Action "${actionName}" uses version "@${version}" in "${relativePath}"`,
          relativePath,
          lineNum,
          'Consider pinning to a SHA for maximum reproducibility',
        ));
      }
    }

    return findings;
  }
}
