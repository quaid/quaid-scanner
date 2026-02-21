/**
 * Model Card Scoring scanner.
 *
 * Calculates Model Card completeness using a weighted formula across
 * required, recommended, and optional sections. Adds bonus for
 * HuggingFace-style YAML front matter with model-index.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { AIRepoDetectionScanner } from './ai-repo-detection.js';

interface SectionDef {
  name: string;
  patterns: RegExp[];
}

/** Required sections (weight 3). */
const REQUIRED_SECTIONS: SectionDef[] = [
  {
    name: 'Model Description',
    patterns: [/^#{1,3}\s+Model\s+Description\b/im, /^#{1,3}\s+Description\b/im, /^#{1,3}\s+Overview\b/im],
  },
  {
    name: 'Intended Use',
    patterns: [/^#{1,3}\s+Intended\s+Use\b/im, /^#{1,3}\s+Uses?\b/im, /^#{1,3}\s+Use\s+Cases?\b/im],
  },
  {
    name: 'Limitations',
    patterns: [/^#{1,3}\s+Limitations?\b/im, /^#{1,3}\s+Known\s+Limitations?\b/im, /^#{1,3}\s+Caveats?\b/im],
  },
];

/** Recommended sections (weight 2). */
const RECOMMENDED_SECTIONS: SectionDef[] = [
  {
    name: 'Training Data',
    patterns: [/^#{1,3}\s+Training\s+Data\b/im, /^#{1,3}\s+Training\s+Details?\b/im, /^#{1,3}\s+Dataset\b/im],
  },
  {
    name: 'Evaluation',
    patterns: [/^#{1,3}\s+Evaluation\b/im, /^#{1,3}\s+Results?\b/im, /^#{1,3}\s+Metrics?\b/im, /^#{1,3}\s+Performance\b/im],
  },
  {
    name: 'Bias',
    patterns: [/^#{1,3}\s+Bias\b/im, /^#{1,3}\s+Fairness\b/im, /^#{1,3}\s+Bias\s+and\s+Fairness\b/im],
  },
  {
    name: 'Ethical Considerations',
    patterns: [/^#{1,3}\s+Ethical\s+Considerations?\b/im, /^#{1,3}\s+Ethics\b/im, /^#{1,3}\s+Responsible\s+Use\b/im],
  },
];

/** Optional sections (weight 1). */
const OPTIONAL_SECTIONS: SectionDef[] = [
  {
    name: 'Citation',
    patterns: [/^#{1,3}\s+Citations?\b/im, /^#{1,3}\s+How\s+to\s+Cite\b/im, /^#{1,3}\s+BibTeX\b/im],
  },
  {
    name: 'Acknowledgments',
    patterns: [/^#{1,3}\s+Acknowledgm?ents?\b/im, /^#{1,3}\s+Credits?\b/im],
  },
  {
    name: 'Glossary',
    patterns: [/^#{1,3}\s+Glossary\b/im, /^#{1,3}\s+Definitions?\b/im],
  },
  {
    name: 'Environmental Impact',
    patterns: [/^#{1,3}\s+Environmental\s+Impact\b/im, /^#{1,3}\s+Carbon\s+Footprint\b/im],
  },
];

const WEIGHT_REQUIRED = 3;
const WEIGHT_RECOMMENDED = 2;
const WEIGHT_OPTIONAL = 1;
const FRONTMATTER_BONUS = 2;

const MAX_SCORE =
  REQUIRED_SECTIONS.length * WEIGHT_REQUIRED +
  RECOMMENDED_SECTIONS.length * WEIGHT_RECOMMENDED +
  OPTIONAL_SECTIONS.length * WEIGHT_OPTIONAL;

/** Model card file name variants. */
const MODEL_CARD_FILES = ['MODEL_CARD.md', 'model_card.md', 'MODELCARD.md', 'modelcard.md', 'Model_Card.md'];

export class ModelCardScoringScanner implements Scanner {
  readonly name = 'model-card-scoring';
  readonly displayName = 'Model Card Scoring';
  readonly pillar = Pillar.AI_READINESS;
  readonly dependsOn = ['ai-repo-detection'];

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;

    // Check if AI repo
    const aiDetector = new AIRepoDetectionScanner();
    const aiFindings = await aiDetector.run(context);
    const isAIRepo = aiFindings.some((f) => f.metadata?.aiRepoDetected === true);

    if (!isAIRepo) {
      return [{
        id: `${this.name}-1`,
        severity: Severity.INFO,
        pillar: this.pillar,
        category: 'model-card-scoring',
        message: 'Not an AI/ML repository — model card scoring skipped',
        file: null,
        line: null,
        column: null,
        suggestion: 'No action needed for non-AI repositories.',
      }];
    }

    const { content, source } = this.findModelCardContent(repoPath);

    const presentRequired = this.matchSections(content, REQUIRED_SECTIONS);
    const presentRecommended = this.matchSections(content, RECOMMENDED_SECTIONS);
    const presentOptional = this.matchSections(content, OPTIONAL_SECTIONS);
    const hasModelIndex = content ? this.detectModelIndex(content) : false;

    const requiredScore = presentRequired.length * WEIGHT_REQUIRED;
    const recommendedScore = presentRecommended.length * WEIGHT_RECOMMENDED;
    const optionalScore = presentOptional.length * WEIGHT_OPTIONAL;
    const frontmatterScore = hasModelIndex ? FRONTMATTER_BONUS : 0;
    const totalScore = requiredScore + recommendedScore + optionalScore + frontmatterScore;
    const completenessPercent = Math.min(100, Math.round((totalScore / MAX_SCORE) * 100));

    let severity: Severity;
    if (completenessPercent > 70) {
      severity = Severity.PASS;
    } else if (completenessPercent >= 40) {
      severity = Severity.WARNING;
    } else {
      severity = Severity.CRITICAL;
    }

    const missingRequired = REQUIRED_SECTIONS.filter((s) => !presentRequired.includes(s.name)).map((s) => s.name);
    const missingRecommended = RECOMMENDED_SECTIONS.filter((s) => !presentRecommended.includes(s.name)).map((s) => s.name);

    let message: string;
    if (severity === Severity.PASS) {
      message = `Model card completeness: ${completenessPercent}% (${totalScore}/${MAX_SCORE})`;
    } else if (severity === Severity.WARNING) {
      message = `Model card incomplete: ${completenessPercent}% — missing: ${[...missingRequired, ...missingRecommended].join(', ')}`;
    } else {
      message = `Model card critically incomplete: ${completenessPercent}% — add required sections: ${missingRequired.join(', ') || 'all sections missing'}`;
    }

    return [{
      id: `${this.name}-1`,
      severity,
      pillar: this.pillar,
      category: 'model-card-scoring',
      message,
      file: source,
      line: null,
      column: null,
      suggestion: severity === Severity.PASS
        ? 'Model card is well-documented.'
        : `Improve model card in ${source || 'README.md'} by adding missing sections.`,
      metadata: {
        source,
        completenessPercent,
        requiredScore,
        recommendedScore,
        optionalScore,
        totalScore,
        maxScore: MAX_SCORE,
        presentRequired,
        presentRecommended,
        presentOptional,
        missingRequired,
        missingRecommended,
        hasModelIndex,
      },
    }];
  }

  private matchSections(content: string | null, sections: SectionDef[]): string[] {
    if (!content) return [];
    const present: string[] = [];
    for (const section of sections) {
      if (section.patterns.some((p) => p.test(content))) {
        present.push(section.name);
      }
    }
    return present;
  }

  private detectModelIndex(content: string): boolean {
    const frontMatterMatch = /^---\s*\n([\s\S]*?)\n---/.exec(content);
    if (!frontMatterMatch) return false;
    return /model-index\s*:/m.test(frontMatterMatch[1]);
  }

  private findModelCardContent(repoPath: string): { content: string | null; source: string | null } {
    for (const filename of MODEL_CARD_FILES) {
      try {
        const content = fs.readFileSync(path.join(repoPath, filename), 'utf-8');
        return { content, source: filename };
      } catch {
        // Try next
      }
    }

    for (const filename of ['README.md', 'readme.md', 'Readme.md']) {
      try {
        const content = fs.readFileSync(path.join(repoPath, filename), 'utf-8');
        return { content, source: filename };
      } catch {
        // Try next
      }
    }

    return { content: null, source: null };
  }
}
