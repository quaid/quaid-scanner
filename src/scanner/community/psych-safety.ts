/**
 * Psychological Safety Artifacts scanner.
 *
 * Detects Code of Conduct, enforcement mechanisms, all-contributors
 * recognition, and other DEI infrastructure signals.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity, MaturityLevel } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const COC_FILENAMES = [
  'CODE_OF_CONDUCT.md',
  'CODE-OF-CONDUCT.md',
  'code_of_conduct.md',
  'code-of-conduct.md',
  '.github/CODE_OF_CONDUCT.md',
];

const ENFORCEMENT_PATTERNS = [
  /\breport\b/i,
  /\breporting\b/i,
  /\benforcement\b/i,
  /\bconsequence/i,
  /\bban\b/i,
  /\bwarning\b/i,
  /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/, // email address
];

export class PsychSafetyScanner implements Scanner {
  readonly name = 'psych-safety';
  readonly displayName = 'Psychological Safety Artifacts';
  readonly pillar = Pillar.COMMUNITY;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath, maturity } = context;
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
        category: 'psych-safety',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const findings: Finding[] = [];

    // --- Code of Conduct ---
    let cocPath: string | null = null;
    let cocContent = '';

    for (const filename of COC_FILENAMES) {
      const fullPath = path.join(repoPath, filename);
      if (fs.existsSync(fullPath)) {
        cocPath = filename;
        try {
          cocContent = fs.readFileSync(fullPath, 'utf-8');
        } catch {
          cocContent = '';
        }
        break;
      }
    }

    if (!cocPath) {
      const severity =
        maturity === MaturityLevel.SANDBOX ? Severity.WARNING : Severity.CRITICAL;
      findings.push(
        makeFinding(
          severity,
          'No Code of Conduct found',
          'Add a CODE_OF_CONDUCT.md — see https://www.contributor-covenant.org/',
          { file: 'CODE_OF_CONDUCT.md' },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.PASS,
          `Code of Conduct found: ${cocPath}`,
          'Code of Conduct is present',
          { file: cocPath },
        ),
      );

      // Check enforcement mechanisms
      const enforcementHits = ENFORCEMENT_PATTERNS.filter((p) => p.test(cocContent));
      if (enforcementHits.length >= 2) {
        findings.push(
          makeFinding(
            Severity.PASS,
            `Code of Conduct has enforcement mechanisms (${enforcementHits.length} signals)`,
            'Enforcement mechanisms are documented',
            { enforcementSignals: enforcementHits.length },
          ),
        );
      } else {
        findings.push(
          makeFinding(
            Severity.WARNING,
            'Code of Conduct lacks clear enforcement mechanisms',
            'Add reporting contact, enforcement process, and consequences to Code of Conduct',
            { enforcementSignals: enforcementHits.length },
          ),
        );
      }
    }

    // --- All-Contributors ---
    const allContribPath = path.join(repoPath, '.all-contributorsrc');
    if (fs.existsSync(allContribPath)) {
      try {
        const raw = fs.readFileSync(allContribPath, 'utf-8');
        const config = JSON.parse(raw);

        findings.push(
          makeFinding(
            Severity.INFO,
            'Project recognizes non-code contributions (all-contributors configured)',
            'Great — recognizing diverse contributions improves community engagement',
            { file: '.all-contributorsrc' },
          ),
        );

        // Detect contribution types
        const types = new Set<string>();
        if (config.contributionTypes) {
          for (const t of config.contributionTypes) types.add(t);
        }
        if (config.contributors && Array.isArray(config.contributors)) {
          for (const c of config.contributors) {
            if (c.contributions) {
              for (const t of c.contributions) types.add(t);
            }
          }
        }

        if (types.size > 0) {
          findings.push(
            makeFinding(
              Severity.INFO,
              `All-contributors recognizes ${types.size} contribution type${types.size === 1 ? '' : 's'}`,
              'Diverse contribution types encourage broader participation',
              { contributionTypes: [...types] },
            ),
          );
        }
      } catch {
        // Invalid JSON — still note presence
        findings.push(
          makeFinding(
            Severity.INFO,
            'All-contributors config found but could not be parsed',
            'Verify .all-contributorsrc is valid JSON',
          ),
        );
      }
    }

    // --- README Contributors Section ---
    const readmePath = path.join(repoPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const readme = fs.readFileSync(readmePath, 'utf-8');
        if (/##\s*contributors/i.test(readme)) {
          findings.push(
            makeFinding(
              Severity.INFO,
              'README has a Contributors section',
              'Visible contributor recognition encourages participation',
            ),
          );
        }
      } catch {
        // Ignore read errors
      }
    }

    return findings;
  }
}
