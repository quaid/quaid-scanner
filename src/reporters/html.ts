import { Severity, Pillar, RiskLevel, PILLAR_WEIGHTS } from '../types/index.js';
import type { ScanReport, Finding } from '../types/index.js';
import { isErrorFinding } from '../issues.js';
import { groupFindings, MAX_GROUP_REFS } from './utils.js';
import type { FindingGroup } from './utils.js';

export interface HtmlReportOptions {
  ecosystem?: { name: string; language?: string; stars?: number };
  /** Collapse repeat-message findings into one grouped entry. Applies to Warnings and Info only. */
  grouped?: boolean;
  /** Override the HTML page <title>. Defaults to "quaid-scanner: {repo}". */
  title?: string;
}

// ── Display mappings ──────────────────────────────────────────────────────────

const PILLAR_LABELS: Record<Pillar, string> = {
  [Pillar.SECURITY]: 'Security',
  [Pillar.GOVERNANCE]: 'Governance',
  [Pillar.COMMUNITY]: 'Community',
  [Pillar.AI_READINESS]: 'AI Readiness',
  [Pillar.INCLUSIVE]: 'Inclusive',
  [Pillar.TECHNICAL]: 'Technical',
};

const PILLAR_ICONS: Record<Pillar, string> = {
  [Pillar.SECURITY]: '🔒',
  [Pillar.GOVERNANCE]: '📋',
  [Pillar.COMMUNITY]: '🤝',
  [Pillar.AI_READINESS]: '🤖',
  [Pillar.INCLUSIVE]: '🌱',
  [Pillar.TECHNICAL]: '⚙️',
};

const RISK_COLOR: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'var(--pass)',
  [RiskLevel.MEDIUM]: 'var(--warning)',
  [RiskLevel.HIGH]: '#ea580c',
  [RiskLevel.CRITICAL]: 'var(--critical)',
};

const SEVERITY_LABELS: Record<number, string> = {
  [Severity.PASS]: 'PASS',
  [Severity.INFO]: 'INFO',
  [Severity.WARNING]: 'WARNING',
  [Severity.CRITICAL]: 'CRITICAL',
};

const INI_TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Tier 1 — Replace Immediately',
  2: 'Tier 2 — Strongly Consider',
  3: 'Tier 3 — Recommended',
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function findingsBySeverity(findings: Finding[], severity: Severity): Finding[] {
  return findings.filter((f) => f.severity === severity);
}

function tierBadge(f: Finding): string {
  const tier = f.metadata?.tier;
  if (tier === 1 || tier === 2 || tier === 3) {
    return `<span class="tier-badge">${INI_TIER_LABELS[tier]}</span>`;
  }
  return '';
}

// ── Score ring SVG (pure SVG, no JS) ─────────────────────────────────────────

function scoreRing(score: number, riskLevel: RiskLevel): string {
  const r = 52;
  const circumference = 2 * Math.PI * r; // ≈ 326.7
  const filled = (score / 10) * circumference;
  const color = RISK_COLOR[riskLevel];
  const displayScore = score.toFixed(1);

  return `
    <svg class="score-ring" viewBox="0 0 120 120" width="120" height="120" aria-label="Score ${displayScore} out of 10">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--border)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none"
        stroke="${color}" stroke-width="10"
        stroke-dasharray="${filled.toFixed(1)} ${(circumference - filled).toFixed(1)}"
        stroke-dashoffset="${(-circumference * 0.25).toFixed(1)}"
        stroke-linecap="round"/>
      <text x="60" y="56" text-anchor="middle" dominant-baseline="central"
            font-size="22" font-weight="700" fill="var(--text)">${displayScore}</text>
      <text x="60" y="76" text-anchor="middle" dominant-baseline="central"
            font-size="10" fill="var(--muted)">/10</text>
    </svg>`;
}

// ── Pillar grid ───────────────────────────────────────────────────────────────

