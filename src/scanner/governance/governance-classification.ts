/**
 * Governance model classification scanner.
 *
 * Analyzes governance-related files to classify the project's governance
 * model (BDFL, Meritocracy, Foundation-backed, Corporate, Community)
 * with a confidence score.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

type GovernanceModel = 'BDFL' | 'Meritocracy' | 'Foundation-backed' | 'Corporate' | 'Community';

interface ModelPattern {
  model: GovernanceModel;
  keywords: RegExp[];
  weight: number;
}

const MODEL_PATTERNS: ModelPattern[] = [
  {
    model: 'BDFL',
    keywords: [
      /\bbdfl\b/i,
      /\bbenevolent dictator\b/i,
      /\bfinal say\b/i,
      /\bproject lead\b/i,
      /\bfounder decides\b/i,
      /\bcreator\b.*\b(decides|authority|final)\b/i,
      /\bsingle maintainer\b/i,
    ],
    weight: 1,
  },
  {
    model: 'Meritocracy',
    keywords: [
      /\bmeritocracy\b/i,
      /\bmerit\b/i,
      /\bcommitter\b/i,
      /\bearned\b/i,
      /\bcontributions determine\b/i,
      /\bpromotion\b/i,
      /\bmaintainer tiers?\b/i,
    ],
    weight: 1,
  },
  {
    model: 'Foundation-backed',
    keywords: [
      /\bfoundation\b/i,
      /\bcncf\b/i,
      /\bapache\b.*\b(foundation|software)\b/i,
      /\blinux foundation\b/i,
      /\bopenjs\b/i,
      /\beclipse\b.*\bfoundation\b/i,
      /\btechnical steering committee\b/i,
      /\btsc\b/i,
      /\bboard\b.*\b(directors|governance)\b/i,
      /\bcharter\b/i,
    ],
    weight: 1,
  },
  {
    model: 'Corporate',
    keywords: [
      /\bcorporate\b/i,
      /\bcompany\b/i,
      /\bemployer\b/i,
      /\bsponsored by\b/i,
      /\bcopyright held by\b/i,
      /\bcorporate employees?\b/i,
      /\bcompany\b.*\b(drives|determines|manages)\b/i,
    ],
    weight: 1,
  },
  {
    model: 'Community',
    keywords: [
      /\bcommunity consensus\b/i,
      /\bconsensus\b/i,
      /\bcollective\b/i,
      /\bdemocratic\b/i,
      /\bvote\b/i,
      /\blazy consensus\b/i,
      /\bworking group/i,
      /\bspecial interest group/i,
    ],
    weight: 1,
  },
];

/** File paths to check for governance signals, in priority order. */
const GOVERNANCE_FILES = [
  'GOVERNANCE.md',
  'GOVERNANCE',
  'docs/governance.md',
  'docs/GOVERNANCE.md',
  '.github/GOVERNANCE.md',
];

/** Secondary files that may contain governance signals. */
const SIGNAL_FILES = ['CONTRIBUTING.md', 'README.md', 'CODE_OF_CONDUCT.md'];

export class GovernanceClassificationScanner implements Scanner {
  readonly name = 'governance-classification';
  readonly displayName = 'Governance Model Classification';
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
        category: 'governance',
        message,
        file,
        line: null,
        column: null,
        suggestion,
        metadata,
      };
    };

    // Collect text from governance and signal files
    const allText = this.collectGovernanceText(repoPath);

    if (!allText.trim()) {
      return [
        makeFinding(
          Severity.INFO,
          'No governance model detected — no governance-related files found',
          null,
          'Consider adding a GOVERNANCE.md file to document the project decision-making process',
        ),
      ];
    }

    // Score each model
    const scores = this.scoreModels(allText);

    // Find best match
    const best = scores.reduce((a, b) => (b.score > a.score ? b : a));

    if (best.score === 0) {
      return [
        makeFinding(
          Severity.INFO,
          'No governance model detected — governance files exist but no recognizable model pattern found',
          null,
          'Consider documenting the governance model explicitly in GOVERNANCE.md',
        ),
      ];
    }

    // Calculate confidence (0-100)
    // Scale so that 2 matches = ~50%, 3+ matches = 70%+
    const rawRatio = best.score / best.maxPossible;
    const confidence = Math.min(100, Math.round(Math.sqrt(rawRatio) * 100));

    if (confidence < 40) {
      return [
        makeFinding(
          Severity.WARNING,
          `Unclear governance model — best guess is "${best.model}" with low confidence (${confidence}%)`,
          null,
          'Document the governance model explicitly in GOVERNANCE.md for clarity',
          {
            governanceModel: best.model,
            confidence,
            matchedKeywords: best.matchedKeywords,
          },
        ),
      ];
    }

    return [
      makeFinding(
        Severity.PASS,
        `Governance model classified as "${best.model}" (confidence: ${confidence}%)`,
        null,
        'Governance model is documented',
        {
          governanceModel: best.model,
          confidence,
          matchedKeywords: best.matchedKeywords,
        },
      ),
    ];
  }

  private collectGovernanceText(repoPath: string): string {
    const parts: string[] = [];

    for (const relPath of [...GOVERNANCE_FILES, ...SIGNAL_FILES]) {
      const fullPath = path.join(repoPath, relPath);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.trim()) {
          parts.push(content);
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    return parts.join('\n');
  }

  private scoreModels(
    text: string,
  ): Array<{
    model: GovernanceModel;
    score: number;
    maxPossible: number;
    matchedKeywords: string[];
  }> {
    return MODEL_PATTERNS.map((pattern) => {
      const matchedKeywords: string[] = [];
      let score = 0;

      for (const regex of pattern.keywords) {
        const match = text.match(regex);
        if (match) {
          score += pattern.weight;
          matchedKeywords.push(match[0]);
        }
      }

      return {
        model: pattern.model,
        score,
        maxPossible: pattern.keywords.length * pattern.weight,
        matchedKeywords,
      };
    });
  }
}
