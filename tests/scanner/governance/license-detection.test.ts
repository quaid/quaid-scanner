import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { LicenseDetectionScanner } from '../../../src/scanner/governance/license-detection.js';
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'license-detection-test-'));
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

// --- Standard license texts for use in tests ---
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

const GPL3_LICENSE_TEXT = `                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

                            Preamble

  The GNU General Public License is a free, copyleft license for
software and other kinds of works.`;

const GPL2_LICENSE_TEXT = `                    GNU GENERAL PUBLIC LICENSE
                       Version 2, June 1991

 Copyright (C) 1989, 1991 Free Software Foundation, Inc.
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

                            Preamble

  The licenses for most software are designed to take away your
freedom to share and change it.  By contrast, the GNU General Public
License is intended to guarantee your freedom to share and change free
software--to make sure the software is free for all its users.`;

const BSD3_LICENSE_TEXT = `BSD 3-Clause License

Copyright (c) 2024, Test Author

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED.`;

const BSD2_LICENSE_TEXT = `BSD 2-Clause License

Copyright (c) 2024, Test Author

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED.`;

const ISC_LICENSE_TEXT = `ISC License

Copyright (c) 2024, Test Author

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS.`;

const MPL2_LICENSE_TEXT = `Mozilla Public License Version 2.0
==================================

1. Definitions
--------------

1.1. "Contributor"
    means each individual or legal entity that creates, contributes to
    the creation of, or owns Covered Software.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.`;

const UNLICENSE_TEXT = `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors.`;

const LGPL3_LICENSE_TEXT = `                   GNU LESSER GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

  This version of the GNU Lesser General Public License incorporates
the terms and conditions of version 3 of the GNU General Public
License, supplemented by the additional permissions listed below.`;

const AGPL3_LICENSE_TEXT = `                    GNU AFFERO GENERAL PUBLIC LICENSE
                       Version 3, 19 November 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

                            Preamble

  The GNU Affero General Public License is a free, copyleft license for
software and other kinds of works, specifically designed to ensure
cooperation with the community in the case of network server software.`;

const CC0_LICENSE_TEXT = `Creative Commons Legal Code

CC0 1.0 Universal

    CREATIVE COMMONS CORPORATION IS NOT A LAW FIRM AND DOES NOT PROVIDE
    LEGAL SERVICES. DISTRIBUTION OF THIS DOCUMENT DOES NOT CREATE AN
    ATTORNEY-CLIENT RELATIONSHIP.

Statement of Purpose

The laws of most jurisdictions throughout the world automatically confer
exclusive Copyright and Related Rights (defined below) upon the creator and
subsequent owner(s) (each and all, an "owner") of an original work of
authorship and/or a database (each, a "Work").`;