function pillarCard(pillar: Pillar, report: ScanReport): string {
  const p = report.pillars[pillar];
  const pct = Math.min(100, (p.score / 10) * 100).toFixed(0);
  const { critical, warning, info } = p.counts;
  const scoreColor = p.score >= 7 ? 'var(--pass)' : p.score >= 4 ? 'var(--warning)' : 'var(--critical)';

  return `
    <div class="pillar-card">
      <div class="pillar-header">
        <span class="pillar-icon">${PILLAR_ICONS[pillar]}</span>
        <span class="pillar-name">${PILLAR_LABELS[pillar]}</span>
        <span class="pillar-score" style="color:${scoreColor}">${p.score.toFixed(1)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${scoreColor}"></div>
      </div>
      <div class="pillar-counts">
        ${critical > 0 ? `<span class="count-critical">${critical}C</span>` : ''}
        ${warning > 0 ? `<span class="count-warning">${warning}W</span>` : ''}
        ${info > 0 ? `<span class="count-info">${info}I</span>` : ''}
        ${critical === 0 && warning === 0 && info === 0 ? '<span class="count-pass">✓ Clean</span>' : ''}
      </div>
    </div>`;
}

// ── Individual finding card (Criticals) ───────────────────────────────────────

function criticalCard(f: Finding): string {
  const fileRef = f.file
    ? `<div class="finding-file"><code>${esc(f.file)}${f.line ? `:${f.line}` : ''}</code></div>`
    : '';
  const refLink = f.referenceUrl
    ? `<a class="ref-link" href="${esc(f.referenceUrl)}" target="_blank" rel="noopener">Reference ↗</a>`
    : '';
  const ctx = f.context
    ? `<pre class="finding-context"><code>${esc(f.context)}</code></pre>`
    : '';

  return `
    <div class="finding-card critical-card">
      <div class="finding-id">${esc(f.id)}</div>
      <div class="finding-message">${esc(f.message)}</div>
      ${ctx}
      ${fileRef}
      <div class="finding-suggestion">💡 ${esc(f.suggestion)}</div>
      ${refLink}
      ${tierBadge(f)}
    </div>`;
}

// ── Grouped finding row (Warnings / Info) ─────────────────────────────────────

function groupedFindingRow(group: FindingGroup, severity: Severity): string {
  const { key, representative: rep, members } = group;
  const sevClass = severity === Severity.WARNING ? 'warning' : 'info';

  if (members.length === 1) {
    // Single occurrence — render as a plain row
    const fileChip = rep.file
      ? `<code class="file-chip">${esc(rep.file)}${rep.line ? `:${rep.line}` : ''}</code>`
      : '';
    return `
      <div class="finding-row ${sevClass}-row">
        <span class="finding-id-small">${esc(rep.id)}</span>
        ${tierBadge(rep)}
        <span class="finding-msg">${esc(rep.message)}</span>
        ${fileChip}
        <span class="finding-sugg">${esc(rep.suggestion)}</span>
      </div>`;
  }

  // Multi-occurrence grouped row
  const withFile = members.filter((m) => m.file);
  const chips = withFile.slice(0, MAX_GROUP_REFS).map((m) => {
    const loc = m.line ? `${m.file}:${m.line}` : m.file!;
    return `<code class="file-chip">${esc(loc)}</code>`;
  });
  if (withFile.length > MAX_GROUP_REFS) {
    chips.push(`<span class="more-chip">+${withFile.length - MAX_GROUP_REFS} more</span>`);
  }

  const refLink = rep.referenceUrl
    ? ` <a class="ref-link-sm" href="${esc(rep.referenceUrl)}" target="_blank" rel="noopener">↗</a>`
    : '';

  return `
    <div class="finding-row ${sevClass}-row grouped-row">
      <div class="grouped-header">
        <span class="grouped-pillar">[${esc(rep.pillar)}]</span>
        <span class="grouped-key">${esc(key)}</span>
        ${tierBadge(rep)}
        <span class="grouped-count">${members.length} occurrences</span>
      </div>
      <div class="grouped-sugg">${esc(rep.suggestion)}${refLink}</div>
      <div class="grouped-files">${chips.join(' ')}</div>
    </div>`;
}

