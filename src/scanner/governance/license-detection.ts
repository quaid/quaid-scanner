/**
 * License detection and identification scanner.
 *
 * Detects the presence and type of project license from LICENSE files,
 * package.json, and pyproject.toml. Uses keyword-based matching to
 * identify common SPDX license identifiers with confidence scoring.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { Pillar, Severity } from '../../types/index.js';

/** File names to check for license files (case-insensitive matching). */
const LICENSE_FILE_NAMES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt',
];

/**
 * License signature definition for keyword-based matching.
 * Each signature contains keywords that must ALL be present
 * in the license text (case-insensitive) for a match.
 */
interface LicenseSignature {
  id: string;
  keywords: string[];
  confidence: number;
}

/**
 * Bundled set of known SPDX license signatures with discriminating keywords.
 * Order matters: more specific licenses should appear before more general ones
 * to avoid false positives (e.g., LGPL-3.0 before GPL-3.0).
 */
const LICENSE_SIGNATURES: LicenseSignature[] = [
  {
    id: 'MIT',
    keywords: ['permission is hereby granted, free of charge', 'the software is provided "as is"'],
    confidence: 95,
  },
  {
    id: 'Apache-2.0',
    keywords: ['apache license', 'version 2.0'],
    confidence: 95,
  },
  {
    id: 'AGPL-3.0',
    keywords: ['gnu affero general public license', 'version 3'],
    confidence: 90,
  },
  {
    id: 'LGPL-3.0',
    keywords: ['gnu lesser general public license', 'version 3'],
    confidence: 90,
  },
  {
    id: 'GPL-3.0',
    keywords: ['gnu general public license', 'version 3'],
    confidence: 90,
  },
  {
    id: 'GPL-2.0',
    keywords: ['gnu general public license', 'version 2'],
    confidence: 90,
  },
  {
    id: 'BSD-3-Clause',
    keywords: ['redistribution and use', 'neither the name'],
    confidence: 85,
  },
  {
    id: 'BSD-2-Clause',
    keywords: ['redistribution and use', 'this software is provided'],
    confidence: 80,
  },
  {
    id: 'ISC',
    keywords: ['isc license', 'permission to use, copy, modify'],
    confidence: 90,
  },
  {
    id: 'MPL-2.0',
    keywords: ['mozilla public license', 'version 2.0'],
    confidence: 90,
  },
  {
    id: 'Unlicense',
    keywords: ['this is free and unencumbered software', 'public domain'],
    confidence: 90,
  },
  {
    id: 'CC0-1.0',
    keywords: ['cc0 1.0 universal', 'creative commons'],
    confidence: 90,
  },
];

/**
 * Read a file and return its content, or null if the file cannot be read.
 */
function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Match license text against known SPDX license signatures.
 * Returns the best match or null if no match is found.
 */
function identifyLicenseByContent(content: string): { id: string; confidence: number } | null {
  const normalizedContent = content.toLowerCase();

  for (const signature of LICENSE_SIGNATURES) {
    const allKeywordsMatch = signature.keywords.every(
      (keyword) => normalizedContent.includes(keyword.toLowerCase())
    );

    if (allKeywordsMatch) {
      return { id: signature.id, confidence: signature.confidence };
    }
  }

  return null;
}

/**
 * Try to find and read a license file from the repo root.
 * Returns the file name and content if found, otherwise null.
 */
function findLicenseFile(repoPath: string): { fileName: string; content: string } | null {
  // Read all files in the root directory
  let rootEntries: string[];
  try {
    rootEntries = fs.readdirSync(repoPath);
  } catch {
    return null;
  }

  // Build a map of lowercase filename -> actual filename
  const fileMap = new Map<string, string>();
  for (const entry of rootEntries) {
    fileMap.set(entry.toLowerCase(), entry);
  }

  // Check each known license file name (case-insensitive)
  for (const licenseName of LICENSE_FILE_NAMES) {
    const actualName = fileMap.get(licenseName.toLowerCase());
    if (actualName) {
      const fullPath = path.join(repoPath, actualName);
      const content = readFileSafe(fullPath);
      if (content !== null) {
        return { fileName: actualName, content };
      }
    }
  }

  return null;
}

/**
 * Try to read a license identifier from package.json.
 */
function readPackageJsonLicense(repoPath: string): string | null {
  const pkgPath = path.join(repoPath, 'package.json');
  const content = readFileSafe(pkgPath);
  if (!content) return null;

  try {
    const pkg = JSON.parse(content) as Record<string, unknown>;
    if (typeof pkg.license === 'string' && pkg.license.trim().length > 0) {
      return pkg.license.trim();
    }
  } catch {
    // Invalid JSON
  }

  return null;
}

/**
 * Try to read a license identifier from pyproject.toml.
 * Uses simple regex matching rather than a full TOML parser.
 */