describe('LicenseDetectionScanner', () => {
  let scanner: LicenseDetectionScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new LicenseDetectionScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  describe('scanner metadata', () => {
    it('has correct name, displayName, and pillar', () => {
      expect(scanner.name).toBe('license-detection-scanner');
      expect(scanner.displayName).toBe('License Detection & Identification');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });

    it('has no dependencies', () => {
      expect(scanner.dependsOn).toBeUndefined();
    });
  });

  describe('missing license detection', () => {
    it('returns CRITICAL finding when no license file or package metadata exists', async () => {
      writeFixture(tmpDir, 'README.md', '# Hello World\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.CRITICAL);
      expect(findings[0].pillar).toBe(Pillar.GOVERNANCE);
      expect(findings[0].category).toBe('license');
      expect(findings[0].message).toContain('No license detected');
      expect(findings[0].file).toBeNull();
    });

    it('returns CRITICAL finding when repo directory is completely empty', async () => {
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.CRITICAL);
      expect(findings[0].message).toContain('No license detected');
    });
  });

  describe('LICENSE file detection', () => {
    it('detects LICENSE file (no extension)', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
      expect(findings[0].file).toBe('LICENSE');
      expect(findings[0].metadata?.licenseId).toBe('MIT');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('detects LICENSE.md file', async () => {
      writeFixture(tmpDir, 'LICENSE.md', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
      expect(findings[0].file).toBe('LICENSE.md');
      expect(findings[0].metadata?.licenseId).toBe('MIT');
    });

    it('detects LICENSE.txt file', async () => {
      writeFixture(tmpDir, 'LICENSE.txt', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
      expect(findings[0].file).toBe('LICENSE.txt');
    });

    it('detects COPYING file', async () => {
      writeFixture(tmpDir, 'COPYING', GPL3_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
      expect(findings[0].file).toBe('COPYING');
      expect(findings[0].metadata?.licenseId).toBe('GPL-3.0');
    });

    it('detects license file with lowercase naming', async () => {
      writeFixture(tmpDir, 'license', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
      expect(findings[0].metadata?.licenseId).toBe('MIT');
    });

    it('detects license.md with lowercase naming', async () => {
      writeFixture(tmpDir, 'license.md', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
    });
  });

  describe('SPDX license identification by content', () => {
    it('identifies MIT license', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('MIT');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(90);
    });

    it('identifies Apache-2.0 license', async () => {
      writeFixture(tmpDir, 'LICENSE', APACHE_2_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('Apache-2.0');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(90);
    });

    it('identifies GPL-3.0 license', async () => {
      writeFixture(tmpDir, 'LICENSE', GPL3_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('GPL-3.0');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(85);
    });

    it('identifies GPL-2.0 license', async () => {
      writeFixture(tmpDir, 'LICENSE', GPL2_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('GPL-2.0');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(85);
    });

    it('identifies BSD-3-Clause license', async () => {
      writeFixture(tmpDir, 'LICENSE', BSD3_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('BSD-3-Clause');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('identifies BSD-2-Clause license', async () => {
      writeFixture(tmpDir, 'LICENSE', BSD2_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('BSD-2-Clause');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(75);
    });

    it('identifies ISC license', async () => {
      writeFixture(tmpDir, 'LICENSE', ISC_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('ISC');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(85);
    });

    it('identifies MPL-2.0 license', async () => {
      writeFixture(tmpDir, 'LICENSE', MPL2_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('MPL-2.0');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(85);
    });

    it('identifies Unlicense', async () => {
      writeFixture(tmpDir, 'LICENSE', UNLICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('Unlicense');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(85);
    });

    it('identifies LGPL-3.0 license', async () => {
      writeFixture(tmpDir, 'LICENSE', LGPL3_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('LGPL-3.0');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(85);
    });

    it('identifies AGPL-3.0 license', async () => {
      writeFixture(tmpDir, 'LICENSE', AGPL3_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('AGPL-3.0');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(85);
    });

    it('identifies CC0-1.0 license', async () => {
      writeFixture(tmpDir, 'LICENSE', CC0_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('CC0-1.0');
      expect(findings[0].metadata?.confidence).toBeGreaterThanOrEqual(85);
    });

    it('reports unknown license when content does not match known licenses', async () => {
      writeFixture(tmpDir, 'LICENSE', 'Some custom proprietary license text.\nDo not use.\n');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
      expect(findings[0].metadata?.licenseId).toBe('UNKNOWN');
      expect(findings[0].message).toContain('unrecognized');
    });
  });

  describe('package.json license field', () => {
    it('reads license from package.json when no LICENSE file exists', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        name: 'test-pkg',
        version: '1.0.0',
        license: 'MIT',
      }, null, 2));
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
      expect(findings[0].metadata?.licenseId).toBe('MIT');
      expect(findings[0].metadata?.source).toBe('package.json');
      expect(findings[0].file).toBe('package.json');
    });

    it('reads SPDX expression from package.json license field', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        name: 'test-pkg',
        version: '1.0.0',
        license: 'Apache-2.0',
      }, null, 2));
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('Apache-2.0');
    });

    it('prefers LICENSE file over package.json', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        name: 'test-pkg',
        version: '1.0.0',
        license: 'Apache-2.0',
      }, null, 2));
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].metadata?.licenseId).toBe('MIT');
      expect(findings[0].file).toBe('LICENSE');
    });

    it('handles package.json without license field', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        name: 'test-pkg',
        version: '1.0.0',
      }, null, 2));
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.CRITICAL);
      expect(findings[0].message).toContain('No license detected');
    });

    it('handles invalid JSON in package.json gracefully', async () => {
      writeFixture(tmpDir, 'package.json', '{ invalid json }');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.CRITICAL);
      expect(findings[0].message).toContain('No license detected');
    });
  });

  describe('pyproject.toml license field', () => {
    it('reads license from pyproject.toml when no LICENSE file exists', async () => {
      writeFixture(tmpDir, 'pyproject.toml', `[project]\nname = "test-pkg"\nversion = "1.0.0"\nlicense = {text = "MIT"}\n`);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
      expect(findings[0].metadata?.licenseId).toBe('MIT');
      expect(findings[0].metadata?.source).toBe('pyproject.toml');
      expect(findings[0].file).toBe('pyproject.toml');
    });

    it('reads license from pyproject.toml with simple string format', async () => {
      writeFixture(tmpDir, 'pyproject.toml', `[project]\nname = "test-pkg"\nversion = "1.0.0"\nlicense = "Apache-2.0"\n`);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('Apache-2.0');
    });

    it('prefers LICENSE file over pyproject.toml', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      writeFixture(tmpDir, 'pyproject.toml', `[project]\nname = "test-pkg"\nversion = "1.0.0"\nlicense = "Apache-2.0"\n`);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('MIT');
      expect(findings[0].file).toBe('LICENSE');
    });

    it('handles pyproject.toml without license field', async () => {
      writeFixture(tmpDir, 'pyproject.toml', `[project]\nname = "test-pkg"\nversion = "1.0.0"\n`);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.CRITICAL);
    });
  });

  describe('fallback priority order', () => {
    it('checks package.json before pyproject.toml when no LICENSE file exists', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        name: 'test-pkg',
        version: '1.0.0',
        license: 'MIT',
      }, null, 2));
      writeFixture(tmpDir, 'pyproject.toml', `[project]\nname = "test-pkg"\nversion = "1.0.0"\nlicense = "Apache-2.0"\n`);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('MIT');
      expect(findings[0].metadata?.source).toBe('package.json');
    });

    it('falls back to pyproject.toml when package.json has no license', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        name: 'test-pkg',
        version: '1.0.0',
      }, null, 2));
      writeFixture(tmpDir, 'pyproject.toml', `[project]\nname = "test-pkg"\nversion = "1.0.0"\nlicense = "BSD-3-Clause"\n`);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.licenseId).toBe('BSD-3-Clause');
      expect(findings[0].metadata?.source).toBe('pyproject.toml');
    });
  });

  describe('confidence scoring', () => {
    it('has high confidence for clear MIT license text', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      const confidence = findings[0].metadata?.confidence as number;
      expect(confidence).toBeGreaterThanOrEqual(90);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('has 100 confidence for SPDX identifiers from package.json', async () => {
      writeFixture(tmpDir, 'package.json', JSON.stringify({
        name: 'test-pkg',
        version: '1.0.0',
        license: 'MIT',
      }, null, 2));
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].metadata?.confidence).toBe(100);
    });
  });

  describe('finding structure', () => {
    it('returns properly structured finding for detected license', async () => {
      writeFixture(tmpDir, 'LICENSE', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      const finding = findings[0];
      expect(finding.id).toContain('license-detection-scanner');
      expect(finding.severity).toBe(Severity.PASS);
      expect(finding.pillar).toBe(Pillar.GOVERNANCE);
      expect(finding.category).toBe('license');
      expect(finding.message).toContain('MIT');
      expect(finding.file).toBe('LICENSE');
      expect(finding.line).toBeNull();
      expect(finding.column).toBeNull();
      expect(finding.suggestion).toBeDefined();
      expect(finding.metadata).toBeDefined();
      expect(finding.metadata?.licenseId).toBe('MIT');
      expect(finding.metadata?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('returns properly structured finding for missing license', async () => {
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      const finding = findings[0];
      expect(finding.id).toContain('license-detection-scanner');
      expect(finding.severity).toBe(Severity.CRITICAL);
      expect(finding.pillar).toBe(Pillar.GOVERNANCE);
      expect(finding.category).toBe('license');
      expect(finding.message).toContain('No license detected');
      expect(finding.file).toBeNull();
      expect(finding.suggestion).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty LICENSE file as unrecognized', async () => {
      writeFixture(tmpDir, 'LICENSE', '');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.WARNING);
      expect(findings[0].metadata?.licenseId).toBe('UNKNOWN');
    });

    it('handles LICENSE file with only whitespace as unrecognized', async () => {
      writeFixture(tmpDir, 'LICENSE', '   \n\n  \n  ');
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings[0].severity).toBe(Severity.WARNING);
      expect(findings[0].metadata?.licenseId).toBe('UNKNOWN');
    });

    it('handles very large LICENSE file without error', async () => {
      const largeLicense = MIT_LICENSE_TEXT + '\n' + 'x'.repeat(100000);
      writeFixture(tmpDir, 'LICENSE', largeLicense);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].metadata?.licenseId).toBe('MIT');
    });

    it('handles LICENCE spelling variant', async () => {
      writeFixture(tmpDir, 'LICENCE', MIT_LICENSE_TEXT);
      const context = createScanContext(tmpDir);

      const findings = await scanner.run(context);

      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe(Severity.PASS);
      expect(findings[0].metadata?.licenseId).toBe('MIT');
    });
  });
});
