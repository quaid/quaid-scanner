import { describe, it, expect } from 'vitest';
import { isMinifiedContent } from '../../../src/scanner/inclusive/utils/is-minified.js';

describe('isMinifiedContent (#202)', () => {
  it('returns false for empty content', () => {
    expect(isMinifiedContent('')).toBe(false);
  });

  it('returns false for short content', () => {
    expect(isMinifiedContent('const x = 1;\nconst y = 2;\n')).toBe(false);
  });

  it('returns false for normal source code with reasonable line lengths', () => {
    const src = Array.from({ length: 200 }, (_, i) =>
      `function fn${i}() { return ${i}; }`,
    ).join('\n');
    expect(isMinifiedContent(src)).toBe(false);
  });

  it('returns true when any single line exceeds 2000 chars (minified bundle)', () => {
    const minifiedLine = 'function abort(){throw new Error("aborted")}'.repeat(100); // ~4400 chars
    const file = `// header\n${minifiedLine}\n`;
    expect(isMinifiedContent(file)).toBe(true);
  });

  it('returns true for a real-shaped Vite bundle (single 89 KB line)', () => {
    const minifiedLine = 'function abort(){throw new Error("aborted")}'.repeat(2000); // ~90 KB
    expect(isMinifiedContent(minifiedLine)).toBe(true);
  });

  it('returns true when average line length exceeds 500 chars (vendored bundle)', () => {
    // 50 lines, each ~600 chars — typical of vendored single-file libraries
    const line = 'x'.repeat(600);
    const file = Array.from({ length: 50 }, () => line).join('\n');
    expect(isMinifiedContent(file)).toBe(true);
  });

  it('returns false for long source files with normal line lengths', () => {
    // 5000 lines of normal-shaped code (~50 chars avg) → 250 KB total, no minified signal
    const src = Array.from({ length: 5000 }, (_, i) =>
      `  const value_${i} = compute(${i});`,
    ).join('\n');
    expect(isMinifiedContent(src)).toBe(false);
  });

  it('returns false for markdown with one long prose line', () => {
    // Markdown sometimes has long prose lines; one 1200-char line should not trigger
    const md = `# Title\n\n${'word '.repeat(240)}\n\nMore content.`;
    expect(isMinifiedContent(md)).toBe(false);
  });

  it('returns true for content with one extremely long line above the threshold', () => {
    const lines = [
      '// normal header line',
      '// another normal line',
      'x'.repeat(5000), // one minified-looking line
      '// trailing normal',
    ];
    expect(isMinifiedContent(lines.join('\n'))).toBe(true);
  });

  it('returns false for content under 2000 bytes regardless of shape', () => {
    // Below the early-out byte threshold; minification heuristics not applicable
    expect(isMinifiedContent('x'.repeat(1500))).toBe(false);
  });
});
