/**
 * Tests for Interaction Template Validation scanner.
 *
 * Validates issue/PR template detection, YAML front matter parsing,
 * and guidance quality assessment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { InteractionTemplateScanner } from '../../../src/scanner/technical/interaction-templates.js';
import { Pillar, Severity, ScanDepth, MaturityLevel, OutputFormat } from '../../../src/types/index.js';
import type { ScanContext, ScannerConfig } from '../../../src/types/index.js';

let tmpDir: string;
let scanner: InteractionTemplateScanner;

function makeContext(overrides: Partial<ScanContext> = {}): ScanContext {
  const config: ScannerConfig = {
    maturity: MaturityLevel.INCUBATING,
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
    pillars: { disabled: [], weights: {}, disabledScanners: [] },
    bots: { enabled: true, additional: [], exclude: [] },
    inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
  };

  return {
    repoPath: tmpDir,
    repoIdentifier: 'owner/repo',
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config,
    git: { commitSha: 'abc', branch: 'main', remoteUrl: null },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-test-'));
  scanner = new InteractionTemplateScanner();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('InteractionTemplateScanner', () => {
  describe('metadata', () => {
    it('has correct scanner properties', () => {
      expect(scanner.name).toBe('interaction-templates');
      expect(scanner.displayName).toBe('Interaction Template Validation');
      expect(scanner.pillar).toBe(Pillar.TECHNICAL);
    });
  });

  describe('issue template detection', () => {
    it('WARNING when no issue templates configured', async () => {
      const findings = await scanner.run(makeContext());
      const noTemplates = findings.find((f) => f.message.includes('No issue templates'));
      expect(noTemplates).toBeDefined();
      expect(noTemplates!.severity).toBe(Severity.WARNING);
    });

    it('detects .github/ISSUE_TEMPLATE directory', async () => {
      const templateDir = path.join(tmpDir, '.github', 'ISSUE_TEMPLATE');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(
        path.join(templateDir, 'bug_report.yml'),
        `---
name: Bug Report
description: File a bug report
labels: [bug]
---
body:
  - type: textarea
    attributes:
      label: Describe the bug
`,
      );

      const findings = await scanner.run(makeContext());
      const templateFinding = findings.find((f) => f.message.includes('issue template'));
      expect(templateFinding).toBeDefined();
    });

    it('detects legacy .github/ISSUE_TEMPLATE.md', async () => {
      fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'ISSUE_TEMPLATE.md'),
        '## Bug Report\n\n**Describe the bug**\n\n**Steps to reproduce**',
      );

      const findings = await scanner.run(makeContext());
      const templateFinding = findings.find((f) => f.message.includes('issue template'));
      expect(templateFinding).toBeDefined();
    });
  });

  describe('PR template detection', () => {
    it('detects pull_request_template.md', async () => {
      fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'pull_request_template.md'),
        '## Summary\n\n## Test plan\n\n- [ ] Tests pass',
      );

      const findings = await scanner.run(makeContext());
      const prFinding = findings.find((f) => f.message.includes('PR template'));
      expect(prFinding).toBeDefined();
    });

    it('detects PULL_REQUEST_TEMPLATE directory', async () => {
      const templateDir = path.join(tmpDir, '.github', 'PULL_REQUEST_TEMPLATE');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(
        path.join(templateDir, 'default.md'),
        '## Changes\n\n## Testing',
      );

      const findings = await scanner.run(makeContext());
      const prFinding = findings.find((f) => f.message.includes('PR template'));
      expect(prFinding).toBeDefined();
    });
  });

  describe('YAML front matter validation', () => {
    it('PASS for valid YAML front matter in template', async () => {
      const templateDir = path.join(tmpDir, '.github', 'ISSUE_TEMPLATE');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(
        path.join(templateDir, 'bug.yml'),
        `---
name: Bug Report
description: Report a bug
labels: [bug, triage]
---
body:
  - type: textarea
    attributes:
      label: What happened?
`,
      );

      const findings = await scanner.run(makeContext());
      const yamlFinding = findings.find(
        (f) => f.message.includes('YAML') && f.severity === Severity.PASS,
      );
      expect(yamlFinding).toBeDefined();
    });

    it('WARNING when labels field missing from YAML', async () => {
      const templateDir = path.join(tmpDir, '.github', 'ISSUE_TEMPLATE');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(
        path.join(templateDir, 'feature.yml'),
        `---
name: Feature Request
description: Suggest a feature
---
body:
  - type: textarea
`,
      );

      const findings = await scanner.run(makeContext());
      const labelFinding = findings.find((f) => f.message.includes('labels'));
      expect(labelFinding).toBeDefined();
      expect(labelFinding!.severity).toBe(Severity.WARNING);
    });
  });

  describe('template types', () => {
    it('PASS when bug and feature templates present', async () => {
      const templateDir = path.join(tmpDir, '.github', 'ISSUE_TEMPLATE');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(
        path.join(templateDir, 'bug_report.yml'),
        '---\nname: Bug Report\ndescription: Report a bug\nlabels: [bug]\n---\n',
      );
      fs.writeFileSync(
        path.join(templateDir, 'feature_request.yml'),
        '---\nname: Feature Request\ndescription: Suggest a feature\nlabels: [enhancement]\n---\n',
      );

      const findings = await scanner.run(makeContext());
      const typeFinding = findings.find(
        (f) => f.message.includes('bug') && f.message.includes('feature'),
      );
      expect(typeFinding).toBeDefined();
      expect(typeFinding!.severity).toBe(Severity.PASS);
    });
  });

  describe('guidance quality', () => {
    it('detects templates with checkbox guidance', async () => {
      fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'pull_request_template.md'),
        '## Checklist\n\n- [ ] Tests pass\n- [ ] Docs updated\n- [ ] Changelog entry',
      );

      const findings = await scanner.run(makeContext());
      const guidanceFinding = findings.find((f) => f.metadata?.hasCheckboxes !== undefined);
      expect(guidanceFinding).toBeDefined();
      expect(guidanceFinding!.metadata?.hasCheckboxes).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles missing repo path', async () => {
      const findings = await scanner.run(makeContext({ repoPath: '/nonexistent/path' }));
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('branch coverage — uncovered paths', () => {
    it('sets allValid=false when a .yml issue template has no front matter (lines 151-152)', async () => {
      const templateDir = path.join(tmpDir, '.github', 'ISSUE_TEMPLATE');
      fs.mkdirSync(templateDir, { recursive: true });
      // .yml file with no --- front-matter block: extractFrontMatter returns null,
      // triggering the else-if branch that sets allValid = false
      fs.writeFileSync(
        path.join(templateDir, 'bad-template.yml'),
        'body:\n  - type: textarea\n    attributes:\n      label: No front matter here\n',
      );

      const findings = await scanner.run(makeContext());
      // allValid=false means we do NOT get the PASS finding for YAML front matter
      const yamlPassFinding = findings.find(
        (f) => f.message.includes('YAML front matter is valid') && f.severity === Severity.PASS,
      );
      expect(yamlPassFinding).toBeUndefined();
      // We should still get the "N issue template(s) found" info finding
      const templateFinding = findings.find((f) => f.message.includes('issue template'));
      expect(templateFinding).toBeDefined();
    });

    it('catches readFileSync error for PR template path when file is unreadable (line 206)', async () => {
      // Create a directory at the location of a known PR template path so existsSync
      // returns true, but readFileSync on a directory throws EISDIR
      const githubDir = path.join(tmpDir, '.github');
      fs.mkdirSync(githubDir, { recursive: true });
      // Make pull_request_template.md a directory — existsSync passes, readFileSync throws
      fs.mkdirSync(path.join(githubDir, 'pull_request_template.md'));

      const findings = await scanner.run(makeContext());
      // The scanner catches the error and continues — no PR template finding
      const prFinding = findings.find(
        (f) => f.message.includes('PR template found'),
      );
      expect(prFinding).toBeUndefined();
    });

    it('catches readFileSync error inside PULL_REQUEST_TEMPLATE dir when entry is unreadable (line 222)', async () => {
      // Ensure none of the root PR template paths exist
      const githubDir = path.join(tmpDir, '.github');
      fs.mkdirSync(githubDir, { recursive: true });

      // Create the PULL_REQUEST_TEMPLATE directory
      const prTemplateDir = path.join(tmpDir, '.github', 'PULL_REQUEST_TEMPLATE');
      fs.mkdirSync(prTemplateDir, { recursive: true });

      // Place a sub-directory inside it: readdirSync will return it, but
      // readFileSync on a directory entry throws EISDIR
      fs.mkdirSync(path.join(prTemplateDir, 'not-a-file.md'));

      const findings = await scanner.run(makeContext());
      // The scanner catches the error — prTemplateContent stays null, no PR finding
      const prFinding = findings.find(
        (f) => f.message.includes('PR template found'),
      );
      expect(prFinding).toBeUndefined();
    });
  });
});
