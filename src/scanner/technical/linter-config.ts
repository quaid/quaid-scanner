import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

// Config file paths, keyed by linter name
const LINTER_CONFIGS: Record<string, string[]> = {
  eslint: [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc.json',
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
  ],
  prettier: [
    '.prettierrc',
    '.prettierrc.js',
    '.prettierrc.json',
    '.prettierrc.yaml',
    '.prettierrc.yml',
    'prettier.config.js',
    'prettier.config.mjs',
  ],
  golangci: ['.golangci.yml', '.golangci.yaml', '.golangci.json', '.golangci.toml'],
  rubocop: ['.rubocop.yml', '.rubocop.yaml'],
  clippy: ['clippy.toml', '.clippy.toml'],
  biome: ['biome.json', 'biome.jsonc'],
  oxlint: ['oxlint.json', '.oxlintrc.json'],
};

// pyproject.toml tool sections that indicate a linter is configured
const PYPROJECT_LINTER_SECTIONS = ['[tool.ruff]', '[tool.flake8]', '[tool.pylint]', '[tool.mypy]', '[tool.pyright]'];

function detectPyprojectLinter(repoPath: string): boolean {
  const pyprojectPath = path.join(repoPath, 'pyproject.toml');
  if (!fs.existsSync(pyprojectPath)) return false;
  try {
    const content = fs.readFileSync(pyprojectPath, 'utf-8');
    return PYPROJECT_LINTER_SECTIONS.some((section) => content.includes(section));
  } catch {
    return false;
  }
}

function detectPackageJsonLinter(repoPath: string): string | null {
  const pkgPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8') as string) as Record<string, unknown>;
    if (pkg['eslintConfig']) return 'eslint (package.json)';
    if (pkg['prettier']) return 'prettier (package.json)';
    const scripts = (pkg['scripts'] as Record<string, string> | undefined) ?? {};
    const hasLintScript = Object.values(scripts).some((s) =>
      /eslint|prettier|biome|oxlint/.test(s),
    );
    if (hasLintScript) return 'lint script in package.json';
  } catch {
    // ignore malformed package.json
  }
  return null;
}

function detectCiLintStep(repoPath: string): boolean {
  const workflowDir = path.join(repoPath, '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) return false;
  try {
    const files = fs.readdirSync(workflowDir) as string[];
    return files
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
      .some((f) => {
        try {
          const content = fs.readFileSync(path.join(workflowDir, f), 'utf-8');
          return /\blint\b|\beslint\b|\bprettier\b|\brubocop\b|\bgolangci\b|\bbiome\b/i.test(content);
        } catch {
          return false;
        }
      });
  } catch {
    return false;
  }
}

export class LinterConfigScanner implements Scanner {
  readonly name = 'linter-config';
  readonly displayName = 'Linter Configuration';
  readonly pillar = Pillar.TECHNICAL;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];
    let counter = 0;

    const make = (severity: Severity, message: string, suggestion: string): Finding => ({
      id: `${this.name}-${++counter}`,
      severity,
      pillar: this.pillar,
      category: 'linting',
      message,
      file: null,
      line: null,
      column: null,
      suggestion,
    });

    // Check each linter's known config files
    const detected: string[] = [];
    for (const [linter, files] of Object.entries(LINTER_CONFIGS)) {
      if (files.some((f) => fs.existsSync(path.join(repoPath, f)))) {
        detected.push(linter);
      }
    }

    // Python pyproject.toml
    if (detectPyprojectLinter(repoPath)) detected.push('ruff/flake8/pylint (pyproject.toml)');

    // package.json inline config or lint script
    const pkgLinter = detectPackageJsonLinter(repoPath);
    if (pkgLinter) detected.push(pkgLinter);

    // CI lint step
    const hasCiLint = detectCiLintStep(repoPath);

    if (detected.length > 0) {
      findings.push(
        make(
          Severity.PASS,
          `Linter configuration detected: ${detected.join(', ')}`,
          'No action needed',
        ),
      );
      if (hasCiLint) {
        findings.push(make(Severity.PASS, 'Lint step found in CI workflow', 'No action needed'));
      } else {
        findings.push(
          make(
            Severity.INFO,
            'Linter config found but no lint step detected in CI workflows',
            'Add a lint step to your CI workflow to enforce linting on every PR',
          ),
        );
      }
    } else {
      findings.push(
        make(
          Severity.WARNING,
          'No linter configuration found',
          'Add a linter (ESLint, Prettier, Ruff, golangci-lint, etc.) and configure it to run in CI',
        ),
      );
    }

    return findings;
  }
}
