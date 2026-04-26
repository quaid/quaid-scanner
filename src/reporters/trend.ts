import type { TrendData } from '../types/index.js';

const BAR_WIDTH = 40;
const SCORE_MAX = 10;

function scoreBar(score: number): string {
  const filled = Math.round((score / SCORE_MAX) * BAR_WIDTH);
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function renderTrendAscii(data: TrendData): string {
  const lines: string[] = [];
  lines.push(`Score trend for ${data.repo} (last ${data.period.days} days)`);
  lines.push(`Trend: ${data.trend.toUpperCase()}  Change: ${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(1)}%`);
  lines.push('');

  if (data.dataPoints.length === 0) {
    lines.push('  No scan history available for this period.');
    return lines.join('\n');
  }

  const minScore = Math.floor(Math.min(...data.dataPoints.map((p) => p.score)));
  const maxScore = Math.ceil(Math.max(...data.dataPoints.map((p) => p.score)));

  lines.push(`  ${maxScore.toFixed(1)} ┐`);
  for (const point of data.dataPoints) {
    const bar = scoreBar(point.score);
    lines.push(`  ${point.score.toFixed(1)} │${bar} ${formatDate(point.date)}${point.commitSha ? ` (${point.commitSha.slice(0, 7)})` : ''}`);
  }
  lines.push(`  ${minScore.toFixed(1)} ┘`);

  return lines.join('\n');
}

export function alertOnDrop(data: TrendData): string | null {
  if (data.trend !== 'declining') return null;
  const drop = Math.abs(data.changePercent);
  if (drop >= 20) {
    return `ALERT: Score dropped ${drop.toFixed(1)}% over the last ${data.period.days} days — immediate attention recommended`;
  }
  if (drop >= 10) {
    return `WARNING: Score declined ${drop.toFixed(1)}% over the last ${data.period.days} days`;
  }
  return null;
}
