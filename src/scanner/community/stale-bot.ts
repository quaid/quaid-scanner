/**
 * Stale Bot Aggression Check scanner.
 *
 * Detects stale bot configurations and classifies their aggression level
 * based on close thresholds and exempt label coverage.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

const STALE_CONFIG_PATHS = ['.github/stale.yml', '.github/stale.yaml'];
const STALE_WORKFLOW_PATHS = ['.github/workflows/stale.yml', '.github/workflows/stale.yaml'];

function classifyAggression(daysBeforeClose: number): {
  severity: Severity;
  level: string;
} {
  if (daysBeforeClose < 14) return { severity: Severity.CRITICAL, level: 'hostile' };
  if (daysBeforeClose < 30) return { severity: Severity.WARNING, level: 'aggressive' };
  if (daysBeforeClose <= 60) return { severity: Severity.PASS, level: 'reasonable' };
  return { severity: Severity.PASS, level: 'lenient' };
}

/** Simple YAML value extraction (avoids full YAML parser dependency). */
function extractYAMLValue(content: string, key: string): string | null {
  const regex = new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/** Extract exempt labels from YAML content. */
function extractExemptLabels(content: string): string[] {
  // Check for exemptLabels (probot stale) or exempt-issue-labels (actions/stale)
  const labels: string[] = [];

  // Inline format: exemptLabels: [security, bug] or exempt-issue-labels: security,bug
  for (const key of ['exemptLabels', 'exempt-issue-labels', 'exempt-pr-labels']) {
    const val = extractYAMLValue(content, key);
    if (val) {
      const cleaned = val.replace(/[\[\]]/g, '');
      labels.push(...cleaned.split(',').map((l) => l.trim()).filter(Boolean));
    }
  }

  // Block format:
  // exemptLabels:
  //   - security
  //   - bug
  const blockMatch = content.match(/exemptLabels:\s*\n((?:\s+-\s+.+\n?)+)/);
  if (blockMatch) {
    const blockLabels = blockMatch[1].match(/-\s+(\S+)/g);
    if (blockLabels) {
      labels.push(...blockLabels.map((l) => l.replace(/^-\s+/, '').trim()));
    }
  }

  return [...new Set(labels)];
}

/** Parse days-before-close from an actions/stale workflow. */
function parseWorkflowStale(content: string): number | null {
  const match = content.match(/days-before-close:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export class StaleBotScanner implements Scanner {
  readonly name = 'stale-bot';
  readonly displayName = 'Stale Bot Aggression Check';
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
        category: 'stale-bot',
        message,
        file: null,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    const findings: Finding[] = [];
    let staleContent: string | null = null;
    let staleFile: string | null = null;

    // Check probot stale config
    for (const configPath of STALE_CONFIG_PATHS) {
      const fullPath = path.join(repoPath, configPath);
      if (fs.existsSync(fullPath)) {
        try {
          staleContent = fs.readFileSync(fullPath, 'utf-8');
          staleFile = configPath;
        } catch {
          // skip
        }
        break;
      }
    }

    // Check actions/stale workflow
    if (!staleContent) {
      for (const workflowPath of STALE_WORKFLOW_PATHS) {
        const fullPath = path.join(repoPath, workflowPath);
        if (fs.existsSync(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('actions/stale')) {
              staleContent = content;
              staleFile = workflowPath;
            }
          } catch {
            // skip
          }
          break;
        }
      }
    }

    if (!staleContent || !staleFile) {
      findings.push(
        makeFinding(
          Severity.INFO,
          'No stale bot configured',
          'Stale bots help manage issue backlog but can harm contributor experience if too aggressive',
        ),
      );
      return findings;
    }

    findings.push(
      makeFinding(
        Severity.INFO,
        `Stale bot configuration found: ${staleFile}`,
        'Reviewing stale bot settings for contributor friendliness',
        { file: staleFile },
      ),
    );

    // Extract close threshold
    let daysBeforeClose: number | null = null;

    // Try probot format first
    const probotVal = extractYAMLValue(staleContent, 'daysUntilClose');
    if (probotVal) {
      daysBeforeClose = parseInt(probotVal, 10);
    }

    // Try actions/stale format
    if (daysBeforeClose === null) {
      daysBeforeClose = parseWorkflowStale(staleContent);
    }

    if (daysBeforeClose !== null && !isNaN(daysBeforeClose)) {
      const { severity, level } = classifyAggression(daysBeforeClose);
      findings.push(
        makeFinding(
          severity,
          `Stale bot close threshold: ${daysBeforeClose} days (${level})`,
          daysBeforeClose < 14
            ? 'Close threshold is hostile — contributions may be prematurely closed'
            : daysBeforeClose < 30
              ? 'Close threshold is aggressive — consider extending to 30+ days'
              : 'Close threshold is reasonable',
          { closeThresholdDays: daysBeforeClose, aggressionLevel: level },
        ),
      );
    }

    // Check exempt labels
    const exemptLabels = extractExemptLabels(staleContent);
    if (exemptLabels.length > 0) {
      findings.push(
        makeFinding(
          Severity.PASS,
          `Stale bot has exempt labels: ${exemptLabels.join(', ')}`,
          'Exempt labels protect important issues from being staled',
          { exemptLabels },
        ),
      );
    } else {
      findings.push(
        makeFinding(
          Severity.WARNING,
          'Stale bot has no exempt labels configured',
          'Add exempt labels for security, bug, pinned, and good first issue to protect important items',
        ),
      );
    }

    return findings;
  }
}
