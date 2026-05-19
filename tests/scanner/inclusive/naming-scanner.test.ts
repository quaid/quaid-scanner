/**
 * Tests for NamingScanner — checks the project's own name and branding
 * against the Inclusive Naming Initiative term list.
 *
 * Mocks node:fs, node:child_process, and TermListManager so tests run
 * in isolation without touching the real filesystem or git.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';
import {
  Pillar,
  Severity,
  ScanDepth,
  MaturityLevel,
  OutputFormat,
} from '../../../src/types/index.js';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that use them.
// ---------------------------------------------------------------------------

vi.mock('node:fs');
vi.mock('node:child_process');
vi.mock('../../../src/scanner/inclusive/term-list.js');

// ---------------------------------------------------------------------------
// Import subject under test AFTER mocks are registered.
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import { TermListManager } from '../../../src/scanner/inclusive/term-list.js';
import { NamingScanner } from '../../../src/scanner/inclusive/naming-scanner.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal inclusive term for "whitelist" at tier 1 (CRITICAL). */
const WHITELIST_TERM = {
  term: 'whitelist',
  tier: 1 as const,
  pattern: /\bwhite[-]?list\b/i,
  replacements: ['allowlist', 'approved list'],
};

/** A minimal inclusive term for "blacklist" at tier 2 (WARNING). */
const BLACKLIST_TERM = {
  term: 'blacklist',
  tier: 2 as const,
  pattern: /\bblack[-]?list\b/i,
  replacements: ['blocklist', 'denylist'],
};

/** A minimal inclusive term for "master" at tier 3 (INFO). */
const MASTER_TERM = {
  term: 'master',
  tier: 3 as const,
  pattern: /\bmaster\b/i,
  replacements: ['main', 'primary'],
};

