/**
 * Dependency pinning scanner for package managers.
 *
 * Checks package.json, requirements.txt, Gemfile, go.mod, and Cargo.toml
 * for unpinned or loosely-pinned dependencies.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

export class DepPinningPackagesScanner implements Scanner {
  readonly name = 'dep-pinning-packages';
  readonly displayName = 'Dependency Pinning - Package Managers';
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

    // Check package.json
    findings.push(...this.checkPackageJson(repoPath, makeFinding));

    // Check package-lock.json
    findings.push(...this.checkPackageLock(repoPath, makeFinding));

    // Check requirements.txt
    findings.push(...this.checkRequirementsTxt(repoPath, makeFinding));

    // Check Gemfile
    findings.push(...this.checkGemfile(repoPath, makeFinding));

    // Check go.mod / go.sum
    findings.push(...this.checkGoMod(repoPath, makeFinding));

    // Check Cargo.toml
    findings.push(...this.checkCargoToml(repoPath, makeFinding));

    return findings;
  }

  private checkPackageJson(
    repoPath: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
  ): Finding[] {
    const filePath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(filePath)) return [];

    const findings: Finding[] = [];
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return [];
    }

    const sections = ['dependencies', 'devDependencies'] as const;
    for (const section of sections) {
      const deps = pkg[section] as Record<string, string> | undefined;
      if (!deps || typeof deps !== 'object') continue;

      for (const [name, version] of Object.entries(deps)) {
        if (typeof version !== 'string') continue;
        const trimmed = version.trim();

        // Wildcard/latest/x → CRITICAL
        if (trimmed === '*' || trimmed === 'latest' || trimmed === 'x') {
          findings.push(makeFinding(
            Severity.CRITICAL,
            `Unpinned dependency "${name}": "${trimmed}" in ${section}`,
            'package.json',
            null,
            `Pin "${name}" to an exact version (e.g., "1.0.0")`,
          ));
          continue;
        }

        // ^ or ~ prefix → WARNING
        if (trimmed.startsWith('^') || trimmed.startsWith('~')) {
          findings.push(makeFinding(
            Severity.WARNING,
            `Loosely pinned dependency "${name}": "${trimmed}" uses ${trimmed[0]} prefix in ${section}`,
            'package.json',
            null,
            `Consider pinning "${name}" to an exact version for reproducible builds`,
          ));
        }
      }
    }

    return findings;
  }

  private checkPackageLock(
    repoPath: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
  ): Finding[] {
    const pkgJsonPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) return [];

    const lockPath = path.join(repoPath, 'package-lock.json');
    if (!fs.existsSync(lockPath)) {
      return [makeFinding(
        Severity.WARNING,
        'No package-lock.json found. Lock files ensure reproducible installs',
        'package.json',
        null,
        'Run "npm install" to generate a package-lock.json',
      )];
    }

    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      const version = typeof lock.lockfileVersion === 'number' ? lock.lockfileVersion : 0;
      if (version >= 2) {
        return [makeFinding(
          Severity.PASS,
          `package-lock.json present with lockfileVersion ${version}`,
          'package-lock.json',
          null,
          'Lock file is up to date',
        )];
      }
      return [makeFinding(
        Severity.WARNING,
        `package-lock.json has outdated lockfileVersion ${version} (expected >= 2)`,
        'package-lock.json',
        null,
        'Upgrade to npm 7+ to generate lockfileVersion 2 or 3',
      )];
    } catch {
      return [];
    }
  }

  private checkRequirementsTxt(
    repoPath: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
  ): Finding[] {
    const filePath = path.join(repoPath, 'requirements.txt');
    if (!fs.existsSync(filePath)) return [];

    const findings: Finding[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || line.startsWith('-')) continue;

      const lineNum = i + 1;

      if (line.includes('==')) {
        // Exactly pinned
        continue;
      }

      if (line.includes('>=') || line.includes('<=') || line.includes('~=') || line.includes('!=')) {
        // Range specifier → WARNING
        const pkgName = line.split(/[><=~!]/)[0].trim();
        findings.push(makeFinding(
          Severity.WARNING,
          `Loosely pinned Python dependency "${pkgName}" in requirements.txt`,
          'requirements.txt',
          lineNum,
          `Pin "${pkgName}" with == (e.g., "${pkgName}==x.y.z")`,
        ));
        continue;
      }

      // No version specifier at all → CRITICAL
      const pkgName = line.split(/[\[;]/)[0].trim();
      if (/^[a-zA-Z][\w.-]*$/.test(pkgName)) {
        findings.push(makeFinding(
          Severity.CRITICAL,
          `Unpinned Python dependency "${pkgName}" has no version constraint`,
          'requirements.txt',
          lineNum,
          `Pin "${pkgName}" with == (e.g., "${pkgName}==x.y.z")`,
        ));
      }
    }

    return findings;
  }

  private checkGemfile(
    repoPath: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
  ): Finding[] {
    const filePath = path.join(repoPath, 'Gemfile');
    if (!fs.existsSync(filePath)) return [];

    const findings: Finding[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      // Match: gem 'name' or gem "name" WITHOUT a comma after (no version constraint)
      const gemMatch = line.match(/^gem\s+['"]([^'"]+)['"]\s*$/);
      if (gemMatch) {
        const gemName = gemMatch[1];
        findings.push(makeFinding(
          Severity.WARNING,
          `Ruby gem "${gemName}" has no version constraint in Gemfile`,
          'Gemfile',
          i + 1,
          `Add a version constraint (e.g., gem '${gemName}', '~> x.y')`,
        ));
      }
    }

    return findings;
  }

  private checkGoMod(
    repoPath: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
  ): Finding[] {
    const goModPath = path.join(repoPath, 'go.mod');
    if (!fs.existsSync(goModPath)) return [];

    const goSumPath = path.join(repoPath, 'go.sum');
    if (!fs.existsSync(goSumPath)) {
      return [makeFinding(
        Severity.INFO,
        'go.mod present but go.sum missing. go.sum provides checksum verification',
        'go.mod',
        null,
        'Run "go mod tidy" to generate go.sum for dependency verification',
      )];
    }

    return [];
  }

  private checkCargoToml(
    repoPath: string,
    makeFinding: (s: Severity, m: string, f: string, l: number | null, sg: string) => Finding,
  ): Finding[] {
    const filePath = path.join(repoPath, 'Cargo.toml');
    if (!fs.existsSync(filePath)) return [];

    const findings: Finding[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let inDeps = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track section headers
      if (line.startsWith('[')) {
        inDeps = line === '[dependencies]' || line === '[dev-dependencies]';
        continue;
      }

      if (!inDeps || !line || line.startsWith('#')) continue;

      // Match: name = "*"
      const wildcardMatch = line.match(/^(\w[\w-]*)\s*=\s*["']\*["']/);
      if (wildcardMatch) {
        findings.push(makeFinding(
          Severity.CRITICAL,
          `Unpinned Rust dependency "${wildcardMatch[1]}": "*" in Cargo.toml`,
          'Cargo.toml',
          i + 1,
          `Pin "${wildcardMatch[1]}" to a specific version (e.g., "1.0.0")`,
        ));
      }
    }

    return findings;
  }
}