// ── Inline CSS ────────────────────────────────────────────────────────────────

const INLINE_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#ffffff;--surface:#f8fafc;--surface2:#f1f5f9;
  --border:#e2e8f0;--border2:#cbd5e1;
  --text:#0f172a;--muted:#64748b;--muted2:#94a3b8;
  --critical:#dc2626;--warning:#d97706;--info:#2563eb;--pass:#16a34a;
  --radius:8px;--radius-sm:4px;
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:15px;line-height:1.6;color:var(--text);background:var(--bg);
}
@media(prefers-color-scheme:dark){
  :root{
    --bg:#0f172a;--surface:#1e293b;--surface2:#263449;
    --border:#334155;--border2:#475569;
    --text:#f1f5f9;--muted:#94a3b8;--muted2:#64748b;
  }
}
body{max-width:1100px;margin:0 auto;padding:24px 20px 48px}
a{color:var(--info);text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:'JetBrains Mono','Fira Code','Cascadia Code',monospace;font-size:0.85em;
     background:var(--surface2);padding:1px 5px;border-radius:3px}
pre{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);
    padding:12px;overflow:auto;font-size:0.82em}

/* Header */
.report-header{display:flex;align-items:center;gap:24px;padding:24px;
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:24px}
.header-left{flex:1;min-width:0}
.repo-name{font-size:1.5rem;font-weight:700;margin-bottom:4px;word-break:break-all}
.repo-meta{font-size:0.85rem;color:var(--muted)}
.risk-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;
  border-radius:20px;font-size:0.8rem;font-weight:600;border:1.5px solid currentColor;margin-top:8px}
.risk-LOW{color:var(--pass)}
.risk-MEDIUM{color:var(--warning)}
.risk-HIGH{color:#ea580c}
.risk-CRITICAL{color:var(--critical)}
.score-ring{flex-shrink:0}

/* Pillar grid */
.pillar-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:24px}
.pillar-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:14px;display:flex;flex-direction:column;gap:8px}
.pillar-header{display:flex;align-items:center;gap:6px}
.pillar-icon{font-size:1rem}
.pillar-name{flex:1;font-size:0.82rem;font-weight:600;color:var(--muted)}
.pillar-score{font-size:1.1rem;font-weight:700}
.progress-bar{height:5px;background:var(--border);border-radius:3px;overflow:hidden}
.progress-fill{height:100%;border-radius:3px;transition:width 0.3s}
.pillar-counts{display:flex;gap:6px;flex-wrap:wrap;font-size:0.75rem;font-weight:600}
.count-critical{color:var(--critical)}.count-warning{color:var(--warning)}
.count-info{color:var(--info)}.count-pass{color:var(--pass)}

/* Section */
.section{margin-bottom:20px}
.section summary{cursor:pointer;list-style:none;padding:12px 16px;
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  font-weight:600;font-size:0.95rem;display:flex;align-items:center;gap:8px;
  user-select:none}
.section summary::-webkit-details-marker{display:none}
.section[open] summary{border-bottom-left-radius:0;border-bottom-right-radius:0;border-bottom:none}
.section-body{background:var(--surface);border:1px solid var(--border);
  border-top:none;border-bottom-left-radius:var(--radius);border-bottom-right-radius:var(--radius);
  padding:12px}
.section-count{margin-left:auto;font-size:0.8rem;color:var(--muted);font-weight:400}

/* Critical cards */
.finding-card{border-left:4px solid;border-radius:var(--radius-sm);
  padding:12px 14px;margin-bottom:10px;background:var(--bg)}
