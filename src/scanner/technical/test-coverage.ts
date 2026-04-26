/**
 * Test Coverage scanner.
 *
 * Detects presence of test files, coverage configuration, and CI badge
 * references that indicate the project tracks and reports coverage.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** Filenames that may contain CI/coverage badge references. */
const BADGE_SOURCE_FILES = ['README.md', 'README.rst', 'README.txt', 'docs/README.md'];

/** Coverage-configuration filenames to probe. */
const COVERAGE_CONFIG_FILES = [
  '.nycrc',
  '.nycrc.json',
  'nyc.config.js',
  'nyc.config.cjs',
  'jest.config.js',
  'jest.config.ts',
  'jest.config.cjs',
  'jest.config.mjs',
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mjs',
  '.c8rc',
  'codecov.yml',
  'codecov.yaml',
  '.codecov.yml',
];

/** Glob-style directory/extension patterns that indicate test files. */
const TEST_PATH_PATTERNS = [/[/_-]tests?[/_.]/, /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/];
const TEST_DIRECTORY_NAMES = ['test', 'tests', '__tests__', 'spec', 'specs'];

/** Minimum acceptable coverage threshold (percent). */
const GOOD_THRESHOLD = 80;
/** Threshold below which coverage is considered dangerously low. */
const LOW_THRESHOLD = 50;

// --- Badge detection helpers -------------------------------------------------

/** Returns true if content contains a Codecov badge. */
function hasCodecovBadge(content: string): boolean {
  return /codecov\.io/i.test(content);
}

/** Returns true if content contains a Coveralls badge. */
function hasCoverallsBadge(content: string): boolean {
  return /coveralls\.io/i.test(content);
}

/** Returns true if content contains a GitHub Actions coverage badge or workflow badge. */
function hasGitHubActionsCoverageBadge(content: string): boolean {
  // Match GitHub Actions workflow badge URL patterns that reference coverage workflows
  return (
    /github\.com\/[^/]+\/[^/]+\/actions\/workflows\/[^)"\s]*cover/i.test(content) ||
    /!\[coverage\]/i.test(content) ||
    /!\[code coverage\]/i.test(content)
  );
}

// --- Config parsing helpers --------------------------------------------------

