import { Severity, Pillar, RiskLevel } from '../types/index.js';
import type { ScanReport, Finding } from '../types/index.js';

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

export function renderMarkdown(report: ScanReport): string {
  const lines: string[] = [];
  const risk = RISK_EMOJI[report.riskLevel];

  lines.push(`# quaid-scanner Report: ${report.repo}`);
  lines.push('');
  lines.push(`**Score:** ${risk} ${report.overallScore.toFixed(1)}/10 — ${report.riskLevel} risk`);
  lines.push(`**Maturity:** ${report.maturity} | **Depth:** ${report.depth} | **Duration:** ${(report.durationMs / 1000).toFixed(1)}s`);
  lines.push(`**Scanned:** ${report.scannedAt}`);
  lines.push('');

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
