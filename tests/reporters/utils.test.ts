import { describe, it, expect } from 'vitest';
import { truncateContext } from '../../src/reporters/utils.js';

describe('truncateContext (#201)', () => {
  it('returns empty string for null', () => {
    expect(truncateContext(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(truncateContext(undefined)).toBe('');
  });

  it('returns input unchanged when shorter than max', () => {
    expect(truncateContext('short snippet')).toBe('short snippet');
  });

  it('truncates with ellipsis when longer than default max (120)', () => {
    const long = 'x'.repeat(200);
    const out = truncateContext(long);
    expect(out.length).toBe(120);
    expect(out.endsWith('…')).toBe(true);
  });

  it('respects custom max option', () => {
    const long = 'x'.repeat(200);
    const out = truncateContext(long, { max: 50 });
    expect(out.length).toBe(50);
    expect(out.endsWith('…')).toBe(true);
  });

  it('collapses whitespace runs to single spaces by default', () => {
    expect(truncateContext('foo   bar\n\nbaz\t\tqux')).toBe('foo bar baz qux');
  });

  it('trims leading and trailing whitespace', () => {
    expect(truncateContext('  hello world  ')).toBe('hello world');
  });

  it('preserves newlines when collapseWhitespace=false', () => {
    expect(truncateContext('line1\nline2', { collapseWhitespace: false })).toBe('line1\nline2');
  });

  it('caps a minified single-line bundle to 120 chars (the #201 case)', () => {
    const minified = 'function abort(){throw new Error("aborted")}'.repeat(2000); // ~90 KB
    const out = truncateContext(minified);
    expect(out.length).toBe(120);
    expect(out.endsWith('…')).toBe(true);
  });
});
