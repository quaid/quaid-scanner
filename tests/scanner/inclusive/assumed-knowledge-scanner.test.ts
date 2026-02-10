import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AssumedKnowledgeScanner } from '../../../src/scanner/inclusive/assumed-knowledge-scanner.js';
import {
  Pillar,
  Severity,
  ScanDepth,
  MaturityLevel,
  OutputFormat,
} from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

function createContext(repoPath: string): ScanContext {
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
    pillars: {
      disabled: [],
      weights: {},
      disabledScanners: [],
    },
    bots: {
      enabled: true,
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

describe('AssumedKnowledgeScanner', () => {
  let scanner: AssumedKnowledgeScanner;
  let tmpDir: string;

  beforeEach(() => {
    scanner = new AssumedKnowledgeScanner();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'assumed-knowledge-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('has the correct name and pillar', () => {
      expect(scanner.name).toBe('assumed-knowledge-scanner');
      expect(scanner.pillar).toBe(Pillar.INCLUSIVE);
      expect(scanner.displayName).toBeDefined();
    });
  });

  describe('git operation detection', () => {
    it('detects "git clone" as assumed knowledge', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\nTo get started:\n\n```\ngit clone https://github.com/org/repo.git\n```\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const cloneFinding = findings.find(
        (f) => f.category === 'assumed-knowledge' && f.message.toLowerCase().includes('clone'),
      );
      expect(cloneFinding).toBeDefined();
      expect(cloneFinding!.severity).toBe(Severity.INFO);
      expect(cloneFinding!.file).toBe('README.md');
    });

    it('detects "fork this repo" as assumed knowledge', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'CONTRIBUTING.md'),
        '# Contributing\n\nFirst, fork this repo and then submit a PR.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const forkFinding = findings.find(
        (f) => f.category === 'assumed-knowledge' && f.message.toLowerCase().includes('fork'),
      );
      expect(forkFinding).toBeDefined();
      expect(forkFinding!.severity).toBe(Severity.INFO);
    });

    it('detects rebase as assumed knowledge', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'CONTRIBUTING.md'),
        '# Contributing\n\nPlease rebase your branch before submitting.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const rebaseFinding = findings.find(
        (f) => f.category === 'assumed-knowledge' && f.message.toLowerCase().includes('rebase'),
      );
      expect(rebaseFinding).toBeDefined();
      expect(rebaseFinding!.severity).toBe(Severity.INFO);
    });
  });

  describe('tool assumption detection', () => {
    it('detects "npm install" without prerequisites section', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n## Getting Started\n\nRun `npm install` to install dependencies.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const npmFinding = findings.find(
        (f) => f.category === 'assumed-knowledge' && f.message.toLowerCase().includes('npm'),
      );
      expect(npmFinding).toBeDefined();
      expect(npmFinding!.severity).toBe(Severity.INFO);
    });

    it('detects "pip install" without prerequisites section', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n## Setup\n\nRun `pip install -r requirements.txt`.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const pipFinding = findings.find(
        (f) => f.category === 'assumed-knowledge' && f.message.toLowerCase().includes('pip'),
      );
      expect(pipFinding).toBeDefined();
    });

    it('detects "docker run" without prerequisites section', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n## Running\n\n```\ndocker run -p 3000:3000 myapp\n```\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const dockerFinding = findings.find(
        (f) => f.category === 'assumed-knowledge' && f.message.toLowerCase().includes('docker'),
      );
      expect(dockerFinding).toBeDefined();
    });
  });

  describe('undefined acronym detection', () => {
    it('detects undefined acronym (e.g., "RBAC") as INFO', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\nThis project uses RBAC for access control.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const acronymFinding = findings.find(
        (f) => f.category === 'undefined-acronym' && f.message.includes('RBAC'),
      );
      expect(acronymFinding).toBeDefined();
      expect(acronymFinding!.severity).toBe(Severity.INFO);
    });

    it('does NOT flag known acronyms (API, URL, etc.)', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\nThis project exposes a REST API over HTTP. Use the URL to access JSON data via the CLI.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const acronymFindings = findings.filter((f) => f.category === 'undefined-acronym');
      expect(acronymFindings).toHaveLength(0);
    });

    it('only flags first occurrence of an unknown acronym', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\nWe use RBAC for security.\nRBAC is important.\nRBAC controls access.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const rbacFindings = findings.filter(
        (f) => f.category === 'undefined-acronym' && f.message.includes('RBAC'),
      );
      expect(rbacFindings).toHaveLength(1);
    });
  });

  describe('missing prerequisites section', () => {
    it('flags missing Prerequisites section when commands are present', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n## Getting Started\n\nRun `npm install` then `npm start`.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const prereqFinding = findings.find(
        (f) => f.category === 'missing-prerequisites',
      );
      expect(prereqFinding).toBeDefined();
      expect(prereqFinding!.severity).toBe(Severity.WARNING);
      expect(prereqFinding!.suggestion).toMatch(/[Pp]rerequisites/);
    });

    it('does NOT warn when Prerequisites section exists', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n## Prerequisites\n\n- Node.js 18+\n- npm 9+\n\n## Getting Started\n\nRun `npm install` then `npm start`.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const prereqFinding = findings.find(
        (f) => f.category === 'missing-prerequisites',
      );
      expect(prereqFinding).toBeUndefined();
    });

    it('does NOT warn when Requirements section exists', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\n## Requirements\n\n- Python 3.10+\n\n## Setup\n\nRun `pip install -r requirements.txt`.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const prereqFinding = findings.find(
        (f) => f.category === 'missing-prerequisites',
      );
      expect(prereqFinding).toBeUndefined();
    });
  });

  describe('empty / no findings', () => {
    it('returns empty for file with no commands or acronyms', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# My Project\n\nThis is a simple project with plain text documentation.\n\nNo special commands here.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      expect(findings).toHaveLength(0);
    });
  });

  describe('finding details', () => {
    it('reports correct file and line number', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'CONTRIBUTING.md'),
        'Line 1\nLine 2\nLine 3\ngit clone https://github.com/org/repo.git\nLine 5\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const cloneFinding = findings.find(
        (f) => f.category === 'assumed-knowledge' && f.message.toLowerCase().includes('clone'),
      );
      expect(cloneFinding).toBeDefined();
      expect(cloneFinding!.file).toBe('CONTRIBUTING.md');
      expect(cloneFinding!.line).toBe(4);
    });
  });

  describe('file scope', () => {
    it('only scans README.md, CONTRIBUTING.md, INSTALL.md, docs/getting-started.md', async () => {
      // Create a file that is NOT in the target list
      fs.writeFileSync(
        path.join(tmpDir, 'CHANGELOG.md'),
        '# Changelog\n\nRun `npm install` to get the latest.\nPlease rebase.\n',
      );

      // Also create a README with no issues
      fs.writeFileSync(
        path.join(tmpDir, 'README.md'),
        '# Project\n\nSimple readme.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      // Should NOT find anything from CHANGELOG.md since it is not in the scan list
      const changelogFindings = findings.filter((f) => f.file === 'CHANGELOG.md');
      expect(changelogFindings).toHaveLength(0);
    });

    it('scans docs/getting-started.md when present', async () => {
      fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'docs', 'getting-started.md'),
        '# Getting Started\n\nFirst, git clone the repository.\n',
      );

      const context = createContext(tmpDir);
      const findings = await scanner.run(context);

      const gsFinding = findings.find(
        (f) => f.file === 'docs/getting-started.md',
      );
      expect(gsFinding).toBeDefined();
    });
  });
});
