import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { LicenseCompatibilityScanner } from '../../../src/scanner/governance/license-compatibility.js';
import {
  Pillar,
  Severity,
  MaturityLevel,
  ScanDepth,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'license-compat-test-'));
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

describe('LicenseCompatibilityScanner', () => {
  let scanner: LicenseCompatibilityScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new LicenseCompatibilityScanner();
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanner metadata', () => {
    it('has correct name, display name, and pillar', () => {
      expect(scanner.name).toBe('license-compatibility');
      expect(scanner.displayName).toBe('License Compatibility Analysis');
      expect(scanner.pillar).toBe(Pillar.GOVERNANCE);
    });
  });

  describe('no license or dependencies', () => {
    it('returns INFO when no LICENSE file found', async () => {
      writeFixture(tmpDir, 'README.md', '# Test\n');
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find((f) => f.severity === Severity.INFO);
      expect(info).toBeDefined();
    });
  });

  describe('MIT project with permissive deps', () => {
    it('returns PASS when all deps are compatible', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find((f) => f.severity === Severity.PASS);
      expect(pass).toBeDefined();
    });
  });

  describe('MIT project with copyleft dep', () => {
    it('returns CRITICAL when copyleft dependency in permissive project', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'gpl-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/gpl-pkg/package.json',
        JSON.stringify({ name: 'gpl-pkg', license: 'GPL-3.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const critical = findings.find((f) => f.severity === Severity.CRITICAL);
      expect(critical).toBeDefined();
      expect(critical!.message).toContain('copyleft');
    });
  });

  describe('MIT project with weak copyleft dep', () => {
    it('returns WARNING for weak copyleft (LGPL/MPL) in permissive project', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'lgpl-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lgpl-pkg/package.json',
        JSON.stringify({ name: 'lgpl-pkg', license: 'LGPL-3.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const warn = findings.find(
        (f) => f.severity === Severity.WARNING && f.message.includes('weak copyleft'),
      );
      expect(warn).toBeDefined();
    });
  });

  describe('GPL project with GPL dep', () => {
    it('returns PASS for compatible copyleft licenses', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'GNU GENERAL PUBLIC LICENSE\nVersion 3\n29 June 2007',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'gpl-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/gpl-pkg/package.json',
        JSON.stringify({ name: 'gpl-pkg', license: 'GPL-3.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('gpl-pkg'),
      );
      expect(pass).toBeDefined();
    });
  });

  describe('Apache project with attribution check', () => {
    it('returns INFO when Apache dep requires NOTICE but no NOTICE file', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'apache-pkg': '^2.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/apache-pkg/package.json',
        JSON.stringify({ name: 'apache-pkg', license: 'Apache-2.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      // Apache in MIT project is compatible but needs NOTICE
      const info = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('NOTICE'),
      );
      expect(info).toBeDefined();
    });
  });

  describe('finding structure', () => {
    it('creates findings with all required fields', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.length).toBeGreaterThan(0);
      const f = findings[0];
      expect(f.id).toContain('license-compatibility');
      expect(f.pillar).toBe(Pillar.GOVERNANCE);
      expect(f.category).toBe('license-compatibility');
      expect(f.suggestion).toBeDefined();
    });
  });

  describe('detectProjectLicense — additional license types', () => {
    it('detects GPL-2.0 from VERSION 2 GPL license text', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'GNU GENERAL PUBLIC LICENSE\nVersion 2, June 1991',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'gpl-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/gpl-pkg/package.json',
        JSON.stringify({ name: 'gpl-pkg', license: 'GPL-2.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      // GPL-2.0 project, GPL-2.0 dep — compatible
      expect(findings.some((f) => f.severity === Severity.PASS)).toBe(true);
    });

    it('detects LGPL-3.0 from LESSER GENERAL PUBLIC LICENSE text', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'GNU LESSER GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'mit-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/mit-pkg/package.json',
        JSON.stringify({ name: 'mit-pkg', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('LGPL-3.0'))).toBe(true);
    });

    it('detects BSD-3-Clause from BSD 3-Clause license text', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'BSD 3-Clause License\nCopyright (c) 2024',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'isc-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/isc-pkg/package.json',
        JSON.stringify({ name: 'isc-pkg', license: 'ISC' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('BSD-3-Clause'))).toBe(true);
    });

    it('detects BSD-2-Clause from BSD 2-Clause license text', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'BSD 2-Clause License\nCopyright (c) 2024',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'isc-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/isc-pkg/package.json',
        JSON.stringify({ name: 'isc-pkg', license: 'ISC' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('BSD-2-Clause'))).toBe(true);
    });

    it('detects ISC from ISC License text', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'ISC License\nCopyright (c) 2024',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'mit-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/mit-pkg/package.json',
        JSON.stringify({ name: 'mit-pkg', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('ISC'))).toBe(true);
    });

    it('detects MPL-2.0 from Mozilla Public License text', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'Mozilla Public License Version 2.0',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'mit-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/mit-pkg/package.json',
        JSON.stringify({ name: 'mit-pkg', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('MPL-2.0'))).toBe(true);
    });

    it('returns INFO when license file content is not a recognized license', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'This is a custom proprietary license with no standard identifier.',
      );
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('not identified'),
      );
      expect(info).toBeDefined();
    });
  });

  describe('missing or broken package.json', () => {
    it('returns INFO when no package.json exists (no deps to check)', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      // No package.json written
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('no installed dependencies'),
      );
      expect(info).toBeDefined();
    });

    it('returns INFO when package.json has no dependencies field', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(tmpDir, 'package.json', JSON.stringify({ name: 'test', version: '1.0.0' }));
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('no installed dependencies'),
      );
      expect(info).toBeDefined();
    });

    it('returns INFO when package.json contains invalid JSON', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(tmpDir, 'package.json', '{ this is not valid json !!!');
      const findings = await scanner.run(createContext(tmpDir));
      const info = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('no installed dependencies'),
      );
      expect(info).toBeDefined();
    });

    it('skips deps that are listed in package.json but not installed in node_modules', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'missing-pkg': '^1.0.0' } }),
      );
      // node_modules/missing-pkg is NOT written
      const findings = await scanner.run(createContext(tmpDir));
      // All deps were skipped, so we get the "no installed dependencies" or "all compatible" message
      const infoOrPass = findings.find(
        (f) => f.severity === Severity.INFO || f.severity === Severity.PASS,
      );
      expect(infoOrPass).toBeDefined();
    });
  });

  describe('Apache dep with NOTICE file present', () => {
    it('emits only PASS (no NOTICE INFO) when NOTICE file already exists', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(tmpDir, 'NOTICE', 'Attributions for included components.');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'apache-pkg': '^2.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/apache-pkg/package.json',
        JSON.stringify({ name: 'apache-pkg', license: 'Apache-2.0' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      const noticeInfo = findings.find(
        (f) => f.severity === Severity.INFO && f.message.includes('NOTICE'),
      );
      expect(noticeInfo).toBeUndefined();
      expect(findings.some((f) => f.severity === Severity.PASS)).toBe(true);
    });
  });

  describe('dep with null license field', () => {
    it('skips deps whose package.json has no license field', async () => {
      writeFixture(tmpDir, 'LICENSE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'no-license-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/no-license-pkg/package.json',
        JSON.stringify({ name: 'no-license-pkg' }), // no license field
      );
      const findings = await scanner.run(createContext(tmpDir));
      // dep is skipped, findings.length === 0 → summary PASS
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('All dependencies'),
      );
      expect(pass).toBeDefined();
    });
  });

  describe('dep with unknown/unrecognized license', () => {
    it('emits PASS for a dep with an unrecognized license identifier in a non-permissive project', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'GNU GENERAL PUBLIC LICENSE\nVersion 3\n29 June 2007',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { 'custom-pkg': '^1.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/custom-pkg/package.json',
        JSON.stringify({ name: 'custom-pkg', license: 'LicenseRef-SomeCustom' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      // Unknown license in a non-permissive project falls through to PASS
      const pass = findings.find(
        (f) => f.severity === Severity.PASS && f.message.includes('custom-pkg'),
      );
      expect(pass).toBeDefined();
    });
  });

  describe('LICENSE.md and alternate filename support', () => {
    it('reads license from LICENSE.md when no LICENSE file exists', async () => {
      writeFixture(tmpDir, 'LICENSE.md', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('MIT'))).toBe(true);
    });

    it('reads license from LICENCE (British spelling) when no other license file exists', async () => {
      writeFixture(tmpDir, 'LICENCE', 'MIT License\nPermission is hereby granted, free of charge');
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('MIT'))).toBe(true);
    });
  });

  describe('Apache-2.0 project license', () => {
    it('detects Apache-2.0 project license and checks deps', async () => {
      writeFixture(
        tmpDir,
        'LICENSE',
        'Apache License\nVersion 2.0, January 2004',
      );
      writeFixture(
        tmpDir,
        'package.json',
        JSON.stringify({ name: 'test', dependencies: { lodash: '^4.0.0' } }),
      );
      writeFixture(
        tmpDir,
        'node_modules/lodash/package.json',
        JSON.stringify({ name: 'lodash', license: 'MIT' }),
      );
      const findings = await scanner.run(createContext(tmpDir));
      expect(findings.some((f) => f.message.includes('Apache-2.0'))).toBe(true);
    });
  });
});