/** Extracts numeric coverage threshold from nyc/.nycrc config content. */
function extractNycThreshold(content: string): number | null {
  // JSON format: "lines": 80 or "branches": 75
  const match = content.match(/"(?:lines|branches|statements|functions)"\s*:\s*(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

/** Extracts numeric threshold from jest config content (coverageThreshold). */
function extractJestThreshold(content: string): number | null {
  // coverageThreshold: { global: { branches: 80, ... } }
  const match = content.match(/coverageThreshold[\s\S]*?(?:branches|lines|statements|functions)\s*:\s*(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

/** Extracts numeric threshold from vitest config content. */
function extractVitestThreshold(content: string): number | null {
  // thresholds: { branches: 80, ... }
  const match = content.match(/thresholds[\s\S]*?(?:branches|lines|statements|functions)\s*:\s*(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

// --- Test-file detection helper ----------------------------------------------

/** Returns true if the repo has any recognizable test files. */
function hasTestFiles(repoPath: string): boolean {
  // Check for test directories at root level
  for (const dir of TEST_DIRECTORY_NAMES) {
    if (fs.existsSync(path.join(repoPath, dir))) return true;
  }

  // Check src subtree for test file patterns (max 2 levels deep to keep cost low)
  const srcDir = path.join(repoPath, 'src');
  if (fs.existsSync(srcDir)) {
    const files = readdirDeep(srcDir, 2);
    for (const f of files) {
      if (TEST_PATH_PATTERNS.some((p) => p.test(f))) return true;
    }
  }

  return false;
}

/** Reads filenames recursively up to `depth` levels; returns relative paths. */
function readdirDeep(dir: string, depth: number): string[] {
  if (depth < 0) return [];
  let results: string[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      results = results.concat(readdirDeep(full, depth - 1).map((f) => `${entry}/${f}`));
    } else {
      results.push(entry);
    }
  }
  return results;
}

// --- Scanner -----------------------------------------------------------------

export class TestCoverageScanner implements Scanner {
  readonly name = 'test-coverage';
  readonly displayName = 'Test Coverage';
  readonly pillar = Pillar.TECHNICAL;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    let counter = 0;

    const makeFinding = (
      severity: Severity,
      message: string,
      suggestion: string,
      metadata?: Record<string, unknown>,
    ): Finding => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity,
        pillar: this.pillar,
        category: 'test-coverage',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const findings: Finding[] = [];

    // -------------------------------------------------------------------------
    // 1. Test file presence
    // -------------------------------------------------------------------------
    const testFilesFound = hasTestFiles(repoPath);
    if (!testFilesFound) {
      findings.push(
        makeFinding(
          Severity.CRITICAL,
          'No test files detected in the repository',
          'Add a test suite to improve code reliability and enable coverage tracking',
          { testFilesFound: false },
        ),
      );
      return findings;
    }

    findings.push(
      makeFinding(
        Severity.PASS,
        'Test files detected in the repository',
        'Tests are present — ensure coverage is tracked and enforced',
        { testFilesFound: true },
      ),
    );

    // -------------------------------------------------------------------------
    // 2. Coverage configuration
    // -------------------------------------------------------------------------
    let configFound = false;
    let detectedThreshold: number | null = null;
    let configFile: string | null = null;

    for (const cfgName of COVERAGE_CONFIG_FILES) {
      const fullPath = path.join(repoPath, cfgName);
      if (!fs.existsSync(fullPath)) continue;

      let content: string;
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch {
        continue;
      }

      configFound = true;
      configFile = cfgName;

      // Try to extract threshold from the config
      if (cfgName.includes('nyc') || cfgName.startsWith('.nyc') || cfgName === '.c8rc') {
        detectedThreshold = extractNycThreshold(content);
      } else if (cfgName.includes('jest')) {
        detectedThreshold = extractJestThreshold(content);
      } else if (cfgName.includes('vitest')) {
        detectedThreshold = extractVitestThreshold(content);
      } else if (cfgName.includes('codecov')) {
        // Codecov YAML: coverage.precision or target
        const m = content.match(/target\s*:\s*(\d+)/);
        if (m) detectedThreshold = parseInt(m[1], 10);
      }

      break; // Use first match
    }

    if (!configFound) {
      findings.push(
        makeFinding(
          Severity.WARNING,
          'No coverage configuration file found',
          'Add a coverage configuration (e.g., vitest.config.ts with coverage thresholds, jest.config.js with coverageThreshold, or .nycrc) to enforce coverage minimums',
          { configFound: false },
        ),
      );
    } else {
      if (detectedThreshold !== null) {
        let severity: Severity;
        let suggestion: string;

        if (detectedThreshold >= GOOD_THRESHOLD) {
          severity = Severity.PASS;
          suggestion = 'Coverage threshold meets or exceeds the recommended 80% minimum';
        } else if (detectedThreshold >= LOW_THRESHOLD) {
          severity = Severity.WARNING;
          suggestion = `Coverage threshold of ${detectedThreshold}% is below the recommended 80% — consider raising it`;
        } else {
          severity = Severity.CRITICAL;
          suggestion = `Coverage threshold of ${detectedThreshold}% is critically low — raise it to at least 80%`;
        }

        findings.push(
          makeFinding(
            severity,
            `Coverage threshold configured at ${detectedThreshold}% (in ${configFile})`,
            suggestion,
            { threshold: detectedThreshold, configFile },
          ),
        );
      } else {
        findings.push(
          makeFinding(
            Severity.INFO,
            `Coverage configuration found: ${configFile}`,
            'Coverage config exists but no explicit numeric threshold detected — consider adding one',
            { configFound: true, configFile, threshold: null },
          ),
        );
      }
    }

    // -------------------------------------------------------------------------
    // 3. CI badge detection
    // -------------------------------------------------------------------------
    let badgeFound = false;
    const badgesDetected: string[] = [];

    for (const badgeFile of BADGE_SOURCE_FILES) {
      const fullPath = path.join(repoPath, badgeFile);
      if (!fs.existsSync(fullPath)) continue;

      let content: string;
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch {
        continue;
      }

      if (hasCodecovBadge(content)) {
        badgesDetected.push('codecov');
        badgeFound = true;
      }
      if (hasCoverallsBadge(content)) {
        badgesDetected.push('coveralls');
        badgeFound = true;
      }
      if (hasGitHubActionsCoverageBadge(content)) {
        badgesDetected.push('github-actions');
        badgeFound = true;
      }
    }

    if (badgeFound) {
      findings.push(
        makeFinding(
          Severity.PASS,
          `Coverage badge(s) detected: ${badgesDetected.join(', ')}`,
          'Coverage is publicly visible — keep badges up to date',
          { badges: badgesDetected },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.INFO,
          'No coverage badge found in README',
          'Add a Codecov, Coveralls, or GitHub Actions coverage badge to your README to signal test quality',
          { badges: [] },
        ),
      );
    }

    return findings;
  }
}
