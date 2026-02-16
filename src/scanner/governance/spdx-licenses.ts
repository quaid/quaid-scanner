/**
 * SPDX License List Management module.
 *
 * Provides a static dataset of ~50 common SPDX licenses with lookup,
 * search, and categorization functions. Optionally fetches the full
 * SPDX license list from GitHub with disk-based caching (7-day TTL).
 *
 * This is a utility/data module, NOT a scanner. It provides SPDX
 * license data that other scanners can consume.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export type LicenseCategory =
  | 'permissive'
  | 'copyleft-weak'
  | 'copyleft-strong'
  | 'public-domain'
  | 'proprietary'
  | 'other';

export interface SpdxLicense {
  /** SPDX identifier, e.g., "MIT" */
  id: string;
  /** Human-readable license name, e.g., "MIT License" */
  name: string;
  /** Whether the license is approved by the Open Source Initiative */
  isOsiApproved: boolean;
  /** Whether the license is considered free/libre by the FSF */
  isFsfLibre: boolean;
  /** Whether the SPDX identifier has been deprecated */
  isDeprecated: boolean;
  /** High-level categorization for governance analysis */
  category: LicenseCategory;
}

/** Shape of the SPDX GitHub JSON endpoint response. */
interface SpdxRemoteLicense {
  licenseId: string;
  name: string;
  isOsiApproved: boolean;
  isFsfLibre?: boolean;
  isDeprecatedLicenseId: boolean;
}

interface SpdxRemoteResponse {
  licenseListVersion: string;
  licenses: SpdxRemoteLicense[];
}

/** Shape of the on-disk cache file. */
interface CacheEnvelope {
  fetchedAt: number;
  licenses: SpdxLicense[];
}

// ---------------------------------------------------------------
// Static license data (~50 common licenses)
// ---------------------------------------------------------------