.critical-card{border-left-color:var(--critical);background:color-mix(in srgb,var(--critical) 5%,var(--bg))}
.finding-id{font-family:monospace;font-size:0.78rem;color:var(--muted);margin-bottom:4px}
.finding-message{font-weight:500;margin-bottom:6px}
.finding-file{margin-bottom:4px;font-size:0.85rem}
.finding-suggestion{font-size:0.85rem;color:var(--muted);margin-top:6px}
.finding-context{margin:8px 0}
.ref-link{font-size:0.8rem;color:var(--info);margin-top:4px;display:inline-block}

/* Finding rows (Warnings / Info) */
.finding-row{padding:8px 10px;border-bottom:1px solid var(--border);font-size:0.875rem;display:flex;
  flex-wrap:wrap;gap:6px;align-items:baseline}
.finding-row:last-child{border-bottom:none}
.warning-row{border-left:3px solid var(--warning)}
.info-row{border-left:3px solid var(--info)}
.finding-id-small{font-family:monospace;font-size:0.75rem;color:var(--muted);flex-shrink:0}
.finding-msg{flex:1;min-width:200px}
.finding-sugg{font-size:0.8rem;color:var(--muted);width:100%}
.file-chip{background:var(--surface2);padding:1px 6px;border-radius:3px;font-size:0.78rem}
.more-chip{font-size:0.78rem;color:var(--muted);font-style:italic}

/* Grouped rows */
.grouped-row{flex-direction:column;gap:4px}
.grouped-header{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-weight:500}
.grouped-pillar{font-size:0.75rem;color:var(--muted);font-family:monospace}
.grouped-key{flex:1;min-width:180px}
.grouped-count{font-size:0.8rem;color:var(--muted);background:var(--surface2);
  padding:1px 8px;border-radius:10px;flex-shrink:0}
.grouped-sugg{font-size:0.8rem;color:var(--muted)}
.grouped-files{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}
.ref-link-sm{color:var(--info);font-size:0.8rem}

/* Tier badge */
.tier-badge{display:inline-block;font-size:0.72rem;background:color-mix(in srgb,var(--warning) 15%,transparent);
  color:var(--warning);border:1px solid color-mix(in srgb,var(--warning) 30%,transparent);
  padding:1px 7px;border-radius:10px;font-weight:600}

/* Callouts */
.callout{border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;font-size:0.875rem}
.callout-amber{background:color-mix(in srgb,var(--warning) 10%,var(--bg));
  border:1px solid color-mix(in srgb,var(--warning) 30%,transparent)}

/* Recommendations */
.rec-list{list-style:none;display:flex;flex-direction:column;gap:8px;padding:4px 0}
.rec-item{display:flex;gap:10px;align-items:flex-start;padding:10px;
  background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm)}
.rec-priority{font-size:0.75rem;font-weight:700;color:var(--muted);min-width:20px;padding-top:2px}
.rec-action{flex:1}
.impact-badge,.effort-badge{display:inline-block;font-size:0.72rem;font-weight:600;
  padding:1px 7px;border-radius:10px;margin-left:4px}
.impact-high{background:color-mix(in srgb,var(--critical) 12%,transparent);color:var(--critical)}
.impact-medium{background:color-mix(in srgb,var(--warning) 12%,transparent);color:var(--warning)}
.impact-low{background:color-mix(in srgb,var(--pass) 12%,transparent);color:var(--pass)}
.effort-low{background:color-mix(in srgb,var(--pass) 12%,transparent);color:var(--pass)}
.effort-medium{background:color-mix(in srgb,var(--info) 12%,transparent);color:var(--info)}
.effort-high{background:color-mix(in srgb,var(--warning) 12%,transparent);color:var(--warning)}

/* Score rationale table */
table{width:100%;border-collapse:collapse;font-size:0.875rem}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)}
th{background:var(--surface);font-weight:600;color:var(--muted);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em}
tr:last-child td{border-bottom:none;font-weight:700}

/* Section headings */
h2{font-size:1rem;font-weight:700;color:var(--muted);text-transform:uppercase;
  letter-spacing:0.06em;margin:24px 0 12px}

