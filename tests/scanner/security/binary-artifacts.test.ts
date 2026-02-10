import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { BinaryArtifactScanner } from '../../../src/scanner/security/binary-artifacts.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'binary-artifacts-test-'));
}

function writeFixture(dir: string, filePath: string, content: Buffer | string): void {
  const fullPath = path.join(dir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
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

describe('BinaryArtifactScanner', () => {
  let scanner: BinaryArtifactScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new BinaryArtifactScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('binary-artifacts');
      expect(scanner.displayName).toBe('Binary Artifact Detection');
      expect(scanner.pillar).toBe(Pillar.SECURITY);
    });
  });

  describe('extension-based detection', () => {
    it('detects .exe files', async () => {
      writeFixture(tmpDir, 'app.exe', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'app.exe')).toBe(true);
    });

    it('detects .dll files', async () => {
      writeFixture(tmpDir, 'lib.dll', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'lib.dll')).toBe(true);
    });

    it('detects .so files', async () => {
      writeFixture(tmpDir, 'lib.so', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'lib.so')).toBe(true);
    });

    it('detects .jar files', async () => {
      writeFixture(tmpDir, 'app.jar', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'app.jar')).toBe(true);
    });

    it('detects .class files', async () => {
      writeFixture(tmpDir, 'Main.class', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'Main.class')).toBe(true);
    });

    it('detects .pyc files', async () => {
      writeFixture(tmpDir, '__pycache__/mod.pyc', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file?.includes('mod.pyc'))).toBe(true);
    });
  });

  describe('magic bytes detection', () => {
    it('detects MZ header (PE/exe)', async () => {
      const buf = Buffer.alloc(100);
      buf[0] = 0x4D; buf[1] = 0x5A; // MZ
      writeFixture(tmpDir, 'unknown_binary', buf);
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'unknown_binary')).toBe(true);
    });

    it('detects ELF header', async () => {
      const buf = Buffer.alloc(100);
      buf[0] = 0x7F; buf[1] = 0x45; buf[2] = 0x4C; buf[3] = 0x46; // ELF
      writeFixture(tmpDir, 'linux_binary', buf);
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'linux_binary')).toBe(true);
    });

    it('detects CAFEBABE header (Java class)', async () => {
      const buf = Buffer.alloc(100);
      buf[0] = 0xCA; buf[1] = 0xFE; buf[2] = 0xBA; buf[3] = 0xBE;
      writeFixture(tmpDir, 'JavaClass', buf);
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'JavaClass')).toBe(true);
    });

    it('detects PK header (ZIP/JAR)', async () => {
      const buf = Buffer.alloc(100);
      buf[0] = 0x50; buf[1] = 0x4B; buf[2] = 0x03; buf[3] = 0x04; // PK
      writeFixture(tmpDir, 'archive.dat', buf);
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'archive.dat')).toBe(true);
    });
  });

  describe('size-based severity', () => {
    it('CRITICAL for binaries > 1MB', async () => {
      const largeBuf = Buffer.alloc(1_100_000); // 1.1MB
      largeBuf[0] = 0x4D; largeBuf[1] = 0x5A;
      writeFixture(tmpDir, 'large.exe', largeBuf);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.file === 'large.exe');
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.CRITICAL);
    });

    it('WARNING for binaries > 100KB but <= 1MB', async () => {
      const medBuf = Buffer.alloc(200_000); // 200KB
      medBuf[0] = 0x4D; medBuf[1] = 0x5A;
      writeFixture(tmpDir, 'medium.exe', medBuf);
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.file === 'medium.exe');
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.WARNING);
    });

    it('INFO for small binaries', async () => {
      writeFixture(tmpDir, 'tiny.exe', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.file === 'tiny.exe');
      expect(f).toBeDefined();
      expect(f!.severity).toBe(Severity.INFO);
    });
  });

  describe('allowlist exclusion', () => {
    it('excludes .png files by default', async () => {
      writeFixture(tmpDir, 'icon.png', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'icon.png')).toBe(false);
    });

    it('excludes .jpg files by default', async () => {
      writeFixture(tmpDir, 'photo.jpg', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'photo.jpg')).toBe(false);
    });

    it('excludes .woff font files by default', async () => {
      writeFixture(tmpDir, 'font.woff', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file === 'font.woff')).toBe(false);
    });
  });

  describe('path exclusion', () => {
    it('excludes node_modules/', async () => {
      writeFixture(tmpDir, 'node_modules/pkg/binary.exe', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file?.includes('node_modules'))).toBe(false);
    });

    it('excludes vendor/', async () => {
      writeFixture(tmpDir, 'vendor/lib.dll', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file?.includes('vendor'))).toBe(false);
    });

    it('excludes .git/', async () => {
      writeFixture(tmpDir, '.git/objects/pack/pack.bin', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.file?.includes('.git'))).toBe(false);
    });
  });

  describe('SHA-256 hash reporting', () => {
    it('reports correct SHA-256 hash in metadata', async () => {
      const content = Buffer.from([0x4D, 0x5A, 0x00, 0x01, 0x02, 0x03]);
      writeFixture(tmpDir, 'hashed.exe', content);
      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.file === 'hashed.exe');
      expect(f).toBeDefined();
      expect(f!.metadata?.sha256).toBe(expectedHash);
    });
  });

  describe('relative path reporting', () => {
    it('reports paths relative to repo root', async () => {
      writeFixture(tmpDir, 'src/lib/binary.dll', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      const f = findings.find((f) => f.file?.includes('binary.dll'));
      expect(f).toBeDefined();
      expect(f!.file).toBe('src/lib/binary.dll');
    });
  });

  describe('clean repositories', () => {
    it('returns empty findings for repos with no binaries', async () => {
      writeFixture(tmpDir, 'src/index.ts', 'console.log("hello");\n');
      writeFixture(tmpDir, 'README.md', '# Hello\n');
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings).toHaveLength(0);
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      writeFixture(tmpDir, 'test.exe', Buffer.alloc(50));
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('binary-artifacts');
      expect(f.pillar).toBe(Pillar.SECURITY);
      expect(f.category).toBe('binary-artifacts');
      expect(f.message).toBeDefined();
      expect(f.file).toBeDefined();
      expect(f.suggestion).toBeDefined();
    });
  });
});
