import { describe, it, expect } from 'vitest';
import { renderTrendAscii, alertOnDrop } from '../../src/reporters/trend.js';
import type { TrendData } from '../../src/types/index.js';

function makeTrend(overrides: Partial<TrendData> = {}): TrendData {
  return {
    repo: 'acme/proj',
    period: { start: new Date('2026-04-17'), end: new Date('2026-04-24'), days: 7 },
    trend: 'stable',
    changePercent: 0,
    dataPoints: [],
    newFindings: [],
    resolvedFindings: [],
    ...overrides,
  };
}

describe('renderTrendAscii', () => {
  it('includes repo name and period', () => {
    const out = renderTrendAscii(makeTrend());
    expect(out).toContain('acme/proj');
    expect(out).toContain('7 days');
  });

  it('shows no-history message when dataPoints empty', () => {
    const out = renderTrendAscii(makeTrend());
    expect(out).toContain('No scan history');
  });

  it('renders one row per data point', () => {
    const trend = makeTrend({
      trend: 'improving',
      changePercent: 15,
      dataPoints: [
        { date: new Date('2026-04-22'), score: 6.0, commitSha: 'abc1234' },
        { date: new Date('2026-04-23'), score: 7.5, commitSha: 'def5678' },
      ],
    });
    const out = renderTrendAscii(trend);
    expect(out).toContain('6.0');
    expect(out).toContain('7.5');
    expect(out).toContain('abc1234');
    expect(out).toContain('IMPROVING');
  });
});

describe('alertOnDrop', () => {
  it('returns null for stable or improving trend', () => {
    expect(alertOnDrop(makeTrend({ trend: 'stable' }))).toBeNull();
    expect(alertOnDrop(makeTrend({ trend: 'improving', changePercent: 10 }))).toBeNull();
  });

  it('returns WARNING for 10-19% decline', () => {
    const msg = alertOnDrop(makeTrend({ trend: 'declining', changePercent: -12 }));
    expect(msg).toBeTruthy();
    expect(msg).toContain('WARNING');
  });

  it('returns ALERT for >=20% decline', () => {
    const msg = alertOnDrop(makeTrend({ trend: 'declining', changePercent: -25 }));
    expect(msg).toBeTruthy();
    expect(msg).toContain('ALERT');
  });

  it('returns null for small decline (<10%)', () => {
    const msg = alertOnDrop(makeTrend({ trend: 'declining', changePercent: -4 }));
    expect(msg).toBeNull();
  });
});
