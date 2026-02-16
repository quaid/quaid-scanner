/**
 * Dependency license scanning.
 *
 * Scans installed dependencies (node_modules, etc.) to identify
 * their licenses and flag copyleft or unknown licenses.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** License categories for common SPDX identifiers. */
const PERMISSIVE_LICENSES = new Set([
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0',
  'Unlicense', 'CC0-1.0', '0BSD', 'Zlib', 'BSL-1.0', 'PostgreSQL',
  'BlueOak-1.0.0', 'Artistic-2.0',
]);

const COPYLEFT_LICENSES = new Set([
  'GPL-2.0', 'GPL-2.0-only', 'GPL-2.0-or-later',
  'GPL-3.0', 'GPL-3.0-only', 'GPL-3.0-or-later',
  'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later',
  'LGPL-2.1', 'LGPL-2.1-only', 'LGPL-2.1-or-later',
  'LGPL-3.0', 'LGPL-3.0-only', 'LGPL-3.0-or-later',
  'MPL-2.0', 'EPL-2.0', 'EUPL-1.2', 'CDDL-1.0',
  'CECILL-2.1',
]);

interface DepInfo {
  name: string;
  license: string | null;
  category: 'permissive' | 'copyleft' | 'unknown';
}

export class DepLicenseScanningScanner implements Scanner {
  readonly name = 'dep-license-scanning';
  readonly displayName = 'Dependency License Scanning';
  readonly pillar = Pillar.GOVERNANCE;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    let counter = 0;

    const makeFinding = (
      severity: Severity,
      message: string,
      file: string | null,
      suggestion: string,
      metadata?: Record<string, unknown>,
    ): Finding => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity,
        pillar: this.pillar,
        category: 'dependency-license',
        message,
        file,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const findings: Finding[] = [];
    const deps: DepInfo[] = [];

    // Check for package.json (Node.js)
    const hasPackageJson = this.scanNodeDeps(repoPath, deps);

    // Check for requirements.txt (Python)
    const hasRequirementsTxt = this.checkPythonDeps(repoPath);

    // Check for go.mod (Go)
    const hasGoMod = fs.existsSync(path.join(repoPath, 'go.mod'));

    // Check for Cargo.toml (Rust)
    const hasCargoToml = fs.existsSync(path.join(repoPath, 'Cargo.toml'));

    if (!hasPackageJson && !hasRequirementsTxt && !hasGoMod && !hasCargoToml) {
      return [
        makeFinding(
          Severity.INFO,
          'No dependency manifest files found',
          null,
          'No action needed — this check applies to projects with package managers',
        ),
      ];
    }

    // Report per-dependency findings for Node.js
    if (deps.length > 0) {
      let permissiveCount = 0;
      let copyleftCount = 0;
      let unknownCount = 0;

      for (const dep of deps) {
        if (dep.category === 'permissive') {
          permissiveCount++;
          findings.push(
            makeFinding(
              Severity.PASS,
              `Dependency "${dep.name}" uses permissive license: ${dep.license}`,
              'package.json',
              'No action needed',
              { dependency: dep.name, license: dep.license, category: dep.category },
            ),
          );
        } else if (dep.category === 'copyleft') {
          copyleftCount++;
          findings.push(
            makeFinding(
              Severity.WARNING,
              `Dependency "${dep.name}" uses copyleft license: ${dep.license}`,
              'package.json',
              `Review license compatibility — "${dep.license}" may impose restrictions on your project`,
              { dependency: dep.name, license: dep.license, category: dep.category },
            ),
          );
        } else {
          unknownCount++;
          findings.push(
            makeFinding(
              Severity.WARNING,
              `Dependency "${dep.name}" has unknown or missing license${dep.license ? `: ${dep.license}` : ''}`,
              'package.json',
              `Investigate the license for "${dep.name}" before using in production`,
              { dependency: dep.name, license: dep.license, category: dep.category },
            ),
          );
        }
      }

      // Summary finding
      findings.unshift(
        makeFinding(
          copyleftCount > 0 || unknownCount > 0 ? Severity.WARNING : Severity.PASS,
          `Scanned ${deps.length} dependencies: ${permissiveCount} permissive, ${copyleftCount} copyleft, ${unknownCount} unknown`,
          'package.json',
          copyleftCount > 0
            ? 'Review copyleft dependencies for license compatibility'
            : unknownCount > 0
              ? 'Investigate dependencies with unknown licenses'
              : 'All dependencies use permissive licenses',
          {
            totalDependencies: deps.length,
            permissive: permissiveCount,
            copyleft: copyleftCount,
            unknown: unknownCount,
          },
        ),
      );
    } else if (hasPackageJson) {
      findings.push(
        makeFinding(
          Severity.INFO,
          'package.json found but node_modules not installed — cannot scan dependency licenses',
          'package.json',
          'Run "npm install" to enable dependency license scanning',
        ),
      );
    }

    // For non-Node ecosystems without local scanning capability
    if (hasRequirementsTxt && deps.length === 0) {
      findings.push(
        makeFinding(
          Severity.INFO,
          'Python dependencies detected (requirements.txt) — license scanning requires installed packages',
          'requirements.txt',
          'Install packages and use a tool like pip-licenses for detailed scanning',
        ),
      );
    }

    if (hasGoMod && deps.length === 0) {
      findings.push(
        makeFinding(
          Severity.INFO,
          'Go dependencies detected (go.mod) — license scanning requires downloaded modules',
          'go.mod',
          'Run "go mod download" and use a tool like go-licenses for scanning',
        ),
      );
    }

    if (hasCargoToml && deps.length === 0) {
      findings.push(
        makeFinding(
          Severity.INFO,
          'Rust dependencies detected (Cargo.toml) — license scanning requires built project',
          'Cargo.toml',
          'Use "cargo-license" for detailed dependency license scanning',
        ),
      );
    }

    return findings;
  }

  private scanNodeDeps(repoPath: string, deps: DepInfo[]): boolean {
    const pkgJsonPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) return false;

    let pkgJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    } catch {
      return false;
    }

    const allDeps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {}),
    };

    const nodeModules = path.join(repoPath, 'node_modules');
    if (!fs.existsSync(nodeModules)) return true;

    for (const depName of Object.keys(allDeps)) {
      const depPkgPath = path.join(nodeModules, depName, 'package.json');
      try {
        const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf-8'));
        const license = depPkg.license || null;
        const category = this.categorizeLicense(license);
        deps.push({ name: depName, license, category });
      } catch {
        deps.push({ name: depName, license: null, category: 'unknown' });
      }
    }

    return true;
  }

  private checkPythonDeps(repoPath: string): boolean {
    return fs.existsSync(path.join(repoPath, 'requirements.txt'));
  }

  private categorizeLicense(license: string | null): 'permissive' | 'copyleft' | 'unknown' {
    if (!license) return 'unknown';
    if (PERMISSIVE_LICENSES.has(license)) return 'permissive';
    if (COPYLEFT_LICENSES.has(license)) return 'copyleft';
    return 'unknown';
  }
}
