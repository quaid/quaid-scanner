/**
 * License compatibility analysis scanner.
 *
 * Checks whether dependency licenses are compatible with the
 * project's own license, flagging copyleft-in-permissive conflicts.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

type LicenseCategory = 'permissive' | 'weak-copyleft' | 'strong-copyleft' | 'unknown';

const PERMISSIVE = new Set([
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0',
  'Unlicense', 'CC0-1.0', '0BSD', 'Zlib', 'BSL-1.0',
]);

const WEAK_COPYLEFT = new Set([
  'LGPL-2.1', 'LGPL-2.1-only', 'LGPL-2.1-or-later',
  'LGPL-3.0', 'LGPL-3.0-only', 'LGPL-3.0-or-later',
  'MPL-2.0', 'EPL-2.0', 'CDDL-1.0',
]);

const STRONG_COPYLEFT = new Set([
  'GPL-2.0', 'GPL-2.0-only', 'GPL-2.0-or-later',
  'GPL-3.0', 'GPL-3.0-only', 'GPL-3.0-or-later',
  'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later',
]);

const ATTRIBUTION_REQUIRED = new Set(['Apache-2.0']);

/** Detect the project license from LICENSE file content. */
function detectProjectLicense(content: string): string | null {
  if (/\bMIT License\b/i.test(content)) return 'MIT';
  if (/\bApache License\b/i.test(content) && /\bVersion 2\.0\b/.test(content)) return 'Apache-2.0';
  if (/\bGNU GENERAL PUBLIC LICENSE\b/i.test(content)) {
    if (/\bVersion 3\b/.test(content)) return 'GPL-3.0';
    if (/\bVersion 2\b/.test(content)) return 'GPL-2.0';
  }
  if (/\bGNU LESSER GENERAL PUBLIC LICENSE\b/i.test(content)) return 'LGPL-3.0';
  if (/\bBSD 3-Clause\b/i.test(content)) return 'BSD-3-Clause';
  if (/\bBSD 2-Clause\b/i.test(content)) return 'BSD-2-Clause';
  if (/\bISC License\b/i.test(content)) return 'ISC';
  if (/\bMozilla Public License\b/i.test(content)) return 'MPL-2.0';
  return null;
}

function categorize(license: string): LicenseCategory {
  if (PERMISSIVE.has(license)) return 'permissive';
  if (WEAK_COPYLEFT.has(license)) return 'weak-copyleft';
  if (STRONG_COPYLEFT.has(license)) return 'strong-copyleft';
  return 'unknown';
}

export class LicenseCompatibilityScanner implements Scanner {
  readonly name = 'license-compatibility';
  readonly displayName = 'License Compatibility Analysis';
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
        category: 'license-compatibility',
        message,
        file,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    // Read project license
    const licenseContent = this.readLicenseFile(repoPath);
    if (!licenseContent) {
      return [
        makeFinding(
          Severity.INFO,
          'Cannot check license compatibility — no LICENSE file found',
          null,
          'Add a LICENSE file to enable compatibility analysis',
        ),
      ];
    }

    const projectLicense = detectProjectLicense(licenseContent);
    if (!projectLicense) {
      return [
        makeFinding(
          Severity.INFO,
          'Cannot check license compatibility — project license not identified',
          null,
          'Use a standard SPDX license to enable compatibility analysis',
        ),
      ];
    }

    const projectCategory = categorize(projectLicense);

    // Read dependencies
    const deps = this.readNodeDeps(repoPath);
    if (deps.length === 0) {
      return [
        makeFinding(
          Severity.INFO,
          `Project license is ${projectLicense} — no installed dependencies to check compatibility`,
          null,
          'Install dependencies to enable compatibility checking',
        ),
      ];
    }

    const findings: Finding[] = [];
    const hasNoticeFile = fs.existsSync(path.join(repoPath, 'NOTICE'));

    for (const dep of deps) {
      if (!dep.license) continue;

      const depCategory = categorize(dep.license);

      // Check strong copyleft in permissive project
      if (projectCategory === 'permissive' && depCategory === 'strong-copyleft') {
        findings.push(
          makeFinding(
            Severity.CRITICAL,
            `License conflict: dependency "${dep.name}" uses strong copyleft license "${dep.license}" in ${projectLicense} project`,
            'package.json',
            `Replace "${dep.name}" with a permissive-licensed alternative or change the project license`,
            { dependency: dep.name, depLicense: dep.license, projectLicense },
          ),
        );
        continue;
      }

      // Check weak copyleft in permissive project
      if (projectCategory === 'permissive' && depCategory === 'weak-copyleft') {
        findings.push(
          makeFinding(
            Severity.WARNING,
            `Dependency "${dep.name}" uses weak copyleft license "${dep.license}" in ${projectLicense} project`,
            'package.json',
            `Review "${dep.license}" obligations — modifications to "${dep.name}" may need to be shared`,
            { dependency: dep.name, depLicense: dep.license, projectLicense },
          ),
        );
        continue;
      }

      // Check attribution requirements
      if (ATTRIBUTION_REQUIRED.has(dep.license) && !hasNoticeFile) {
        findings.push(
          makeFinding(
            Severity.INFO,
            `Dependency "${dep.name}" uses ${dep.license} which requires a NOTICE file`,
            'package.json',
            'Add a NOTICE file with required attributions',
            { dependency: dep.name, depLicense: dep.license },
          ),
        );
      }

      // Compatible
      findings.push(
        makeFinding(
          Severity.PASS,
          `Dependency "${dep.name}" (${dep.license}) is compatible with project license ${projectLicense}`,
          'package.json',
          'No compatibility issues',
          { dependency: dep.name, depLicense: dep.license, projectLicense },
        ),
      );
    }

    if (findings.length === 0) {
      findings.push(
        makeFinding(
          Severity.PASS,
          `All dependencies are compatible with project license ${projectLicense}`,
          null,
          'No license compatibility issues found',
        ),
      );
    }

    return findings;
  }

  private readLicenseFile(repoPath: string): string | null {
    for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE']) {
      try {
        return fs.readFileSync(path.join(repoPath, name), 'utf-8');
      } catch {
        // Try next
      }
    }
    return null;
  }

  private readNodeDeps(repoPath: string): Array<{ name: string; license: string | null }> {
    const pkgPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(pkgPath)) return [];

    let pkgJson: { dependencies?: Record<string, string> };
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      return [];
    }

    const deps: Array<{ name: string; license: string | null }> = [];
    const nodeModules = path.join(repoPath, 'node_modules');

    for (const depName of Object.keys(pkgJson.dependencies || {})) {
      try {
        const depPkg = JSON.parse(
          fs.readFileSync(path.join(nodeModules, depName, 'package.json'), 'utf-8'),
        );
        deps.push({ name: depName, license: depPkg.license || null });
      } catch {
        // Package not installed
      }
    }

    return deps;
  }
}