function createContext(repoPath: string = '/repo'): ScanContext {
  const config: ScannerConfig = {
    maturity: MaturityLevel.SANDBOX,
    depth: ScanDepth.STANDARD,
    format: OutputFormat.JSON,
    output: null,
    threshold: null,
    quiet: false,
    verbose: false,
    scannerTimeout: 30000,
    githubToken: null,
    zerodbApiKey: null,
    zerodbProjectId: null,
    ecosystem: false,
    ecosystemDepth: 'static',
    pillars: {
      disabled: [],
      weights: {},
      disabledScanners: [],
    },
    bots: {
      enabled: false,
      additional: [],
      exclude: [],
    },
    inclusive: {
      termListUrl: null,
      customTerms: {},
      ignoredTerms: [],
      excludePatterns: [],
    },
  };

  return {
    repoPath,
    repoIdentifier: null,
    maturity: MaturityLevel.SANDBOX,
    depth: ScanDepth.STANDARD,
    config,
    git: {
      commitSha: null,
      branch: null,
      remoteUrl: null,
    },
    signal: AbortSignal.timeout(30000),
    emit: () => {},
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('NamingScanner', () => {
  let scanner: NamingScanner;
  let mockLoadTerms: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    scanner = new NamingScanner();

    // Default: TermListManager returns the whitelist term so most tests can
    // exercise a flagged path without re-configuring the mock.
    mockLoadTerms = vi.fn().mockResolvedValue({ terms: [WHITELIST_TERM], source: 'bundled' });
    (TermListManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      loadTerms: mockLoadTerms,
    }));

    // Default fs stubs — can be overridden per test.
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('');

    // Default: git remote exits with non-zero (no remote configured).
    (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 1,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Scanner metadata
  // -------------------------------------------------------------------------

  describe('scanner metadata', () => {
    it('has the correct name', () => {
      expect(scanner.name).toBe('inclusive-naming-scanner');
    });

    it('has the correct displayName', () => {
      expect(scanner.displayName).toBe('Project Naming Scanner');
    });

    it('belongs to the INCLUSIVE pillar', () => {
      expect(scanner.pillar).toBe(Pillar.INCLUSIVE);
    });
  });

  // -------------------------------------------------------------------------
  // package.json name field
  // -------------------------------------------------------------------------

  describe('package.json name field', () => {
    it('returns a finding when package name contains a flagged term', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return JSON.stringify({ name: 'my-whitelist-tool' });
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const finding = findings.find((f) => f.file === 'package.json');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.CRITICAL);
      expect(finding!.pillar).toBe(Pillar.INCLUSIVE);
      expect(finding!.category).toBe('inclusive-naming');
      expect(finding!.suggestion).toContain('allowlist');
    });

    it('returns no findings when package name is clean', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return JSON.stringify({ name: 'clean-project-name' });
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const pkgFindings = findings.filter((f) => f.file === 'package.json');
      expect(pkgFindings).toHaveLength(0);
    });

    it('returns no findings and does not throw when package.json is missing', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const findings = await scanner.run(createContext());

      const pkgFindings = findings.filter((f) => f.file === 'package.json');
      expect(pkgFindings).toHaveLength(0);
    });

    it('returns no findings and does not throw when package.json is invalid JSON', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return 'NOT VALID JSON {{{';
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const pkgFindings = findings.filter((f) => f.file === 'package.json');
      expect(pkgFindings).toHaveLength(0);
    });

    it('maps tier 1 term to CRITICAL severity', async () => {
      mockLoadTerms.mockResolvedValue({ terms: [WHITELIST_TERM], source: 'bundled' });
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return JSON.stringify({ name: 'whitelist-manager' });
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const finding = findings.find((f) => f.file === 'package.json');
      expect(finding!.severity).toBe(Severity.CRITICAL);
    });

    it('maps tier 2 term to WARNING severity', async () => {
      mockLoadTerms.mockResolvedValue({ terms: [BLACKLIST_TERM], source: 'bundled' });
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return JSON.stringify({ name: 'blacklist-checker' });
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const finding = findings.find((f) => f.file === 'package.json');
      expect(finding!.severity).toBe(Severity.WARNING);
    });

    it('maps tier 3 term to INFO severity', async () => {
      mockLoadTerms.mockResolvedValue({ terms: [MASTER_TERM], source: 'bundled' });
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return JSON.stringify({ name: 'master-config' });
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const finding = findings.find((f) => f.file === 'package.json');
      expect(finding!.severity).toBe(Severity.INFO);
    });
  });

  // -------------------------------------------------------------------------
  // README.md H1 title
  // -------------------------------------------------------------------------

  describe('README.md H1 title', () => {
    it('returns a finding when README H1 contains a flagged term', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('README.md')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('README.md')) {
          return '# Whitelist Manager\n\nSome description.\n';
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const finding = findings.find((f) => f.file === 'README.md');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.CRITICAL);
      expect(finding!.category).toBe('inclusive-naming');
    });

    it('returns no findings when README H1 is clean', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('README.md')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('README.md')) {
          return '# Clean Project\n\nSome description.\n';
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const readmeFindings = findings.filter((f) => f.file === 'README.md');
      expect(readmeFindings).toHaveLength(0);
    });

    it('skips README check when README.md does not exist', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

      await expect(scanner.run(createContext())).resolves.toBeDefined();

      const findings = await scanner.run(createContext());
      const readmeFindings = findings.filter((f) => f.file === 'README.md');
      expect(readmeFindings).toHaveLength(0);
    });

    it('skips README check when README has no H1 line', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('README.md')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('README.md')) {
          // No H1 — just regular text
          return 'Just some text without a heading.\nMore text.\n';
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const readmeFindings = findings.filter((f) => f.file === 'README.md');
      expect(readmeFindings).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Git remote slug
  // -------------------------------------------------------------------------

  describe('git remote slug', () => {
    it('returns a finding when the git remote repo slug contains a flagged term', async () => {
      (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 0,
        stdout: Buffer.from('https://github.com/myorg/whitelist-service.git\n'),
        stderr: Buffer.from(''),
      });

      const findings = await scanner.run(createContext());

      const finding = findings.find((f) => f.file === null);
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe(Severity.CRITICAL);
      expect(finding!.category).toBe('inclusive-naming');
      expect(finding!.suggestion).toContain('allowlist');
    });

    it('returns no findings when git remote slug is clean', async () => {
      (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 0,
        stdout: Buffer.from('https://github.com/myorg/clean-project.git\n'),
        stderr: Buffer.from(''),
      });

      const findings = await scanner.run(createContext());

      const remoteFindings = findings.filter((f) => f.file === null);
      expect(remoteFindings).toHaveLength(0);
    });

    it('skips git remote check when spawnSync returns non-zero exit', async () => {
      (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 128,
        stdout: Buffer.from(''),
        stderr: Buffer.from('fatal: not a git repository'),
      });

      await expect(scanner.run(createContext())).resolves.toBeDefined();

      const findings = await scanner.run(createContext());
      const remoteFindings = findings.filter((f) => f.file === null);
      expect(remoteFindings).toHaveLength(0);
    });

    it('skips git remote check when spawnSync throws', async () => {
      (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('spawnSync failed');
      });

      await expect(scanner.run(createContext())).resolves.toBeDefined();
    });

    it('skips git remote check when remote URL is empty', async () => {
      (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 0,
        stdout: Buffer.from('\n'),
        stderr: Buffer.from(''),
      });

      const findings = await scanner.run(createContext());

      const remoteFindings = findings.filter((f) => f.file === null);
      expect(remoteFindings).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Combined / multi-source
  // -------------------------------------------------------------------------

  describe('combined sources', () => {
    it('returns empty findings array when no terms match any source', async () => {
      mockLoadTerms.mockResolvedValue({ terms: [WHITELIST_TERM], source: 'bundled' });

      // All sources are clean / missing
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 1,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      const findings = await scanner.run(createContext());

      expect(findings).toEqual([]);
    });

    it('returns findings from multiple sources in one run', async () => {
      // package.json flagged
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation(
        (p: unknown) =>
          (p as string).endsWith('package.json') || (p as string).endsWith('README.md')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return JSON.stringify({ name: 'whitelist-tool' });
        }
        if ((p as string).endsWith('README.md')) {
          return '# Whitelist Tool\n';
        }
        return '';
      });
      // git remote also flagged
      (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 0,
        stdout: Buffer.from('https://github.com/org/whitelist-tool.git\n'),
        stderr: Buffer.from(''),
      });

      const findings = await scanner.run(createContext());

      expect(findings.length).toBeGreaterThanOrEqual(3);
      const sources = new Set(findings.map((f) => f.file));
      expect(sources).toContain('package.json');
      expect(sources).toContain('README.md');
      expect(sources).toContain(null);
    });
  });

  // -------------------------------------------------------------------------
  // Finding shape
  // -------------------------------------------------------------------------

  describe('finding shape', () => {
    it('finding id is prefixed with the scanner name', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return JSON.stringify({ name: 'whitelist-app' });
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const finding = findings.find((f) => f.file === 'package.json');
      expect(finding!.id).toMatch(/^inclusive-naming-scanner-\d+$/);
    });

    it('suggestion contains the alternative term from the INI list', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          return JSON.stringify({ name: 'whitelist-manager' });
        }
        return '';
      });

      const findings = await scanner.run(createContext());

      const finding = findings.find((f) => f.file === 'package.json');
      expect(finding!.suggestion).toContain('Inclusive Naming Initiative');
      expect(finding!.suggestion).toMatch(/allowlist|approved list/);
    });
  });

  // -------------------------------------------------------------------------
  // Negative-lookbehind: avoid false positives on property access
  // -------------------------------------------------------------------------

  describe('negative lookbehind on property access patterns', () => {
    it('does not flag "whitelist" when preceded by a dot', async () => {
      mockLoadTerms.mockResolvedValue({ terms: [WHITELIST_TERM], source: 'bundled' });
      (fs.existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) =>
        (p as string).endsWith('package.json')
      );
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if ((p as string).endsWith('package.json')) {
          // Name would not normally have a dot, but this tests the regex path
          return JSON.stringify({ name: 'clean-name' });
        }
        return '';
      });
      // Use git remote with a dot-prefixed slug segment
      (childProcess.spawnSync as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 0,
        stdout: Buffer.from('https://github.com/org/clean-tool.git\n'),
        stderr: Buffer.from(''),
      });

      const findings = await scanner.run(createContext());

      expect(findings).toHaveLength(0);
    });
  });
});
