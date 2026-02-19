/**
 * Model Card Section Detection scanner.
 *
 * Validates presence of required and recommended Model Card sections
 * in README.md or standalone MODEL_CARD.md files for AI repositories.
 * Detects HuggingFace-style YAML front matter with model-index.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { AIRepoDetectionScanner } from './ai-repo-detection.js';

/** Required Model Card sections with heading aliases. */
const REQUIRED_SECTIONS: Array<{ name: string; patterns: RegExp[] }> = [
  {
    name: 'Model Description',
    patterns: [
      /^#{1,3}\s+Model\s+Description\b/im,
      /^#{1,3}\s+Description\b/im,
      /^#{1,3}\s+Overview\b/im,
    ],
  },
  {
    name: 'Intended Use',
    patterns: [
      /^#{1,3}\s+Intended\s+Use\b/im,
      /^#{1,3}\s+Uses?\b/im,
      /^#{1,3}\s+Use\s+Cases?\b/im,
    ],
  },
  {
    name: 'Limitations',
    patterns: [
      /^#{1,3}\s+Limitations?\b/im,
      /^#{1,3}\s+Known\s+Limitations?\b/im,
      /^#{1,3}\s+Caveats?\b/im,
    ],
  },
];

/** Recommended Model Card sections with heading aliases. */
const RECOMMENDED_SECTIONS: Array<{ name: string; patterns: RegExp[] }> = [
  {
    name: 'Training Data',
    patterns: [
      /^#{1,3}\s+Training\s+Data\b/im,
      /^#{1,3}\s+Training\s+Details?\b/im,
      /^#{1,3}\s+Dataset\b/im,
    ],
  },
  {
    name: 'Evaluation',
    patterns: [
      /^#{1,3}\s+Evaluation\b/im,
      /^#{1,3}\s+Results?\b/im,
      /^#{1,3}\s+Metrics?\b/im,
      /^#{1,3}\s+Performance\b/im,
    ],
  },
  {
    name: 'Bias',
    patterns: [
      /^#{1,3}\s+Bias\b/im,
      /^#{1,3}\s+Fairness\b/im,
      /^#{1,3}\s+Bias\s+and\s+Fairness\b/im,
    ],
  },
  {
    name: 'Ethical Considerations',
    patterns: [
      /^#{1,3}\s+Ethical\s+Considerations?\b/im,
      /^#{1,3}\s+Ethics\b/im,
      /^#{1,3}\s+Responsible\s+Use\b/im,
    ],
  },
];

/** Model card file name variants to search for. */
const MODEL_CARD_FILES = [
  'MODEL_CARD.md',
  'model_card.md',
  'MODELCARD.md',
  'modelcard.md',
  'Model_Card.md',
];

export class ModelCardDetectionScanner implements Scanner {
  readonly name = 'model-card-detection';
  readonly displayName = 'Model Card Section Detection';
  readonly pillar = Pillar.AI_READINESS;
  readonly dependsOn = ['ai-repo-detection'];

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;

    // First check if this is an AI repo
    const aiDetector = new AIRepoDetectionScanner();
    const aiFindings = await aiDetector.run(context);
    const aiDetection = aiFindings.find((f) => f.metadata?.aiRepoDetected !== undefined);
    const isAIRepo = aiDetection?.metadata?.aiRepoDetected === true;

    if (!isAIRepo) {
      return [{
        id: `${this.name}-1`,
        severity: Severity.INFO,
        pillar: this.pillar,
        category: 'model-card-detection',
        message: 'Not an AI/ML repository — model card check skipped',
        file: null,
        line: null,
        column: null,
        suggestion: 'No action needed for non-AI repositories.',
      }];
    }

    const findings: Finding[] = [];

    // Find the model card source: prefer MODEL_CARD.md, fall back to README.md
    const { content, source } = this.findModelCardContent(repoPath);

    // Check sections
    const presentRequired: string[] = [];
    const missingRequired: string[] = [];
    const presentRecommended: string[] = [];
    const missingRecommended: string[] = [];

    if (content) {
      for (const section of REQUIRED_SECTIONS) {
        if (section.patterns.some((p) => p.test(content))) {
          presentRequired.push(section.name);
        } else {
          missingRequired.push(section.name);
        }
      }

      for (const section of RECOMMENDED_SECTIONS) {
        if (section.patterns.some((p) => p.test(content))) {
          presentRecommended.push(section.name);
        } else {
          missingRecommended.push(section.name);
        }
      }
    } else {
      // No content found at all
      missingRequired.push(...REQUIRED_SECTIONS.map((s) => s.name));
      missingRecommended.push(...RECOMMENDED_SECTIONS.map((s) => s.name));
    }

    const allRequiredPresent = missingRequired.length === 0;
    let severity: Severity;
    let message: string;

    if (allRequiredPresent) {
      severity = Severity.PASS;
      message = `Model card has all required sections (${presentRequired.length}/${REQUIRED_SECTIONS.length} required, ${presentRecommended.length}/${RECOMMENDED_SECTIONS.length} recommended)`;
    } else {
      severity = Severity.WARNING;
      message = `Model card missing required sections: ${missingRequired.join(', ')}`;
    }

    findings.push({
      id: `${this.name}-1`,
      severity,
      pillar: this.pillar,
      category: 'model-card-sections',
      message,
      file: source,
      line: null,
      column: null,
      suggestion: allRequiredPresent
        ? missingRecommended.length > 0
          ? `Consider adding recommended sections: ${missingRecommended.join(', ')}`
          : 'Model card is comprehensive.'
        : `Add missing sections to ${source || 'README.md'}: ${missingRequired.join(', ')}`,
      metadata: {
        source,
        presentRequired,
        missingRequired,
        presentRecommended,
        missingRecommended,
      },
    });

    // Check for HuggingFace YAML front matter
    if (content) {
      const frontmatterFinding = this.checkFrontMatter(content, source);
      if (frontmatterFinding) {
        findings.push(frontmatterFinding);
      }
    }

    return findings;
  }

  private findModelCardContent(repoPath: string): { content: string | null; source: string | null } {
    // Check for standalone MODEL_CARD.md variants first
    for (const filename of MODEL_CARD_FILES) {
      try {
        const filePath = path.join(repoPath, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        return { content, source: filename };
      } catch {
        // Try next variant
      }
    }

    // Fall back to README.md
    const readmeVariants = ['README.md', 'readme.md', 'Readme.md'];
    for (const filename of readmeVariants) {
      try {
        const filePath = path.join(repoPath, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        return { content, source: filename };
      } catch {
        // Try next variant
      }
    }

    return { content: null, source: null };
  }

  private checkFrontMatter(content: string, source: string | null): Finding | null {
    const frontMatterMatch = /^---\s*\n([\s\S]*?)\n---/.exec(content);
    if (!frontMatterMatch) return null;

    const frontMatter = frontMatterMatch[1];
    const hasModelIndex = /model-index\s*:/m.test(frontMatter);

    if (!hasModelIndex) return null;

    return {
      id: `${this.name}-2`,
      severity: Severity.PASS,
      pillar: this.pillar,
      category: 'model-card-frontmatter',
      message: 'HuggingFace-style model-index found in YAML front matter',
      file: source,
      line: null,
      column: null,
      suggestion: 'Model index metadata is properly configured.',
      metadata: {
        hasModelIndex: true,
      },
    };
  }
}
