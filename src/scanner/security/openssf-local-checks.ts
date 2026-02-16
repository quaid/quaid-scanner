/**
 * OpenSSF local security checks.
 *
 * Provides local fallback checks when the Scorecard API is unavailable.
 * Implements a subset of OpenSSF Scorecard checks that can run offline:
 * - License
 * - Security-Policy
 * - Binary-Artifacts
 * - Maintained
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const BINARY_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.a',
  '.class', '.jar', '.war', '.pyc', '.pyo', '.wasm',
]);

export class OpenSSFLocalChecksScanner implements Scanner {
  readonly name = 'openssf-local-checks';
  readonly displayName = 'OpenSSF Local Security Checks';
  readonly pillar = Pillar.SECURITY;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    let counter = 0;

    const makeFinding = (
      severity: Severity,
      message: string,
      checkName: string,
      suggestion: string,
    ): Finding => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity,
        pillar: this.pillar,
        category: 'openssf-scorecard',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata: {
          scorecard_source: 'local',
          checkName,
        },
      };
    };

    const findings: Finding[] = [];

    // License check
    findings.push(this.checkLicense(repoPath, makeFinding));

    // Security-Policy check
    findings.push(this.checkSecurityPolicy(repoPath, makeFinding));

    // Binary-Artifacts check
    findings.push(await this.checkBinaryArtifacts(repoPath, makeFinding));

    // Maintained check
    findings.push(this.checkMaintained(repoPath, makeFinding));

    return findings;
  }

  private checkLicense(
    repoPath: string,
    make: (s: Severity, m: string, c: string, sg: string) => Finding,
  ): Finding {
    const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'COPYING'];
    for (const name of licenseFiles) {
      if (fs.existsSync(path.join(repoPath, name))) {
        return make(
          Severity.PASS,
          `License check: ${name} file found`,
          'License',
          'License file is present',
        );
      }
    }
    return make(
      Severity.CRITICAL,
      'License check: No LICENSE file found',
      'License',
      'Add a LICENSE file with a recognized open source license',
    );
  }

  private checkSecurityPolicy(
    repoPath: string,
    make: (s: Severity, m: string, c: string, sg: string) => Finding,
  ): Finding {
    const securityFiles = [
      'SECURITY.md',
      '.github/SECURITY.md',
      'docs/SECURITY.md',
      'security.md',
    ];
    for (const name of securityFiles) {
      if (fs.existsSync(path.join(repoPath, name))) {
        return make(
          Severity.PASS,
          `Security-Policy check: ${name} file found`,
          'Security-Policy',
          'Security policy is documented',
        );
      }
    }
    return make(
      Severity.WARNING,
      'Security-Policy check: No SECURITY.md file found',
      'Security-Policy',
      'Add a SECURITY.md file with vulnerability reporting instructions',
    );
  }

  private async checkBinaryArtifacts(
    repoPath: string,
    make: (s: Severity, m: string, c: string, sg: string) => Finding,
  ): Promise<Finding> {
    const ignore = ['**/node_modules/**', '**/vendor/**', '**/.git/**', '**/dist/**', '**/build/**'];

    let binaryCount = 0;
    try {
      const allFiles = await glob('**/*', {
        cwd: repoPath,
        nodir: true,
        ignore,
        absolute: false,
      });

      for (const file of allFiles) {
        const ext = path.extname(file).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) {
          binaryCount++;
        }
      }
    } catch {
      // Glob failed, skip
    }

    if (binaryCount === 0) {
      return make(
        Severity.PASS,
        'Binary-Artifacts check: No binary artifacts found in repository',
        'Binary-Artifacts',
        'No binary artifacts detected',
      );
    }

    return make(
      Severity.WARNING,
      `Binary-Artifacts check: Found ${binaryCount} binary file(s) in repository`,
      'Binary-Artifacts',
      'Remove binary artifacts and use package managers or build systems instead',
    );
  }

  private checkMaintained(
    repoPath: string,
    make: (s: Severity, m: string, c: string, sg: string) => Finding,
  ): Finding {
    // Check for recent activity indicators
    const indicators = [
      'README.md',
      'CONTRIBUTING.md',
      'package.json',
      'go.mod',
      'Cargo.toml',
      'pyproject.toml',
    ];

    let found = 0;
    for (const name of indicators) {
      if (fs.existsSync(path.join(repoPath, name))) found++;
    }

    if (found >= 2) {
      return make(
        Severity.PASS,
        `Maintained check: Project has ${found} active project indicator files`,
        'Maintained',
        'Project appears to be maintained',
      );
    }

    return make(
      Severity.INFO,
      'Maintained check: Limited project activity indicators found (local check only)',
      'Maintained',
      'Consider using the Scorecard API for a more accurate Maintained check',
    );
  }
}
