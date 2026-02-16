/**
 * Support Channel Clarity scanner.
 *
 * Detects SUPPORT.md, README support sections, and community channel links
 * (Discord, Slack, Discussions, Stack Overflow) to assess user guidance quality.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const SUPPORT_FILES = ['SUPPORT.md', '.github/SUPPORT.md'];
const README_SUPPORT_PATTERNS = [
  /##\s*support/i,
  /##\s*getting help/i,
  /##\s*questions/i,
  /##\s*need help/i,
];

const CHANNEL_DETECTORS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'discord', pattern: /discord(?:\.gg|\.com|app\.com)/i },
  { name: 'slack', pattern: /slack\.com/i },
  { name: 'stackoverflow', pattern: /stack\s*overflow/i },
  { name: 'discussions', pattern: /github\s*discussions/i },
  { name: 'gitter', pattern: /gitter\.im/i },
  { name: 'matrix', pattern: /matrix\.to|matrix\.org/i },
  { name: 'mailing-list', pattern: /mailing\s*list|groups\.google\.com/i },
];

export class SupportChannelScanner implements Scanner {
  readonly name = 'support-channels';
  readonly displayName = 'Support Channel Clarity';
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
        category: 'support-channels',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const findings: Finding[] = [];
    let supportContent = '';
    let supportFile: string | null = null;

    // Check for SUPPORT.md
    for (const file of SUPPORT_FILES) {
      const fullPath = path.join(repoPath, file);
      if (fs.existsSync(fullPath)) {
        try {
          supportContent = fs.readFileSync(fullPath, 'utf-8');
          supportFile = file;
        } catch {
          // skip
        }
        break;
      }
    }

    if (supportFile) {
      findings.push(
        makeFinding(
          Severity.PASS,
          `SUPPORT.md found: ${supportFile}`,
          'Support documentation is present',
          { file: supportFile },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.WARNING,
          'No SUPPORT.md or .github/SUPPORT.md found',
          'Add a SUPPORT.md documenting how users can get help',
        ),
      );
    }

    // Check README for support section
    const readmePath = path.join(repoPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const readme = fs.readFileSync(readmePath, 'utf-8');
        const hasSupport = README_SUPPORT_PATTERNS.some((p) => p.test(readme));
        if (hasSupport) {
          findings.push(
            makeFinding(
              Severity.INFO,
              'README contains a support/help section',
              'Support information in README helps users find resources',
            ),
          );
        }
        // Also scan README for community channels if no SUPPORT.md
        if (!supportContent) {
          supportContent = readme;
        }
      } catch {
        // skip
      }
    }

    // Detect community channels
    if (supportContent) {
      const channels: string[] = [];
      for (const detector of CHANNEL_DETECTORS) {
        if (detector.pattern.test(supportContent)) {
          channels.push(detector.name);
        }
      }

      if (channels.length > 0) {
        findings.push(
          makeFinding(
            channels.length >= 2 ? Severity.PASS : Severity.INFO,
            `Support channels detected: ${channels.join(', ')}`,
            channels.length >= 2
              ? 'Multiple support channels documented'
              : 'Consider adding more support channels for better user coverage',
            { channels },
          ),
        );
      }
    }

    return findings;
  }
}
