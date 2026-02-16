/**
 * Source file license header scanner.
 *
 * Detects SPDX-License-Identifier headers in source files and
 * cross-checks them against the root LICENSE file to identify
 * inconsistencies. Reports coverage statistics for header adoption.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** Source file patterns to scan for SPDX headers. */
const SOURCE_PATTERNS: string[] = [
  '**/*.ts',
  '**/*.js',
  '**/*.py',
  '**/*.go',
  '**/*.rs',
  '**/*.java',
  '**/*.c',
  '**/*.cpp',
  '**/*.h',
  '**/*.rb',
  '**/*.sh',
];

/** Directories to exclude from scanning. */
const EXCLUDED_DIRS: string[] = [
  'node_modules/',
  'vendor/',
  '.git/',
  'dist/',
  'build/',
];

/** Maximum number of source files to scan to avoid perf issues on large repos. */
const MAX_FILES_TO_SCAN = 100;

/** Number of lines to read from the top of each file looking for SPDX header. */
const HEADER_SCAN_LINES = 30;

/** Regex pattern to match SPDX-License-Identifier in any comment style. */
const SPDX_HEADER_REGEX = /SPDX-License-Identifier:\s*(.+)/;

/** License file names to check at the repo root (case-insensitive). */
const LICENSE_FILE_NAMES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
];

/**
 * Known license keyword patterns for identifying SPDX IDs from LICENSE file content.
 * More specific licenses listed first to avoid false matches.
 */
const LICENSE_CONTENT_SIGNATURES: Array<{ id: string; keywords: string[] }> = [
  { id: 'MIT', keywords: ['permission is hereby granted, free of charge', 'the software is provided "as is"'] },
  { id: 'Apache-2.0', keywords: ['apache license', 'version 2.0'] },
  { id: 'AGPL-3.0', keywords: ['gnu affero general public license', 'version 3'] },
  { id: 'LGPL-3.0', keywords: ['gnu lesser general public license', 'version 3'] },
  { id: 'GPL-3.0', keywords: ['gnu general public license', 'version 3'] },
  { id: 'GPL-2.0', keywords: ['gnu general public license', 'version 2'] },
  { id: 'BSD-3-Clause', keywords: ['redistribution and use', 'neither the name'] },
  { id: 'BSD-2-Clause', keywords: ['redistribution and use', 'this software is provided'] },
  { id: 'ISC', keywords: ['isc license', 'permission to use, copy, modify'] },
  { id: 'MPL-2.0', keywords: ['mozilla public license', 'version 2.0'] },
];

/**
 * Read a file safely, returning null on failure.
 */
function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Find and identify the root LICENSE file's SPDX ID.
 * Returns the identified SPDX ID or null if not found/unrecognized.
 */
function identifyRootLicense(repoPath: string): string | null {
  let rootEntries: string[];
  try {
    rootEntries = fs.readdirSync(repoPath);
  } catch {
    return null;
  }

  const fileMap = new Map<string, string>();
  for (const entry of rootEntries) {
    fileMap.set(entry.toLowerCase(), entry);
  }

  for (const licenseName of LICENSE_FILE_NAMES) {
    const actualName = fileMap.get(licenseName.toLowerCase());
    if (actualName) {
      const fullPath = path.join(repoPath, actualName);
      const content = readFileSafe(fullPath);
      if (content !== null) {
        return identifyLicenseFromContent(content);
      }
    }
  }

  return null;
}

/**
 * Match license text against known signatures to get an SPDX ID.
 */
function identifyLicenseFromContent(content: string): string | null {
  const normalized = content.toLowerCase();
  for (const sig of LICENSE_CONTENT_SIGNATURES) {
    const allMatch = sig.keywords.every((kw) => normalized.includes(kw.toLowerCase()));
    if (allMatch) {
      return sig.id;
    }
  }
  return null;
}

/**
 * Check whether a root LICENSE file exists at all (regardless of recognition).
 */
