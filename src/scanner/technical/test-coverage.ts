import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const COVERAGE_CONFIG_FILES = [
  '.codecov.yml',
  '.codecov.yaml',
  'codecov.yml',
  'codecov.yaml',
  '.coveragerc',        // pytest-cov
  'jest.config.js',
  'jest.config.ts',
  'jest.config.mjs',
  'jest.config.cjs',
  'vitest.config.ts',
  'vitest.config.js',
  '.nycrc',
  '.nycrc.json',
  'nyc.config.js',
  'c8.config.js',
];

// Patterns in CI workflow files that indicate coverage upload
const CI_COVERAGE_PATTERNS = /codecov|coveralls|lcov|coverage.*upload|upload.*coverage|collect.*coverage|--coverage|run.*coverage/i;

// README badge patterns for coverage
const COVERAGE_BADGE_PATTERNS = /codecov|coveralls|shields\.io.*coverage|img\.shields\.io.*coverage/i;

function hasJestCoverageConfig(repoPath: string): boolean {
  const pkgPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8') as string) as Record<string, unknown>;
    const jest = pkg['jest'] as Record<string, unknown> | undefined;
    if (!jest) return false;
    return !!(jest['collectCoverage'] || jest['coverageThreshold'] || jest['coverageDirectory']);
  } catch {
    return false;
  }
}

function hasPytestCoverageConfig(repoPath: string): boolean {
  const pyprojectPath = path.join(repoPath, 'pyproject.toml');
  const setupCfgPath = path.join(repoPath, 'setup.cfg');
  for (const p of [pyprojectPath, setupCfgPath]) {
    if (!fs.existsSync(p)) continue;
    try {
      const content = fs.readFileSync(p, 'utf-8');
      if (/\[tool\.pytest|addopts.*--cov|\[coverage:/.test(content)) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

function hasVitestCoverageConfig(repoPath: string): boolean {
  for (const file of ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs']) {
    const p = path.join(repoPath, file);
    if (!fs.existsSync(p)) continue;
    try {
      const content = fs.readFileSync(p, 'utf-8');
      if (/coverage|provider.*v8|provider.*istanbul/i.test(content)) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

function detectCiCoverageStep(repoPath: string): boolean {
  const workflowDir = path.join(repoPath, '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) return false;
  try {
    const files = fs.readdirSync(workflowDir) as string[];
    return files
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
      .some((f) => {
        try {
          return CI_COVERAGE_PATTERNS.test(fs.readFileSync(path.join(workflowDir, f), 'utf-8'));
        } catch {
          return false;
        }
      });
  } catch {
    return false;
  }
}

function detectReadmeBadge(repoPath: string): boolean {
  for (const name of ['README.md', 'README.rst', 'README.txt', 'README']) {
    const p = path.join(repoPath, name);
    if (!fs.existsSync(p)) continue;
    try {
      if (COVERAGE_BADGE_PATTERNS.test(fs.readFileSync(p, 'utf-8'))) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

export class TestCoverageScanner implements Scanner {
  readonly name = 'test-coverage';
  readonly displayName = 'Test Coverage Configuration';
  readonly pillar = Pillar.TECHNICAL;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];
    let counter = 0;

    const make = (severity: Severity, message: string, suggestion: string): Finding => ({
      id: `${this.name}-${++counter}`,
      severity,
      pillar: this.pillar,
      category: 'test-coverage',
      message,
      file: null,
      line: null,
      column: null,
      suggestion,
    });

    const detectedSources: string[] = [];

    // File-based detection
    for (const file of COVERAGE_CONFIG_FILES) {
      if (fs.existsSync(path.join(repoPath, file))) {
        detectedSources.push(file);
        break; // one pass signal is enough
      }
    }

    if (hasJestCoverageConfig(repoPath)) detectedSources.push('jest coverage config');
    if (hasPytestCoverageConfig(repoPath)) detectedSources.push('pytest-cov config');
    if (hasVitestCoverageConfig(repoPath)) detectedSources.push('vitest coverage config');

    const hasCi = detectCiCoverageStep(repoPath);
    const hasBadge = detectReadmeBadge(repoPath);

    if (detectedSources.length > 0) {
      findings.push(
        make(
          Severity.PASS,
          `Test coverage configuration found: ${detectedSources.join(', ')}`,
          'No action needed',
        ),
      );
    } else {
      findings.push(
        make(
          Severity.WARNING,
          'No test coverage configuration detected',
          'Configure test coverage (codecov, jest coverage, pytest-cov, vitest coverage) and set a minimum threshold',
        ),
      );
    }

    if (hasCi) {
      findings.push(make(Severity.PASS, 'Coverage upload/reporting step found in CI', 'No action needed'));
    } else if (detectedSources.length > 0) {
      findings.push(
        make(
          Severity.INFO,
          'Coverage config found but no CI upload step detected',
          'Add codecov or coveralls upload to your CI workflow so coverage trends are tracked',
        ),
      );
    }

    if (hasBadge) {
      findings.push(make(Severity.PASS, 'Coverage badge found in README', 'No action needed'));
    }

    return findings;
  }
}
