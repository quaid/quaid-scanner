/**
 * Dataset Provenance scanner.
 *
 * Detects dataset files, checks for datasheet documentation with
 * "Datasheets for Datasets" sections, and detects DVC usage.
 * Only activates for AI/ML repositories.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';
import { AIRepoDetectionScanner } from './ai-repo-detection.js';

/** Dataset file extensions to detect. */
const DATASET_EXTENSIONS = new Set([
  '.csv', '.tsv', '.parquet', '.arrow', '.jsonl',
  '.ndjson', '.feather', '.hdf5', '.h5', '.npz', '.npy',
  '.tfrecord', '.petastorm',
]);

/** Dataset directory names. */
const DATASET_DIRS = new Set(['data', 'datasets', 'dataset']);

/** Directories to skip. */
const EXCLUDED_DIRS = ['node_modules', '.git', 'vendor', 'dist', 'build', '__pycache__', '.dvc'];

/** Datasheet documentation file candidates. */
const DATASHEET_FILES = [
  'DATASHEET.md', 'datasheet.md', 'Datasheet.md',
  'DATA_README.md', 'data_readme.md',
];

/** "Datasheets for Datasets" required sections. */
const DATASHEET_SECTIONS: Array<{ name: string; patterns: RegExp[] }> = [
  { name: 'Motivation', patterns: [/^#{1,3}\s+Motivation\b/im, /^#{1,3}\s+Purpose\b/im] },
  { name: 'Composition', patterns: [/^#{1,3}\s+Composition\b/im, /^#{1,3}\s+Contents?\b/im] },
  { name: 'Collection Process', patterns: [/^#{1,3}\s+Collection\s+Process\b/im, /^#{1,3}\s+Data\s+Collection\b/im] },
  { name: 'Preprocessing', patterns: [/^#{1,3}\s+Preprocessing\b/im, /^#{1,3}\s+Cleaning\b/im, /^#{1,3}\s+Data\s+Processing\b/im] },
  { name: 'Uses', patterns: [/^#{1,3}\s+Uses?\b/im, /^#{1,3}\s+Intended\s+Use\b/im] },
  { name: 'Distribution', patterns: [/^#{1,3}\s+Distribution\b/im, /^#{1,3}\s+Access\b/im, /^#{1,3}\s+Availability\b/im] },
  { name: 'Maintenance', patterns: [/^#{1,3}\s+Maintenance\b/im, /^#{1,3}\s+Updates?\b/im] },
];

export class DatasetProvenanceScanner implements Scanner {
  readonly name = 'dataset-provenance';
  readonly displayName = 'Dataset Provenance';
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
        category: 'dataset-provenance',
        message: 'Not an AI/ML repository — dataset provenance check skipped',
        file: null,
        line: null,
        column: null,
        suggestion: 'No action needed for non-AI repositories.',
      }];
    }

    const findings: Finding[] = [];
    let counter = 0;

    // Detect dataset files and directories
    const datasetSignals = await this.detectDatasets(repoPath);
    const datasetsDetected = datasetSignals.length > 0;

    counter++;
    findings.push({
      id: `${this.name}-${counter}`,
      severity: datasetsDetected ? Severity.PASS : Severity.INFO,
      pillar: this.pillar,
      category: 'dataset-detection',
      message: datasetsDetected
        ? `Datasets detected (${datasetSignals.length} signal${datasetSignals.length > 1 ? 's' : ''})`
        : 'No dataset files detected in repository',
      file: null,
      line: null,
      column: null,
      suggestion: datasetsDetected
        ? 'Ensure dataset documentation is provided.'
        : 'No action needed.',
      metadata: {
        datasetsDetected,
        datasetSignals,
      },
    });

    // If datasets detected, check for documentation and DVC
    if (datasetsDetected) {
      counter++;
      findings.push(this.checkDatasheetDoc(repoPath, counter));

      counter++;
      findings.push(this.checkDVC(repoPath, counter));
    }

    return findings;
  }

  private async detectDatasets(repoPath: string): Promise<string[]> {
    const signals: string[] = [];

    try {
      // Check for dataset directories
      const entries = fs.readdirSync(repoPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && DATASET_DIRS.has(entry.name)) {
          signals.push(`Dataset directory: ${entry.name}/`);
        }
      }

      // Scan for dataset files
      const ignorePatterns = EXCLUDED_DIRS.map((d) => `**/${d}/**`);
      const allFiles = await glob('**/*', {
        cwd: repoPath,
        absolute: true,
        nodir: true,
        dot: false,
        ignore: ignorePatterns,
      });

      for (const absolutePath of allFiles) {
        const relativePath = path.relative(repoPath, absolutePath);
        const ext = path.extname(absolutePath).toLowerCase();

        if (DATASET_EXTENSIONS.has(ext)) {
          signals.push(`Dataset file: ${relativePath} (${ext})`);
        }
      }
    } catch {
      // Handle missing repo or glob errors
    }

    return signals;
  }

  private checkDatasheetDoc(repoPath: string, counter: number): Finding {
    const { content, source } = this.findDatasheetContent(repoPath);

    if (!content) {
      return {
        id: `${this.name}-${counter}`,
        severity: Severity.WARNING,
        pillar: this.pillar,
        category: 'dataset-documentation',
        message: 'Datasets found but no datasheet documentation (DATASHEET.md, DATA_README.md, or data/README.md)',
        file: null,
        line: null,
        column: null,
        suggestion: 'Create a DATASHEET.md documenting dataset motivation, composition, collection process, and intended uses.',
        metadata: { source: null, presentSections: [], missingSections: DATASHEET_SECTIONS.map((s) => s.name) },
      };
    }

    const presentSections: string[] = [];
    const missingSections: string[] = [];

    for (const section of DATASHEET_SECTIONS) {
      if (section.patterns.some((p) => p.test(content))) {
        presentSections.push(section.name);
      } else {
        missingSections.push(section.name);
      }
    }

    const hasEnoughSections = presentSections.length >= 4;

    return {
      id: `${this.name}-${counter}`,
      severity: hasEnoughSections ? Severity.PASS : Severity.WARNING,
      pillar: this.pillar,
      category: 'dataset-documentation',
      message: hasEnoughSections
        ? `Datasheet documentation found with ${presentSections.length}/${DATASHEET_SECTIONS.length} sections`
        : `Datasheet documentation incomplete: ${missingSections.length} sections missing (${missingSections.join(', ')})`,
      file: source,
      line: null,
      column: null,
      suggestion: hasEnoughSections
        ? missingSections.length > 0
          ? `Consider adding sections: ${missingSections.join(', ')}`
          : 'Datasheet is comprehensive.'
        : `Add missing sections to ${source}: ${missingSections.join(', ')}`,
      metadata: { source, presentSections, missingSections },
    };
  }

  private checkDVC(repoPath: string, counter: number): Finding {
    const dvcSignals: string[] = [];

    try {
      // Check for .dvc/ directory
      const dvcDir = path.join(repoPath, '.dvc');
      if (fs.existsSync(dvcDir) && fs.statSync(dvcDir).isDirectory()) {
        dvcSignals.push('.dvc/ directory');
      }

      // Check for .dvcignore
      if (fs.existsSync(path.join(repoPath, '.dvcignore'))) {
        dvcSignals.push('.dvcignore file');
      }

      // Check for *.dvc files
      const entries = fs.readdirSync(repoPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.dvc')) {
          dvcSignals.push(`DVC file: ${entry.name}`);
        }
      }
    } catch {
      // Handle missing directory
    }

    const hasDVC = dvcSignals.length > 0;

    return {
      id: `${this.name}-${counter}`,
      severity: hasDVC ? Severity.PASS : Severity.INFO,
      pillar: this.pillar,
      category: 'dataset-versioning',
      message: hasDVC
        ? `Data Version Control (DVC) detected (${dvcSignals.join(', ')})`
        : 'No data versioning tool detected',
      file: null,
      line: null,
      column: null,
      suggestion: hasDVC
        ? 'DVC is properly configured for dataset versioning.'
        : 'Consider using DVC (Data Version Control) for dataset versioning and reproducibility.',
      metadata: { hasDVC, dvcSignals },
    };
  }

  private findDatasheetContent(repoPath: string): { content: string | null; source: string | null } {
    // Check standalone datasheet files
    for (const filename of DATASHEET_FILES) {
      try {
        const content = fs.readFileSync(path.join(repoPath, filename), 'utf-8');
        return { content, source: filename };
      } catch {
        // Try next
      }
    }

    // Check data/README.md
    try {
      const content = fs.readFileSync(path.join(repoPath, 'data', 'README.md'), 'utf-8');
      return { content, source: 'data/README.md' };
    } catch {
      // Not found
    }

    return { content: null, source: null };
  }
}
