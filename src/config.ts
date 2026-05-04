/**
 * Configuration module for quaid-scanner
 *
 * Provides default configuration, config building from CLI options,
 * and target validation.
 */

import { resolve } from 'path';
import {
  ScanDepth,
  OutputFormat,
  MaturityLevel,
  type ScannerConfig,
} from './types/index.js';

/**
 * Default scanner configuration with sensible defaults.
 */
export const DEFAULT_CONFIG: ScannerConfig = {
  maturity: null,
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
  ecosystem: false,
  ecosystemDepth: 'static',
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

/** Map of string values to ScanDepth enum values */
const DEPTH_MAP: Record<string, ScanDepth> = {
  quick: ScanDepth.QUICK,
  standard: ScanDepth.STANDARD,
  thorough: ScanDepth.THOROUGH,
};

/** Map of string values to OutputFormat enum values */
const FORMAT_MAP: Record<string, OutputFormat> = {
  json: OutputFormat.JSON,
  markdown: OutputFormat.MARKDOWN,
};

/** Map of string values to MaturityLevel enum values */
const MATURITY_MAP: Record<string, MaturityLevel> = {
  sandbox: MaturityLevel.SANDBOX,
  incubating: MaturityLevel.INCUBATING,
  graduated: MaturityLevel.GRADUATED,
  archived: MaturityLevel.ARCHIVED,
};

/** GitHub URL regex for extracting owner/repo */
const GITHUB_URL_PATTERN =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/;

/**
 * Builds a ScannerConfig by merging CLI options over defaults.
 *
 * @param cliOptions - Raw option values from CLI parsing
 * @returns A fully populated ScannerConfig
 */
export function buildConfig(
  cliOptions: Record<string, unknown>,
): ScannerConfig {
  const config: ScannerConfig = { ...DEFAULT_CONFIG };

  if (typeof cliOptions.depth === 'string' && cliOptions.depth in DEPTH_MAP) {
    config.depth = DEPTH_MAP[cliOptions.depth];
  }

  if (typeof cliOptions.format === 'string' && cliOptions.format in FORMAT_MAP) {
    config.format = FORMAT_MAP[cliOptions.format];
  }

  if (typeof cliOptions.output === 'string') {
    config.output = cliOptions.output;
  }

  if (typeof cliOptions.threshold === 'string') {
    config.threshold = parseFloat(cliOptions.threshold);
  }

  if (cliOptions.quiet === true) {
    config.quiet = true;
  }

  if (cliOptions.verbose === true) {
    config.verbose = true;
  }

  if (cliOptions.ecosystem === true) {
    config.ecosystem = true;
  }

  if (cliOptions.ecosystemDepth === 'assisted') {
    config.ecosystemDepth = 'assisted';
  }

  if (typeof cliOptions.maturity === 'string') {
    if (cliOptions.maturity === 'auto') {
      config.maturity = null;
    } else if (cliOptions.maturity in MATURITY_MAP) {
      config.maturity = MATURITY_MAP[cliOptions.maturity];
    }
  }

  // Read GitHub token from environment when not set by caller
  if (!config.githubToken) {
    config.githubToken =
      process.env['GITHUB_TOKEN'] ||
      process.env['GITHUB_PERSONAL_ACCESS_TOKEN'] ||
      null;
  }

  return config;
}

/**
 * Validates and classifies a scan target as either a local path or GitHub URL.
 *
 * @param target - The raw target string from CLI input
 * @returns An object with type ('local' | 'github') and the resolved value
 * @throws Error if the target is empty or an unsupported URL
 */
export function validateTarget(
  target: string,
): { type: 'local' | 'github'; value: string } {
  if (!target || target.trim() === '') {
    throw new Error('Target cannot be empty');
  }

  const trimmed = target.trim();

  // Check if it looks like a URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const match = GITHUB_URL_PATTERN.exec(trimmed);
    if (!match) {
      throw new Error(
        `Unsupported URL: ${trimmed}. Only GitHub URLs (https://github.com/owner/repo) are supported.`,
      );
    }
    return { type: 'github', value: `${match[1]}/${match[2]}` };
  }

  // Treat as local path
  return { type: 'local', value: resolve(trimmed) };
}
