/**
 * Asset protection and legal barrier scanner.
 *
 * Detects trademark policies, export control documentation, CLA/DCO
 * requirements, and classifies contributor friction level.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** File paths to check for trademark/brand policy. */
const TRADEMARK_PATHS = [
  'TRADEMARK.md',
  'TRADEMARK',
  'docs/trademark.md',
  'docs/TRADEMARK.md',
  'BRAND.md',
  'BRAND',
];

/** File paths to check for export control documentation. */
const EXPORT_CONTROL_PATHS = [
  'EXPORT-CONTROL.md',
  'EXPORT_CONTROL.md',
  'EXPORT-CONTROL',
  'EXPORT_CONTROL',
  'docs/export-control.md',
  'docs/EXPORT-CONTROL.md',
  'docs/export_control.md',
];

/** File paths to check for CLA documentation. */
const CLA_FILE_PATHS = [
  'CLA.md',
  'CLA',
  '.cla',
  'contributor-license-agreement.md',
  'contributor-license-agreement',
];

/** File paths to check for CLA bot/automation configuration. */
const CLA_BOT_PATHS = [
  '.github/.clabot',
  '.github/.cla.json',
  '.github/workflows/cla.yml',
  '.github/workflows/cla.yaml',
];

/** Known CLA-related GitHub Action patterns. */
const CLA_ACTION_PATTERNS = [
  'contributor-assistant/github-action',
  'cla-assistant/',
  'cla-bot/',
];

/** File paths to check for DCO documentation. */
const DCO_FILE_PATHS = [
  'DCO',
  'DCO.md',
];

/** DCO bot configuration path. */
const DCO_BOT_PATH = '.github/dco.yml';

/** Friction level classifications. */
type FrictionLevel = 'Low' | 'Medium' | 'High' | 'Very High';

/**
 * Checks whether any of the given relative paths exist in a directory.
 *
 * @param repoPath - Root directory to search in
 * @param relativePaths - Array of relative file paths to check
 * @returns The first matching relative path, or null if none found
 */
function findFile(repoPath: string, relativePaths: string[]): string | null {
  for (const relativePath of relativePaths) {
    const fullPath = path.join(repoPath, relativePath);
    if (fs.existsSync(fullPath)) {
      return relativePath;
    }
  }
  return null;
}

/**
 * Checks whether any GitHub Actions workflow file contains CLA action patterns.
 *
 * @param repoPath - Root directory to search in
 * @returns True if a CLA action pattern is found in any workflow
 */
