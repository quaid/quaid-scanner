/**
 * Tests for the ClearlyDefined License Cross-Validation scanner.
 *
 * Uses an injected mock fetch function to avoid real network calls.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ClearlyDefinedScanner } from '../../../src/scanner/governance/clearly-defined.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clearly-defined-test-'));
}

function writeFixture(dir: string, filePath: string, content: string): void {
  const fullPath = path.join(dir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

function createContext(repoPath: string): ScanContext {
  const config: ScannerConfig = {
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    format: OutputFormat.JSON,
    output: null,
    threshold: null,
    quiet: false,
    verbose: false,
    scannerTimeout: 30_000,
    githubToken: null,
    zerodbApiKey: null,
    zerodbProjectId: null,
    pillars: { disabled: [], weights: {}, disabledScanners: [] },
    bots: { enabled: true, additional: [], exclude: [] },
    inclusive: {
      termListUrl: null,
      customTerms: {},
      ignoredTerms: [],
      excludePatterns: [],
    },
  } as ScannerConfig;

  return {
    repoPath,
    repoIdentifier: null,
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: null, branch: null, remoteUrl: null },
    signal: AbortSignal.timeout(30_000),
    emit: () => {},
  };
}

/** Build a minimal ClearlyDefined API response with the given declared license. */
function makeCDResponse(declaredLicense: string | null): object {
  return {
    licensed: {
      declared: declaredLicense,
    },
  };
}

/** Returns a fetch mock that always resolves with the given body and status. */
function mockFetch(
  body: object | null,
  status = 200,
): typeof globalThis.fetch {
  return async (_url: string | URL | Request, _init?: RequestInit) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  };
}

