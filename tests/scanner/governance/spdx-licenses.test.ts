/**
 * Tests for the SPDX License List Management module.
 *
 * Validates static license data, lookup functions, search,
 * categorization, and optional remote fetch with caching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  SpdxLicenseManager,
  SPDX_LICENSES,
  type SpdxLicense,
} from '../../../src/scanner/governance/spdx-licenses.js';

describe('SpdxLicenseManager', () => {
  let manager: SpdxLicenseManager;

  beforeEach(() => {
    manager = new SpdxLicenseManager();
  });

  // ---------------------------------------------------------------
  // Static data integrity
  // ---------------------------------------------------------------
  describe('static license data', () => {
    it('contains at least 30 licenses', () => {
      expect(SPDX_LICENSES.size).toBeGreaterThanOrEqual(30);
    });

    it('every license has all required fields', () => {
      for (const [id, license] of SPDX_LICENSES) {
        expect(license.id).toBe(id);
        expect(typeof license.name).toBe('string');
        expect(license.name.length).toBeGreaterThan(0);
        expect(typeof license.isOsiApproved).toBe('boolean');
        expect(typeof license.isFsfLibre).toBe('boolean');
        expect(typeof license.isDeprecated).toBe('boolean');
        expect([
          'permissive',
          'copyleft-weak',
          'copyleft-strong',
          'public-domain',
          'proprietary',
          'other',
        ]).toContain(license.category);
      }
    });

    it('includes the most common SPDX license IDs', () => {
      const requiredIds = [
        'MIT',
        'Apache-2.0',
        'GPL-2.0-only',
        'GPL-3.0-only',
        'LGPL-2.1-only',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'ISC',
        'MPL-2.0',
        'Unlicense',
        'CC0-1.0',
        'AGPL-3.0-only',
      ];

      for (const id of requiredIds) {
        expect(SPDX_LICENSES.has(id)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------
  // getLicense
  // ---------------------------------------------------------------
  describe('getLicense', () => {
    it('returns correct data for MIT', () => {
      const license = manager.getLicense('MIT');

      expect(license).not.toBeNull();
      expect(license!.id).toBe('MIT');
      expect(license!.name).toBe('MIT License');
      expect(license!.isOsiApproved).toBe(true);
      expect(license!.category).toBe('permissive');
    });

    it('returns correct data for Apache-2.0', () => {
      const license = manager.getLicense('Apache-2.0');

      expect(license).not.toBeNull();
      expect(license!.id).toBe('Apache-2.0');
      expect(license!.name).toBe('Apache License 2.0');
      expect(license!.isOsiApproved).toBe(true);
      expect(license!.category).toBe('permissive');
    });

    it('returns correct data for GPL-3.0-only', () => {
      const license = manager.getLicense('GPL-3.0-only');

      expect(license).not.toBeNull();
      expect(license!.id).toBe('GPL-3.0-only');
      expect(license!.isOsiApproved).toBe(true);
      expect(license!.category).toBe('copyleft-strong');
    });

    it('is case-insensitive', () => {
      const lower = manager.getLicense('mit');
      const upper = manager.getLicense('MIT');
      const mixed = manager.getLicense('Mit');

      expect(lower).not.toBeNull();
      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });

    it('returns null for unknown license ID', () => {
      expect(manager.getLicense('NONEXISTENT-LICENSE-99')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(manager.getLicense('')).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // isOsiApproved
  // ---------------------------------------------------------------
  describe('isOsiApproved', () => {
    it('returns true for OSI-approved licenses', () => {
      expect(manager.isOsiApproved('MIT')).toBe(true);
      expect(manager.isOsiApproved('Apache-2.0')).toBe(true);
      expect(manager.isOsiApproved('GPL-3.0-only')).toBe(true);
      expect(manager.isOsiApproved('BSD-3-Clause')).toBe(true);
    });

    it('returns false for non-OSI-approved licenses', () => {
      expect(manager.isOsiApproved('CC0-1.0')).toBe(false);
      expect(manager.isOsiApproved('WTFPL')).toBe(false);
    });

    it('returns false for unknown license IDs', () => {
      expect(manager.isOsiApproved('FAKE-LICENSE')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(manager.isOsiApproved('mit')).toBe(true);
      expect(manager.isOsiApproved('apache-2.0')).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // getCategory
  // ---------------------------------------------------------------
  describe('getCategory', () => {
    it('returns permissive for MIT', () => {
      expect(manager.getCategory('MIT')).toBe('permissive');
    });

    it('returns copyleft-strong for GPL-3.0-only', () => {
      expect(manager.getCategory('GPL-3.0-only')).toBe('copyleft-strong');
    });

    it('returns copyleft-weak for LGPL-2.1-only', () => {
      expect(manager.getCategory('LGPL-2.1-only')).toBe('copyleft-weak');
    });

    it('returns public-domain for Unlicense', () => {
      expect(manager.getCategory('Unlicense')).toBe('public-domain');
    });

    it('returns null for unknown license IDs', () => {
      expect(manager.getCategory('FAKE-LICENSE')).toBeNull();
    });

    it('is case-insensitive', () => {
      expect(manager.getCategory('mit')).toBe('permissive');
    });
  });

  // ---------------------------------------------------------------
  // getAllLicenseIds
  // ---------------------------------------------------------------
  describe('getAllLicenseIds', () => {
    it('returns an array of strings', () => {
      const ids = manager.getAllLicenseIds();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThanOrEqual(30);
      for (const id of ids) {
        expect(typeof id).toBe('string');
      }
    });

    it('includes common license IDs', () => {
      const ids = manager.getAllLicenseIds();

      expect(ids).toContain('MIT');
      expect(ids).toContain('Apache-2.0');
      expect(ids).toContain('GPL-3.0-only');
    });

    it('returns unique IDs', () => {
      const ids = manager.getAllLicenseIds();
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ---------------------------------------------------------------
  // searchLicenses
  // ---------------------------------------------------------------
  describe('searchLicenses', () => {
    it('finds licenses by partial ID match', () => {
      const results = manager.searchLicenses('GPL');

      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(
          r.id.toLowerCase().includes('gpl') || r.name.toLowerCase().includes('gpl')
        ).toBe(true);
      }
    });

    it('finds licenses by partial name match', () => {
      const results = manager.searchLicenses('Mozilla');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === 'MPL-2.0')).toBe(true);
    });

    it('is case-insensitive', () => {
      const lower = manager.searchLicenses('mozilla');
      const upper = manager.searchLicenses('MOZILLA');

      expect(lower).toEqual(upper);
    });

    it('returns empty array when no match found', () => {
      const results = manager.searchLicenses('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('finds MIT by name substring "MIT License"', () => {
      const results = manager.searchLicenses('MIT License');
      expect(results.some((r) => r.id === 'MIT')).toBe(true);
    });

    it('returns multiple results for broad queries', () => {
      const results = manager.searchLicenses('BSD');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for empty query', () => {
      const results = manager.searchLicenses('');
      expect(results).toEqual([]);
    });
  });

  // ---------------------------------------------------------------
  // fetchLatestList (with mocking)
  // ---------------------------------------------------------------
  describe('fetchLatestList', () => {
    let tmpCacheDir: string;

    beforeEach(() => {
      tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spdx-test-cache-'));
    });

    afterEach(() => {
      fs.rmSync(tmpCacheDir, { recursive: true, force: true });
      vi.restoreAllMocks();
    });

    it('returns static data when fetch fails', async () => {
      // Mock global fetch to reject
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await manager.fetchLatestList(tmpCacheDir);

      expect(result.length).toBeGreaterThanOrEqual(30);
      // Should be the same as our static data
      const staticIds = manager.getAllLicenseIds().sort();
      const fetchedIds = result.map((l) => l.id).sort();
      expect(fetchedIds).toEqual(staticIds);
    });

    it('parses SPDX JSON response and returns licenses', async () => {
      const mockResponse = {
        licenseListVersion: '3.25.0',
        licenses: [
          {
            licenseId: 'MIT',
            name: 'MIT License',
            isOsiApproved: true,
            isFsfLibre: true,
            isDeprecatedLicenseId: false,
          },
          {
            licenseId: 'Apache-2.0',
            name: 'Apache License 2.0',
            isOsiApproved: true,
            isFsfLibre: true,
            isDeprecatedLicenseId: false,
          },
          {
            licenseId: 'GPL-3.0-only',
            name: 'GNU General Public License v3.0 only',
            isOsiApproved: true,
            isFsfLibre: true,
            isDeprecatedLicenseId: false,
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await manager.fetchLatestList(tmpCacheDir);

      expect(result.length).toBe(3);
      expect(result[0].id).toBe('MIT');
      expect(result[0].name).toBe('MIT License');
      expect(result[0].isOsiApproved).toBe(true);
    });

    it('caches fetched data to disk', async () => {
      const mockResponse = {
        licenseListVersion: '3.25.0',
        licenses: [
          {
            licenseId: 'MIT',
            name: 'MIT License',
            isOsiApproved: true,
            isFsfLibre: true,
            isDeprecatedLicenseId: false,
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await manager.fetchLatestList(tmpCacheDir);

      const cacheFile = path.join(tmpCacheDir, 'spdx-licenses.json');
      expect(fs.existsSync(cacheFile)).toBe(true);

      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      expect(cached.licenses).toBeDefined();
      expect(cached.fetchedAt).toBeDefined();
    });

    it('uses cached data when cache is fresh (within TTL)', async () => {
      // Write a fresh cache file
      const cacheFile = path.join(tmpCacheDir, 'spdx-licenses.json');
      const cachedData = {
        fetchedAt: Date.now(),
        licenses: [
          {
            id: 'MIT',
            name: 'MIT License',
            isOsiApproved: true,
            isFsfLibre: true,
            isDeprecated: false,
            category: 'permissive' as const,
          },
        ],
      };
      fs.writeFileSync(cacheFile, JSON.stringify(cachedData), 'utf-8');

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const result = await manager.fetchLatestList(tmpCacheDir);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('MIT');
    });

    it('refetches when cache is expired', async () => {
      // Write an expired cache file (8 days old)
      const cacheFile = path.join(tmpCacheDir, 'spdx-licenses.json');
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const cachedData = {
        fetchedAt: eightDaysAgo,
        licenses: [
          {
            id: 'OLD-LICENSE',
            name: 'Old License',
            isOsiApproved: false,
            isFsfLibre: false,
            isDeprecated: true,
            category: 'other' as const,
          },
        ],
      };
      fs.writeFileSync(cacheFile, JSON.stringify(cachedData), 'utf-8');

      const mockResponse = {
        licenseListVersion: '3.25.0',
        licenses: [
          {
            licenseId: 'MIT',
            name: 'MIT License',
            isOsiApproved: true,
            isFsfLibre: true,
            isDeprecatedLicenseId: false,
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await manager.fetchLatestList(tmpCacheDir);

      expect(result[0].id).toBe('MIT');
    });

    it('falls back to static data when HTTP response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await manager.fetchLatestList(tmpCacheDir);

      // Should return static data as fallback
      expect(result.length).toBeGreaterThanOrEqual(30);
    });
  });

  // ---------------------------------------------------------------
  // Category classification correctness
  // ---------------------------------------------------------------
  describe('license category classification', () => {
    it('classifies permissive licenses correctly', () => {
      const permissiveIds = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'];
      for (const id of permissiveIds) {
        expect(manager.getCategory(id)).toBe('permissive');
      }
    });

    it('classifies copyleft-strong licenses correctly', () => {
      const copyleftStrongIds = ['GPL-2.0-only', 'GPL-3.0-only', 'AGPL-3.0-only'];
      for (const id of copyleftStrongIds) {
        expect(manager.getCategory(id)).toBe('copyleft-strong');
      }
    });

    it('classifies copyleft-weak licenses correctly', () => {
      const copyleftWeakIds = ['LGPL-2.1-only', 'LGPL-3.0-only', 'MPL-2.0'];
      for (const id of copyleftWeakIds) {
        expect(manager.getCategory(id)).toBe('copyleft-weak');
      }
    });

    it('classifies public-domain licenses correctly', () => {
      const publicDomainIds = ['Unlicense', 'CC0-1.0', '0BSD'];
      for (const id of publicDomainIds) {
        expect(manager.getCategory(id)).toBe('public-domain');
      }
    });
  });

  // ---------------------------------------------------------------
  // FSF libre flag
  // ---------------------------------------------------------------
  describe('FSF libre flag', () => {
    it('MIT is FSF libre', () => {
      expect(manager.getLicense('MIT')!.isFsfLibre).toBe(true);
    });

    it('Apache-2.0 is FSF libre', () => {
      expect(manager.getLicense('Apache-2.0')!.isFsfLibre).toBe(true);
    });

    it('GPL-3.0-only is FSF libre', () => {
      expect(manager.getLicense('GPL-3.0-only')!.isFsfLibre).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // Deprecated flag
  // ---------------------------------------------------------------
  describe('deprecated flag', () => {
    it('marks deprecated licenses correctly', () => {
      // GPL-2.0 (without -only/-or-later) is deprecated in SPDX 3.x
      const deprecated = manager.getLicense('GPL-2.0');
      if (deprecated) {
        expect(deprecated.isDeprecated).toBe(true);
      }
    });

    it('non-deprecated licenses are not flagged', () => {
      expect(manager.getLicense('MIT')!.isDeprecated).toBe(false);
      expect(manager.getLicense('Apache-2.0')!.isDeprecated).toBe(false);
      expect(manager.getLicense('GPL-3.0-only')!.isDeprecated).toBe(false);
    });
  });
});
