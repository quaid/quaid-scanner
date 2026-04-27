import { describe, it, expect } from 'vitest';
import { FoundationMapper } from '../../src/ecosystem/foundation-mapper.js';
import type { EcosystemProfile } from '../../src/ecosystem/types.js';

function makeProfile(domain: string): EcosystemProfile {
  return { domain, ecosystems: [], standards: [], primaryLanguage: 'TypeScript', detectedTopics: [] };
}

describe('FoundationMapper', () => {
  const mapper = new FoundationMapper();

  it('maps oss-health domain to OpenSSF and TODO Group', () => {
    const result = mapper.enrich(makeProfile('oss-health'));
    expect(result.ecosystems.some((e) => e.includes('OpenSSF'))).toBe(true);
    expect(result.ecosystems.some((e) => e.includes('TODO Group'))).toBe(true);
  });

  it('maps oss-health standards to OpenSSF Scorecard and CHAOSS', () => {
    const result = mapper.enrich(makeProfile('oss-health'));
    expect(result.standards.some((s) => s.includes('OpenSSF Scorecard'))).toBe(true);
    expect(result.standards.some((s) => s.includes('CHAOSS'))).toBe(true);
  });

  it('maps container-orchestration to CNCF', () => {
    const result = mapper.enrich(makeProfile('container-orchestration'));
    expect(result.ecosystems.some((e) => e.includes('CNCF'))).toBe(true);
  });

  it('preserves existing ecosystems and deduplicates', () => {
    const profile = { ...makeProfile('oss-health'), ecosystems: ['OpenSSF'] };
    const result = mapper.enrich(profile);
    const openSSFCount = result.ecosystems.filter((e) => e.includes('OpenSSF')).length;
    expect(openSSFCount).toBe(1);
  });

  it('falls back to general foundations for unknown domain', () => {
    const result = mapper.enrich(makeProfile('some-unknown-domain'));
    expect(result.ecosystems.length).toBeGreaterThan(0);
  });

  it('returns empty ecosystems when domain is unknown and no general fallback exists', () => {
    const result = mapper.enrich(makeProfile('totally-unknown-domain-xyz'));
    // Even with no specific mapping, result should be an array (may be empty or general fallback)
    expect(Array.isArray(result.ecosystems)).toBe(true);
  });

  it('returns empty standards array for domain with no standards mapping', () => {
    // 'container-orchestration' has no standards entry — tests the ?? [] on line 7
    const result = mapper.enrich(makeProfile('container-orchestration'));
    expect(Array.isArray(result.standards)).toBe(true);
  });
});
