/**
 * Binary artifact detection scanner.
 *
 * Detects binary files in the source tree by extension and magic bytes,
 * with severity based on file size. Reports SHA-256 hashes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { glob } from 'glob';
import { Pillar, Severity } from '../../types/index.js';
import type { Scanner, ScanContext, Finding } from '../../types/index.js';

/** Binary file extensions to detect. */
const BINARY_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.jar', '.war', '.ear', '.class',
  '.pyc', '.pyo',
  '.o', '.a', '.lib',
]);

/** Default allowlisted extensions (images, fonts). */
const DEFAULT_ALLOWLIST = new Set([
  '.ico', '.png', '.jpg', '.jpeg', '.gif',
  '.woff', '.woff2', '.ttf', '.eot',
  '.svg',
]);

/** Directories to exclude from scanning. */
const EXCLUDED_DIRS = ['node_modules', 'vendor', '.git', 'dist', 'build'];

/** Known magic byte signatures. */
const MAGIC_SIGNATURES: Array<{ name: string; bytes: number[] }> = [
  { name: 'MZ (PE/EXE)', bytes: [0x4D, 0x5A] },
  { name: 'ELF', bytes: [0x7F, 0x45, 0x4C, 0x46] },
  { name: 'Java class (CAFEBABE)', bytes: [0xCA, 0xFE, 0xBA, 0xBE] },
  { name: 'ZIP/JAR (PK)', bytes: [0x50, 0x4B, 0x03, 0x04] },
];

/** Size thresholds in bytes. */
const SIZE_CRITICAL = 1_000_000;  // 1MB
const SIZE_WARNING = 100_000;     // 100KB

export class BinaryArtifactScanner implements Scanner {
  readonly name = 'binary-artifacts';
  readonly displayName = 'Binary Artifact Detection';
  readonly pillar = Pillar.SECURITY;

  async run(context: ScanContext): Promise<Finding[]> {
    const { repoPath } = context;
    const findings: Finding[] = [];
    let counter = 0;

    // Find all files, excluding certain directories
    const ignorePatterns = EXCLUDED_DIRS.map((d) => `**/${d}/**`);
    const allFiles = await glob('**/*', {
      cwd: repoPath,
      absolute: true,
      nodir: true,
      dot: true,
      ignore: ignorePatterns,
    });

    for (const absolutePath of allFiles) {
      const relativePath = path.relative(repoPath, absolutePath);
      const ext = path.extname(absolutePath).toLowerCase();

      // Skip allowlisted extensions
      if (DEFAULT_ALLOWLIST.has(ext)) continue;

      let isBinary = false;
      let detectionMethod = '';

      // Check by extension
      if (BINARY_EXTENSIONS.has(ext)) {
        isBinary = true;
        detectionMethod = `extension (${ext})`;
      }

      // Check by magic bytes if not already detected by extension
      if (!isBinary) {
        const magicResult = this.checkMagicBytes(absolutePath);
        if (magicResult) {
          isBinary = true;
          detectionMethod = `magic bytes (${magicResult})`;
        }
      }

      if (!isBinary) continue;

      // Get file stats
      let stats: fs.Stats;
      try {
        stats = fs.statSync(absolutePath);
      } catch {
        continue;
      }

      // Calculate SHA-256
      const sha256 = this.calculateHash(absolutePath);

      // Determine severity based on size
      let severity: Severity;
      if (stats.size > SIZE_CRITICAL) {
        severity = Severity.CRITICAL;
      } else if (stats.size > SIZE_WARNING) {
        severity = Severity.WARNING;
      } else {
        severity = Severity.INFO;
      }

      counter++;
      findings.push({
        id: `${this.name}-${counter}`,
        severity,
        pillar: this.pillar,
        category: 'binary-artifacts',
        message: `Binary artifact detected: "${relativePath}" (${this.formatSize(stats.size)}, detected by ${detectionMethod})`,
        file: relativePath,
        line: null,
        column: null,
        suggestion: 'Remove binary files from the source tree. Use a package manager or artifact repository instead.',
        metadata: {
          sha256,
          sizeBytes: stats.size,
          detectionMethod,
        },
      });
    }

    return findings;
  }

  private checkMagicBytes(filePath: string): string | null {
    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(4);
      const bytesRead = fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);

      if (bytesRead < 2) return null;

      for (const sig of MAGIC_SIGNATURES) {
        if (bytesRead < sig.bytes.length) continue;
        let match = true;
        for (let i = 0; i < sig.bytes.length; i++) {
          if (buf[i] !== sig.bytes[i]) {
            match = false;
            break;
          }
        }
        if (match) return sig.name;
      }
    } catch {
      // Skip files that can't be read
    }
    return null;
  }

  private calculateHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return 'unknown';
    }
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}MB`;
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)}KB`;
    return `${bytes}B`;
  }
}
