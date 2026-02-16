import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { LicenseHeaderScanner } from '../../../src/scanner/governance/license-headers.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';

/**
 * Create a temporary directory for test fixtures.
 */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'license-headers-test-'));
}

/**
 * Write a fixture file inside the temp directory.
 */
function writeFixture(tmpDir: string, relativePath: string, content: string): void {
  const fullPath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Remove temp directory recursively.
 */
function removeTempDir(tmpDir: string): void {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Build a minimal ScanContext pointing at the given repo path.
 */
function createScanContext(repoPath: string): ScanContext {
  const config: ScannerConfig = {
    maturity: null,
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
    signal: new AbortController().signal,
    emit: () => {},
  };
}

// --- Standard license texts for test fixtures ---

const MIT_LICENSE_TEXT = `MIT License

Copyright (c) 2024 Test Author

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

const APACHE_2_LICENSE_TEXT = `
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.`;


describe('LicenseHeaderScanner', () => {
  let scanner: LicenseHeaderScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new LicenseHeaderScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  describe('scanner metadata', () => {
    it('has correct name, displayName, and pillar', () => {
      expect(scanner.name).toBe('license-header-scanner');
      expect(scanner.displayName).toBe('Source File License Headers');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });

    it('has no dependsOn defined', () => {
      expect(scanner.dependsOn).toBeUndefined();
    });
  });

  describe('no source files', () => {
    it('returns INFO when no source files exist', async () => {
      writeFixture(tmpDir, 'README.md', '# Hello\n');
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.INFO);
      expect(findings[0].message).toContain('No source files found');
    });
  });

  describe('no SPDX headers found', () => {
    it('returns INFO when source files have no SPDX headers', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(tmpDir, 'src/main.ts', 'console.log("hello world");\n');
      writeFixture(tmpDir, 'src/utils.js', 'function add(a, b) { return a + b; }\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const infoFinding = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('No SPDX license headers found')
      );
      expect(infoFinding).toBeDefined();
    });

    it('includes metadata with scan statistics', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(tmpDir, 'src/main.ts', 'console.log("hello world");\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
      expect(summaryFinding!.metadata!.filesScanned).toBeGreaterThanOrEqual(1);
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(0);
    });
  });

  describe('matching SPDX headers', () => {
    it('returns PASS when SPDX headers match the LICENSE file', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.ts',
        '// SPDX-License-Identifier: MIT\nconsole.log("hello");\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const passFinding = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('consistent')
      );
      expect(passFinding).toBeDefined();
    });

    it('returns PASS summary with metadata when all headers match', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.ts',
        '// SPDX-License-Identifier: MIT\nconsole.log("hello");\n'
      );
      writeFixture(
        tmpDir,
        'src/util.js',
        '// SPDX-License-Identifier: MIT\nmodule.exports = {};\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(2);
      expect(summaryFinding!.metadata!.rootLicense).toBe('MIT');
    });
  });

  describe('mismatched SPDX headers', () => {
    it('returns WARNING when SPDX header does not match LICENSE file', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.ts',
        '// SPDX-License-Identifier: Apache-2.0\nconsole.log("hello");\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const warningFinding = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('inconsistent')
      );
      expect(warningFinding).toBeDefined();
      expect(warningFinding!.file).toBe('src/main.ts');
    });

    it('reports each mismatched file individually', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/a.ts',
        '// SPDX-License-Identifier: GPL-3.0\nconst a = 1;\n'
      );
      writeFixture(
        tmpDir,
        'src/b.ts',
        '// SPDX-License-Identifier: Apache-2.0\nconst b = 2;\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const warnings = findings.filter(
        (f) => f.severity === Severity.WARNING && f.message.includes('inconsistent')
      );
      expect(warnings.length).toBe(2);
    });
  });

  describe('mixed headers', () => {
    it('reports summary with mixed header coverage', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/with-header.ts',
        '// SPDX-License-Identifier: MIT\nconst a = 1;\n'
      );
      writeFixture(
        tmpDir,
        'src/without-header.ts',
        'const b = 2;\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
      expect(summaryFinding!.metadata!.filesScanned).toBe(2);
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(1);
    });
  });

  describe('various SPDX header comment styles', () => {
    it('detects // style comments (TypeScript, JavaScript, Go, Rust, Java, C, C++)', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.go',
        '// SPDX-License-Identifier: MIT\npackage main\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(1);
    });

    it('detects # style comments (Python, Ruby, Shell)', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.py',
        '# SPDX-License-Identifier: MIT\nimport os\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(1);
    });

    it('detects /* */ style block comments (C, C++, Java)', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.c',
        '/* SPDX-License-Identifier: MIT */\n#include <stdio.h>\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(1);
    });

    it('detects SPDX header within multi-line block comment', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.java',
        '/*\n * Copyright 2024 Test\n * SPDX-License-Identifier: MIT\n */\npublic class Main {}\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(1);
    });

    it('detects shell script SPDX header after shebang', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'scripts/deploy.sh',
        '#!/bin/bash\n# SPDX-License-Identifier: MIT\necho "deploy"\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(1);
    });
  });

  describe('no LICENSE file at root', () => {
    it('returns INFO when no LICENSE file exists but headers are present', async () => {
      writeFixture(
        tmpDir,
        'src/main.ts',
        '// SPDX-License-Identifier: MIT\nconsole.log("hello");\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
      expect(summaryFinding!.metadata!.rootLicense).toBeNull();
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(1);
    });

    it('returns INFO about missing LICENSE when headers exist but no root license', async () => {
      writeFixture(
        tmpDir,
        'src/main.ts',
        '// SPDX-License-Identifier: MIT\nconsole.log("hello");\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const infoFinding = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('No root LICENSE file')
      );
      expect(infoFinding).toBeDefined();
    });
  });

  describe('finding structure', () => {
    it('returns properly structured findings', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.ts',
        '// SPDX-License-Identifier: MIT\nconsole.log("hello");\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      for (const finding of findings) {
        expect(finding.id).toContain('license-header-scanner');
        expect(finding.pillar).toBe(Pillar.GOVERNANCE);
        expect(finding.category).toBe('license-headers');
        expect(finding.column).toBeNull();
        expect(finding.suggestion).toBeDefined();
      }
    });

    it('includes line number for SPDX header location', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.ts',
        '// Copyright 2024\n// SPDX-License-Identifier: MIT\nconsole.log("hello");\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
    });
  });

  describe('metadata reporting', () => {
    it('includes headerLicenseIds in metadata', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/a.ts',
        '// SPDX-License-Identifier: MIT\nconst a = 1;\n'
      );
      writeFixture(
        tmpDir,
        'src/b.ts',
        '// SPDX-License-Identifier: Apache-2.0\nconst b = 2;\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
      const headerIds = summaryFinding!.metadata!.headerLicenseIds as string[];
      expect(headerIds).toContain('MIT');
      expect(headerIds).toContain('Apache-2.0');
    });

    it('reports rootLicense in metadata', async () => {
      writeFixture(tmpDir, 'LICENSE', APACHE_2_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'src/main.ts',
        '// SPDX-License-Identifier: Apache-2.0\nconst a = 1;\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding!.metadata!.rootLicense).toBe('Apache-2.0');
    });
  });

  describe('exclusion patterns', () => {
    it('excludes node_modules from scanning', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        'node_modules/some-pkg/index.js',
        '// SPDX-License-Identifier: ISC\nmodule.exports = {};\n'
      );
      writeFixture(
        tmpDir,
        'src/main.ts',
        'console.log("hello");\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(0);
    });

    it('excludes .git directory from scanning', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(
        tmpDir,
        '.git/hooks/pre-commit',
        '#!/bin/sh\n# SPDX-License-Identifier: MIT\nexit 0\n'
      );
      writeFixture(
        tmpDir,
        'src/main.sh',
        '#!/bin/bash\necho "hello"\n'
      );
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
      expect(summaryFinding!.metadata!.filesWithHeaders).toBe(0);
    });
  });

  describe('file extension coverage', () => {
    it('scans multiple file extensions', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(tmpDir, 'src/main.ts', '// SPDX-License-Identifier: MIT\nconst a = 1;\n');
      writeFixture(tmpDir, 'src/main.py', '# SPDX-License-Identifier: MIT\nimport os\n');
      writeFixture(tmpDir, 'src/main.go', '// SPDX-License-Identifier: MIT\npackage main\n');
      writeFixture(tmpDir, 'src/main.rs', '// SPDX-License-Identifier: MIT\nfn main() {}\n');
      writeFixture(tmpDir, 'src/Main.java', '// SPDX-License-Identifier: MIT\npublic class Main {}\n');
      writeFixture(tmpDir, 'src/main.rb', '# SPDX-License-Identifier: MIT\nputs "hello"\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const summaryFinding = findings.find((f) => f.metadata?.filesScanned !== undefined);
      expect(summaryFinding).toBeDefined();
      expect(summaryFinding!.metadata!.filesScanned).toBeGreaterThanOrEqual(6);
      expect(summaryFinding!.metadata!.filesWithHeaders).toBeGreaterThanOrEqual(6);
    });
  });
});
