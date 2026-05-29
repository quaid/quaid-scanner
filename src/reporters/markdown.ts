import { Severity, Pillar, RiskLevel } from '../types/index.js';
import type { ScanReport, Finding, FindingDataSource } from '../types/index.js';

const PILLAR_LABELS: Record<Pillar, string> = {
  [Pillar.SECURITY]: 'Security',
  [Pillar.GOVERNANCE]: 'Governance',
  [Pillar.COMMUNITY]: 'Community',
  [Pillar.AI_READINESS]: 'AI Readiness',
  [Pillar.INCLUSIVE]: 'Inclusive Language',
  [Pillar.TECHNICAL]: 'Technical Rigor',
};

const RISK_EMOJI: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: '🟢',
  [RiskLevel.MEDIUM]: '🟡',
  [RiskLevel.HIGH]: '🟠',
  [RiskLevel.CRITICAL]: '🔴',
};

function findingsBySeverity(findings: Finding[], severity: Severity): Finding[] {
    return findings.filter((f) => f.severity === severity);
}

const DATA_SOURCE_LABELS: Record<FindingDataSource, string> = {
    api: 'external API',
    local: 'local file check',
    heuristic: 'computed heuristic',
};

/**
 * Render the optional dataSource, context, and metadata fields for a finding.
 * Returns an array of markdown lines to splice in after the message line.
 */
function renderFindingExtras(f: Finding): string[] {
    const lines: string[] = [];

    // dataSource label
    if (f.dataSource !== undefined) {
        const label = DATA_SOURCE_LABELS[f.dataSource];
        lines.push(`_(source: ${label})_`);
    }

    // context fenced block
    if (f.context !== undefined) {
        lines.push('');
        lines.push('**Context:**');
        lines.push('```');
        lines.push(f.context);
        lines.push('```');
    }

    // known metadata fields
    if (f.metadata !== undefined) {
        const detailLines: string[] = [];

        if (f.metadata.checkName !== undefined && f.metadata.checkScore !== undefined) {
            detailLines.push(`Check: ${String(f.metadata.checkName)} — ${String(f.metadata.checkScore)}/10`);
        }
        if (f.metadata.branch !== undefined) {
            detailLines.push(`Branch: ${String(f.metadata.branch)}`);
        }
        if (f.metadata.overallScore !== undefined) {
            detailLines.push(`Overall score: ${String(f.metadata.overallScore)}`);
        }

        if (detailLines.length > 0) {
            lines.push('');
            lines.push('**Details:**');
            for (const dl of detailLines) {
                lines.push(dl);
            }
        }
    }

    return lines;
}

export interface MarkdownReportOptions {
  /** Optional ecosystem metadata to include as a dedicated section */
  ecosystem?: {
    name: string;
    language?: string;
    stars?: number;
  };
}

export function renderMarkdown(report: ScanReport, options?: MarkdownReportOptions): string {
  const lines: string[] = [];
  const risk = RISK_EMOJI[report.riskLevel];

  lines.push(`# quaid-scanner Report: ${report.repo}`);
  lines.push('');
  lines.push(`**Score:** ${risk} ${report.overallScore.toFixed(1)}/10 — ${report.riskLevel} risk`);
  lines.push(`**Maturity:** ${report.maturity} | **Depth:** ${report.depth} | **Duration:** ${(report.durationMs / 1000).toFixed(1)}s`);
  lines.push(`**Scanned:** ${report.scannedAt}`);
  lines.push('');

  // Optional ecosystem section
  if (options?.ecosystem) {
    const eco = options.ecosystem;
    lines.push('## Ecosystem');
    lines.push('');
    lines.push(`**Name:** ${eco.name}`);
    if (eco.language) lines.push(`**Language:** ${eco.language}`);
    if (eco.stars !== undefined) lines.push(`**Stars:** ${eco.stars}`);
    lines.push('');
  }

  // Pillar scorecard
  lines.push('## Pillar Scores');
  lines.push('');
  lines.push('| Pillar | Score | Weight | Findings |');
  lines.push('|--------|-------|--------|----------|');
  for (const pillar of Object.values(Pillar)) {
    const p = report.pillars[pillar];
    const counts = `${p.counts.critical}C ${p.counts.warning}W ${p.counts.info}I`;
    lines.push(`| ${PILLAR_LABELS[pillar]} | ${p.score.toFixed(1)} | ${(p.weight * 100).toFixed(0)}% | ${counts} |`);
  }
  lines.push('');

  // Findings grouped by severity
  const criticals = findingsBySeverity(report.findings, Severity.CRITICAL);
  const warnings = findingsBySeverity(report.findings, Severity.WARNING);
  const infos = findingsBySeverity(report.findings, Severity.INFO);

  if (criticals.length > 0) {
    lines.push('## Critical Findings');
    lines.push('');
    for (const f of criticals) {
      lines.push(`### ${f.id}`);
      lines.push(`**Pillar:** ${PILLAR_LABELS[f.pillar as Pillar]} | **Category:** ${f.category}`);
      lines.push('');
      lines.push(f.message);
      const extras = renderFindingExtras(f);
      if (extras.length > 0) {
        lines.push('');
        for (const extra of extras) {
          lines.push(extra);
        }
      }
      if (f.file) lines.push(`\n> File: \`${f.file}\`${f.line ? `:${f.line}` : ''}`);
      lines.push('');
      lines.push(`**Suggestion:** ${f.suggestion}`);
      if (f.referenceUrl) lines.push(`\n**Reference:** ${f.referenceUrl}`);
      lines.push('');
    }
  }

  if (warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const f of warnings) {
      lines.push(`- **[${f.id}]** ${f.message} *(${f.suggestion})*`);
    }
    lines.push('');
  }

  if (infos.length > 0) {
    lines.push('## Info');
    lines.push('');
    for (const f of infos) {
      lines.push(`- **[${f.id}]** ${f.message}`);
    }
    lines.push('');
  }

  if (report.findings.length === 0) {
    lines.push('## Findings');
    lines.push('');
    lines.push('No findings — all checks passed.');
    lines.push('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of report.recommendations) {
      lines.push(`- **[${rec.impact.toUpperCase()} impact / ${rec.effort} effort]** ${rec.action}`);
      if (rec.resources && rec.resources.length > 0) {
        for (const r of rec.resources) lines.push(`  - ${r}`);
      }
    }
    lines.push('');
  }

  // Metadata footer
  lines.push('---');
  lines.push(`*quaid-scanner v${report.version} | ${report.scannedAt}*`);
  if (report.metadata.commitSha) lines.push(`*Commit: ${report.metadata.commitSha}*`);

  return lines.join('\n');
}
