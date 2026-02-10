import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { parseArgs } from '../../src/cli.js';
import {
  DEFAULT_CONFIG,
  buildConfig,
  validateTarget,
} from '../../src/config.js';
import {
  ScanDepth,
  OutputFormat,
  MaturityLevel,
} from '../../src/types/index.js';

describe('Story 1.2: CLI Interface', () => {
  describe('parseArgs', () => {
    it('returns default config when no args provided', () => {
      const result = parseArgs(['node', 'quaid-scanner']);
      expect(result.options).toBeDefined();
    });

    it('sets target to a local path', () => {
      const result = parseArgs(['node', 'quaid-scanner', '/tmp/my-repo']);
      expect(result.target).toBe('/tmp/my-repo');
    });

    it('sets target to a GitHub URL', () => {
      const url = 'https://github.com/owner/repo';
      const result = parseArgs(['node', 'quaid-scanner', url]);
      expect(result.target).toBe(url);
    });

    it('--depth quick sets depth to quick', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--depth',
        'quick',
      ]);
      expect(result.options.depth).toBe('quick');
    });

    it('--depth standard sets depth to standard', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--depth',
        'standard',
      ]);
      expect(result.options.depth).toBe('standard');
    });

    it('--depth thorough sets depth to thorough', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--depth',
        'thorough',
      ]);
      expect(result.options.depth).toBe('thorough');
    });

    it('--format json sets format to json', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--format',
        'json',
      ]);
      expect(result.options.format).toBe('json');
    });

    it('--format markdown sets format to markdown', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--format',
        'markdown',
      ]);
      expect(result.options.format).toBe('markdown');
    });

    it('--output report.json sets output path', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--output',
        'report.json',
      ]);
      expect(result.options.output).toBe('report.json');
    });

    it('--threshold 7.5 sets threshold to 7.5', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--threshold',
        '7.5',
      ]);
      expect(result.options.threshold).toBe('7.5');
    });

    it('--quiet sets quiet to true', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--quiet',
      ]);
      expect(result.options.quiet).toBe(true);
    });

    it('--verbose sets verbose to true', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--verbose',
      ]);
      expect(result.options.verbose).toBe(true);
    });

    it('--maturity sandbox sets maturity to sandbox', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--maturity',
        'sandbox',
      ]);
      expect(result.options.maturity).toBe('sandbox');
    });

    it('--config sets config file path', () => {
      const result = parseArgs([
        'node',
        'quaid-scanner',
        '/tmp/repo',
        '--config',
        '.quaid-scanner.yaml',
      ]);
      expect(result.options.config).toBe('.quaid-scanner.yaml');
    });
  });

  describe('validateTarget', () => {
    it('returns local type for a local path', () => {
      const result = validateTarget('/tmp/my-repo');
      expect(result.type).toBe('local');
      expect(result.value).toBe(resolve('/tmp/my-repo'));
    });

    it('returns github type for a GitHub URL', () => {
      const result = validateTarget('https://github.com/owner/repo');
      expect(result.type).toBe('github');
      expect(result.value).toBe('owner/repo');
    });

    it('returns github type for GitHub URL with trailing slash', () => {
      const result = validateTarget('https://github.com/owner/repo/');
      expect(result.type).toBe('github');
      expect(result.value).toBe('owner/repo');
    });

    it('throws error for invalid URL', () => {
      expect(() => validateTarget('https://gitlab.com/owner/repo')).toThrow();
    });

    it('throws error for empty string', () => {
      expect(() => validateTarget('')).toThrow();
    });

    it('returns local type for relative path', () => {
      const result = validateTarget('./my-repo');
      expect(result.type).toBe('local');
      expect(result.value).toBe(resolve('./my-repo'));
    });
  });

  describe('buildConfig', () => {
    it('returns defaults when no CLI options provided', () => {
      const config = buildConfig({});
      expect(config.depth).toBe(ScanDepth.STANDARD);
      expect(config.format).toBe(OutputFormat.JSON);
      expect(config.output).toBeNull();
      expect(config.threshold).toBeNull();
      expect(config.quiet).toBe(false);
      expect(config.verbose).toBe(false);
      expect(config.maturity).toBeNull();
    });

    it('merges depth option over defaults', () => {
      const config = buildConfig({ depth: 'quick' });
      expect(config.depth).toBe(ScanDepth.QUICK);
    });

    it('merges format option over defaults', () => {
      const config = buildConfig({ format: 'markdown' });
      expect(config.format).toBe(OutputFormat.MARKDOWN);
    });

    it('merges output option over defaults', () => {
      const config = buildConfig({ output: 'report.json' });
      expect(config.output).toBe('report.json');
    });

    it('merges threshold option as a number', () => {
      const config = buildConfig({ threshold: '7.5' });
      expect(config.threshold).toBe(7.5);
    });

    it('merges quiet option over defaults', () => {
      const config = buildConfig({ quiet: true });
      expect(config.quiet).toBe(true);
    });

    it('merges verbose option over defaults', () => {
      const config = buildConfig({ verbose: true });
      expect(config.verbose).toBe(true);
    });

    it('merges maturity option over defaults', () => {
      const config = buildConfig({ maturity: 'sandbox' });
      expect(config.maturity).toBe(MaturityLevel.SANDBOX);
    });

    it('merges maturity incubating', () => {
      const config = buildConfig({ maturity: 'incubating' });
      expect(config.maturity).toBe(MaturityLevel.INCUBATING);
    });

    it('merges maturity graduated', () => {
      const config = buildConfig({ maturity: 'graduated' });
      expect(config.maturity).toBe(MaturityLevel.GRADUATED);
    });

    it('merges maturity archived', () => {
      const config = buildConfig({ maturity: 'archived' });
      expect(config.maturity).toBe(MaturityLevel.ARCHIVED);
    });

    it('handles auto maturity as null', () => {
      const config = buildConfig({ maturity: 'auto' });
      expect(config.maturity).toBeNull();
    });

    it('merges multiple options simultaneously', () => {
      const config = buildConfig({
        depth: 'thorough',
        format: 'markdown',
        output: 'out.md',
        threshold: '8',
        quiet: true,
        maturity: 'graduated',
      });
      expect(config.depth).toBe(ScanDepth.THOROUGH);
      expect(config.format).toBe(OutputFormat.MARKDOWN);
      expect(config.output).toBe('out.md');
      expect(config.threshold).toBe(8);
      expect(config.quiet).toBe(true);
      expect(config.maturity).toBe(MaturityLevel.GRADUATED);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('has depth set to standard', () => {
      expect(DEFAULT_CONFIG.depth).toBe(ScanDepth.STANDARD);
    });

    it('has format set to json', () => {
      expect(DEFAULT_CONFIG.format).toBe(OutputFormat.JSON);
    });

    it('has output set to null', () => {
      expect(DEFAULT_CONFIG.output).toBeNull();
    });

    it('has threshold set to null', () => {
      expect(DEFAULT_CONFIG.threshold).toBeNull();
    });

    it('has quiet set to false', () => {
      expect(DEFAULT_CONFIG.quiet).toBe(false);
    });

    it('has verbose set to false', () => {
      expect(DEFAULT_CONFIG.verbose).toBe(false);
    });

    it('has maturity set to null', () => {
      expect(DEFAULT_CONFIG.maturity).toBeNull();
    });

    it('has scannerTimeout set to a positive number', () => {
      expect(DEFAULT_CONFIG.scannerTimeout).toBeGreaterThan(0);
    });

    it('has pillars config with empty disabled and disabledScanners', () => {
      expect(DEFAULT_CONFIG.pillars.disabled).toEqual([]);
      expect(DEFAULT_CONFIG.pillars.disabledScanners).toEqual([]);
    });

    it('has bots config with enabled true', () => {
      expect(DEFAULT_CONFIG.bots.enabled).toBe(true);
    });

    it('has inclusive config with null termListUrl', () => {
      expect(DEFAULT_CONFIG.inclusive.termListUrl).toBeNull();
    });
  });
});