function hasClaActionInWorkflows(repoPath: string): boolean {
  const workflowDir = path.join(repoPath, '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) {
    return false;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(workflowDir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.yml' && ext !== '.yaml') continue;

    try {
      const content = fs.readFileSync(path.join(workflowDir, entry.name), 'utf-8');
      for (const pattern of CLA_ACTION_PATTERNS) {
        if (content.includes(pattern)) {
          return true;
        }
      }
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Checks whether CONTRIBUTING.md mentions DCO or sign-off requirements.
 *
 * @param repoPath - Root directory to search in
 * @returns True if DCO/sign-off language is found
 */
function contributingMentionsDco(repoPath: string): boolean {
  const contributingPaths = ['CONTRIBUTING.md', 'CONTRIBUTING', 'contributing.md'];
  for (const relPath of contributingPaths) {
    const fullPath = path.join(repoPath, relPath);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const content = fs.readFileSync(fullPath, 'utf-8').toLowerCase();
      if (content.includes('sign-off') || content.includes('signed-off-by') || content.includes('dco')) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

export class AssetProtectionScanner implements Scanner {
  readonly name = 'asset-protection';
  readonly displayName = 'Asset Protection & Legal Barriers';
  readonly pillar = Pillar.GOVERNANCE;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];

    // 1. Trademark detection
    findings.push(this.checkTrademark(repoPath));

    // 2. Export control detection
    findings.push(this.checkExportControl(repoPath));

    // 3. CLA/DCO detection
    const claDcoResult = this.checkClaDco(repoPath);
    findings.push(claDcoResult.finding);

    // 4. Friction level classification
    findings.push(this.classifyFriction(claDcoResult.frictionLevel));

    return findings;
  }

  /**
   * Checks for trademark/brand policy files.
   */
  private checkTrademark(repoPath: string): Finding {
    const found = findFile(repoPath, TRADEMARK_PATHS);

    if (found) {
      return {
        id: `${this.name}-1`,
        severity: Severity.PASS,
        pillar: this.pillar,
        category: 'trademark',
        message: `Trademark policy found: ${found}`,
        file: found,
        line: null,
        column: null,
        suggestion: 'Trademark policy is documented',
        metadata: { filePath: found },
      };
    }

    return {
      id: `${this.name}-1`,
      severity: Severity.INFO,
      pillar: this.pillar,
      category: 'trademark',
      message: 'No trademark policy found (optional)',
      file: null,
      line: null,
      column: null,
      suggestion: 'Consider adding a TRADEMARK.md if the project has registered marks',
    };
  }

  /**
   * Checks for export control documentation.
   */
  private checkExportControl(repoPath: string): Finding {
    const found = findFile(repoPath, EXPORT_CONTROL_PATHS);

    if (found) {
      return {
        id: `${this.name}-2`,
        severity: Severity.PASS,
        pillar: this.pillar,
        category: 'export-control',
        message: `Export control documentation found: ${found}`,
        file: found,
        line: null,
        column: null,
        suggestion: 'Export control documentation is present',
        metadata: { filePath: found },
      };
    }

    return {
      id: `${this.name}-2`,
      severity: Severity.INFO,
      pillar: this.pillar,
      category: 'export-control',
      message: 'No export control documentation found (optional)',
      file: null,
      line: null,
      column: null,
      suggestion: 'Consider adding an EXPORT-CONTROL.md if the project includes controlled technology',
    };
  }

  /**
   * Checks for CLA or DCO requirements and automation.
   *
   * @returns Finding and the determined friction level
   */
  private checkClaDco(repoPath: string): { finding: Finding; frictionLevel: FrictionLevel } {
    // Check for CLA files
    const claFile = findFile(repoPath, CLA_FILE_PATHS);

    if (claFile) {
      // CLA found - check for automation
      const claBotConfig = findFile(repoPath, CLA_BOT_PATHS);
      const hasWorkflowAction = hasClaActionInWorkflows(repoPath);
      const hasAutomation = claBotConfig !== null || hasWorkflowAction;

      if (hasAutomation) {
        return {
          finding: {
            id: `${this.name}-3`,
            severity: Severity.PASS,
            pillar: this.pillar,
            category: 'cla-dco',
            message: `CLA requirement detected with automation (${claFile})`,
            file: claFile,
            line: null,
            column: null,
            suggestion: 'CLA process is automated for contributors',
            metadata: {
              type: 'CLA',
              automated: true,
              claFile,
              automationConfig: claBotConfig,
            },
          },
          frictionLevel: 'High',
        };
      }

      // CLA without automation
      return {
        finding: {
          id: `${this.name}-3`,
          severity: Severity.WARNING,
          pillar: this.pillar,
          category: 'cla-dco',
          message: `CLA required but no automation detected (${claFile})`,
          file: claFile,
          line: null,
          column: null,
          suggestion: 'Add CLA automation (e.g., CLA Assistant bot) to reduce contributor friction',
          metadata: {
            type: 'CLA',
            automated: false,
            claFile,
          },
        },
        frictionLevel: 'Very High',
      };
    }

    // Check for DCO files
    const dcoFile = findFile(repoPath, DCO_FILE_PATHS);
    const dcoBotConfig = findFile(repoPath, [DCO_BOT_PATH]);
    const dcoInContributing = contributingMentionsDco(repoPath);

    if (dcoFile || dcoBotConfig || dcoInContributing) {
      const detectedVia = dcoFile || dcoBotConfig || 'CONTRIBUTING.md';
      return {
        finding: {
          id: `${this.name}-3`,
          severity: Severity.PASS,
          pillar: this.pillar,
          category: 'cla-dco',
          message: `DCO requirement detected (${detectedVia})`,
          file: detectedVia,
          line: null,
          column: null,
          suggestion: 'DCO is a lightweight contributor agreement',
          metadata: {
            type: 'DCO',
            dcoFile: dcoFile || null,
            dcoBotConfig: dcoBotConfig || null,
            dcoInContributing,
          },
        },
        frictionLevel: 'Medium',
      };
    }

    // No CLA or DCO
    return {
      finding: {
        id: `${this.name}-3`,
        severity: Severity.INFO,
        pillar: this.pillar,
        category: 'cla-dco',
        message: 'No CLA or DCO requirement detected',
        file: null,
        line: null,
        column: null,
        suggestion: 'No contributor agreement required - low barrier to contribution',
      },
      frictionLevel: 'Low',
    };
  }

  /**
   * Creates a finding that classifies the contributor friction level.
   */
  private classifyFriction(frictionLevel: FrictionLevel): Finding {
    const descriptions: Record<FrictionLevel, string> = {
      'Low': 'No CLA/DCO requirement - minimal barrier to contribution',
      'Medium': 'DCO only - lightweight sign-off requirement',
      'High': 'CLA with automation - streamlined but requires agreement',
      'Very High': 'CLA without automation - manual process creates significant friction',
    };

    return {
      id: `${this.name}-4`,
      severity: Severity.INFO,
      pillar: this.pillar,
      category: 'friction-level',
      message: `Contributor friction level: ${frictionLevel}`,
      file: null,
      line: null,
      column: null,
      suggestion: descriptions[frictionLevel],
      metadata: {
        frictionLevel,
      },
    };
  }
}