/** Returns a fetch mock that throws a network error. */
function mockFetchThrows(message = 'network error'): typeof globalThis.fetch {
  return async (_url: string | URL | Request, _init?: RequestInit) => {
    throw new Error(message);
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClearlyDefinedScanner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  describe('scanner metadata', () => {
    it('has correct name', () => {
      const scanner = new ClearlyDefinedScanner(mockFetch({}));
      expect(scanner.name).toBe('clearly-defined');
    });

    it('has correct displayName', () => {
      const scanner = new ClearlyDefinedScanner(mockFetch({}));
      expect(scanner.displayName).toBe('ClearlyDefined License Cross-Validation');
    });

    it('has GOVERNANCE pillar', () => {
      const scanner = new ClearlyDefinedScanner(mockFetch({}));
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  // -------------------------------------------------------------------------
  // No package.json
  // -------------------------------------------------------------------------

  describe('missing package.json', () => {
    it('returns empty findings when package.json does not exist', async () => {
      const scanner = new ClearlyDefinedScanner(mockFetch({}));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Empty dependencies
  // -------------------------------------------------------------------------

  describe('empty dependencies', () => {
    it('returns empty findings when dependencies object is empty', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: {} }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch({}));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });

    it('returns empty findings when package.json has no dependencies field', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test' }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch({}));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Permissive license — clean result
  // -------------------------------------------------------------------------

  describe('permissive license', () => {
    it('produces no finding for a dependency with a permissive license (MIT)', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.17.21' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('MIT')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });

    it('produces no finding for Apache-2.0', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { express: '^4.18.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('Apache-2.0')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Copyleft license — WARNING
  // -------------------------------------------------------------------------

  describe('copyleft license', () => {
    it('produces a WARNING finding for a GPL-3.0 dependency', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'some-gpl-pkg': '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('GPL-3.0-only')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
    });

    it('includes the package name and license in the copyleft WARNING message', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'gpl-lib': '^2.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('GPL-3.0-only')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings[0].message).toContain('gpl-lib');
      expect(findings[0].message).toContain('GPL-3.0-only');
      expect(findings[0].message).toContain('copyleft');
    });

    it('includes a suggestion about copyleft compatibility', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'gpl-lib': '^2.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('GPL-3.0-only')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings[0].suggestion).toContain('copyleft');
    });
  });

  // -------------------------------------------------------------------------
  // NOASSERTION — INFO
  // -------------------------------------------------------------------------

  describe('NOASSERTION license', () => {
    it('produces an INFO finding when declared license is NOASSERTION', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { mystery: '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('NOASSERTION')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
    });

    it('produces an INFO finding when declared license is null (missing)', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { mystery: '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse(null)));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
    });

    it('includes the package name in the NOASSERTION INFO message', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { mystery: '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('NOASSERTION')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings[0].message).toContain('mystery');
      expect(findings[0].message).toContain('no license data');
    });

    it('suggests opening a curation PR at clearlydefined.io for NOASSERTION', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { mystery: '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('NOASSERTION')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings[0].suggestion).toContain('clearlydefined.io');
    });
  });

  // -------------------------------------------------------------------------
  // Unknown license — WARNING
  // -------------------------------------------------------------------------

  describe('unknown (uncommon) license', () => {
    it('produces a WARNING finding for an unrecognized SPDX identifier', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'weird-pkg': '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('LicenseRef-Proprietary')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
    });

    it('includes the unknown license identifier in the WARNING message', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'weird-pkg': '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('LicenseRef-Proprietary')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings[0].message).toContain('weird-pkg');
      expect(findings[0].message).toContain('LicenseRef-Proprietary');
    });

    it('suggests manual review for unknown license', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'weird-pkg': '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('LicenseRef-Proprietary')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings[0].suggestion).toContain('manually');
    });
  });

  // -------------------------------------------------------------------------
  // Graceful degradation — network error
  // -------------------------------------------------------------------------

  describe('graceful degradation on network error', () => {
    it('returns a single INFO finding when fetch throws', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.17.21' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetchThrows('network error'));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
    });

    it('does not throw when fetch fails — returns INFO finding instead', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.17.21' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetchThrows());
      await expect(scanner.run(createContext(tmpDir))).resolves.toBeDefined();
    });

    it('degradation finding message mentions ClearlyDefined API unavailability', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.17.21' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetchThrows());
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings[0].message).toContain('ClearlyDefined');
      expect(findings[0].message).toContain('unavailable');
    });
  });

  // -------------------------------------------------------------------------
  // Graceful degradation — non-200 HTTP status
  // -------------------------------------------------------------------------

  describe('graceful degradation on non-200 HTTP status', () => {
    it('returns a single INFO finding when API returns 500', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.17.21' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(null, 500));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
    });

    it('returns a single INFO finding when API returns 404', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.17.21' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(null, 404));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(Severity.INFO);
    });
  });

  // -------------------------------------------------------------------------
  // Multiple dependencies
  // -------------------------------------------------------------------------

  describe('multiple dependencies', () => {
    it('generates a finding for each flagged dependency', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: {
            'gpl-lib': '^1.0.0',
            'mystery-lib': '^2.0.0',
          },
        }),
      );

      // First call returns copyleft, second returns NOASSERTION
      let callCount = 0;
      const multiFetch: typeof globalThis.fetch = async (_url, _init) => {
        callCount++;
        const license = callCount === 1 ? 'GPL-3.0-only' : 'NOASSERTION';
        return {
          ok: true,
          status: 200,
          json: async () => makeCDResponse(license),
        } as Response;
      };

      const scanner = new ClearlyDefinedScanner(multiFetch);
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(2);
    });

    it('skips findings for permissive dependencies and reports only flagged ones', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: {
            'clean-pkg': '^1.0.0',
            'gpl-pkg': '^2.0.0',
          },
        }),
      );

      // First call permissive, second copyleft
      let callCount = 0;
      const multiFetch: typeof globalThis.fetch = async (_url, _init) => {
        callCount++;
        const license = callCount === 1 ? 'MIT' : 'GPL-3.0-only';
        return {
          ok: true,
          status: 200,
          json: async () => makeCDResponse(license),
        } as Response;
      };

      const scanner = new ClearlyDefinedScanner(multiFetch);
      const findings = await scanner.run(createContext(tmpDir));
      // Only the GPL one should generate a finding
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('gpl-pkg');
    });
  });

  // -------------------------------------------------------------------------
  // Finding structure
  // -------------------------------------------------------------------------

  describe('finding structure', () => {
    it('includes all required Finding fields', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'gpl-lib': '^1.0.0' } }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('GPL-3.0-only')));
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings[0];
      expect(f.id).toContain('clearly-defined');
      expect(f.pillar).toBe(Pillar.GOVERNANCE);
      expect(f.category).toBe('dependency-license');
      expect(typeof f.message).toBe('string');
      expect(typeof f.suggestion).toBe('string');
      expect(f.file).toBe('package.json');
    });

    it('uses incrementing IDs across multiple findings', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'test',
          dependencies: {
            'gpl-lib-a': '^1.0.0',
            'gpl-lib-b': '^2.0.0',
          },
        }),
      );
      const scanner = new ClearlyDefinedScanner(mockFetch(makeCDResponse('GPL-3.0-only')));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings[0].id).not.toBe(findings[1].id);
    });
  });

  // -------------------------------------------------------------------------
  // Version resolution
  // -------------------------------------------------------------------------

  describe('version resolution', () => {
    it('uses resolved version from node_modules when available', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.17.21' } }),
      );
      // The resolved version from node_modules is 4.17.21
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', version: '4.17.21', license: 'MIT' }),
      );

      const capturedUrls: string[] = [];
      const capturingFetch: typeof globalThis.fetch = async (url, _init) => {
        capturedUrls.push(url.toString());
        return {
          ok: true,
          status: 200,
          json: async () => makeCDResponse('MIT'),
        } as Response;
      };

      const scanner = new ClearlyDefinedScanner(capturingFetch);
      await scanner.run(createContext(tmpDir));
      expect(capturedUrls[0]).toContain('4.17.21');
    });

    it('strips semver range prefix when node_modules is not available', async () => {
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.17.21' } }),
      );

      const capturedUrls: string[] = [];
      const capturingFetch: typeof globalThis.fetch = async (url, _init) => {
        capturedUrls.push(url.toString());
        return {
          ok: true,
          status: 200,
          json: async () => makeCDResponse('MIT'),
        } as Response;
      };

      const scanner = new ClearlyDefinedScanner(capturingFetch);
      await scanner.run(createContext(tmpDir));
      // Should strip ^ prefix and use 4.17.21
      expect(capturedUrls[0]).toContain('4.17.21');
      expect(capturedUrls[0]).not.toContain('^');
    });
  });
});