const STATIC_LICENSES: SpdxLicense[] = [
  // --- Permissive ---
  { id: 'MIT', name: 'MIT License', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'Apache-2.0', name: 'Apache License 2.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'BSD-2-Clause', name: 'BSD 2-Clause "Simplified" License', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'BSD-3-Clause', name: 'BSD 3-Clause "New" or "Revised" License', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'ISC', name: 'ISC License', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'BSL-1.0', name: 'Boost Software License 1.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'Artistic-2.0', name: 'Artistic License 2.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'Zlib', name: 'zlib License', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'PostgreSQL', name: 'PostgreSQL License', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'X11', name: 'X11 License', isOsiApproved: false, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'curl', name: 'curl License', isOsiApproved: false, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'BlueOak-1.0.0', name: 'Blue Oak Model License 1.0.0', isOsiApproved: true, isFsfLibre: false, isDeprecated: false, category: 'permissive' },
  { id: 'MIT-0', name: 'MIT No Attribution', isOsiApproved: true, isFsfLibre: false, isDeprecated: false, category: 'permissive' },
  { id: 'Apache-1.1', name: 'Apache License 1.1', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'BSD-3-Clause-LBNL', name: 'Lawrence Berkeley National Labs BSD variant license', isOsiApproved: true, isFsfLibre: false, isDeprecated: false, category: 'permissive' },
  { id: 'MulanPSL-2.0', name: 'Mulan Permissive Software License, Version 2', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'permissive' },
  { id: 'Unicode-3.0', name: 'Unicode License v3', isOsiApproved: true, isFsfLibre: false, isDeprecated: false, category: 'permissive' },

  // --- Copyleft-weak ---
  { id: 'LGPL-2.1-only', name: 'GNU Lesser General Public License v2.1 only', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'LGPL-2.1-or-later', name: 'GNU Lesser General Public License v2.1 or later', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'LGPL-3.0-only', name: 'GNU Lesser General Public License v3.0 only', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'LGPL-3.0-or-later', name: 'GNU Lesser General Public License v3.0 or later', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'MPL-2.0', name: 'Mozilla Public License 2.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'EPL-2.0', name: 'Eclipse Public License 2.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'EPL-1.0', name: 'Eclipse Public License 1.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'EUPL-1.2', name: 'European Union Public License 1.2', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'EUPL-1.1', name: 'European Union Public License 1.1', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'CDDL-1.0', name: 'Common Development and Distribution License 1.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'CDDL-1.1', name: 'Common Development and Distribution License 1.1', isOsiApproved: false, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'CPL-1.0', name: 'Common Public License 1.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },
  { id: 'MPL-1.1', name: 'Mozilla Public License 1.1', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-weak' },

  // --- Copyleft-strong ---
  { id: 'GPL-2.0-only', name: 'GNU General Public License v2.0 only', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-strong' },
  { id: 'GPL-2.0-or-later', name: 'GNU General Public License v2.0 or later', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-strong' },
  { id: 'GPL-3.0-only', name: 'GNU General Public License v3.0 only', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-strong' },
  { id: 'GPL-3.0-or-later', name: 'GNU General Public License v3.0 or later', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-strong' },
  { id: 'AGPL-3.0-only', name: 'GNU Affero General Public License v3.0 only', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-strong' },
  { id: 'AGPL-3.0-or-later', name: 'GNU Affero General Public License v3.0 or later', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-strong' },
  { id: 'OSL-3.0', name: 'Open Software License 3.0', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'copyleft-strong' },
  { id: 'SSPL-1.0', name: 'Server Side Public License, v 1', isOsiApproved: false, isFsfLibre: false, isDeprecated: false, category: 'copyleft-strong' },

  // --- Public domain ---
  { id: 'Unlicense', name: 'The Unlicense', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'public-domain' },
  { id: 'CC0-1.0', name: 'Creative Commons Zero v1.0 Universal', isOsiApproved: false, isFsfLibre: false, isDeprecated: false, category: 'public-domain' },
  { id: '0BSD', name: 'BSD Zero Clause License', isOsiApproved: true, isFsfLibre: true, isDeprecated: false, category: 'public-domain' },

  // --- Other ---
  { id: 'WTFPL', name: 'Do What The F*ck You Want To Public License', isOsiApproved: false, isFsfLibre: true, isDeprecated: false, category: 'other' },
  { id: 'CC-BY-4.0', name: 'Creative Commons Attribution 4.0 International', isOsiApproved: false, isFsfLibre: true, isDeprecated: false, category: 'other' },
  { id: 'CC-BY-SA-4.0', name: 'Creative Commons Attribution Share Alike 4.0 International', isOsiApproved: false, isFsfLibre: true, isDeprecated: false, category: 'other' },
  { id: 'CC-BY-NC-4.0', name: 'Creative Commons Attribution Non Commercial 4.0 International', isOsiApproved: false, isFsfLibre: false, isDeprecated: false, category: 'other' },
  { id: 'CC-BY-NC-SA-4.0', name: 'Creative Commons Attribution Non Commercial Share Alike 4.0 International', isOsiApproved: false, isFsfLibre: false, isDeprecated: false, category: 'other' },

  // --- Deprecated SPDX identifiers (kept for backward compatibility) ---
  { id: 'GPL-2.0', name: 'GNU General Public License v2.0 only (deprecated ID)', isOsiApproved: true, isFsfLibre: true, isDeprecated: true, category: 'copyleft-strong' },
  { id: 'GPL-3.0', name: 'GNU General Public License v3.0 only (deprecated ID)', isOsiApproved: true, isFsfLibre: true, isDeprecated: true, category: 'copyleft-strong' },
  { id: 'AGPL-3.0', name: 'GNU Affero General Public License v3.0 (deprecated ID)', isOsiApproved: true, isFsfLibre: true, isDeprecated: true, category: 'copyleft-strong' },
  { id: 'LGPL-2.1', name: 'GNU Lesser General Public License v2.1 (deprecated ID)', isOsiApproved: true, isFsfLibre: true, isDeprecated: true, category: 'copyleft-weak' },
  { id: 'LGPL-3.0', name: 'GNU Lesser General Public License v3.0 (deprecated ID)', isOsiApproved: true, isFsfLibre: true, isDeprecated: true, category: 'copyleft-weak' },
];

// ---------------------------------------------------------------
// Build the public static map
// ---------------------------------------------------------------

/**
 * Static map of SPDX license IDs to their metadata.
 * Contains ~50 of the most commonly used licenses.
 */
export const SPDX_LICENSES: ReadonlyMap<string, SpdxLicense> = new Map(
  STATIC_LICENSES.map((lic) => [lic.id, lic])
);

/**
 * Lowercase ID -> canonical ID for case-insensitive lookup.
 */
const LOWER_INDEX: ReadonlyMap<string, string> = new Map(
  STATIC_LICENSES.map((lic) => [lic.id.toLowerCase(), lic.id])
);

// ---------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------

/** Cache TTL: 7 days in milliseconds. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Cache file name used inside the cache directory. */
const CACHE_FILE_NAME = 'spdx-licenses.json';

/** SPDX license list JSON URL on GitHub. */
const SPDX_JSON_URL =
  'https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json';

// ---------------------------------------------------------------
// Category inference for remotely fetched licenses
// ---------------------------------------------------------------

/**
 * Attempt to infer a category for a remotely-fetched license based
 * on its SPDX identifier. This is best-effort; unknown patterns
 * default to 'other'.
 */
function inferCategory(licenseId: string): LicenseCategory {
  const id = licenseId.toUpperCase();

  if (id.startsWith('AGPL')) return 'copyleft-strong';
  if (id.startsWith('GPL')) return 'copyleft-strong';
  if (id.startsWith('LGPL')) return 'copyleft-weak';
  if (id.startsWith('MPL')) return 'copyleft-weak';
  if (id.startsWith('EPL')) return 'copyleft-weak';
  if (id.startsWith('EUPL')) return 'copyleft-weak';
  if (id.startsWith('CDDL')) return 'copyleft-weak';
  if (id.startsWith('CPL')) return 'copyleft-weak';
  if (id === 'OSL-3.0' || id.startsWith('OSL-')) return 'copyleft-strong';
  if (id === 'SSPL-1.0') return 'copyleft-strong';

  if (id === 'CC0-1.0' || id === '0BSD' || id === 'UNLICENSE') return 'public-domain';

  // Common permissive patterns
  if (
    id.startsWith('MIT') ||
    id.startsWith('APACHE') ||
    id.startsWith('BSD') ||
    id === 'ISC' ||
    id.startsWith('BSL') ||
    id.startsWith('ZLIB') ||
    id === 'POSTGRESQL' ||
    id.startsWith('ARTISTIC')
  ) {
    return 'permissive';
  }

  return 'other';
}

// ---------------------------------------------------------------
// SpdxLicenseManager
// ---------------------------------------------------------------

/**
 * Utility class for SPDX license data lookup, search, and
 * optional remote fetching with disk-based caching.
 */
export class SpdxLicenseManager {
  /**
   * Look up a license by its SPDX identifier (case-insensitive).
   *
   * @param id - The SPDX license identifier
   * @returns The license metadata, or null if not found
   */
  getLicense(id: string): SpdxLicense | null {
    if (!id) return null;
    const canonicalId = LOWER_INDEX.get(id.toLowerCase());
    if (!canonicalId) return null;
    return SPDX_LICENSES.get(canonicalId) ?? null;
  }

  /**
   * Check whether a given SPDX license ID is OSI-approved.
   *
   * @param id - The SPDX license identifier
   * @returns true if the license is OSI-approved, false otherwise
   */
  isOsiApproved(id: string): boolean {
    return this.getLicense(id)?.isOsiApproved ?? false;
  }

  /**
   * Get the category of a given SPDX license.
   *
   * @param id - The SPDX license identifier
   * @returns The category string, or null if license is unknown
   */
  getCategory(id: string): LicenseCategory | null {
    return this.getLicense(id)?.category ?? null;
  }

  /**
   * Return all SPDX license IDs in the static dataset.
   */
  getAllLicenseIds(): string[] {
    return Array.from(SPDX_LICENSES.keys());
  }

  /**
   * Search licenses by partial match on ID or name (case-insensitive).
   *
   * @param query - The search string
   * @returns Array of matching SpdxLicense objects
   */
  searchLicenses(query: string): SpdxLicense[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const results: SpdxLicense[] = [];

    for (const license of SPDX_LICENSES.values()) {
      if (
        license.id.toLowerCase().includes(lowerQuery) ||
        license.name.toLowerCase().includes(lowerQuery)
      ) {
        results.push(license);
      }
    }

    return results;
  }

  /**
   * Fetch the latest SPDX license list from GitHub.
   *
   * Uses disk-based caching with a 7-day TTL. Falls back to the
   * static bundled data if the fetch fails or the network is unavailable.
   *
   * @param cacheDir - Directory to store the cache file.
   *                   Defaults to a temp directory.
   * @returns Array of SpdxLicense objects from the remote list
   */
  async fetchLatestList(cacheDir?: string): Promise<SpdxLicense[]> {
    const resolvedCacheDir = cacheDir ?? path.join(os.tmpdir(), 'quaid-scanner-spdx');
    const cacheFile = path.join(resolvedCacheDir, CACHE_FILE_NAME);

    // Try reading from cache first
    const cached = this.readCache(cacheFile);
    if (cached) {
      return cached;
    }

    // Attempt remote fetch
    try {
      const response = await fetch(SPDX_JSON_URL);
      if (!response.ok) {
        return this.staticFallback();
      }

      const data = (await response.json()) as SpdxRemoteResponse;
      const licenses = this.mapRemoteLicenses(data.licenses);

      // Write to cache
      this.writeCache(resolvedCacheDir, cacheFile, licenses);

      return licenses;
    } catch {
      return this.staticFallback();
    }
  }

  // --- Private helpers ---

  /**
   * Read and validate the disk cache. Returns the cached licenses
   * if the cache exists and is within TTL, otherwise null.
   */
  private readCache(cacheFile: string): SpdxLicense[] | null {
    try {
      if (!fs.existsSync(cacheFile)) return null;
      const raw = fs.readFileSync(cacheFile, 'utf-8');
      const envelope = JSON.parse(raw) as CacheEnvelope;

      if (!envelope.fetchedAt || !Array.isArray(envelope.licenses)) {
        return null;
      }

      const age = Date.now() - envelope.fetchedAt;
      if (age > CACHE_TTL_MS) {
        return null;
      }

      return envelope.licenses;
    } catch {
      return null;
    }
  }

  /**
   * Write fetched licenses to the cache file.
   */
  private writeCache(cacheDir: string, cacheFile: string, licenses: SpdxLicense[]): void {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
      const envelope: CacheEnvelope = {
        fetchedAt: Date.now(),
        licenses,
      };
      fs.writeFileSync(cacheFile, JSON.stringify(envelope), 'utf-8');
    } catch {
      // Non-critical: caching failure should not break the caller
    }
  }

  /**
   * Map remote SPDX license entries to our SpdxLicense interface.
   */
  private mapRemoteLicenses(remoteLicenses: SpdxRemoteLicense[]): SpdxLicense[] {
    return remoteLicenses.map((remote) => {
      // Check if we have a local entry for better category data
      const local = SPDX_LICENSES.get(remote.licenseId);
      return {
        id: remote.licenseId,
        name: remote.name,
        isOsiApproved: remote.isOsiApproved,
        isFsfLibre: remote.isFsfLibre ?? local?.isFsfLibre ?? false,
        isDeprecated: remote.isDeprecatedLicenseId,
        category: local?.category ?? inferCategory(remote.licenseId),
      };
    });
  }

  /**
   * Return a copy of the static license data as a fallback.
   */
  private staticFallback(): SpdxLicense[] {
    return Array.from(SPDX_LICENSES.values());
  }
}
