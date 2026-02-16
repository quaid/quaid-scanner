/**
 * Tests for OpenSSF Scorecard caching and historical tracking.
 *
 * Validates local file-based cache with TTL and trend analysis
 * over 7/30/90-day windows.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  ScorecardCache,
  type ScorecardCacheEntry,
  type ScorecardHistoryEntry,
} from '../../../src/scanner/security/openssf-caching.js';

let tmpDir: string;
let cache: ScorecardCache;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openssf-cache-test-'));
  cache = new ScorecardCache(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('ScorecardCache', () => {
  const repo = 'github.com/owner/repo';
  const sampleData = {
    score: 7.5,
    date: '2026-01-15',
    checks: [
      { name: 'Code-Review', score: 8, reason: 'good reviews' },
      { name: 'Maintained', score: 6, reason: 'recent activity' },
    ],
    scorecardVersion: '4.13.0',
  };

  describe('constructor', () => {
    it('creates cache directory if it does not exist', () => {
      const newDir = path.join(tmpDir, 'subcache');
      expect(fs.existsSync(newDir)).toBe(false);
      new ScorecardCache(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('uses default cache directory when none provided', () => {
      const defaultCache = new ScorecardCache();
      expect(defaultCache.cacheDir).toContain('.quaid');
    });
  });

  describe('get / set', () => {
    it('returns null for a cache miss', () => {
      const result = cache.get(repo);
      expect(result).toBeNull();
    });

    it('stores and retrieves a cache entry', () => {
      cache.set(repo, sampleData);
      const result = cache.get(repo);
      expect(result).not.toBeNull();
      expect(result!.score).toBe(7.5);
      expect(result!.checks).toHaveLength(2);
    });

    it('returns null when entry has expired (24-hour TTL)', () => {
      cache.set(repo, sampleData);

      // Move time 25 hours ahead
      const twentyFiveHours = 25 * 60 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + twentyFiveHours);

      const result = cache.get(repo);
      expect(result).toBeNull();
    });

    it('returns entry within TTL window', () => {
      cache.set(repo, sampleData);

      // Move time 23 hours ahead (still valid)
      const twentyThreeHours = 23 * 60 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + twentyThreeHours);

      const result = cache.get(repo);
      expect(result).not.toBeNull();
      expect(result!.score).toBe(7.5);
    });

    it('supports custom TTL', () => {
      const shortCache = new ScorecardCache(tmpDir, 1000); // 1-second TTL
      shortCache.set(repo, sampleData);

      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
      expect(shortCache.get(repo)).toBeNull();
    });

    it('overwrites existing cache entry', () => {
      cache.set(repo, sampleData);
      cache.set(repo, { ...sampleData, score: 9.0 });
      const result = cache.get(repo);
      expect(result!.score).toBe(9.0);
    });
  });

  describe('invalidate', () => {
    it('removes cached entry for a repo', () => {
      cache.set(repo, sampleData);
      expect(cache.get(repo)).not.toBeNull();
      cache.invalidate(repo);
      expect(cache.get(repo)).toBeNull();
    });

    it('does nothing for a nonexistent repo', () => {
      // Should not throw
      cache.invalidate('nonexistent/repo');
    });
  });

  describe('history recording', () => {
    it('records history entry when setting cache', () => {
      cache.set(repo, sampleData);
      const history = cache.getHistory(repo);
      expect(history).toHaveLength(1);
      expect(history[0].score).toBe(7.5);
      expect(history[0].checks).toEqual(sampleData.checks);
    });

    it('accumulates history across multiple sets', () => {
      cache.set(repo, sampleData);
      cache.set(repo, { ...sampleData, score: 8.0, date: '2026-01-16' });
      cache.set(repo, { ...sampleData, score: 6.0, date: '2026-01-17' });

      const history = cache.getHistory(repo);
      expect(history).toHaveLength(3);
      expect(history.map((h) => h.score)).toEqual([7.5, 8.0, 6.0]);
    });

    it('returns empty array for repo with no history', () => {
      const history = cache.getHistory('nonexistent/repo');
      expect(history).toEqual([]);
    });

    it('preserves history when cache entry expires', () => {
      cache.set(repo, sampleData);

      const twentyFiveHours = 25 * 60 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + twentyFiveHours);

      // Cache miss but history still present
      expect(cache.get(repo)).toBeNull();
      expect(cache.getHistory(repo)).toHaveLength(1);
    });
  });

  describe('trend analysis', () => {
    function buildHistory(
      scores: Array<{ score: number; daysAgo: number }>,
    ): void {
      const now = Date.now();
      for (const entry of scores) {
        const timestamp = now - entry.daysAgo * 24 * 60 * 60 * 1000;
        vi.spyOn(Date, 'now').mockReturnValue(timestamp);
        cache.set(repo, { ...sampleData, score: entry.score });
        vi.restoreAllMocks();
      }
    }

    it('returns null trend when fewer than 2 data points', () => {
      cache.set(repo, sampleData);
      const trend = cache.getTrend(repo, 7);
      expect(trend).toBeNull();
    });

    it('detects improving trend', () => {
      buildHistory([
        { score: 5.0, daysAgo: 6 },
        { score: 6.0, daysAgo: 4 },
        { score: 7.5, daysAgo: 2 },
        { score: 8.5, daysAgo: 0 },
      ]);

      const trend = cache.getTrend(repo, 7);
      expect(trend).not.toBeNull();
      expect(trend!.direction).toBe('improving');
      expect(trend!.changePercent).toBeGreaterThan(0);
    });

    it('detects declining trend', () => {
      buildHistory([
        { score: 9.0, daysAgo: 6 },
        { score: 7.0, daysAgo: 4 },
        { score: 5.0, daysAgo: 2 },
        { score: 3.0, daysAgo: 0 },
      ]);

      const trend = cache.getTrend(repo, 7);
      expect(trend).not.toBeNull();
      expect(trend!.direction).toBe('declining');
      expect(trend!.changePercent).toBeLessThan(0);
    });

    it('detects stable trend (small variance)', () => {
      buildHistory([
        { score: 7.0, daysAgo: 6 },
        { score: 7.1, daysAgo: 4 },
        { score: 6.9, daysAgo: 2 },
        { score: 7.0, daysAgo: 0 },
      ]);

      const trend = cache.getTrend(repo, 7);
      expect(trend).not.toBeNull();
      expect(trend!.direction).toBe('stable');
    });

    it('filters history to requested time window', () => {
      buildHistory([
        { score: 3.0, daysAgo: 60 },  // outside 30-day window
        { score: 5.0, daysAgo: 20 },
        { score: 7.0, daysAgo: 10 },
        { score: 8.0, daysAgo: 0 },
      ]);

      const trend30 = cache.getTrend(repo, 30);
      expect(trend30).not.toBeNull();
      expect(trend30!.dataPoints).toBe(3); // only last 30 days

      const trend90 = cache.getTrend(repo, 90);
      expect(trend90).not.toBeNull();
      expect(trend90!.dataPoints).toBe(4); // all 4 entries
    });

    it('computes correct average score', () => {
      buildHistory([
        { score: 4.0, daysAgo: 5 },
        { score: 6.0, daysAgo: 3 },
        { score: 8.0, daysAgo: 1 },
      ]);

      const trend = cache.getTrend(repo, 7);
      expect(trend).not.toBeNull();
      expect(trend!.averageScore).toBe(6.0);
    });

    it('computes latest vs average delta', () => {
      buildHistory([
        { score: 4.0, daysAgo: 5 },
        { score: 6.0, daysAgo: 3 },
        { score: 10.0, daysAgo: 0 },
      ]);

      const trend = cache.getTrend(repo, 7);
      expect(trend).not.toBeNull();
      // average = (4+6+10)/3 ≈ 6.67, latest = 10, delta = +3.33
      expect(trend!.latestVsAverage).toBeGreaterThan(3);
    });
  });

  describe('multi-period summary', () => {
    it('returns trend summaries for 7, 30, and 90 day windows', () => {
      const now = Date.now();
      const entries = [
        { score: 5.0, daysAgo: 80 },
        { score: 6.0, daysAgo: 50 },
        { score: 7.0, daysAgo: 20 },
        { score: 7.5, daysAgo: 5 },
        { score: 8.0, daysAgo: 0 },
      ];
      for (const entry of entries) {
        const timestamp = now - entry.daysAgo * 24 * 60 * 60 * 1000;
        vi.spyOn(Date, 'now').mockReturnValue(timestamp);
        cache.set(repo, { ...sampleData, score: entry.score });
        vi.restoreAllMocks();
      }

      const summary = cache.getTrendSummary(repo);
      expect(summary).toHaveProperty('days7');
      expect(summary).toHaveProperty('days30');
      expect(summary).toHaveProperty('days90');
    });
  });

  describe('file persistence', () => {
    it('persists data across cache instances', () => {
      cache.set(repo, sampleData);

      const cache2 = new ScorecardCache(tmpDir);
      const result = cache2.get(repo);
      expect(result).not.toBeNull();
      expect(result!.score).toBe(7.5);
    });

    it('persists history across cache instances', () => {
      cache.set(repo, sampleData);
      cache.set(repo, { ...sampleData, score: 9.0 });

      const cache2 = new ScorecardCache(tmpDir);
      const history = cache2.getHistory(repo);
      expect(history).toHaveLength(2);
    });

    it('handles corrupted cache file gracefully', () => {
      const cacheFile = path.join(tmpDir, 'scorecard-cache.json');
      fs.writeFileSync(cacheFile, 'not valid json{{{');

      const cache2 = new ScorecardCache(tmpDir);
      const result = cache2.get(repo);
      expect(result).toBeNull();
    });

    it('handles corrupted history file gracefully', () => {
      const historyFile = path.join(tmpDir, 'scorecard-history.json');
      fs.writeFileSync(historyFile, 'corrupted data');

      const cache2 = new ScorecardCache(tmpDir);
      const history = cache2.getHistory(repo);
      expect(history).toEqual([]);
    });
  });

  describe('repo key normalization', () => {
    it('normalizes repo identifiers to consistent keys', () => {
      cache.set('github.com/Owner/Repo', sampleData);
      const result = cache.get('github.com/owner/repo');
      expect(result).not.toBeNull();
    });

    it('handles trailing slashes and .git suffixes', () => {
      cache.set('github.com/owner/repo.git', sampleData);
      const result = cache.get('github.com/owner/repo');
      expect(result).not.toBeNull();
    });
  });
});
