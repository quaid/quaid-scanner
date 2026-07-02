/**
 * Helper that normalises an optional InclusiveConfig into a fully-populated
 * object, supplying safe defaults for every field.
 *
 * Use this instead of accessing config.inclusive directly so that callers who
 * omit the field (or pass undefined) never trigger a property-access crash.
 */

import type { InclusiveConfig } from '../../types/index.js';

/**
 * Return a fully-populated InclusiveConfig, filling in safe defaults for any
 * fields that are absent when a caller omits config.inclusive.
 *
 * @param config - The raw inclusive config value, which may be undefined at
 *   runtime even though the TypeScript type says it is required.
 */
export function resolveInclusiveConfig(config: InclusiveConfig | undefined): Required<InclusiveConfig> {
  return {
    termListUrl: config?.termListUrl ?? null,
    customTerms: config?.customTerms ?? {},
    ignoredTerms: config?.ignoredTerms ?? [],
    excludePatterns: config?.excludePatterns ?? [],
  };
}
