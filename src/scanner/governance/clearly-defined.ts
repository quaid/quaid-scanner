/**
 * ClearlyDefined License Cross-Validation scanner.
 *
 * Cross-validates the declared licenses of production npm dependencies
 * against the ClearlyDefined.io public API.  Each dependency is looked
 * up individually and the declared SPDX expression is evaluated:
 *
 *  - Permissive  → no finding (clean)
 *  - Copyleft    → Severity.WARNING
 *  - NOASSERTION or missing → Severity.INFO
 *  - Unrecognised SPDX identifier → Severity.WARNING
 *
 * If the ClearlyDefined API is unreachable the scanner degrades
 * gracefully: it returns a single INFO finding and does NOT throw.
 *
 * A 50 ms inter-request delay is applied to avoid hammering the API.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

// ---------------------------------------------------------------------------
// License sets — mirrors dep-license-scanning.ts for consistency
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ClearlyDefined API response shape (partial)
// ---------------------------------------------------------------------------

interface ClearlyDefinedResponse {
  licensed?: {
    declared?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Scanner implementation
// ---------------------------------------------------------------------------

export class ClearlyDefinedScanner implements Scanner {
  readonly name = 'clearly-defined';
  readonly displayName = 'ClearlyDefined License Cross-Validation';
  readonly pillar = Pillar.GOVERNANCE;

  /**
   * @param fetchFn - Injectable fetch implementation (defaults to globalThis.fetch).
   *                  Pass a mock in tests to avoid real network calls.
   */
  constructor(private readonly fetchFn: typeof fetch = globalThis.fetch) {}

  /** Run the scanner against the repository at `context.repoPath`. */
  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    let counter = 0;

    const makeFinding = (
      severity: Severity,
      message: string,
      file: string | null,
      suggestion: string,
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
      };
    };

    // Read package.json — return empty if absent or unparseable.
    const pkgJsonPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      return [];
    }

    let pkgJson: { dependencies?: Record<string, string> };
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    } catch {
      return [];
    }

    const deps = pkgJson.dependencies ?? {};
    const depEntries = Object.entries(deps);

    if (depEntries.length === 0) {
      return [];
    }

    // Fetch license data for each production dependency.
    const findings: Finding[] = [];

    for (const [name, versionSpec] of depEntries) {
      // Resolve the concrete version.
      const version = this.resolveVersion(repoPath, name, versionSpec);

      // Query ClearlyDefined.
      let declaredLicense: string | null | undefined;
      try {
        const url =
          `https://api.clearlydefined.io/definitions/npm/npmjs/-/${name}/${version}`;
        const response = await this.fetchFn(url);
        if (!response.ok) {
          // Non-2xx — treat as API unavailable.
          return [
            makeFinding(
              Severity.INFO,
              'ClearlyDefined API unavailable — cross-validation skipped',
              null,
              'Check network connectivity or try again later',
            ),
          ];
        }
        const data = (await response.json()) as ClearlyDefinedResponse;
        declaredLicense = data?.licensed?.declared;
      } catch {
        // Network error or fetch threw — degrade gracefully.
        return [
          makeFinding(
            Severity.INFO,
            'ClearlyDefined API unavailable — cross-validation skipped',
            null,
            'Check network connectivity or try again later',
          ),
        ];
      }

      // Evaluate the declared license.
      const finding = this.evaluateLicense(name, version, declaredLicense ?? null, makeFinding);
      if (finding !== null) {
        findings.push(finding);
      }

      // Rate-limit: 50 ms between requests.
      await this.delay(50);
    }

    return findings;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Determine the concrete version string for a dependency.
   *
   * Prefers the `version` field from `node_modules/{name}/package.json`
   * (resolved version) and falls back to stripping semver range prefixes
   * (`^`, `~`, `>=`, `>`, `<=`, `<`) from the version specifier.
   */
  private resolveVersion(repoPath: string, name: string, versionSpec: string): string {
    const depPkgPath = path.join(repoPath, 'node_modules', name, 'package.json');
    if (fs.existsSync(depPkgPath)) {
      try {
        const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf-8')) as {
          version?: string;
        };
        if (depPkg.version) {
          return depPkg.version;
        }
      } catch {
        // Fall through to regex stripping.
      }
    }

    // Strip common semver range prefixes.
    return versionSpec.replace(/^[^0-9]*/, '');
  }

  /**
   * Map a declared license string to a Finding, or return null if clean.
   */
  private evaluateLicense(
    name: string,
    version: string,
    declared: string | null,
    makeFinding: (
      severity: Severity,
      message: string,
      file: string | null,
      suggestion: string,
    ) => Finding,
  ): Finding | null {
    // No license data.
    if (declared === null || declared === undefined || declared === 'NOASSERTION') {
      return makeFinding(
        Severity.INFO,
        `ClearlyDefined has no license data for ${name}@${version}`,
        'package.json',
        'Check the package manually and consider opening a curation PR at clearlydefined.io',
      );
    }

    // Copyleft license.
    if (COPYLEFT_LICENSES.has(declared)) {
      return makeFinding(
        Severity.WARNING,
        `ClearlyDefined confirms ${name}@${version} is licensed ${declared} (copyleft)`,
        'package.json',
        "Evaluate whether this copyleft license is compatible with your project's licensing obligations",
      );
    }

    // Permissive license — clean.
    if (PERMISSIVE_LICENSES.has(declared)) {
      return null;
    }

    // Unrecognised SPDX identifier.
    return makeFinding(
      Severity.WARNING,
      `ClearlyDefined reports an uncommon license for ${name}@${version}: ${declared}`,
      'package.json',
      'Review the license terms manually',
    );
  }

  /** Delay helper — wraps setTimeout so tests can override via fake timers if needed. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