function readPyprojectLicense(repoPath: string): string | null {
  const tomlPath = path.join(repoPath, 'pyproject.toml');
  const content = readFileSafe(tomlPath);
  if (!content) return null;

  // Check for inline table format: license = {text = "MIT"}
  const inlineMatch = content.match(/license\s*=\s*\{[^}]*text\s*=\s*"([^"]+)"/);
  if (inlineMatch) {
    return inlineMatch[1].trim();
  }

  // Check for simple string format: license = "MIT"
  const simpleMatch = content.match(/license\s*=\s*"([^"]+)"/);
  if (simpleMatch) {
    return simpleMatch[1].trim();
  }

  return null;
}


/**
 * Scanner that detects and identifies project licenses.
 *
 * Checks for license files (LICENSE, LICENSE.md, LICENSE.txt, COPYING),
 * falls back to package.json and pyproject.toml license fields, and
 * uses keyword-based matching to identify SPDX license identifiers.
 */
export class LicenseDetectionScanner implements Scanner {
  readonly name = 'license-detection-scanner';
  readonly displayName = 'License Detection & Identification';
  readonly pillar = Pillar.GOVERNANCE;

  /**
   * Run the license detection scan.
   *
   * @param context - The scan context containing repo path and configuration
   * @returns Array of findings (exactly one finding per scan)
   */
  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;

    // Step 1: Try to find a LICENSE file
    const licenseFile = findLicenseFile(repoPath);
    if (licenseFile) {
      return [this.processLicenseFile(licenseFile.fileName, licenseFile.content)];
    }

    // Step 2: Try package.json
    const pkgLicense = readPackageJsonLicense(repoPath);
    if (pkgLicense) {
      return [this.createMetadataFinding(pkgLicense, 'package.json')];
    }

    // Step 3: Try pyproject.toml
    const pyLicense = readPyprojectLicense(repoPath);
    if (pyLicense) {
      return [this.createMetadataFinding(pyLicense, 'pyproject.toml')];
    }

    // No license found
    return [this.createMissingLicenseFinding()];
  }

  /**
   * Process a license file and identify its content.
   */
  private processLicenseFile(fileName: string, content: string): Finding {
    const trimmedContent = content.trim();

    // Empty or whitespace-only file
    if (trimmedContent.length === 0) {
      return this.createUnrecognizedFinding(fileName);
    }

    // Try to identify the license by content
    const match = identifyLicenseByContent(trimmedContent);
    if (match) {
      return this.createDetectedFinding(match.id, match.confidence, 'file', fileName);
    }

    // License file exists but content is not recognized
    return this.createUnrecognizedFinding(fileName);
  }

  /**
   * Create a PASS finding for a successfully detected license.
   */
  private createDetectedFinding(
    licenseId: string,
    confidence: number,
    source: string,
    file: string
  ): Finding {
    return {
      id: `license-detection-scanner:${file}:${licenseId}`,
      severity: Severity.PASS,
      pillar: Pillar.GOVERNANCE,
      category: 'license',
      message: `License detected: ${licenseId} (confidence: ${confidence}%)`,
      file,
      line: null,
      column: null,
      suggestion: 'License is properly declared.',
      referenceUrl: `https://spdx.org/licenses/${licenseId}.html`,
      metadata: {
        licenseId,
        confidence,
        source,
      },
    };
  }

  /**
   * Create a PASS finding for a license read from package metadata (package.json, pyproject.toml).
   */
  private createMetadataFinding(licenseId: string, source: string): Finding {
    return {
      id: `license-detection-scanner:${source}:${licenseId}`,
      severity: Severity.PASS,
      pillar: Pillar.GOVERNANCE,
      category: 'license',
      message: `License detected: ${licenseId} (from ${source})`,
      file: source,
      line: null,
      column: null,
      suggestion: 'Consider also adding a LICENSE file to the repository root for clarity.',
      referenceUrl: `https://spdx.org/licenses/${licenseId}.html`,
      metadata: {
        licenseId,
        confidence: 100,
        source,
      },
    };
  }

  /**
   * Create a CRITICAL finding when no license is detected.
   */
  private createMissingLicenseFinding(): Finding {
    return {
      id: 'license-detection-scanner:missing',
      severity: Severity.CRITICAL,
      pillar: Pillar.GOVERNANCE,
      category: 'license',
      message: 'No license detected. Without a license, the project is under exclusive copyright by default.',
      file: null,
      line: null,
      column: null,
      suggestion: 'Add a LICENSE file to the repository root. Visit https://choosealicense.com/ for guidance.',
      referenceUrl: 'https://choosealicense.com/',
      metadata: {
        licenseId: 'NONE',
        confidence: 100,
        source: 'none',
      },
    };
  }

  /**
   * Create a WARNING finding when a license file exists but content is unrecognized.
   */
  private createUnrecognizedFinding(file: string): Finding {
    return {
      id: `license-detection-scanner:${file}:unrecognized`,
      severity: Severity.WARNING,
      pillar: Pillar.GOVERNANCE,
      category: 'license',
      message: `License file found (${file}) but content is unrecognized. Consider using a standard SPDX-listed license.`,
      file,
      line: null,
      column: null,
      suggestion: 'Use a well-known open source license. Visit https://choosealicense.com/ for guidance.',
      referenceUrl: 'https://choosealicense.com/',
      metadata: {
        licenseId: 'UNKNOWN',
        confidence: 0,
        source: 'file',
      },
    };
  }
}
