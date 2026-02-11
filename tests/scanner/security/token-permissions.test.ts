import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { TokenPermissionsScanner } from '../../../src/scanner/security/token-permissions.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'token-perms-test-'));
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
  };
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

describe('TokenPermissionsScanner', () => {
  let scanner: TokenPermissionsScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new TokenPermissionsScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('token-permissions');
      expect(scanner.displayName).toBe('Token Permission Analysis');
      expect(scanner.pillar).toBe(Pillar.SECURITY);
    });
  });

  describe('no workflows', () => {
    it('returns empty findings when no .github/workflows directory', async () => {
      writeFixture(tmpDir, 'README.md', '# Hello\n');
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });
  });

  describe('missing permissions block', () => {
    it('CRITICAL when no top-level permissions block', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.severity === Severity.CRITICAL && f.message.includes('permissions'));
      expect(f).toBeDefined();
    });
  });

  describe('write-all permissions', () => {
    it('CRITICAL when permissions is write-all', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
permissions: write-all
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.severity === Severity.CRITICAL && f.message.includes('write-all'));
      expect(f).toBeDefined();
    });
  });

  describe('read-all permissions', () => {
    it('PASS when permissions is read-all', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
permissions: read-all
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
    });
  });

  describe('empty permissions (minimal)', () => {
    it('PASS when permissions is empty object', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
permissions: {}
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
      const findings = await scanner.run(createContext(tmpDir));
      const passFinding = findings.find((f) => f.severity === Severity.PASS);
      expect(passFinding).toBeDefined();
    });
  });

  describe('write permissions', () => {
    it('WARNING when individual permission set to write', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
permissions:
  contents: write
  pull-requests: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.severity === Severity.WARNING && f.message.includes('contents'));
      expect(f).toBeDefined();
    });
  });

  describe('GITHUB_TOKEN in curl/wget', () => {
    it('flags ${{ secrets.GITHUB_TOKEN }} in run blocks', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -H "Authorization: token \${{ secrets.GITHUB_TOKEN }}" https://api.github.com/repos
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('GITHUB_TOKEN') && f.message.includes('curl'));
      expect(f).toBeDefined();
    });
  });

  describe('multiple workflow files', () => {
    it('scans all workflow files', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
permissions: read-all
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
      writeFixture(tmpDir, '.github/workflows/release.yml', `
name: Release
on: push
permissions: write-all
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
      const findings = await scanner.run(createContext(tmpDir));
      // ci.yml should pass, release.yml should be critical
      expect(findings.some((f) => f.file?.includes('ci.yml') && f.severity === Severity.PASS)).toBe(true);
      expect(findings.some((f) => f.file?.includes('release.yml') && f.severity === Severity.CRITICAL)).toBe(true);
    });
  });

  describe('job-level permissions', () => {
    it('detects job-level permission overrides', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
permissions:
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('deploy') && f.message.includes('contents'));
      expect(f).toBeDefined();
    });
  });

  describe('finding structure', () => {
    it('creates findings with required fields', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
permissions: write-all
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('token-permissions');
      expect(f.pillar).toBe(Pillar.SECURITY);
      expect(f.category).toBe('token-permissions');
      expect(f.file).toBeDefined();
      expect(f.suggestion).toBeDefined();
    });
  });
});
