import type { Finding } from '../types/index.js';

export interface FindingGroup {
  key: string;
  representative: Finding;
  members: Finding[];
}

/**
 * Normalise a finding message into a canonical group key by stripping
 * occurrence-specific details (context suffix, package version, etc.).
 * Used by both markdown and HTML renderers for consistent grouping.
 */
export function canonicalKey(f: Finding): string {
  const msg = f.message;

  // "Non-inclusive term "X" found in <context>" → "Non-inclusive term "X""
  const iniMatch = msg.match(/^(Non-inclusive term "[^"]+"|Found diminishing language "[^"]+")/);
  if (iniMatch) return iniMatch[1];

  // Loosely pinned devDependencies
  if (/Loosely pinned dependency .* uses \^ prefix in devDependencies/.test(msg)) {
    return 'Loosely pinned devDependencies (^ prefix)';
  }
  if (/Loosely pinned dependency .* uses \^ prefix in/.test(msg)) {
    return 'Loosely pinned dependency (^ prefix)';
  }
  if (/Loosely pinned dependency .* uses ~ prefix in devDependencies/.test(msg)) {
    return 'Loosely pinned devDependencies (~ prefix)';
  }

  // "Undefined acronym "X" may confuse newcomers" → "Undefined acronym "X""
  const acronymMatch = msg.match(/^(Undefined acronym "[^"]+")/);
  if (acronymMatch) return acronymMatch[1];

  // "Assumed knowledge: "X" command used without ..." → "Assumed knowledge: "X" command"
  const akMatch = msg.match(/^(Assumed knowledge: "[^"]+" (?:command|operation))/);
  if (akMatch) return akMatch[1];

  return msg;
}

export function groupFindings(findings: Finding[]): FindingGroup[] {
  const map = new Map<string, FindingGroup>();

  for (const f of findings) {
    const key = canonicalKey(f);
    const existing = map.get(key);
    if (existing) {
      existing.members.push(f);
    } else {
      map.set(key, { key, representative: f, members: [f] });
    }
  }

  return [...map.values()];
}

/** Maximum file:line refs to show before "+ more" truncation. */
export const MAX_GROUP_REFS = 5;

/**
 * Truncate a `context` excerpt for safe display in reports.
 * Collapses internal whitespace runs to single spaces by default — passing
 * `collapseWhitespace: false` preserves newlines for block contexts.
 * Appends '…' when the result is truncated. Returns '' for null/undefined.
 *
 * Why: minified single-line bundles can have matched lines tens of KB long,
 * which dominate grouped reports with unreadable noise (#201).
 */
export function truncateContext(
  s: string | null | undefined,
  opts: { max?: number; collapseWhitespace?: boolean } = {},
): string {
  if (s == null) return '';
  const max = opts.max ?? 120;
  const collapse = opts.collapseWhitespace ?? true;
  const normalized = (collapse ? s.replace(/\s+/g, ' ') : s).trim();
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max - 1) + '…';
}
