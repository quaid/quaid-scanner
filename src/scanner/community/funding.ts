/**
 * Funding Infrastructure scanner.
 *
 * Detects .github/FUNDING.yml, parses platform keys, and checks README
 * for sponsorship badges to assess financial sustainability options.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const VALID_PLATFORM_KEYS = new Set([
  'github',
  'patreon',
  'open_collective',
  'ko_fi',
  'tidelift',
  'community_bridge',
  'liberapay',
  'issuehunt',
  'custom',
]);

const SPONSOR_PATTERNS = [
  /sponsor/i,
  /opencollective\.com/i,
  /github\.com\/sponsors/i,
  /patreon\.com/i,
  /ko-fi\.com/i,
  /buymeacoffee\.com/i,
  /liberapay\.com/i,
];

export class FundingScanner implements Scanner {
  readonly name = 'funding';
  readonly displayName = 'Funding Infrastructure';
  readonly pillar = Pillar.COMMUNITY;

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
        category: 'funding',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const findings: Finding[] = [];

    // Check for FUNDING.yml
    const fundingPath = path.join(repoPath, '.github', 'FUNDING.yml');
    let fundingContent = '';

    if (fs.existsSync(fundingPath)) {
      try {
        fundingContent = fs.readFileSync(fundingPath, 'utf-8');
      } catch {
        // skip
      }
    }

    if (fundingContent) {
      // Parse platform keys using simple line-level parsing
      const platforms: string[] = [];
      for (const line of fundingContent.split('\n')) {
        const match = line.match(/^(\w+)\s*:/);
        if (match) {
          const key = match[1].toLowerCase();
          if (VALID_PLATFORM_KEYS.has(key)) {
            platforms.push(key);
          }
        }
      }

      findings.push(
        makeFinding(
          Severity.INFO,
          `Funding infrastructure present: ${platforms.length} platform${platforms.length === 1 ? '' : 's'} configured`,
          'Funding options help sustain the project',
          { file: '.github/FUNDING.yml', platforms },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.INFO,
          'No funding infrastructure detected',
          'Consider adding .github/FUNDING.yml to enable sponsorship options',
        ),
      );
    }

    // Check README for sponsor badges/links
    const readmePath = path.join(repoPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const readme = fs.readFileSync(readmePath, 'utf-8');
        const hasSponsorContent = SPONSOR_PATTERNS.some((p) => p.test(readme));
        if (hasSponsorContent) {
          findings.push(
            makeFinding(
              Severity.INFO,
              'README contains funding/sponsor badge or link',
              'Visible sponsorship links help with project sustainability',
            ),
          );
        }
      } catch {
        // skip
      }
    }

    return findings;
  }
}
