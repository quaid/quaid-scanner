/**
 * Tests for the .quaid-scanner-ignore file loader.
 *
 * Covers: missing file, valid patterns, blank-line filtering,
 * comment filtering, whitespace trimming, and multiple patterns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadIgnorePatterns } from '../../../src/scanner/inclusive/ignore-file.js';

function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'ignore-file-test-'));
}

function removeTempDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
}

describe('loadIgnorePatterns', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = createTempDir();
    });

    afterEach(() => {
        removeTempDir(tmpDir);
    });

    describe('when .quaid-scanner-ignore does not exist', () => {
        it('returns an empty array', async () => {
            const result = await loadIgnorePatterns(tmpDir);
            expect(result).toEqual([]);
        });
    });

    describe('when .quaid-scanner-ignore exists', () => {
        it('returns parsed patterns from the file, normalizing directory patterns', async () => {
            fs.writeFileSync(
                path.join(tmpDir, '.quaid-scanner-ignore'),
                'tests/\ndocs/PRD.md\n',
                'utf-8',
            );

            const result = await loadIgnorePatterns(tmpDir);
            // Directory patterns (ending with /) are normalized to glob recursive form
            expect(result).toEqual(['tests/**', 'docs/PRD.md']);
        });

        it('skips blank lines', async () => {
            fs.writeFileSync(
                path.join(tmpDir, '.quaid-scanner-ignore'),
                'tests/\n\n\ndocs/PRD.md\n',
                'utf-8',
            );

            const result = await loadIgnorePatterns(tmpDir);
            expect(result).toEqual(['tests/**', 'docs/PRD.md']);
        });

        it('skips lines starting with #', async () => {
            fs.writeFileSync(
                path.join(tmpDir, '.quaid-scanner-ignore'),
                '# This is a comment\ntests/\n# Another comment\ndocs/PRD.md\n',
                'utf-8',
            );

            const result = await loadIgnorePatterns(tmpDir);
            expect(result).toEqual(['tests/**', 'docs/PRD.md']);
        });

        it('trims whitespace from pattern lines', async () => {
            fs.writeFileSync(
                path.join(tmpDir, '.quaid-scanner-ignore'),
                '  tests/  \n  docs/PRD.md  \n',
                'utf-8',
            );

            const result = await loadIgnorePatterns(tmpDir);
            expect(result).toEqual(['tests/**', 'docs/PRD.md']);
        });

        it('returns multiple patterns when multiple non-comment lines present', async () => {
            fs.writeFileSync(
                path.join(tmpDir, '.quaid-scanner-ignore'),
                [
                    '# Test fixtures',
                    'tests/',
                    '',
                    '# Documentation',
                    'docs/PRD.md',
                    'docs/PRD-v2.md',
                    'vendor/',
                ].join('\n'),
                'utf-8',
            );

            const result = await loadIgnorePatterns(tmpDir);
            // Directory patterns normalized; file patterns unchanged
            expect(result).toEqual(['tests/**', 'docs/PRD.md', 'docs/PRD-v2.md', 'vendor/**']);
        });

        it('returns empty array when file contains only comments and blank lines', async () => {
            fs.writeFileSync(
                path.join(tmpDir, '.quaid-scanner-ignore'),
                '# Only comments\n# Nothing else\n\n',
                'utf-8',
            );

            const result = await loadIgnorePatterns(tmpDir);
            expect(result).toEqual([]);
        });
    });
});
