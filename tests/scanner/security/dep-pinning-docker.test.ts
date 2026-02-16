import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DepPinningDockerScanner } from '../../../src/scanner/security/dep-pinning-docker.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dep-pinning-docker-test-'));
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

describe('DepPinningDockerScanner', () => {
  let scanner: DepPinningDockerScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new DepPinningDockerScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('dep-pinning-docker');
      expect(scanner.displayName).toBe('Dependency Pinning - Docker & Workflows');
      expect(scanner.pillar).toBe(Pillar.SECURITY);
    });
  });

  describe('Dockerfile scanning', () => {
    it('flags :latest tags as CRITICAL', async () => {
      writeFixture(tmpDir, 'Dockerfile', 'FROM node:latest\nRUN npm install\n');
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('latest') && f.severity === Severity.CRITICAL);
      expect(f).toBeDefined();
    });

    it('flags missing digest for base images as WARNING', async () => {
      writeFixture(tmpDir, 'Dockerfile', 'FROM node:18\nRUN npm install\n');
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('digest') || f.message.includes('node:18'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
    });

    it('PASS for SHA256 digest pinning', async () => {
      writeFixture(tmpDir, 'Dockerfile', 'FROM node@sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789\nRUN npm install\n');
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.file === 'Dockerfile' && f.severity === Severity.PASS);
      expect(f).toBeDefined();
    });

    it('handles multi-stage builds', async () => {
      writeFixture(tmpDir, 'Dockerfile', [
        'FROM node:18 AS builder',
        'RUN npm install',
        'FROM nginx:latest',
        'COPY --from=builder /app /usr/share/nginx/html',
      ].join('\n'));
      const findings = await scanner.run(createContext(tmpDir));
      // Should flag both: node:18 (no digest) and nginx:latest
      expect(findings.filter((f) => f.file === 'Dockerfile' && f.severity !== Severity.PASS).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GitHub Actions workflow scanning', () => {
    it('flags uses: without @ version as CRITICAL', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('actions/checkout') && !f.message.includes('@'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
    });

    it('flags @main as CRITICAL', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('@main'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
    });

    it('flags @master as CRITICAL', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('@master'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
    });

    it('PASS for SHA pinning', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('actions/checkout') && f.severity === Severity.PASS);
      expect(f).toBeDefined();
    });

    it('PASS for semver pinning', async () => {
      writeFixture(tmpDir, '.github/workflows/ci.yml', `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.1.0
`);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.message.includes('actions/checkout') && f.severity === Severity.PASS);
      expect(f).toBeDefined();
    });

    it('WARNING for major-only version (e.g., @v4)', async () => {
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
      const f = findings.find((f) => f.message.includes('actions/checkout') && f.message.includes('@v4'));
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
    });
  });

  describe('no dependency files', () => {
    it('returns empty findings when no Dockerfiles or workflows exist', async () => {
      writeFixture(tmpDir, 'README.md', '# Hello\n');
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });
  });

  describe('finding structure', () => {
    it('creates findings with required fields', async () => {
      writeFixture(tmpDir, 'Dockerfile', 'FROM node:latest\n');
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('dep-pinning-docker');
      expect(f.pillar).toBe(Pillar.SECURITY);
      expect(f.category).toBe('dependency-pinning');
      expect(f.suggestion).toBeDefined();
    });
  });
});