function hasRootLicenseFile(repoPath: string): boolean {
  let rootEntries: string[];
  try {
    rootEntries = fs.readdirSync(repoPath);
  } catch {
    return false;
  }

  const fileMap = new Map<string, string>();
  for (const entry of rootEntries) {
    fileMap.set(entry.toLowerCase(), entry);
  }

  for (const licenseName of LICENSE_FILE_NAMES) {
    if (fileMap.has(licenseName.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Parsed SPDX header info from a source file.
 */
interface HeaderInfo {
  relativePath: string;
  spdxId: string;
  line: number;
}

/**
 * Scan the first N lines of a file for an SPDX-License-Identifier header.
 * Returns the parsed header info or null if not found.
 */
function scanFileForHeader(
  absolutePath: string,
  repoPath: string,
  maxLines: number
): HeaderInfo | null {
  const content = readFileSafe(absolutePath);
  if (content === null) return null;

  const lines = content.split('\n').slice(0, maxLines);
  for (let i = 0; i < lines.length; i++) {
    const match = SPDX_HEADER_REGEX.exec(lines[i]);
    if (match) {
      const spdxId = match[1].trim().replace(/\s*\*\/\s*$/, '');
      const relativePath = path.relative(repoPath, absolutePath);
      return { relativePath, spdxId, line: i + 1 };
    }
  }

  return null;
}

/**
 * Scanner that detects SPDX-License-Identifier headers in source files
 * and cross-checks them with the root LICENSE file.
 */
export class LicenseHeaderScanner implements Scanner {
  readonly name = 'license-header-scanner';
  readonly displayName = 'Source File License Headers';
  readonly pillar = Pillar.GOVERNANCE;

  /**
   * Run the license header scan.
   *
   * @param context - The scan context containing repo path and configuration
   * @returns Array of findings about license header status
   */
  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];

    // Step 1: Find source files
    const sourceFiles = await this.findSourceFiles(repoPath);

    if (sourceFiles.length === 0) {
      return [this.createNoSourceFilesFinding()];
    }

    // Step 2: Identify root license
    const rootLicense = identifyRootLicense(repoPath);
    const rootLicenseFileExists = hasRootLicenseFile(repoPath);

    // Step 3: Scan each file for SPDX headers
    const headers: HeaderInfo[] = [];
    for (const filePath of sourceFiles) {
      const header = scanFileForHeader(filePath, repoPath, HEADER_SCAN_LINES);
      if (header) {
        headers.push(header);
      }
    }

    // Step 4: Determine unique license IDs from headers
    const headerLicenseIds = [...new Set(headers.map((h) => h.spdxId))];

    // Step 5: Build findings
    if (headers.length === 0) {
      // No headers found at all
      findings.push(this.createNoHeadersFinding(sourceFiles.length, rootLicense));
    } else {
      // Cross-check headers with root license
      if (rootLicense !== null) {
        // Check for mismatches
        const mismatched = headers.filter((h) => h.spdxId !== rootLicense);
        const matched = headers.filter((h) => h.spdxId === rootLicense);

        if (mismatched.length === 0) {
          // All headers match
          findings.push(
            this.createConsistentFinding(matched.length, sourceFiles.length, rootLicense)
          );
        } else {
          // Some headers mismatch
          for (const mismatch of mismatched) {
            findings.push(
              this.createMismatchFinding(mismatch, rootLicense)
            );
          }
          if (matched.length > 0) {
            findings.push(
              this.createConsistentFinding(matched.length, sourceFiles.length, rootLicense)
            );
          }
        }
      } else if (!rootLicenseFileExists) {
        // Headers exist but no root LICENSE file
        findings.push(this.createNoRootLicenseFinding(headers.length));
      }

      // Summary finding with metadata
      findings.push(
        this.createSummaryFinding(
          sourceFiles.length,
          headers.length,
          headerLicenseIds,
          rootLicense
        )
      );
    }

    return findings;
  }

  /**
   * Find source files matching known extensions, excluding common dirs.
   */
  private async findSourceFiles(repoPath: string): Promise<string[]> {
    const ignorePatterns = EXCLUDED_DIRS.map((d) => `**/${d}**`);

    const files = await glob(SOURCE_PATTERNS, {
      cwd: repoPath,
      absolute: true,
      nodir: true,
      ignore: ignorePatterns,
    });

    // Limit to MAX_FILES_TO_SCAN to avoid perf issues
    return files.slice(0, MAX_FILES_TO_SCAN);
  }

  /**
   * Finding when no source files are found in the repo.
   */
  private createNoSourceFilesFinding(): Finding {
    return {
      id: 'license-header-scanner:no-source-files',
      severity: Severity.INFO,
      pillar: Pillar.GOVERNANCE,
      category: 'license-headers',
      message: 'No source files found to scan for SPDX license headers.',
      file: null,
      line: 0,
      column: null,
      suggestion: 'This check applies to repositories containing source code files.',
      metadata: {
        filesScanned: 0,
        filesWithHeaders: 0,
        headerLicenseIds: [],
        rootLicense: null,
      },
    };
  }

  /**
   * Finding when source files exist but none contain SPDX headers.
   */
  private createNoHeadersFinding(filesScanned: number, rootLicense: string | null): Finding {
    return {
      id: 'license-header-scanner:no-headers',
      severity: Severity.INFO,
      pillar: Pillar.GOVERNANCE,
      category: 'license-headers',
      message: `No SPDX license headers found in ${filesScanned} source file(s).`,
      file: null,
      line: 0,
      column: null,
      suggestion:
        'Consider adding SPDX-License-Identifier headers to source files for clear per-file licensing. See https://spdx.dev/learn/handling-license-info/',
      metadata: {
        filesScanned,
        filesWithHeaders: 0,
        headerLicenseIds: [],
        rootLicense,
      },
    };
  }

  /**
   * Finding when headers match the root license consistently.
   */
  private createConsistentFinding(
    matchCount: number,
    totalScanned: number,
    rootLicense: string
  ): Finding {
    return {
      id: `license-header-scanner:consistent:${rootLicense}`,
      severity: Severity.PASS,
      pillar: Pillar.GOVERNANCE,
      category: 'license-headers',
      message: `${matchCount} of ${totalScanned} source file(s) have SPDX headers consistent with root LICENSE (${rootLicense}).`,
      file: null,
      line: 0,
      column: null,
      suggestion: 'License headers are consistent with the project license.',
      referenceUrl: `https://spdx.org/licenses/${rootLicense}.html`,
      metadata: {
        matchCount,
        rootLicense,
      },
    };
  }

  /**
   * Finding for a file with a mismatched SPDX header.
   */
  private createMismatchFinding(header: HeaderInfo, rootLicense: string): Finding {
    return {
      id: `license-header-scanner:inconsistent:${header.relativePath}`,
      severity: Severity.WARNING,
      pillar: Pillar.GOVERNANCE,
      category: 'license-headers',
      message: `SPDX header in ${header.relativePath} is inconsistent with root LICENSE: header says "${header.spdxId}" but LICENSE is "${rootLicense}".`,
      file: header.relativePath,
      line: header.line,
      column: null,
      suggestion: `Update the SPDX-License-Identifier in ${header.relativePath} to "${rootLicense}" or verify the intended license for this file.`,
      referenceUrl: 'https://spdx.dev/learn/handling-license-info/',
      metadata: {
        headerLicense: header.spdxId,
        rootLicense,
      },
    };
  }

  /**
   * Finding when headers exist but no root LICENSE file is present.
   */
  private createNoRootLicenseFinding(headerCount: number): Finding {
    return {
      id: 'license-header-scanner:no-root-license',
      severity: Severity.INFO,
      pillar: Pillar.GOVERNANCE,
      category: 'license-headers',
      message: `No root LICENSE file found to cross-check against ${headerCount} file(s) with SPDX headers.`,
      file: null,
      line: 0,
      column: null,
      suggestion: 'Add a LICENSE file to the repository root so SPDX headers can be validated against the project license.',
      referenceUrl: 'https://choosealicense.com/',
    };
  }

  /**
   * Summary finding with scan statistics in metadata.
   */
  private createSummaryFinding(
    filesScanned: number,
    filesWithHeaders: number,
    headerLicenseIds: string[],
    rootLicense: string | null
  ): Finding {
    return {
      id: 'license-header-scanner:summary',
      severity: Severity.INFO,
      pillar: Pillar.GOVERNANCE,
      category: 'license-headers',
      message: `License header scan complete: ${filesWithHeaders} of ${filesScanned} source file(s) have SPDX headers.`,
      file: null,
      line: 0,
      column: null,
      suggestion:
        filesWithHeaders < filesScanned
          ? 'Consider adding SPDX-License-Identifier headers to all source files.'
          : 'All scanned source files have SPDX license headers.',
      metadata: {
        filesScanned,
        filesWithHeaders,
        headerLicenseIds,
        rootLicense,
      },
    };
  }
}
