/**
 * OpenSSF Scorecard caching and historical tracking.
 *
 * Provides a local file-based cache with configurable TTL (default 24 hours)
 * and stores historical score entries for trend analysis over 7/30/90-day
 * windows.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface ScorecardCacheData {
  score: number;
  date: string;
  checks: Array<{ name: string; score: number; reason: string }>;
  scorecardVersion: string;
}

export interface ScorecardCacheEntry extends ScorecardCacheData {
  cachedAt: number;
}

export interface ScorecardHistoryEntry extends ScorecardCacheData {
  recordedAt: number;
}

export interface TrendResult {
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  averageScore: number;
  latestVsAverage: number;
  dataPoints: number;
}

export interface TrendSummary {
  days7: TrendResult | null;
  days30: TrendResult | null;
  days90: TrendResult | null;
}

type CacheStore = Record<string, ScorecardCacheEntry>;
type HistoryStore = Record<string, ScorecardHistoryEntry[]>;

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE = 'scorecard-cache.json';
const HISTORY_FILE = 'scorecard-history.json';

/** Normalize a repo identifier to a consistent lowercase key. */
function normalizeRepo(repo: string): string {
  return repo
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/\/+$/, '');
}

export class ScorecardCache {
  readonly cacheDir: string;
  private readonly ttlMs: number;
  private cacheStore: CacheStore;
  private historyStore: HistoryStore;

  constructor(cacheDir?: string, ttlMs: number = DEFAULT_TTL_MS) {
    this.cacheDir =
      cacheDir ?? path.join(os.homedir(), '.quaid', 'cache', 'scorecard');
    this.ttlMs = ttlMs;

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    this.cacheStore = this.loadJson<CacheStore>(CACHE_FILE, {});
    this.historyStore = this.loadJson<HistoryStore>(HISTORY_FILE, {});
  }

  /** Retrieve a cached scorecard result. Returns null on miss or expiry. */
  get(repo: string): ScorecardCacheData | null {
    const key = normalizeRepo(repo);
    const entry = this.cacheStore[key];
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > this.ttlMs) {
      return null;
    }

    return {
      score: entry.score,
      date: entry.date,
      checks: entry.checks,
      scorecardVersion: entry.scorecardVersion,
    };
  }

  /** Store a scorecard result in cache and append to history. */
  set(repo: string, data: ScorecardCacheData): void {
    const key = normalizeRepo(repo);
    const now = Date.now();

    this.cacheStore[key] = {
      ...data,
      cachedAt: now,
    };

    if (!this.historyStore[key]) {
      this.historyStore[key] = [];
    }

    this.historyStore[key].push({
      ...data,
      recordedAt: now,
    });

    this.persist();
  }

  /** Remove a cached entry for a repo. */
  invalidate(repo: string): void {
    const key = normalizeRepo(repo);
    if (this.cacheStore[key]) {
      delete this.cacheStore[key];
      this.persist();
    }
  }

  /** Retrieve all history entries for a repo, ordered chronologically. */
  getHistory(repo: string): ScorecardHistoryEntry[] {
    const key = normalizeRepo(repo);
    return this.historyStore[key] ?? [];
  }

  /** Calculate a trend over the given number of days. */
  getTrend(repo: string, days: number): TrendResult | null {
    const key = normalizeRepo(repo);
    const history = this.historyStore[key];
    if (!history || history.length < 2) return null;

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = history.filter((h) => h.recordedAt >= cutoff);

    if (filtered.length < 2) return null;

    const scores = filtered.map((h) => h.score);
    const averageScore =
      Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
      100;
    const latest = scores[scores.length - 1];
    const earliest = scores[0];
    const latestVsAverage =
      Math.round((latest - averageScore) * 100) / 100;

    const change = latest - earliest;
    const changePercent =
      earliest === 0
        ? latest > 0
          ? 100
          : 0
        : Math.round((change / earliest) * 100 * 100) / 100;

    // Classify direction: >5% change is significant
    let direction: TrendResult['direction'];
    if (changePercent > 5) {
      direction = 'improving';
    } else if (changePercent < -5) {
      direction = 'declining';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      changePercent,
      averageScore,
      latestVsAverage,
      dataPoints: filtered.length,
    };
  }

  /** Get trend summaries across 7, 30, and 90-day windows. */
  getTrendSummary(repo: string): TrendSummary {
    return {
      days7: this.getTrend(repo, 7),
      days30: this.getTrend(repo, 30),
      days90: this.getTrend(repo, 90),
    };
  }

  /** Load a JSON file from the cache directory, returning fallback on error. */
  private loadJson<T>(filename: string, fallback: T): T {
    const filePath = path.join(this.cacheDir, filename);
    if (!fs.existsSync(filePath)) return fallback;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  /** Persist both cache and history stores to disk. */
  private persist(): void {
    fs.writeFileSync(
      path.join(this.cacheDir, CACHE_FILE),
      JSON.stringify(this.cacheStore, null, 2),
    );
    fs.writeFileSync(
      path.join(this.cacheDir, HISTORY_FILE),
      JSON.stringify(this.historyStore, null, 2),
    );
  }
}