/* Footer */
.report-footer{margin-top:32px;padding-top:16px;border-top:1px solid var(--border);
  font-size:0.78rem;color:var(--muted2);display:flex;gap:16px;flex-wrap:wrap}
`;

// ── Severity JSON replacer (same as serializeJson) ────────────────────────────

function severityReplacer(_key: string, value: unknown): unknown {
  if (_key === 'severity' && typeof value === 'number') {
    return SEVERITY_LABELS[value] ?? String(value);
  }
  return value;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderHtml(report: ScanReport, options?: HtmlReportOptions): string {
  const pageTitle = options?.title ?? `quaid-scanner: ${report.repo}`;

  const allWarnings = findingsBySeverity(report.findings, Severity.WARNING);
  const realWarnings = allWarnings.filter((f) => !isErrorFinding(f));
  const scannerErrorFindings = allWarnings.filter(isErrorFinding);
  const criticals = findingsBySeverity(report.findings, Severity.CRITICAL).filter((f) => !isErrorFinding(f));
  const infos = findingsBySeverity(report.findings, Severity.INFO).filter((f) => !isErrorFinding(f));

  const repoDisplay = report.repo.split('/').pop() ?? report.repo;
  const branchStr = report.metadata.branch ? ` · ${report.metadata.branch}` : '';
  const durStr = (report.durationMs / 1000).toFixed(1);

  // ── Header ───────────────────────────────────────────────────────────────
  const header = `
  <div class="report-header">
    <div class="header-left">
      <div class="repo-name">${esc(repoDisplay)}</div>
      <div class="repo-meta">${esc(report.repo)}${branchStr}</div>
      <div class="repo-meta">Maturity: ${esc(report.maturity)} · Depth: ${esc(report.depth)} · ${durStr}s</div>
      <div class="repo-meta">Scanned: ${esc(report.scannedAt)}</div>
      <div><span class="risk-badge risk-${esc(report.riskLevel)}">${esc(report.riskLevel)} RISK</span></div>
    </div>
    ${scoreRing(report.overallScore, report.riskLevel)}
  </div>`;

  // ── Pillar grid ───────────────────────────────────────────────────────────
  const pillars = Object.values(Pillar).map((p) => pillarCard(p, report)).join('');
  const pillarGrid = `<div class="pillar-grid">${pillars}</div>`;

  // ── Findings sections ─────────────────────────────────────────────────────
  let findingSections = '';

  if (criticals.length > 0) {
    const cards = criticals.map(criticalCard).join('');
    findingSections += `
    <details class="section" open>
      <summary>🔴 Critical Findings <span class="section-count">${criticals.length}</span></summary>
      <div class="section-body">${cards}</div>
    </details>`;
  }

  if (realWarnings.length > 0) {
    let rows: string;
    if (options?.grouped) {
      rows = groupFindings(realWarnings)
        .map((g) => groupedFindingRow(g, Severity.WARNING))
        .join('');
    } else {
      rows = realWarnings.map((f) => `
        <div class="finding-row warning-row">
          <span class="finding-id-small">${esc(f.id)}</span>
          ${tierBadge(f)}
          <span class="finding-msg">${esc(f.message)}</span>
          <span class="finding-sugg">${esc(f.suggestion)}</span>
          ${f.file ? `<code class="file-chip">${esc(f.file)}${f.line ? `:${f.line}` : ''}</code>` : ''}
        </div>`).join('');
    }
    findingSections += `
    <details class="section" open>
      <summary>⚠️ Warnings <span class="section-count">${realWarnings.length} findings</span></summary>
      <div class="section-body">${rows}</div>
    </details>`;
  }

  const showScannerErrors = report.partial || scannerErrorFindings.length > 0;
  if (showScannerErrors) {
    const items = (report.failedScanners?.length
      ? report.failedScanners.map((fs) => `<div><strong>${esc(fs.name)}</strong> — ${esc(fs.message)} (${esc(fs.reason)})</div>`)
      : scannerErrorFindings.map((f) => `<div>${esc(f.message)}</div>`)
    ).join('');
    findingSections += `
    <details class="section" open>
      <summary>⚡ Scanner Errors</summary>
      <div class="section-body">
        <div class="callout callout-amber">
          One or more scanners did not complete. Findings reflect scanner reliability issues, not repo health.
          ${items}
        </div>
      </div>
    </details>`;
  }

  if (infos.length > 0) {
    let rows: string;
    if (options?.grouped) {
      rows = groupFindings(infos)
        .map((g) => groupedFindingRow(g, Severity.INFO))
        .join('');
    } else {
      rows = infos.map((f) => `
        <div class="finding-row info-row">
          <span class="finding-id-small">${esc(f.id)}</span>
          ${tierBadge(f)}
          <span class="finding-msg">${esc(f.message)}</span>
          ${f.file ? `<code class="file-chip">${esc(f.file)}${f.line ? `:${f.line}` : ''}</code>` : ''}
        </div>`).join('');
    }
    findingSections += `
    <details class="section">
      <summary>ℹ️ Info <span class="section-count">${infos.length} findings</span></summary>
      <div class="section-body">${rows}</div>
    </details>`;
  }

  if (report.findings.length === 0) {
    findingSections = `<div class="callout callout-amber">✅ No findings — all checks passed.</div>`;
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  let recsHtml = '';
  if (report.recommendations.length > 0) {
    const items = report.recommendations.map((rec, i) => `
      <li class="rec-item">
        <span class="rec-priority">${i + 1}.</span>
        <div class="rec-action">
          ${esc(rec.action)}
          <span class="impact-badge impact-${rec.impact}">${rec.impact} impact</span>
          <span class="effort-badge effort-${rec.effort}">${rec.effort} effort</span>
          ${rec.resources?.length ? `<div style="margin-top:4px;font-size:0.78rem;color:var(--muted)">${rec.resources.map((r) => `<a href="${esc(r)}">${esc(r)}</a>`).join(' ')}</div>` : ''}
        </div>
      </li>`).join('');
    recsHtml = `<h2>Recommendations</h2><ul class="rec-list">${items}</ul>`;
  }

  // ── Score rationale ───────────────────────────────────────────────────────
  const ratRows = (Object.keys(PILLAR_WEIGHTS) as Pillar[]).map((p) => {
    const ps = report.pillars[p];
    return `<tr>
      <td>${PILLAR_LABELS[p]}</td>
      <td>${(ps.weight * 100).toFixed(0)}%</td>
      <td>${ps.score.toFixed(1)}</td>
      <td>${ps.weightedScore.toFixed(2)}</td>
    </tr>`;
  }).join('');
  const rationaleHtml = `
    <h2>Score Rationale</h2>
    <table>
      <thead><tr><th>Pillar</th><th>Weight</th><th>Score</th><th>Contribution</th></tr></thead>
      <tbody>${ratRows}</tbody>
      <tfoot><tr><td><strong>Overall</strong></td><td>100%</td><td></td><td><strong>${report.overallScore.toFixed(2)}</strong></td></tr></tfoot>
    </table>`;

  // ── JSON embed ────────────────────────────────────────────────────────────
  const jsonEmbed = `<script id="scan-data" type="application/json">${JSON.stringify(report, severityReplacer, 2)}</script>`;

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = `
  <div class="report-footer">
    <span>quaid-scanner v${esc(report.version)}</span>
    <span>${esc(report.scannedAt)}</span>
    ${report.metadata.commitSha ? `<span>Commit: <code>${esc(String(report.metadata.commitSha))}</code></span>` : ''}
  </div>`;

  // ── Assemble ──────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(pageTitle)}</title>
<style>${INLINE_CSS}</style>
</head>
<body>
${header}
${pillarGrid}
${findingSections}
${recsHtml}
${rationaleHtml}
${footer}
${jsonEmbed}
</body>
</html>`;
}
