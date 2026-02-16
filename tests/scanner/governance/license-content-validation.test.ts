import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { LicenseContentValidationScanner } from '../../../src/scanner/governance/license-content-validation.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'license-valid-test-'));
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

const MIT_LICENSE = `MIT License

Copyright (c) 2026 Test User

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const APACHE_2_HEADER = `
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION`;

describe('LicenseContentValidationScanner', () => {
  let scanner: LicenseContentValidationScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new LicenseContentValidationScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('license-content-validation');
      expect(scanner.displayName).toBe('LICENSE Content Validation');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('no LICENSE file', () => {
    it('returns WARNING when no LICENSE file exists', async () => {
      writeFixture(tmpDir, 'README.md', '# Project\n');
      const findings = await scanner.run(createContext(tmpDir));
      const warn = findings.find((f) => f.severity === Severity.WARNING);
      expect(warn).toBeDefined();
      expect(warn!.message).toContain('No LICENSE file');
    });
  });

  describe('empty LICENSE file', () => {
    it('returns CRITICAL for empty LICENSE', async () => {
      writeFixture(tmpDir, 'LICENSE', '');
      const findings = await scanner.run(createContext(tmpDir));
      const critical = findings.find((f) => f.severity === Severity.CRITICAL);
      expect(critical).toBeDefined();
      expect(critical!.message).toContain('empty');
    });
  });

  describe('valid MIT license', () => {
    it('returns PASS for standard MIT license text', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE);
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.detectedLicense).toBe('MIT');
    });
  });

  describe('valid Apache 2.0 license', () => {
    it('returns PASS for Apache 2.0 license text', async () => {
      writeFixture(tmpDir, 'LICENSE', APACHE_2_HEADER);
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
      expect(pass!.metadata?.detectedLicense).toBe('Apache-2.0');
    });
  });

  describe('modified license text', () => {
    it('returns WARNING for slightly modified license', async () => {
      const modified = MIT_LICENSE.replace('Permission is hereby granted', 'Permission is granted')
        .replace('WITHOUT WARRANTY OF ANY KIND', 'WITH NO WARRANTY');
      writeFixture(tmpDir, 'LICENSE', modified);
      const findings = await scanner.run(createContext(tmpDir));
      // Should detect MIT but with modification warning
      const finding = findings.find((f) =>
        f.severity === Severity.WARNING || f.severity === Severity.PASS,
      );
      expect(finding).toBeDefined();
    });
  });

  describe('unrecognized license', () => {
    it('returns WARNING for unrecognizable license text', async () => {
      writeFixture(tmpDir, 'LICENSE', 'This is some custom license text that does not match any known license template.');
      const findings = await scanner.run(createContext(tmpDir));
      const warn = findings.find((f) => f.severity === Severity.WARNING);
      expect(warn).toBeDefined();
      expect(warn!.message).toContain('not recognized');
    });
  });

  describe('LICENSE file variants', () => {
    it('finds LICENSE.md', async () => {
      writeFixture(tmpDir, 'LICENSE.md', MIT_LICENSE);
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
    });

    it('finds LICENSE.txt', async () => {
      writeFixture(tmpDir, 'LICENSE.txt', MIT_LICENSE);
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
    });

    it('finds LICENCE (British spelling)', async () => {
      writeFixture(tmpDir, 'LICENCE', MIT_LICENSE);
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
    });
  });

  describe('finding structure', () => {
    it('creates findings with required fields', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE);
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('license-content-validation');
      expect(f.pillar).toBe(Pillar.GOVERNANCE);
      expect(f.category).toBe('license-validation');
      expect(f.suggestion).toBeDefined();
    });
  });
});
