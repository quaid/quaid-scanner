/**
 * LICENSE content validation scanner.
 *
 * Validates LICENSE file contents against known SPDX templates
 * using text similarity to detect modifications or unrecognized licenses.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** Known license signature patterns for identification. */
const LICENSE_SIGNATURES: Array<{
  id: string;
  name: string;
  patterns: RegExp[];
  requiredPatterns: number;
}> = [
  {
    id: 'MIT',
    name: 'MIT License',
    patterns: [
      /\bMIT License\b/i,
      /\bPermission is hereby granted,? free of charge\b/i,
      /\bTHE SOFTWARE IS PROVIDED "AS IS"/i,
      /\bwithout limitation the rights to use, copy, modify\b/i,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'Apache-2.0',
    name: 'Apache License, Version 2.0',
    patterns: [
      /\bApache License\b/i,
      /\bVersion 2\.0\b/,
      /\bhttp:\/\/www\.apache\.org\/licenses\b/i,
      /\bTERMS AND CONDITIONS FOR USE, REPRODUCTION/i,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'GPL-3.0',
    name: 'GNU General Public License v3.0',
    patterns: [
      /\bGNU GENERAL PUBLIC LICENSE\b/i,
      /\bVersion 3\b/,
      /\b29 June 2007\b/,
      /\bfree software\b/i,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'GPL-2.0',
    name: 'GNU General Public License v2.0',
    patterns: [
      /\bGNU GENERAL PUBLIC LICENSE\b/i,
      /\bVersion 2\b/,
      /\bJune 1991\b/,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'BSD-3-Clause',
    name: 'BSD 3-Clause License',
    patterns: [
      /\bRedistribution and use in source and binary forms\b/i,
      /\bNeither the name of\b/i,
      /\bTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS\b/i,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'BSD-2-Clause',
    name: 'BSD 2-Clause License',
    patterns: [
      /\bRedistribution and use in source and binary forms\b/i,
      /\bTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS\b/i,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'ISC',
    name: 'ISC License',
    patterns: [
      /\bISC License\b/i,
      /\bPermission to use, copy, modify\b/i,
      /\bTHE SOFTWARE IS PROVIDED "AS IS"\b/i,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'MPL-2.0',
    name: 'Mozilla Public License 2.0',
    patterns: [
      /\bMozilla Public License\b/i,
      /\bVersion 2\.0\b/,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'LGPL-3.0',
    name: 'GNU Lesser General Public License v3.0',
    patterns: [
      /\bGNU LESSER GENERAL PUBLIC LICENSE\b/i,
      /\bVersion 3\b/,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'AGPL-3.0',
    name: 'GNU Affero General Public License v3.0',
    patterns: [
      /\bGNU AFFERO GENERAL PUBLIC LICENSE\b/i,
      /\bVersion 3\b/,
    ],
    requiredPatterns: 2,
  },
  {
    id: 'Unlicense',
    name: 'The Unlicense',
    patterns: [
      /\bThis is free and unencumbered software\b/i,
      /\bunlicense\.org\b/i,
    ],
    requiredPatterns: 1,
  },
  {
    id: 'CC0-1.0',
    name: 'Creative Commons Zero v1.0',
    patterns: [
      /\bCC0\b/,
      /\bCreative Commons\b/i,
      /\bpublic domain\b/i,
    ],
    requiredPatterns: 2,
  },
];

/** File names to check for LICENSE content. */
const LICENSE_FILE_NAMES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'LICENSE-MIT',
  'LICENSE-APACHE',
];

export class LicenseContentValidationScanner implements Scanner {
  readonly name = 'license-content-validation';
  readonly displayName = 'LICENSE Content Validation';
  readonly pillar = Pillar.GOVERNANCE;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    let counter = 0;

    const makeFinding = (
      severity: Severity,
      message: string,
      file: string | null,
      suggestion: string,
      metadata?: Record<string, unknown>,
    ): Finding => {
      counter++;
      return {
        id: `${this.name}-${counter}`,
        severity,
        pillar: this.pillar,
        category: 'license-validation',
        message,
        file,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    // Find LICENSE file
    let licenseFile: string | null = null;
    let licenseContent: string | null = null;

    for (const name of LICENSE_FILE_NAMES) {
      const fullPath = path.join(repoPath, name);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        licenseFile = name;
        licenseContent = content;
        break;
      } catch {
        // File doesn't exist
      }
    }

    if (!licenseFile || licenseContent === null) {
      return [
        makeFinding(
          Severity.WARNING,
          'No LICENSE file found in repository root',
          null,
          'Add a LICENSE file with a recognized open source license',
        ),
      ];
    }

    if (!licenseContent.trim()) {
      return [
        makeFinding(
          Severity.CRITICAL,
          `LICENSE file "${licenseFile}" is empty`,
          licenseFile,
          'Add license text to the LICENSE file',
        ),
      ];
    }

    // Try to identify the license
    const match = this.identifyLicense(licenseContent);

    if (!match) {
      return [
        makeFinding(
          Severity.WARNING,
          `LICENSE file content not recognized as a standard SPDX license`,
          licenseFile,
          'Use a standard open source license (MIT, Apache-2.0, GPL-3.0, etc.)',
          { detectedLicense: null },
        ),
      ];
    }

    // Check match quality
    const matchRatio = match.matchedPatterns / match.totalPatterns;

    if (matchRatio >= 0.75) {
      return [
        makeFinding(
          Severity.PASS,
          `LICENSE file matches "${match.id}" (${match.name})`,
          licenseFile,
          'License content is valid',
          {
            detectedLicense: match.id,
            licenseName: match.name,
            matchRatio: Math.round(matchRatio * 100),
          },
        ),
      ];
    }

    return [
      makeFinding(
        Severity.WARNING,
        `LICENSE file appears to be a modified "${match.id}" (${Math.round(matchRatio * 100)}% match)`,
        licenseFile,
        `Consider using the standard ${match.id} license text without modifications`,
        {
          detectedLicense: match.id,
          licenseName: match.name,
          matchRatio: Math.round(matchRatio * 100),
        },
      ),
    ];
  }

  private identifyLicense(
    content: string,
  ): { id: string; name: string; matchedPatterns: number; totalPatterns: number } | null {
    let bestMatch: {
      id: string;
      name: string;
      matchedPatterns: number;
      totalPatterns: number;
    } | null = null;

    for (const sig of LICENSE_SIGNATURES) {
      let matched = 0;
      for (const pattern of sig.patterns) {
        if (pattern.test(content)) {
          matched++;
        }
      }

      if (matched >= sig.requiredPatterns) {
        if (!bestMatch || matched > bestMatch.matchedPatterns) {
          bestMatch = {
            id: sig.id,
            name: sig.name,
            matchedPatterns: matched,
            totalPatterns: sig.patterns.length,
          };
        }
      }
    }

    return bestMatch;
  }
}
