/**
 * Governance file detection scanner.
 *
 * Checks for governance documentation in standard locations
 * and extracts content for downstream classification analysis.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** Standard governance file paths, in priority order. */
const GOVERNANCE_PATHS = [
  'GOVERNANCE.md',
  'GOVERNANCE',
  'docs/governance.md',
  'docs/GOVERNANCE.md',
  '.github/GOVERNANCE.md',
];

export class GovernanceDetectionScanner implements Scanner {
  readonly name = 'governance-detection';
  readonly displayName = 'Governance File Detection';
  readonly pillar = Pillar.GOVERNANCE;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;

    // Search through known governance file paths
    for (const relativePath of GOVERNANCE_PATHS) {
      const fullPath = path.join(repoPath, relativePath);
      if (!fs.existsSync(fullPath)) continue;

      let content: string;
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch {
        continue;
      }

      // Check for empty or whitespace-only content
      if (!content.trim()) {
        return [{
          id: `${this.name}-1`,
          severity: Severity.INFO,
          pillar: this.pillar,
          category: 'governance',
          message: `Governance file "${relativePath}" found but is empty`,
          file: relativePath,
          line: null,
          column: null,
          suggestion: 'Add governance documentation describing the decision-making process',
          metadata: { filePath: relativePath, content },
        }];
      }

      // Governance file found with content
      return [{
        id: `${this.name}-1`,
        severity: Severity.PASS,
        pillar: this.pillar,
        category: 'governance',
        message: `Governance documentation found: ${relativePath}`,
        file: relativePath,
        line: null,
        column: null,
        suggestion: 'Governance documentation is present',
        metadata: { filePath: relativePath, content },
      }];
    }

    // No governance file found
    return [{
      id: `${this.name}-1`,
      severity: Severity.INFO,
      pillar: this.pillar,
      category: 'governance',
      message: 'No governance documentation found',
      file: null,
      line: null,
      column: null,
      suggestion: 'Add a GOVERNANCE.md file describing the project decision-making process',
    }];
  }
}
