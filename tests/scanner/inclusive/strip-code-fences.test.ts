import { describe, it, expect } from 'vitest';
import { stripCodeFences } from '../../../src/scanner/inclusive/utils/strip-code-fences.js';

describe('stripCodeFences', () => {
  it('preserves plain prose unchanged', () => {
    const input = 'Hello world\nThis is prose.\n';
    expect(stripCodeFences(input)).toBe(input);
  });

  it('replaces fenced code block content with blank lines', () => {
    const input = 'Prose before\n```\nconst x = PROFANITY;\n```\nProse after\n';
    const result = stripCodeFences(input);
    expect(result).toContain('Prose before');
    expect(result).toContain('Prose after');
    expect(result).not.toContain('PROFANITY');
  });

  it('preserves line count so line numbers stay correct', () => {
    const input = 'Line 1\n```\nLine 3\nLine 4\n```\nLine 6\n';
    const result = stripCodeFences(input);
    expect(result.split('\n')).toHaveLength(input.split('\n').length);
  });

  it('replaces inline code with spaces', () => {
    const input = 'Call the `PROFANITY_CHECK` function.\n';
    const result = stripCodeFences(input);
    expect(result).not.toContain('PROFANITY_CHECK');
    expect(result.length).toBe(input.length);
  });

  it('handles fenced block with language hint', () => {
    const input = '```typescript\nconst VIOLENCE = true;\n```\n';
    const result = stripCodeFences(input);
    expect(result).not.toContain('VIOLENCE');
  });

  it('does not touch prose between blocks', () => {
    const input = [
      'Intro prose.',
      '```sh',
      'npm install',
      '```',
      'Middle prose.',
      '```',
      'docker run',
      '```',
      'End prose.',
    ].join('\n');
    const result = stripCodeFences(input);
    expect(result).toContain('Intro prose.');
    expect(result).toContain('Middle prose.');
    expect(result).toContain('End prose.');
    expect(result).not.toContain('npm install');
    expect(result).not.toContain('docker run');
  });
});
