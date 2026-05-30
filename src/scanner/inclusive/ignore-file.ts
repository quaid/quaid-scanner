/**
 * Loader for .quaid-scanner-ignore files.
 *
 * Reads project-level exclusion patterns from a .quaid-scanner-ignore
 * file at the root of the scanned repository. The format is one glob
 * pattern per line; lines starting with # are treated as comments and
 * blank lines are ignored.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Normalize a raw pattern line into a glob ignore pattern.
 *
 * Patterns that end with a `/` (directory patterns like `tests/`) are
 * converted to recursive glob patterns (`tests/**`) so that glob's
 * `ignore` option correctly excludes all files within the directory.
 *
 * @param pattern - Raw pattern string from the ignore file
 * @returns Normalized glob pattern
 */
function normalizePattern(pattern: string): string {
    if (pattern.endsWith('/')) {
        return `${pattern}**`;
    }
    return pattern;
}

/**
 * Load exclusion patterns from a .quaid-scanner-ignore file.
 *
 * Directory patterns (ending with `/`) are automatically normalized to
 * recursive glob patterns (e.g. `tests/` → `tests/**`).
 *
 * @param repoPath - Absolute path to the root of the repository being scanned
 * @returns Array of glob patterns to exclude, or an empty array if the file
 *          does not exist or cannot be read
 */
export async function loadIgnorePatterns(repoPath: string): Promise<string[]> {
    const filePath = path.join(repoPath, '.quaid-scanner-ignore');
    try {
        const content = await readFile(filePath, 'utf-8');
        return content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith('#'))
            .map(normalizePattern);
    } catch {
        return [];
    }
}
