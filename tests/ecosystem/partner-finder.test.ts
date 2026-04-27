import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PartnerFinder } from '../../src/ecosystem/partner-finder.js';
import { ScanDepth, MaturityLevel, OutputFormat } from '../../src/types/index.js';
import type { EcosystemContext } from '../../src/ecosystem/types.js';
import type { ScanReport } from '../../src/types/index.js';

function makeContext(repoPath: string, overrides: Partial<EcosystemContext> = {}): EcosystemContext {
  return {
    repoPath,
    repoIdentifier: null,
    maturity: MaturityLevel.INCUBATING,
    depth: ScanDepth.STANDARD,
    config: {
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
      pillars: { disabled: [], weights: {}, disabledScanners: [] },
      bots: { enabled: true, additional: [], exclude: [] },
      inclusive: { termListUrl: null, customTerms: {}, ignoredTerms: [], excludePatterns: [] },
    },
    git: { commitSha: 'abc', branch: 'main', remoteUrl: null },
    signal: new AbortController().signal,
    emit: () => {},
    existingReport: {} as ScanReport,
    zerodbAvailable: false,
    ...overrides,
  };
}

describe('PartnerFinder', () => {
  let tmpDir: string;
  const finder = new PartnerFinder();

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function makeTmpDir(): string {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'partner-test-'));
    return tmpDir;
  }

  // -------------------------------------------------------------------------
  // No manifest files at all
  // -------------------------------------------------------------------------
  describe('empty repo (no manifest files)', () => {
    it('returns an empty array when the directory contains no known files', () => {
      const dir = makeTmpDir();
      const actors = finder.find(makeContext(dir));
      expect(actors).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // package.json — various shapes
  // -------------------------------------------------------------------------
  describe('package.json dependency parsing', () => {
    it('returns upstream actors for regular dependencies', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          dependencies: {
            express: '^4.18.0',
            lodash: '^4.17.21',
          },
        }),
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('express');
      expect(names).toContain('lodash');
      expect(actors.every((a) => a.role === 'upstream')).toBe(true);
      expect(actors.every((a) => Array.isArray(a.tags))).toBe(true);
    });

    it('includes peerDependencies', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          peerDependencies: {
            react: '^18.0.0',
          },
        }),
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('react');
    });

    it('combines dependencies and peerDependencies', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          dependencies: { axios: '^1.0.0' },
          peerDependencies: { react: '^18.0.0' },
        }),
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('axios');
      expect(names).toContain('react');
    });

    it('filters out @types/ packages', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@types/node': '^20.0.0',
            express: '^4.0.0',
          },
        }),
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).not.toContain('@types/node');
      expect(names).toContain('express');
    });

    it('filters out eslint packages', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          dependencies: {
            'eslint-config-prettier': '^9.0.0',
            vitest: '^1.0.0',
          },
        }),
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).not.toContain('eslint-config-prettier');
      expect(names).toContain('vitest');
    });

    it('filters out @typescript packages', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@typescript-eslint/parser': '^6.0.0',
            zod: '^3.0.0',
          },
        }),
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).not.toContain('@typescript-eslint/parser');
      expect(names).toContain('zod');
    });

    it('caps at 8 notable dependencies', () => {
      const dir = makeTmpDir();
      const deps: Record<string, string> = {};
      for (let i = 0; i < 15; i++) {
        deps[`package-${i}`] = '^1.0.0';
      }
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: deps }));
      const actors = finder.find(makeContext(dir));
      expect(actors.filter((a) => a.role === 'upstream').length).toBeLessThanOrEqual(8);
    });

    it('handles package.json with no dependencies or peerDependencies keys', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'my-pkg', version: '1.0.0' }),
      );
      const actors = finder.find(makeContext(dir));
      expect(actors).toEqual([]);
    });

    it('returns empty array when package.json contains malformed JSON', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(path.join(dir, 'package.json'), '{ not valid json !!!');
      const actors = finder.find(makeContext(dir));
      expect(actors).toEqual([]);
    });

    it('sets correct upstream actor shape', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.0.0' } }),
      );
      const actors = finder.find(makeContext(dir));
      const actor = actors[0];
      expect(actor.role).toBe('upstream');
      expect(actor.repoUrl).toBeNull();
      expect(actor.similarityScore).toBeNull();
      expect(actor.tags).toContain('dependency');
      expect(actor.rationale).toMatch(/manifest/i);
    });
  });

  // -------------------------------------------------------------------------
  // requirements.txt — Python deps
  // -------------------------------------------------------------------------
  describe('requirements.txt parsing', () => {
    it('detects Python dependencies', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'requirements.txt'),
        'requests>=2.28.0\nflask==2.3.0\npytest\n',
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('requests');
      expect(names).toContain('flask');
      expect(names).toContain('pytest');
    });

    it('strips version specifiers and comments (semicolons)', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'requirements.txt'),
        'Django>=3.2; python_version>="3.8"\nnumpy<2.0\n',
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('Django');
      expect(names).toContain('numpy');
    });

    it('ignores blank lines in requirements.txt', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(path.join(dir, 'requirements.txt'), '\n\nrequests\n\n');
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('requests');
    });

    it('returns empty when requirements.txt does not exist', () => {
      const dir = makeTmpDir();
      // No requirements.txt present
      const actors = finder.find(makeContext(dir));
      expect(actors).toEqual([]);
    });

    it('returns empty when requirements.txt is empty', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(path.join(dir, 'requirements.txt'), '');
      const actors = finder.find(makeContext(dir));
      expect(actors).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // go.mod — Go modules
  // -------------------------------------------------------------------------
  describe('go.mod parsing', () => {
    it('detects Go module dependencies from require block', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'go.mod'),
        [
          'module github.com/myorg/myproject',
          '',
          'go 1.21',
          '',
          'require (',
          '\tgithub.com/gin-gonic/gin v1.9.1',
          '\tgithub.com/stretchr/testify v1.8.4',
          ')',
        ].join('\n'),
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('github.com/gin-gonic/gin');
      expect(names).toContain('github.com/stretchr/testify');
    });

    it('handles single-line require statement', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'go.mod'),
        [
          'module example.com/mymod',
          '',
          'go 1.20',
          '',
          'require github.com/pkg/errors v0.9.1',
        ].join('\n'),
      );
      const actors = finder.find(makeContext(dir));
      // single-line "require X v..." — the line starts with "require"
      // The regex extracts the module name from the pattern \s+(\S+)\s+v
      // For "require github.com/pkg/errors v0.9.1", m[1] = "github.com/pkg/errors"
      const names = actors.map((a) => a.name);
      expect(names).toContain('github.com/pkg/errors');
    });

    it('returns empty when go.mod does not exist', () => {
      const dir = makeTmpDir();
      const actors = finder.find(makeContext(dir));
      expect(actors).toEqual([]);
    });

    it('returns empty when go.mod has no require lines', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'go.mod'),
        ['module github.com/myorg/myproject', '', 'go 1.21'].join('\n'),
      );
      const actors = finder.find(makeContext(dir));
      expect(actors).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // README integration extraction
  // -------------------------------------------------------------------------
  describe('README integration detection', () => {
    it('extracts integrations from README.md with "integrates with" phrase', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        [
          '# MyProject',
          '',
          'This project integrates with Prometheus for metrics.',
          'It also works with Grafana dashboards.',
        ].join('\n'),
      );
      const actors = finder.find(makeContext(dir));
      const partnerNames = actors.filter((a) => a.role === 'partner').map((a) => a.name);
      expect(partnerNames.some((n) => n === 'Prometheus')).toBe(true);
      expect(partnerNames.some((n) => n === 'Grafana')).toBe(true);
    });

    it('extracts integrations using "powered by" phrase', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        'Powered by Kubernetes and OpenTelemetry.',
      );
      const actors = finder.find(makeContext(dir));
      const partnerNames = actors.filter((a) => a.role === 'partner').map((a) => a.name);
      expect(partnerNames.some((n) => n === 'Kubernetes' || n === 'Powered')).toBeDefined();
    });

    it('extracts integrations using "built on top of" phrase', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        'Built on top of Express for the HTTP layer.',
      );
      const actors = finder.find(makeContext(dir));
      const partnerNames = actors.filter((a) => a.role === 'partner').map((a) => a.name);
      // "Express" is title-cased and > 3 chars
      expect(partnerNames.some((n) => n === 'Express')).toBe(true);
    });

    it('extracts integrations using "plugin for" phrase', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        'This is a plugin for Webpack that optimizes bundles.',
      );
      const actors = finder.find(makeContext(dir));
      const partnerNames = actors.filter((a) => a.role === 'partner').map((a) => a.name);
      expect(partnerNames.some((n) => n === 'Webpack')).toBe(true);
    });

    it('falls back to README.rst when README.md absent', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.rst'),
        'This project works with Sphinx documentation.',
      );
      const actors = finder.find(makeContext(dir));
      const partnerNames = actors.filter((a) => a.role === 'partner').map((a) => a.name);
      expect(partnerNames.some((n) => n === 'Sphinx')).toBe(true);
    });

    it('falls back to README.txt when other READMEs absent', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.txt'),
        'Integration with Ansible is supported.',
      );
      const actors = finder.find(makeContext(dir));
      const partnerNames = actors.filter((a) => a.role === 'partner').map((a) => a.name);
      expect(partnerNames.some((n) => n === 'Ansible')).toBe(true);
    });

    it('falls back to README (no extension) when others absent', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README'),
        'Works with Jenkins for continuous integration.',
      );
      const actors = finder.find(makeContext(dir));
      const partnerNames = actors.filter((a) => a.role === 'partner').map((a) => a.name);
      expect(partnerNames.some((n) => n === 'Jenkins')).toBe(true);
    });

    it('returns no partner actors when no README exists', () => {
      const dir = makeTmpDir();
      const actors = finder.find(makeContext(dir));
      const partnerActors = actors.filter((a) => a.role === 'partner');
      expect(partnerActors).toEqual([]);
    });

    it('returns no partner actors when README has no integration phrases', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        '# MyProject\n\nThis is a simple utility library.\n',
      );
      const actors = finder.find(makeContext(dir));
      const partnerActors = actors.filter((a) => a.role === 'partner');
      expect(partnerActors).toEqual([]);
    });

    it('caps readme integrations at 5', () => {
      const dir = makeTmpDir();
      const lines = [
        'Integrates with AlphaService.',
        'Integrates with BetaService.',
        'Integrates with GammaService.',
        'Integrates with DeltaService.',
        'Integrates with EpsilonService.',
        'Integrates with ZetaService.',
        'Integrates with EtaService.',
      ];
      fs.writeFileSync(path.join(dir, 'README.md'), lines.join('\n'));
      const actors = finder.find(makeContext(dir));
      const partnerActors = actors.filter((a) => a.role === 'partner');
      expect(partnerActors.length).toBeLessThanOrEqual(5);
    });

    it('deduplicates README integrations (case-insensitive) vs dependency actors', () => {
      const dir = makeTmpDir();
      // express is a dep and also mentioned in README
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ dependencies: { Express: '^4.0.0' } }),
      );
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        'This project integrates with Express for routing.',
      );
      const actors = finder.find(makeContext(dir));
      const expressActors = actors.filter((a) => a.name.toLowerCase() === 'express');
      // Should only appear once (as upstream dep, not duplicated as partner)
      expect(expressActors.length).toBe(1);
    });

    it('sets correct partner actor shape', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        'This service integrates with Datadog for observability.',
      );
      const actors = finder.find(makeContext(dir));
      const partner = actors.find((a) => a.role === 'partner');
      expect(partner).toBeDefined();
      expect(partner!.repoUrl).toBeNull();
      expect(partner!.similarityScore).toBeNull();
      expect(partner!.tags).toContain('integration');
      expect(partner!.tags).toContain('readme');
      expect(partner!.rationale).toMatch(/README/i);
    });

    it('filters out words shorter than or equal to 3 characters from README matches', () => {
      const dir = makeTmpDir();
      // "For" and "The" are short words; "Node" is 4 chars and should pass
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        'Works with Node for the web.',
      );
      const actors = finder.find(makeContext(dir));
      const partnerNames = actors.filter((a) => a.role === 'partner').map((a) => a.name);
      expect(partnerNames).not.toContain('For');
      expect(partnerNames).not.toContain('The');
      expect(partnerNames.some((n) => n === 'Node' || n === 'Works')).toBeDefined();
    });

    it('deduplicates repeated words within a single README line', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        'Integrates with Redis Redis Redis for caching.',
      );
      const actors = finder.find(makeContext(dir));
      const redisActors = actors.filter((a) => a.name === 'Redis');
      expect(redisActors.length).toBeLessThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // Combined / integration tests
  // -------------------------------------------------------------------------
  describe('combined manifest + README', () => {
    it('aggregates deps from package.json and README partners', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ dependencies: { axios: '^1.0.0' } }),
      );
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        'This library works with Stripe for payments.',
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('axios');
      expect(names.some((n) => n === 'Stripe')).toBe(true);
    });

    it('aggregates deps from requirements.txt and go.mod simultaneously', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(path.join(dir, 'requirements.txt'), 'boto3\n');
      fs.writeFileSync(
        path.join(dir, 'go.mod'),
        [
          'module example.com/m',
          'go 1.21',
          'require (',
          '\tgithub.com/spf13/cobra v1.7.0',
          ')',
        ].join('\n'),
      );
      const actors = finder.find(makeContext(dir));
      const names = actors.map((a) => a.name);
      expect(names).toContain('boto3');
      expect(names).toContain('github.com/spf13/cobra');
    });

    it('returns upstream role for all manifest deps', () => {
      const dir = makeTmpDir();
      fs.writeFileSync(
        path.join(dir, 'requirements.txt'),
        'requests\nflask\n',
      );
      const actors = finder.find(makeContext(dir));
      expect(actors.every((a) => a.role === 'upstream')).toBe(true);
    });
  });
});
